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
    if (req.query.ageGroup || req.query.branchId) {
      where.student = {}
      if (req.query.ageGroup) where.student.ageGroup = req.query.ageGroup
      if (req.query.branchId) where.student.branchId = req.query.branchId
    }
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

    const day = startOfDay()
    const now = new Date()
    const attendance = await prisma.attendance.upsert({
      where: { studentId_date: { studentId: card.studentId, date: day } },
      update: { status: 'hadir', coachId: req.user.id, method: 'qr_scan', checkInTime: now, submittedAt: now },
      create: { studentId: card.studentId, date: day, status: 'hadir', coachId: req.user.id, method: 'qr_scan', checkInTime: now, submittedAt: now },
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
    const results = []
    for (const r of records) {
      const row = await prisma.attendance.upsert({
        where: { studentId_date: { studentId: r.studentId, date: day } },
        update: { status: r.status, coachId: req.user.id, method: 'manual', submittedAt: new Date() },
        create: { studentId: r.studentId, date: day, status: r.status, coachId: req.user.id, method: 'manual', submittedAt: new Date() },
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
