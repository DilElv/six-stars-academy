import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { notifyUser, notifyRole } from '../lib/notify.js'
import { getUserBranchIds } from '../lib/branchAccess.js'
import { ensureCurrentSessionMonth, isDateInCurrentMonth, monthlySessionLimit } from '../lib/sessionQuota.js'

const router = Router()

function startOfDay(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

// Any attendance status (hadir/izin/sakit/alfa) consumes one session from the
// student's package quota. Only counts once per calendar day — editing an
// already-recorded day's status does not consume another session.
//
// Once sessionsUsed reaches totalSessions, the student flips to
// 'needs_renewal'. Further attendance is still recorded, but the package
// counter remains capped until renewal.
// Mirrors computeSessionStats() in routes/students.js — prefers the stored
// value (set correctly, prorated for a partial first month, by every
// creation/renewal path — see lib/packagePeriod.js) and only falls back to
// the flat estimate for legacy rows predating that fix.
function totalSessionsFor(student) {
  if (student.totalSessions != null) return student.totalSessions
  return monthlySessionLimit(student.package)
}

async function upsertAttendanceAndConsumeSession(studentId, date, data) {
  const affectsCurrentQuota = isDateInCurrentMonth(date)
  const result = await prisma.$transaction(async (tx) => {
    // Serialize attendance writes per student so simultaneous manual/QR
    // requests cannot both pass the quota check.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${studentId}))`
    const existing = await tx.attendance.findUnique({ where: { studentId_date: { studentId, date } } })

    let renewalRequired = false
    if (!existing && affectsCurrentQuota) {
      let student = await tx.student.findUnique({
        where: { id: studentId },
        include: { package: { select: { sessionsPerWeek: true, durationMonths: true } } },
      })
      student = await ensureCurrentSessionMonth(student, tx)
      const totalSessions = student ? totalSessionsFor(student) : 0
      const packageExpired = student?.packageEndDate && new Date(student.packageEndDate) < startOfDay()
      renewalRequired = !!(student && (packageExpired || (student.totalSessions != null && student.sessionsUsed >= totalSessions)))
      if (renewalRequired && student.status !== 'needs_renewal') {
        await tx.student.update({ where: { id: studentId }, data: { status: 'needs_renewal' } })
      }
    }

    const row = await tx.attendance.upsert({
      where: { studentId_date: { studentId, date } },
      update: data,
      create: { studentId, date, ...data },
    })

    let quotaReached = null
    if (!existing && affectsCurrentQuota && !renewalRequired) {
      const updated = await tx.student.update({
        where: { id: studentId },
        data: { sessionsUsed: { increment: 1 } },
        include: { package: { select: { sessionsPerWeek: true, durationMonths: true } } },
      })
      const totalSessions = totalSessionsFor(updated)
      if (totalSessions > 0 && updated.sessionsUsed >= totalSessions && updated.status !== 'needs_renewal') {
        await tx.student.update({ where: { id: studentId }, data: { status: 'needs_renewal' } })
        quotaReached = { updated, totalSessions }
      }
    }

    return { row, existing, quotaReached, renewalRequired }
  })

  if (result.quotaReached) {
      const { updated, totalSessions } = result.quotaReached

      await notifyUser(updated.userId, {
        type: 'quota_exhausted',
        title: 'Kuota Paket Habis',
        message: `Kuota ${totalSessions} sesi latihan ${updated.fullName} sudah habis. Segera perpanjang paket agar bisa lanjut latihan.`,
        link: '/dashboard/pembayaran',
      })

      const adminMessage = `${updated.fullName} (${totalSessions}/${totalSessions}) telah mencapai batas kuota paket.`
      await Promise.all([
        notifyRole('admin', { type: 'student_quota_reached', title: 'Kuota Siswa Habis', message: adminMessage, link: '/admin/data-anak' }),
        notifyRole('head_coach', { type: 'student_quota_reached', title: 'Kuota Siswa Habis', message: adminMessage, link: '/head-coach/data-anak' }),
        notifyRole('coach', { type: 'student_quota_reached', title: 'Kuota Siswa Habis', message: adminMessage, link: '/coach/absensi' }),
      ])
  }

  return { ...result.row, alreadyRecorded: !!result.existing, renewalWarning: result.renewalRequired || !!result.quotaReached }
}

router.get('/summary', authenticate, authorize('coach', 'head_coach', 'admin'), async (req, res) => {
  try {
    let branchId = req.query.branchId || undefined
    if (req.user.role === 'coach') {
      const branchIds = await getUserBranchIds(req.user.id)
      branchId = branchId && branchIds.includes(branchId) ? branchId : '__none__'
    }

    const studentWhere = branchId ? { branchId } : {}
    const totalStudents = await prisma.student.count({ where: studentWhere })

    const days = 7
    const from = startOfDay()
    from.setDate(from.getDate() - (days - 1))

    const attendances = await prisma.attendance.findMany({
      where: {
        date: { gte: from },
        student: branchId ? { branchId } : undefined,
      },
      select: { date: true, status: true },
    })

    const trend = []
    for (let i = 0; i < days; i++) {
      const d = new Date(from)
      d.setDate(d.getDate() + i)
      const key = d.toISOString().slice(0, 10)
      const dayRows = attendances.filter((a) => a.date.toISOString().slice(0, 10) === key)
      trend.push({
        date: key,
        label: d.toLocaleDateString('id-ID', { weekday: 'short' }),
        hadir: dayRows.filter((a) => a.status === 'hadir').length,
        izin: dayRows.filter((a) => a.status === 'izin').length,
        sakit: dayRows.filter((a) => a.status === 'sakit').length,
        alfa: dayRows.filter((a) => a.status === 'alfa').length,
      })
    }

    const todayKey = startOfDay().toISOString().slice(0, 10)
    const todayRow = trend.find((t) => t.date === todayKey) || { hadir: 0, izin: 0, sakit: 0, alfa: 0 }
    const todaySubmitted = todayRow.hadir + todayRow.izin + todayRow.sakit + todayRow.alfa
    const today = {
      hadir: todayRow.hadir,
      izin: todayRow.izin,
      sakit: todayRow.sakit,
      alfa: todayRow.alfa,
      belum: Math.max(0, totalStudents - todaySubmitted),
    }

    res.json({ totalStudents, trend, today })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/me', authenticate, authorize('parent'), async (req, res) => {
  try {
    const student = await prisma.student.findFirst({ where: { userId: req.user.id } })
    if (!student) return res.json([])
    const attendances = await prisma.attendance.findMany({
      where: { studentId: student.id },
      orderBy: { date: 'desc' },
    })
    res.json(attendances)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/', authenticate, authorize('coach', 'head_coach', 'admin'), async (req, res) => {
  try {
    const date = startOfDay(req.query.date)
    const where = { date }
    where.student = {}
    if (req.query.ageGroup) where.student.ageGroup = req.query.ageGroup
    if (req.query.branchId) where.student.branchId = req.query.branchId

    if (req.user.role === 'coach') {
      const branchIds = await getUserBranchIds(req.user.id)
      where.student.branchId = req.query.branchId && branchIds.includes(req.query.branchId) ? req.query.branchId : '__none__'
    }

    if (Object.keys(where.student).length === 0) delete where.student
    const attendances = await prisma.attendance.findMany({ where, include: { student: { include: { branch: true } }, coach: { select: { name: true } } } })
    res.json(attendances)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/scan', authenticate, authorize('coach', 'head_coach', 'admin'), async (req, res) => {
  const { qrCode } = req.body
  if (!qrCode) return res.status(400).json({ error: 'qrCode wajib diisi' })
  try {
    const card = await prisma.studentCard.findUnique({ where: { qrCode }, include: { student: true } })
    if (!card || card.status !== 'active') return res.status(404).json({ error: 'Kartu tidak dikenali' })

    if (req.user.role === 'coach') {
      const branchIds = await getUserBranchIds(req.user.id)
      if (card.student.branchId && !branchIds.includes(card.student.branchId)) {
        return res.status(403).json({ error: 'Siswa ini bukan dari cabang Anda' })
      }
    }

    const day = startOfDay()
    const now = new Date()
    const attendance = await upsertAttendanceAndConsumeSession(card.studentId, day, {
      status: 'hadir', coachId: req.user.id, method: 'qr_scan', checkInTime: now, submittedAt: now,
    })

    res.json({ student: card.student, attendance })
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', authenticate, authorize('coach', 'head_coach', 'admin'), async (req, res) => {
  const { date, records } = req.body
  if (!Array.isArray(records)) return res.status(400).json({ error: 'records harus array' })
  try {
    const day = startOfDay(date)
    if (!date || Number.isNaN(day.getTime()) || day > startOfDay()) return res.status(400).json({ error: 'Tanggal absensi tidak valid atau masih di masa depan' })
    if (records.some((r) => !r.studentId || !['hadir', 'izin', 'sakit', 'alfa'].includes(r.status))) return res.status(400).json({ error: 'Status absensi tidak valid' })

    if (req.user.role === 'coach') {
      const branchIds = await getUserBranchIds(req.user.id)
      const students = await prisma.student.findMany({
        where: { id: { in: records.map((r) => r.studentId) } },
        select: { id: true, branchId: true },
      })
      const wrong = students.find((s) => s.branchId && !branchIds.includes(s.branchId))
      if (wrong) {
        return res.status(403).json({ error: 'Salah satu siswa bukan dari cabang Anda' })
      }
    }

    const results = []
    const skipped = []
    const alreadyRecorded = []
    const renewalWarnings = []
    for (const r of records) {
      try {
        const row = await upsertAttendanceAndConsumeSession(r.studentId, day, {
          status: r.status, coachId: req.user.id, method: 'manual', submittedAt: new Date(),
        })
        results.push(row)
        if (row.alreadyRecorded) alreadyRecorded.push(r.studentId)
        if (row.renewalWarning) renewalWarnings.push(r.studentId)
      } catch (err) {
        if (!err.status) throw err
        skipped.push({ studentId: r.studentId, error: err.message })
      }
    }

    const coach = await prisma.user.findUnique({ where: { id: req.user.id } })
    await notifyRole('admin', {
      type: 'attendance_submitted',
      title: 'Absensi Dikirim',
      message: `${coach?.name || 'Coach'} mengirim absensi ${results.length} siswa untuk ${day.toLocaleDateString('id-ID')}.`,
      link: '/admin/absensi',
    })

    res.json({ message: 'Absensi terkirim', count: results.length, skipped, alreadyRecorded, renewalWarnings })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
