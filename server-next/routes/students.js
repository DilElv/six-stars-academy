import { Router } from 'express'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import QRCode from 'qrcode'
import prisma from '../lib/prisma.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { findExistingCustomPackage, resolveCustomPackage } from '../lib/studentCustomPackage.js'
import { logPaymentAudit } from '../lib/paymentAudit.js'
import { getEffectivePrice, resolvePackagePrice } from '../lib/pricing.js'
import { getUserBranchIds } from '../lib/branchAccess.js'
import { computePackagePeriod, parsePackageDates } from '../lib/packagePeriod.js'
import { notifyUser, notifyRole } from '../lib/notify.js'
import { applyPaymentSuccess } from '../lib/paymentHelpers.js'
import { assignAgeGroup } from '../lib/ageGroup.js'
import { ensureCurrentSessionMonth, monthlySessionLimit } from '../lib/sessionQuota.js'

const router = Router()

// Self-heals `Student.ageGroup` on every read: since brackets are derived
// purely from dateOfBirth vs. today's date, a record left untouched drifts
// out of date the moment a birthday passes into a new bracket — there is no
// "save" event to trigger a recompute. Called from every GET route so (a)
// existing production rows correct themselves the instant they're fetched
// (e.g. just opening Data Anak), with zero manual edit required, and (b) the
// STORED column (not just the response) stays fresh, since other routes
// filter directly on `where.ageGroup`.
async function healAgeGroup(student) {
  if (!student?.dateOfBirth) return student
  const fresh = assignAgeGroup(student.dateOfBirth)
  if (fresh === student.ageGroup) return student
  await prisma.student.update({ where: { id: student.id }, data: { ageGroup: fresh } })
  return { ...student, ageGroup: fresh }
}

async function healAgeGroups(students) {
  return Promise.all(students.map(healAgeGroup))
}

async function ensureCard(studentId) {
  let card = await prisma.studentCard.findUnique({ where: { studentId } })
  if (!card) {
    const student = await prisma.student.findUnique({ where: { id: studentId } })
    card = await prisma.studentCard.create({
      data: { studentId, qrCode: crypto.randomBytes(16).toString('hex'), cardNumber: student.studentId },
    })
  }
  return card
}

async function sendQrImage(res, qrCode) {
  const png = await QRCode.toBuffer(qrCode, { width: 300, margin: 1 })
  res.set('Content-Type', 'image/png')
  res.send(png)
}

// Session/attendance progress for the student's CURRENT package period — same
// numbers shown on the parent dashboard, reused here so admin/head_coach see
// the exact same "sesi ke-X dari Y" and attendance breakdown.
async function computeSessionStats(student) {
  // Prefers the stored value — it's set correctly (prorated for a partial
  // first month, see lib/packagePeriod.js) by every creation/renewal path.
  // Falls back to the flat estimate only for legacy rows predating that fix.
  const totalSessions = student.totalSessions ?? monthlySessionLimit(student.package)

  if (!student.packageStartDate || !student.packageEndDate) {
    return { totalSessions, attendedSessions: 0, attendanceSummary: { hadir: 0, izin: 0, sakit: 0, alfa: 0, total: 0 } }
  }

  // Attendance.date is always normalized to local start-of-day (see
  // startOfDay() in routes/attendance.js). packageStartDate/EndDate are exact
  // creation timestamps, so comparing them directly skews by the server's UTC
  // offset — e.g. on WIB (UTC+7), local midnight becomes 17:00 UTC the
  // previous calendar day, which falls BEFORE a same-day packageStartDate
  // timestamp and silently excludes the registration day's attendance. Round
  // both bounds to local day boundaries so the ranges compare like-for-like.
  const rangeStart = new Date(student.packageStartDate)
  rangeStart.setHours(0, 0, 0, 0)
  const rangeEnd = new Date(student.packageEndDate)
  rangeEnd.setHours(23, 59, 59, 999)

  const attendances = await prisma.attendance.findMany({
    where: { studentId: student.id, date: { gte: rangeStart, lte: rangeEnd } },
    select: { status: true },
  })
  const attendanceSummary = {
    hadir: attendances.filter((a) => a.status === 'hadir').length,
    izin: attendances.filter((a) => a.status === 'izin').length,
    sakit: attendances.filter((a) => a.status === 'sakit').length,
    alfa: attendances.filter((a) => a.status === 'alfa').length,
    total: attendances.length,
  }
  // attendedSessions intentionally reads student.sessionsUsed (a running
  // counter, incremented on every check-in and resettable/seedable by admin —
  // e.g. for a kid who already had sessions before being added to the
  // system) rather than attendanceSummary.hadir (derived from Attendance rows
  // in this package's date window). The two normally agree since real
  // check-ins update both, but an admin-seeded starting count only has a
  // sessionsUsed value and no historical Attendance rows to re-derive from —
  // using sessionsUsed as the single source of truth keeps every view
  // (this modal, the Data Anak list cards, the parent dashboard) in sync.
  return { totalSessions, attendedSessions: student.sessionsUsed, attendanceSummary }
}

router.post('/', authenticate, authorize('admin', 'head_coach'), async (req, res) => {
  const {
    parentName, parentEmail, parentPhone, parentPassword,
    fullName, dateOfBirth, position, photo,
    packageId, branchId,
    paymentStatus, amount, registrationFee,
    sessionsUsed,
  } = req.body
  // Beasiswa is admin-only — head_coach can create/edit students same as
  // always, but never sets a scholarship percent, same pattern as branchId
  // being stripped for coach/head_coach in routes/auth.js.
  const canManageScholarship = ['admin', 'head_coach'].includes(req.user.role)
  const registrationScholarshipPercent = canManageScholarship ? Math.max(0, Math.min(100, Number(req.body.registrationScholarshipPercent) || 0)) : 0
  const sppScholarshipPercent = canManageScholarship ? Math.max(0, Math.min(100, Number(req.body.sppScholarshipPercent) || 0)) : 0

  try {
    if (!parentEmail || !parentEmail.toLowerCase().endsWith('@sixstars.id')) {
      return res.status(400).json({ error: 'Email untuk login harus menggunakan domain @sixstars.id' })
    }
    if (!parentPassword || parentPassword.length < 6) return res.status(400).json({ error: 'Password minimal 6 karakter' })

    const existing = await prisma.user.findUnique({ where: { email: parentEmail } })
    if (existing) return res.status(400).json({ error: 'Email sudah terdaftar' })

    const pkg = packageId ? await prisma.package.findUnique({ where: { id: packageId } }) : null
    const initialSessions = sessionsUsed === undefined || sessionsUsed === '' ? 0 : Number(sessionsUsed)
    if (!Number.isInteger(initialSessions) || initialSessions < 0 || (pkg && initialSessions > monthlySessionLimit(pkg))) return res.status(400).json({ error: 'Sesi awal harus berada dalam batas kuota paket' })
    // Resolves to the branch's BranchPackage override (Pengaturan > Harga
    // Paket) when one exists, matching what the picker actually displayed —
    // `amount` from the body is a rare explicit override, not the norm.
    const pkgAmount = pkg
      ? (amount !== undefined && amount !== '' ? Math.max(0, Math.round(Number(amount))) : await getEffectivePrice(pkg.id, branchId || null))
      : 0
    const ageGroup = assignAgeGroup(dateOfBirth)
    const hashed = await bcrypt.hash(parentPassword, 10)

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name: parentName, email: parentEmail, password: hashed, role: 'parent', phone: parentPhone },
      })

      // Derived from the highest existing studentId, not a row count — count()
      // collides with an existing ID as soon as any student has ever been
      // deleted (e.g. SS-0001 deleted leaves count()=1, regenerating the
      // still-in-use SS-0002 and throwing a P2002 that got misreported as
      // "Email sudah terdaftar" since the catch-all only checked the error
      // code, not which field it was on).
      const lastStudent = await tx.student.findFirst({ orderBy: { studentId: 'desc' }, select: { studentId: true } })
      const lastNum = lastStudent ? parseInt(lastStudent.studentId.replace('SS-', ''), 10) || 0 : 0
      const studentId = `SS-${String(lastNum + 1).padStart(4, '0')}`
      const startDate = new Date()
      const period = pkg ? computePackagePeriod(startDate, pkg) : null

      const student = await tx.student.create({
        data: {
          userId: user.id,
          studentId,
          fullName,
          dateOfBirth: new Date(dateOfBirth),
          position,
          ageGroup,
          photo: photo || null,
          parentName,
          parentPhone,
          parentEmail,
          address: '',
          packageId: pkg?.id || null,
          packageStartDate: pkg ? startDate : null,
          packageEndDate: period?.packageEndDate || null,
          totalSessions: pkg ? monthlySessionLimit(pkg) : null,
          sessionMonth: pkg ? startDate.getMonth() + 1 : null,
          sessionYear: pkg ? startDate.getFullYear() : null,
          branchId: branchId || null,
          sessionsUsed: sessionsUsed ? Math.max(0, Math.round(Number(sessionsUsed))) : 0,
          registrationScholarshipPercent,
          sppScholarshipPercent,
        },
      })

      if (pkg) {
        const regFee = registrationFee ?? 750000
        const discount = Math.round(pkgAmount * sppScholarshipPercent / 100) + Math.round(regFee * registrationScholarshipPercent / 100)
        const totalAmount = Math.max(0, pkgAmount + regFee - discount)

        await tx.payment.create({
          data: {
            studentId: student.id,
            packageId: pkg.id,
            amount: pkgAmount,
            registrationFee: regFee,
            totalAmount,
            paymentType: 'registration',
            status: paymentStatus || 'pending',
            paidAt: paymentStatus === 'success' ? new Date() : null,
            effectsAppliedAt: paymentStatus === 'success' ? new Date() : null,
          },
        })
      }

      await tx.studentCard.create({
        data: { studentId: student.id, qrCode: crypto.randomBytes(16).toString('hex'), cardNumber: student.studentId },
      })

      return { user: { id: user.id, name: user.name, email: user.email, role: user.role }, student }
    })

    res.status(201).json(result)
  } catch (err) {
    // Report which field actually collided instead of always assuming
    // email — a P2002 here can also fire on studentId/qrCode/cardNumber,
    // and blindly blaming email produces a misleading error message.
    if (err.code === 'P2002') {
      const target = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : err.meta?.target
      if (target?.includes('email')) return res.status(400).json({ error: 'Email sudah terdaftar' })
      console.error('P2002 on unexpected field:', target, err)
      return res.status(400).json({ error: `Gagal menyimpan, data bentrok pada field: ${target || 'tidak diketahui'}. Coba lagi.` })
    }
    console.error(err)
    res.status(500).json({ error: err.message || 'Server error' })
  }
})

router.get('/', authenticate, authorize('coach', 'head_coach', 'admin'), async (req, res) => {
  try {
    const where = {}
    if (req.query.branchId) where.branchId = req.query.branchId

    if (req.user.role === 'coach') {
      const branchIds = await getUserBranchIds(req.user.id)
      where.branchId = req.query.branchId && branchIds.includes(req.query.branchId) ? req.query.branchId : '__none__'
    }

    let students = await prisma.student.findMany({
      where,
      include: {
        package: true,
        branch: true,
        payments: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { fullName: 'asc' },
    })
    // ageGroup is healed (and re-persisted) before filtering below, so a
    // stale stored value never hides a student who now belongs to the
    // requested bracket — see healAgeGroups().
    students = await healAgeGroups(students)
    const refreshedStudents = []
    for (const student of students) refreshedStudents.push(await ensureCurrentSessionMonth(student))
    students = refreshedStudents
    if (req.query.ageGroup) students = students.filter((s) => s.ageGroup === req.query.ageGroup)
    res.json(students)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/me', authenticate, authorize('parent'), async (req, res) => {
  try {
    let student = await prisma.student.findFirst({
      where: { userId: req.user.id },
      include: { package: true, branch: true },
      orderBy: { createdAt: 'asc' },
    })
    if (!student) return res.status(404).json({ error: 'Data anak tidak ditemukan' })
    student = await healAgeGroup(student)
    student = await ensureCurrentSessionMonth(student)

    const stats = await computeSessionStats(student)
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const attendanceDates = await prisma.attendance.findMany({
      where: { studentId: student.id, date: { gte: monthStart, lt: todayStart } },
      select: { date: true },
    })
    const dateKey = (value) => new Date(value).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
    const recordedDates = new Set(attendanceDates.map((row) => dateKey(row.date)))
    const schedules = student.branchId ? await prisma.schedule.findMany({
      where: {
        branchId: student.branchId,
        status: 'active',
        date: { gte: monthStart, lt: todayStart },
      },
      select: { date: true, startTime: true, endTime: true, location: true },
      orderBy: { date: 'asc' },
    }) : []
    const missedAttendanceDates = schedules.filter((row) => !recordedDates.has(dateKey(row.date)))
    // For "anak lama", surface their quoted custom package even before it's
    // paid/activated (Student.packageId only updates once paid) — the
    // renewal UI needs this to know a custom price already exists.
    const customPackage = await findExistingCustomPackage(student)
    res.json({ ...student, ...stats, customPackage, missedAttendanceDates })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/me/qrcode.png', authenticate, authorize('parent'), async (req, res) => {
  try {
    const student = await prisma.student.findFirst({ where: { userId: req.user.id } })
    if (!student) return res.status(404).json({ error: 'Data anak tidak ditemukan' })
    const card = await ensureCard(student.id)
    await sendQrImage(res, card.qrCode)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/sessions/reset-all', authenticate, authorize('head_coach', 'admin'), async (req, res) => {
  try {
    const where = {}
    const requestedBranchId = req.body?.branchId || null
    if (req.user.role === 'head_coach') {
      const branchIds = await getUserBranchIds(req.user.id)
      if (requestedBranchId && !branchIds.includes(requestedBranchId)) {
        return res.status(403).json({ error: 'Anda hanya dapat mereset sesi anak di cabang Anda' })
      }
      where.branchId = requestedBranchId || { in: branchIds }
    } else if (requestedBranchId) {
      where.branchId = requestedBranchId
    }

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const result = await prisma.$transaction(async (tx) => {
      const reset = await tx.student.updateMany({
        where,
        data: { sessionsUsed: 0, sessionMonth: now.getMonth() + 1, sessionYear: now.getFullYear() },
      })
      await tx.student.updateMany({
        where: {
          ...where,
          status: { not: 'inactive' },
          packageId: { not: null },
          OR: [{ packageEndDate: null }, { packageEndDate: { gte: today } }],
        },
        data: { status: 'active' },
      })
      await tx.student.updateMany({
        where: { ...where, status: { not: 'inactive' }, packageEndDate: { lt: today } },
        data: { status: 'needs_renewal' },
      })
      return reset
    })
    res.json({ count: result.count, sessionsUsed: 0, month: now.getMonth() + 1, year: now.getFullYear() })
  } catch (err) {
    console.error('Reset all student sessions failed:', err)
    res.status(500).json({ error: 'Gagal mereset sesi anak' })
  }
})

router.get('/:id', authenticate, authorize('head_coach', 'admin'), async (req, res) => {
  try {
    let student = await prisma.student.findUnique({
      where: { id: req.params.id },
      include: {
        package: true,
        branch: true,
        payments: { orderBy: { createdAt: 'desc' } },
        assessments: { orderBy: [{ year: 'desc' }, { month: 'desc' }] },
        studentCard: true,
      },
    })
    if (!student) return res.status(404).json({ error: 'Siswa tidak ditemukan' })
    student = await healAgeGroup(student)
    student = await ensureCurrentSessionMonth(student)
    const stats = await computeSessionStats(student)
    res.json({ ...student, ...stats, customPackage: await findExistingCustomPackage(student) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:id', authenticate, authorize('head_coach', 'admin'), async (req, res) => {
  const {
    fullName, dateOfBirth, position, address, parentName, parentPhone, photo, status, branchId, packageId, sessionsUsed, totalSessions,
    parentEmail, parentPassword, registrationFee, amount, paymentStatus,
  } = req.body
  const canManageScholarship = ['admin', 'head_coach'].includes(req.user.role)
  const { registrationScholarshipPercent, sppScholarshipPercent } = req.body
  for (const value of [sessionsUsed, totalSessions]) {
    if (value !== undefined && value !== '' && (!Number.isInteger(Number(value)) || Number(value) < 0)) return res.status(400).json({ error: 'Sesi harus berupa bilangan bulat minimal 0' })
  }
  try {
    const student = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${req.params.id}))`
      const current = await tx.student.findUnique({ where: { id: req.params.id } })
      if (!current) throw Object.assign(new Error('Siswa tidak ditemukan'), { status: 404 })
      const data = {
        fullName, position, address, parentName, parentPhone, photo, status,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        branchId: branchId !== undefined ? (branchId || null) : undefined,
        sessionsUsed: sessionsUsed !== undefined && sessionsUsed !== '' ? Math.max(0, Math.round(Number(sessionsUsed))) : undefined,
        totalSessions: totalSessions !== undefined && totalSessions !== '' ? Math.max(0, Math.round(Number(totalSessions))) : undefined,
      }
      // Beasiswa is admin-only — a head_coach's request simply never sets
      // these keys, so `undefined` leaves the student's existing values untouched.
      if (canManageScholarship && registrationScholarshipPercent !== undefined) {
        data.registrationScholarshipPercent = Math.max(0, Math.min(100, Number(registrationScholarshipPercent) || 0))
      }
      if (canManageScholarship && sppScholarshipPercent !== undefined) {
        data.sppScholarshipPercent = Math.max(0, Math.min(100, Number(sppScholarshipPercent) || 0))
      }

      // Changing the package re-derives the end date from today (same as a
      // fresh assignment) — this is a correction to what package the student
      // is on, not a renewal, so it doesn't touch Payment records.
      if (packageId !== undefined && packageId !== current.packageId) {
        if (packageId) {
          const pkg = await tx.package.findUnique({ where: { id: packageId } })
          if (!pkg) throw Object.assign(new Error('Paket tidak ditemukan'), { status: 400 })
          const startDate = new Date()
          const period = computePackagePeriod(startDate, pkg)
          data.packageId = packageId
          data.packageStartDate = startDate
          data.packageEndDate = period.packageEndDate
          data.totalSessions = monthlySessionLimit(pkg)
          data.sessionsUsed = 0
          data.sessionMonth = startDate.getMonth() + 1
          data.sessionYear = startDate.getFullYear()
        } else {
          data.packageId = null
          data.packageStartDate = null
          data.packageEndDate = null
          data.totalSessions = null
        }
      }

      const effectiveUsed = data.sessionsUsed ?? current.sessionsUsed
      const effectiveTotal = data.totalSessions ?? current.totalSessions
      if (effectiveTotal != null && effectiveUsed > effectiveTotal) {
        throw Object.assign(new Error('Sesi terpakai tidak boleh melebihi total sesi'), { status: 400 })
      }
      if (data.sessionsUsed !== undefined || data.totalSessions !== undefined) {
        data.sessionMonth = new Date().getMonth() + 1
        data.sessionYear = new Date().getFullYear()
        const endDate = data.packageEndDate === undefined ? current.packageEndDate : data.packageEndDate
        const expired = endDate && new Date(endDate) < new Date(new Date().setHours(0, 0, 0, 0))
        data.status = (status ?? current.status) === 'inactive' ? 'inactive' : expired || (effectiveTotal != null && effectiveUsed >= effectiveTotal) ? 'needs_renewal' : 'active'
      }

      // Kelompok umur is always derived from tanggal lahir, never an
      // independently-editable field — otherwise it silently drifts from
      // the student's actual age (either because dateOfBirth was corrected
      // without also updating this, or because time passed and nobody
      // re-saved the record since their last birthday).
      data.ageGroup = assignAgeGroup(data.dateOfBirth || current.dateOfBirth)

      // Login email lives on both User and Student — keep them in sync, and
      // guard the same way account creation does (domain + uniqueness).
      if (parentEmail !== undefined && parentEmail !== current.parentEmail) {
        if (!parentEmail || !parentEmail.toLowerCase().endsWith('@sixstars.id')) {
          throw Object.assign(new Error('Email untuk login harus menggunakan domain @sixstars.id'), { status: 400 })
        }
        const clash = await tx.user.findUnique({ where: { email: parentEmail } })
        if (clash && clash.id !== current.userId) throw Object.assign(new Error('Email sudah terdaftar'), { status: 400 })
        data.parentEmail = parentEmail
        await tx.user.update({ where: { id: current.userId }, data: { email: parentEmail } })
      }

      if (parentPassword) {
        if (parentPassword.length < 6) throw Object.assign(new Error('Password minimal 6 karakter'), { status: 400 })
        const hashed = await bcrypt.hash(parentPassword, 10)
        await tx.user.update({ where: { id: current.userId }, data: { password: hashed } })
      }

      // The registration Payment (created once, when the student was first
      // added) is what carries biaya pendaftaran / status pembayaran /
      // beasiswa discount — same fields Tambah Anak sets, editable here as a
      // correction, not a new transaction.
      if (registrationFee !== undefined || amount !== undefined || paymentStatus !== undefined
        || (canManageScholarship && (registrationScholarshipPercent !== undefined || sppScholarshipPercent !== undefined))) {
        const payment = await tx.payment.findFirst({ where: { studentId: req.params.id, paymentType: 'registration' } })
        if (payment) {
          const newAmount = amount !== undefined && amount !== '' ? Math.max(0, Math.round(Number(amount))) : payment.amount
          const newFee = registrationFee !== undefined && registrationFee !== '' ? Math.max(0, Math.round(Number(registrationFee))) : payment.registrationFee
          const regScholarship = data.registrationScholarshipPercent ?? current.registrationScholarshipPercent
          const sppScholarship = data.sppScholarshipPercent ?? current.sppScholarshipPercent

          const discount = Math.round(newAmount * sppScholarship / 100) + Math.round(newFee * regScholarship / 100)
          const newStatus = paymentStatus !== undefined ? paymentStatus : payment.status

          await tx.payment.update({
            where: { id: payment.id },
            data: {
              amount: newAmount,
              registrationFee: newFee,
              totalAmount: Math.max(newAmount + newFee - discount, 0),
              status: newStatus,
              paidAt: newStatus === 'success' ? (payment.paidAt || new Date()) : null,
            },
          })
        }
      }

      return tx.student.update({ where: { id: req.params.id }, data })
    })

    res.json(student)
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:id/package-period', authenticate, authorize('admin', 'head_coach'), async (req, res) => {
  try {
    let dates
    try { dates = parsePackageDates(req.body.packageStartDate, req.body.packageEndDate) }
    catch (err) { return res.status(400).json({ error: err.message }) }
    const student = await prisma.student.findUnique({ where: { id: req.params.id } })
    if (!student) return res.status(404).json({ error: 'Siswa tidak ditemukan' })
    if (req.user.role === 'head_coach' && !(await getUserBranchIds(req.user.id)).includes(student.branchId)) {
      return res.status(403).json({ error: 'Anda hanya dapat mengedit periode anak di cabang Anda' })
    }
    if (!student.packageId) return res.status(400).json({ error: 'Anak belum memiliki paket' })
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const exhausted = student.totalSessions != null && student.sessionsUsed >= student.totalSessions
    const status = student.status === 'inactive' ? 'inactive' : dates.packageEndDate < today || exhausted ? 'needs_renewal' : 'active'
    const updated = await prisma.student.update({ where: { id: student.id }, data: { ...dates, status }, include: { package: true, branch: true } })
    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Gagal menyimpan periode paket' })
  }
})

// Admin-initiated renewal — distinct from PUT /:id's simple package
// correction. Dua mode (mode: 'invoice' | 'paid'):
//
//  - 'invoice': membuat TAGIHAN yang belum dibayar — item masuk ke daftar
//    tagihan anak dan parent dapat notifikasi. Tidak ada Payment, tidak ada
//    pendapatan, paket belum diperpanjang. Parent membayarnya dari menu
//    Perpanjang Paket (satu checkout, otomatis lunas saat gateway mengonfirmasi).
//  - 'paid' (default, demi kompatibilitas): menandai LANGSUNG LUNAS untuk
//    pembayaran manual (cash / transfer pribadi / kebijakan khusus). Membuat
//    Payment lunas + menerapkan efek paket + mencatat keterangan & jejak audit.
//
// "Anak lama" (isOldMember) dan "Custom" memakai hidden, student-specific
// custom-priced Package (Package.isCustom) yang dibuat sekali lalu dipakai
// ulang, bukan dicocokkan ke katalog Pengaturan.
router.post('/:id/renew', authenticate, authorize('admin', 'head_coach'), async (req, res) => {
  const { isOldMember, packageId, customPackage, amount, mode, paymentMethod, note } = req.body
  const invoiceMode = mode === 'invoice'
  try {
    const student = await prisma.student.findUnique({ where: { id: req.params.id }, include: { package: true } })
    if (!student) return res.status(404).json({ error: 'Siswa tidak ditemukan' })

    if (req.user.role === 'head_coach' && !(await getUserBranchIds(req.user.id)).includes(student.branchId)) {
      return res.status(403).json({ error: 'Anda hanya dapat memperpanjang paket anak di cabang Anda' })
    }
    if (amount !== undefined && amount !== '' && (!Number.isSafeInteger(Number(amount)) || Number(amount) < 0 || Number(amount) > 2147483647)) return res.status(400).json({ error: 'Harga tidak valid' })
    let pkg
    if (customPackage) {
      const { name, sessionsPerWeek, durationMonths, price } = customPackage
      if (!name?.trim()) return res.status(400).json({ error: 'Nama paket custom wajib diisi' })
      if (!Number.isSafeInteger(Number(sessionsPerWeek)) || Number(sessionsPerWeek) <= 0) return res.status(400).json({ error: 'Sesi per minggu harus lebih dari 0' })
      if (!Number.isSafeInteger(Number(durationMonths)) || Number(durationMonths) <= 0) return res.status(400).json({ error: 'Durasi (bulan) harus lebih dari 0' })
      if (price === undefined || price === '' || !Number.isSafeInteger(Number(price)) || Number(price) < 0 || Number(price) > 2147483647) return res.status(400).json({ error: 'Harga tidak valid' })

      pkg = await resolveCustomPackage(student, {
        name: name.trim(),
        sessionsPerWeek: Math.round(Number(sessionsPerWeek)),
        durationMonths: Math.round(Number(durationMonths)),
        price: Math.round(Number(price)),
      })
    } else {
      if (!packageId) return res.status(400).json({ error: 'Pilih paket terlebih dahulu' })
      pkg = await prisma.package.findUnique({ where: { id: packageId } })
      if (!pkg || pkg.isCustom || pkg.status !== 'active') return res.status(400).json({ error: 'Pilih paket standar yang aktif atau gunakan Custom' })
    }

    const resolvedAmount = amount !== undefined && amount !== ''
      ? Math.max(0, Math.round(Number(amount)))
      : await resolvePackagePrice(pkg, student)

    // Period quoted for the success/notification screen.
    let quoteBase = new Date()
    if (student.packageEndDate && new Date(student.packageEndDate) > new Date()) {
      quoteBase = new Date(student.packageEndDate)
      quoteBase.setDate(quoteBase.getDate() + 1)
    }
    const quote = computePackagePeriod(quoteBase, pkg)

    if (isOldMember !== undefined) {
      await prisma.student.update({ where: { id: student.id }, data: { isOldMember: !!isOldMember } })
    }

    const invoiceLabel = `Perpanjangan Paket — ${pkg.name}`

    // ---- Mode TAGIHAN: dibukukan sebagai tagihan, tidak ada pendapatan dulu ----
    if (invoiceMode) {
      const [existing, pendingCheckout] = await Promise.all([
        prisma.cartItem.findFirst({ where: { studentId: student.id, type: 'package', status: 'open' } }),
        prisma.payment.findFirst({
          where: { studentId: student.id, paymentType: 'cart', status: 'pending', cartItems: { some: { type: 'package' } } },
          select: { id: true },
        }),
      ])
      if (existing) {
        return res.status(400).json({ error: 'Sudah ada tagihan perpanjangan paket yang belum dibayar untuk anak ini.' })
      }
      if (pendingCheckout) {
        return res.status(400).json({ error: 'Masih ada pembayaran perpanjangan paket yang belum selesai untuk anak ini.' })
      }
      const cartItem = await prisma.cartItem.create({
        data: {
          studentId: student.id,
          type: 'package',
          label: invoiceLabel,
          category: 'Perpanjangan Paket',
          amount: resolvedAmount,
          metadata: { packageId: pkg.id, packageName: pkg.name, custom: !!pkg.isCustom, note: note?.trim() || null },
          addedById: req.user.id,
          status: 'open',
        },
      })

      await notifyUser(student.userId, {
        type: 'cart_item_added',
        title: 'Tagihan Perpanjangan Paket',
        message: `Tagihan ${invoiceLabel} sebesar Rp${resolvedAmount.toLocaleString('id-ID')} sudah dibuat. Silakan buka menu Perpanjang Paket untuk membayar.`,
        link: '/dashboard/pembayaran',
      })
      await logPaymentAudit({
        studentId: student.id,
        action: 'invoice_created',
        actor: req.user,
        amount: resolvedAmount,
        note: `${invoiceLabel}${note?.trim() ? ` — ${note.trim()}` : ''}`,
      })
      return res.status(201).json({
        invoice: true,
        cartItem,
        package: pkg,
        amount: resolvedAmount,
        quote,
        student: await prisma.student.findUnique({ where: { id: student.id }, include: { package: true, branch: true } }),
      })
    }

    // ---- Mode LANGSUNG LUNAS (cash / transfer manual) ----
    let payment = await prisma.payment.create({
      data: {
        studentId: student.id,
        packageId: pkg.id,
        amount: resolvedAmount,
        registrationFee: 0,
        totalAmount: resolvedAmount,
        paymentType: 'renewal',
        status: 'success',
        paymentMethod: paymentMethod?.trim() || 'manual',
        note: note?.trim() || null,
        paidAt: new Date(),
      },
    })

    payment = await applyPaymentSuccess(payment)

    // Batalkan tagihan/checkout lain untuk perpanjangan ini supaya parent
    // tidak membayar periode yang sama dua kali.
    await prisma.$transaction(async (tx) => {
      await tx.cartItem.deleteMany({ where: { studentId: student.id, type: 'package', status: 'open' } })
      const pending = await tx.payment.findMany({ where: { studentId: student.id, paymentType: 'cart', status: 'pending' }, include: { cartItems: true } })
      for (const p of pending) {
        const packageItems = p.cartItems.filter((c) => c.type === 'package')
        if (packageItems.length) await tx.cartItem.deleteMany({ where: { id: { in: packageItems.map((c) => c.id) } } })
        await tx.cartItem.updateMany({ where: { paymentId: p.id }, data: { paymentId: null, status: 'open' } })
        await tx.payment.delete({ where: { id: p.id } })
      }
    })

    await logPaymentAudit({
      paymentId: payment.id,
      action: 'mark_paid_manual',
      actor: req.user,
      studentId: student.id,
      amount: resolvedAmount,
      after: { status: payment.status, paymentMethod: payment.paymentMethod, totalAmount: payment.totalAmount },
      note: payment.note || `Perpanjangan dicatat lunas oleh ${req.user.role}`,
    })

    await notifyRole('admin', {
      type: 'renewal_recorded',
      title: 'Perpanjangan Paket Dicatat',
      message: `${student.fullName} diperpanjang oleh ${req.user.role === 'admin' ? 'admin' : 'head coach'} — Rp${resolvedAmount.toLocaleString('id-ID')}${payment.note ? ` (${payment.note})` : ''}.`,
      link: '/admin/data-anak',
    })

    const updatedStudent = await prisma.student.findUnique({ where: { id: student.id }, include: { package: true, branch: true } })
    res.json({ student: updatedStudent, payment, package: pkg, paid: true, quote })
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/:id/qrcode.png', authenticate, authorize('head_coach', 'admin'), async (req, res) => {
  try {
    const card = await ensureCard(req.params.id)
    await sendQrImage(res, card.qrCode)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const student = await prisma.student.findUnique({ where: { id: req.params.id }, select: { userId: true } })
    if (!student) return res.status(404).json({ error: 'Siswa tidak ditemukan' })

    await prisma.student.delete({ where: { id: req.params.id } })

    // A parent User can have multiple Student children sharing one login
    // (siblings) — only remove the User once it has no students left,
    // otherwise its email stays orphaned forever and permanently blocks
    // that address from ever being used again ("Email sudah terdaftar").
    const remaining = await prisma.student.count({ where: { userId: student.userId } })
    if (remaining === 0) {
      await prisma.user.delete({ where: { id: student.userId } })
    }

    res.json({ message: 'Deleted' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
