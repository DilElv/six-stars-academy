import { Router } from 'express'
import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma.js'
import { authenticate, authorize } from '../middleware/auth.js'

const router = Router()

router.use(authenticate, authorize('admin'))

router.get('/stats', async (req, res) => {
  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0)
    const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999)

    const [totalAnak, totalHeadCoach, totalCoach, pendapatanBulanIni, absensiHariIni, pembayaranPending, raporBelumDibuat] = await Promise.all([
      prisma.student.count({ where: { status: 'active' } }),
      prisma.user.count({ where: { role: 'head_coach' } }),
      prisma.user.count({ where: { role: 'coach' } }),
      prisma.payment.aggregate({ _sum: { totalAmount: true }, where: { status: 'success', paidAt: { gte: startOfMonth } } }),
      prisma.attendance.count({ where: { date: { gte: startOfToday, lte: endOfToday } } }),
      prisma.payment.count({ where: { status: 'pending' } }),
      prisma.assessment.count({ where: { month: now.getMonth() + 1, year: now.getFullYear(), reports: { none: {} } } }),
    ])

    res.json({
      totalAnak,
      totalHeadCoach,
      totalCoach,
      pendapatanBulanIni: pendapatanBulanIni._sum.totalAmount || 0,
      absensiHariIni,
      pembayaranPending,
      raporBelumDibuat,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/users', async (req, res) => {
  try {
    const where = req.query.role ? { role: req.query.role } : {}
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true, name: true, email: true, role: true, phone: true, photo: true, bio: true, status: true, createdAt: true,
        _count: { select: { coachAttendances: true, trainingSessions: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json(users)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/users', async (req, res) => {
  const { name, email, password, role, phone } = req.body
  try {
    const hashed = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({ data: { name, email, password: hashed, role, phone } })
    const { password: _pw, ...profile } = user
    res.status(201).json(profile)
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Email sudah terdaftar' })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/users/:id', async (req, res) => {
  const { name, phone, status, password } = req.body
  try {
    const data = { name, phone, status }
    if (password) data.password = await bcrypt.hash(password, 10)
    const user = await prisma.user.update({ where: { id: req.params.id }, data })
    const { password: _pw, ...profile } = user
    res.json(profile)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/users/:id', async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } })
    res.json({ message: 'Deleted' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
