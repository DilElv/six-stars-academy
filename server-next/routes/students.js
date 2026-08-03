import { Router } from 'express'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import QRCode from 'qrcode'
import prisma from '../lib/prisma.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { getEffectivePrice } from '../lib/pricing.js'
import { getUserBranchIds } from '../lib/branchAccess.js'

const router = Router()

const AGE_GROUP_BRACKETS = [
  { label: 'U-8', min: 0, max: 8 },
  { label: 'U-10', min: 9, max: 10 },
  { label: 'U-12', min: 11, max: 12 },
  { label: 'U-14', min: 13, max: 14 },
  { label: 'U-16', min: 15, max: 16 },
  { label: 'U-18', min: 17, max: 999 },
]

function calcAge(dob) {
  const birth = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

function assignAgeGroup(dob) {
  const age = calcAge(dob)
  const bracket = AGE_GROUP_BRACKETS.find((b) => age >= b.min && age <= b.max)
  return bracket ? bracket.label : AGE_GROUP_BRACKETS[0].label
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
  const totalSessions = student.package
    ? student.package.sessionsPerWeek * 4 * student.package.durationMonths
    : 0

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
  const isAdmin = req.user.role === 'admin'
  const registrationScholarshipPercent = isAdmin ? Math.max(0, Math.min(100, Number(req.body.registrationScholarshipPercent) || 0)) : 0
  const sppScholarshipPercent = isAdmin ? Math.max(0, Math.min(100, Number(req.body.sppScholarshipPercent) || 0)) : 0

  try {
    if (!parentEmail || !parentEmail.toLowerCase().endsWith('@sixstars.id')) {
      return res.status(400).json({ error: 'Email untuk login harus menggunakan domain @sixstars.id' })
    }
    if (!parentPassword || parentPassword.length < 6) return res.status(400).json({ error: 'Password minimal 6 karakter' })

    const existing = await prisma.user.findUnique({ where: { email: parentEmail } })
    if (existing) return res.status(400).json({ error: 'Email sudah terdaftar' })

    const pkg = packageId ? await prisma.package.findUnique({ where: { id: packageId } }) : null
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
      const endDate = pkg ? new Date(startDate.getTime() + pkg.durationMonths * 30 * 24 * 60 * 60 * 1000) : null

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
          packageStartDate: startDate,
          packageEndDate: endDate,
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
    if (req.query.ageGroup) where.ageGroup = req.query.ageGroup
    if (req.query.branchId) where.branchId = req.query.branchId

    if (req.user.role === 'coach') {
      const branchIds = await getUserBranchIds(req.user.id)
      where.branchId = req.query.branchId && branchIds.includes(req.query.branchId) ? req.query.branchId : '__none__'
    }

    const students = await prisma.student.findMany({
      where,
      include: {
        package: true,
        branch: true,
        payments: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { fullName: 'asc' },
    })
    res.json(students)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/me', authenticate, authorize('parent'), async (req, res) => {
  try {
    const student = await prisma.student.findFirst({
      where: { userId: req.user.id },
      include: { package: true, branch: true },
      orderBy: { createdAt: 'asc' },
    })
    if (!student) return res.status(404).json({ error: 'Data anak tidak ditemukan' })

    const stats = await computeSessionStats(student)
    res.json({ ...student, ...stats })
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

router.get('/:id', authenticate, authorize('head_coach', 'admin'), async (req, res) => {
  try {
    const student = await prisma.student.findUnique({
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
    const stats = await computeSessionStats(student)
    res.json({ ...student, ...stats })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:id', authenticate, authorize('head_coach', 'admin'), async (req, res) => {
  const {
    fullName, dateOfBirth, position, ageGroup, address, parentName, parentPhone, photo, status, branchId, packageId, sessionsUsed,
    parentEmail, parentPassword, registrationFee, amount, paymentStatus,
  } = req.body
  const isAdmin = req.user.role === 'admin'
  const { registrationScholarshipPercent, sppScholarshipPercent } = req.body
  try {
    const student = await prisma.$transaction(async (tx) => {
      const data = {
        fullName, position, ageGroup, address, parentName, parentPhone, photo, status,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        branchId: branchId !== undefined ? (branchId || null) : undefined,
        sessionsUsed: sessionsUsed !== undefined && sessionsUsed !== '' ? Math.max(0, Math.round(Number(sessionsUsed))) : undefined,
      }
      // Beasiswa is admin-only — a head_coach's request simply never sets
      // these keys, so `undefined` leaves the student's existing values untouched.
      if (isAdmin && registrationScholarshipPercent !== undefined) {
        data.registrationScholarshipPercent = Math.max(0, Math.min(100, Number(registrationScholarshipPercent) || 0))
      }
      if (isAdmin && sppScholarshipPercent !== undefined) {
        data.sppScholarshipPercent = Math.max(0, Math.min(100, Number(sppScholarshipPercent) || 0))
      }

      // Changing the package re-derives the end date from today (same as a
      // fresh assignment) — this is a correction to what package the student
      // is on, not a renewal, so it doesn't touch Payment records.
      if (packageId !== undefined) {
        if (packageId) {
          const pkg = await tx.package.findUnique({ where: { id: packageId } })
          if (!pkg) throw Object.assign(new Error('Paket tidak ditemukan'), { status: 400 })
          const startDate = new Date()
          data.packageId = packageId
          data.packageStartDate = startDate
          data.packageEndDate = new Date(startDate.getTime() + pkg.durationMonths * 30 * 24 * 60 * 60 * 1000)
        } else {
          data.packageId = null
          data.packageStartDate = null
          data.packageEndDate = null
        }
      }

      const current = await tx.student.findUnique({ where: { id: req.params.id } })
      if (!current) throw Object.assign(new Error('Siswa tidak ditemukan'), { status: 404 })

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
        || (isAdmin && (registrationScholarshipPercent !== undefined || sppScholarshipPercent !== undefined))) {
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
