import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { notifyUser } from '../lib/notify.js'

const router = Router()

router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const where = {}
    if (req.query.status) where.status = req.query.status
    const payments = await prisma.payment.findMany({
      where,
      include: { package: true, student: { select: { fullName: true, studentId: true, parentName: true, parentPhone: true } } },
      orderBy: { createdAt: 'desc' },
    })
    res.json(payments)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  const { status, paymentMethod } = req.body
  try {
    const data = { status, paymentMethod }
    if (status === 'success') data.paidAt = new Date()
    const payment = await prisma.payment.update({
      where: { id: req.params.id },
      data,
      include: { student: true },
    })

    if (status === 'success' || status === 'failed') {
      await notifyUser(payment.student.userId, {
        type: status === 'success' ? 'payment_success' : 'payment_failed',
        title: status === 'success' ? 'Pembayaran Berhasil' : 'Pembayaran Gagal',
        message: status === 'success'
          ? `Pembayaran untuk ${payment.student.fullName} telah diverifikasi lunas.`
          : `Pembayaran untuk ${payment.student.fullName} ditandai gagal. Silakan hubungi admin.`,
        link: '/dashboard/pembayaran',
      })
    }

    res.json(payment)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/me', authenticate, authorize('parent'), async (req, res) => {
  try {
    const student = await prisma.student.findFirst({ where: { userId: req.user.id } })
    if (!student) return res.json([])
    const payments = await prisma.payment.findMany({
      where: { studentId: student.id },
      include: { package: true },
      orderBy: { createdAt: 'desc' },
    })
    res.json(payments)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
