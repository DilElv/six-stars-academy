import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { notifyRole } from '../lib/notify.js'

const router = Router()

function startOfDay(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

// Any attendance status (hadir/izin/sakit/alfa) consumes one session from the
// student's package quota. Only counts once per calendar day — editing an
// already-recorded day's status does not consume another session.
async function upsertAttendanceAndConsumeSession(studentId, date, data) {
  const existing = await prisma.attendance.findUnique({ where: { studentId_date: { studentId, date } } })
  const row = await prisma.attendance.upsert({
    where: { studentId_date: { studentId, date } },
    update: data,
    create: { studentId, date, ...data },
  })
  if (!existing) {
    await prisma.student.update({ where: { id: studentId }, data: { sessionsUsed: { increment: 1 } } })
  }
  return row
}

router.get('/summary', authenticate, authorize('coach', 'head_coach', 'admin'), async (req, res) => {
  try {
    let branchId = req.query.branchId || undefined
    if (req.user.role === 'coach') {
      const coach = await prisma.user.findUnique({ where: { id: req.user.id } })
      branchId = coach?.branchId || '__none__'
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
      const coach = await prisma.user.findUnique({ where: { id: req.user.id } })
      where.student.branchId = coach?.branchId || '__none__'
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
      const coach = await prisma.user.findUnique({ where: { id: req.user.id } })
      if (coach?.branchId && card.student.branchId && coach.branchId !== card.student.branchId) {
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
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', authenticate, authorize('coach', 'head_coach', 'admin'), async (req, res) => {
  const { date, records } = req.body
  if (!Array.isArray(records)) return res.status(400).json({ error: 'records harus array' })
  try {
    const day = startOfDay(date)

    if (req.user.role === 'coach') {
      const coach = await prisma.user.findUnique({ where: { id: req.user.id } })
      if (coach?.branchId) {
        const students = await prisma.student.findMany({
          where: { id: { in: records.map((r) => r.studentId) } },
          select: { id: true, branchId: true },
        })
        const wrong = students.find((s) => s.branchId && s.branchId !== coach.branchId)
        if (wrong) {
          return res.status(403).json({ error: 'Salah satu siswa bukan dari cabang Anda' })
        }
      }
    }

    const results = []
    for (const r of records) {
      const row = await upsertAttendanceAndConsumeSession(r.studentId, day, {
        status: r.status, coachId: req.user.id, method: 'manual', submittedAt: new Date(),
      })
      results.push(row)
    }

    const coach = await prisma.user.findUnique({ where: { id: req.user.id } })
    await notifyRole('admin', {
      type: 'attendance_submitted',
      title: 'Absensi Dikirim',
      message: `${coach?.name || 'Coach'} mengirim absensi ${results.length} siswa untuk ${day.toLocaleDateString('id-ID')}.`,
      link: '/admin/absensi',
    })

    res.json({ message: 'Absensi terkirim', count: results.length })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
