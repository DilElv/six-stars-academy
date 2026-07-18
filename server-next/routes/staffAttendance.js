import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { authenticate, authorize } from '../middleware/auth.js'

const router = Router()

function startOfDay(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

router.post('/checkin', authenticate, authorize('coach', 'head_coach'), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } })
    const day = startOfDay()
    const now = new Date()
    const record = await prisma.staffAttendance.upsert({
      where: { userId_date: { userId: req.user.id, date: day } },
      update: { status: 'hadir', checkInTime: now, branchId: user.branchId },
      create: { userId: req.user.id, branchId: user.branchId, date: day, status: 'hadir', checkInTime: now },
    })
    res.json(record)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/me', authenticate, authorize('coach', 'head_coach'), async (req, res) => {
  try {
    const day = startOfDay(req.query.date)
    const record = await prisma.staffAttendance.findUnique({ where: { userId_date: { userId: req.user.id, date: day } } })
    res.json(record)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const day = startOfDay(req.query.date)
    const where = { date: day }
    if (req.query.branchId) where.branchId = req.query.branchId
    const records = await prisma.staffAttendance.findMany({
      where,
      include: { user: { select: { name: true, role: true, photo: true } }, branch: true },
      orderBy: { checkInTime: 'asc' },
    })
    res.json(records)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
