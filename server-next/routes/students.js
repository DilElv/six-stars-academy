import { Router } from 'express'
import crypto from 'crypto'
import QRCode from 'qrcode'
import prisma from '../lib/prisma.js'
import { authenticate, authorize } from '../middleware/auth.js'

const router = Router()

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

router.get('/', authenticate, authorize('coach', 'head_coach', 'admin'), async (req, res) => {
  try {
    const where = req.query.ageGroup ? { ageGroup: req.query.ageGroup } : {}
    const students = await prisma.student.findMany({
      where,
      include: { package: true },
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
      include: { package: true },
      orderBy: { createdAt: 'asc' },
    })
    if (!student) return res.status(404).json({ error: 'Data anak tidak ditemukan' })
    res.json(student)
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
      include: { package: true, payments: { orderBy: { createdAt: 'desc' } }, assessments: { orderBy: [{ year: 'desc' }, { month: 'desc' }] } },
    })
    if (!student) return res.status(404).json({ error: 'Siswa tidak ditemukan' })
    res.json(student)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:id', authenticate, authorize('head_coach', 'admin'), async (req, res) => {
  const { fullName, dateOfBirth, position, ageGroup, address, parentName, parentPhone, photo, status } = req.body
  try {
    const student = await prisma.student.update({
      where: { id: req.params.id },
      data: {
        fullName, position, ageGroup, address, parentName, parentPhone, photo, status,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      },
    })
    res.json(student)
  } catch (err) {
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
    await prisma.student.delete({ where: { id: req.params.id } })
    res.json({ message: 'Deleted' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
