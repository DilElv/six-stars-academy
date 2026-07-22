import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { notifyRole, notifyUser } from '../lib/notify.js'

const router = Router()

router.get('/', authenticate, authorize('coach', 'head_coach', 'admin'), async (req, res) => {
  try {
    const where = {}
    if (req.query.branchId) where.branchId = req.query.branchId
    if (req.query.ageGroup) {
      const ag = req.query.ageGroup
      where.OR = [
        { ageGroup: ag },
        { ageGroup: { startsWith: ag + ',' } },
        { ageGroup: { endsWith: ',' + ag } },
        { ageGroup: { contains: ',' + ag + ',' } },
      ]
    }
    if (req.query.status) where.status = req.query.status

    if (req.user.role === 'coach') {
      const user = await prisma.user.findUnique({ where: { id: req.user.id } })
      if (user?.branchId) where.branchId = user.branchId
    }

    const events = await prisma.event.findMany({
      where,
      include: {
        createdBy: { select: { name: true } },
        branch: { select: { name: true, code: true } },
        _count: { select: { participants: true } },
      },
      orderBy: { date: 'desc' },
    })
    res.json(events)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/me', authenticate, authorize('parent'), async (req, res) => {
  try {
    const student = await prisma.student.findFirst({ where: { userId: req.user.id } })
    if (!student) return res.json([])

    const participants = await prisma.eventParticipant.findMany({
      where: { studentId: student.id },
      include: {
        event: {
          include: {
            branch: { select: { name: true, code: true } },
            createdBy: { select: { name: true } },
          },
        },
      },
      orderBy: { event: { date: 'desc' } },
    })
    res.json(participants)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/:id', authenticate, authorize('coach', 'head_coach', 'admin'), async (req, res) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: {
        createdBy: { select: { name: true, email: true } },
        branch: { select: { name: true, code: true } },
        participants: {
          include: {
            student: {
              select: { id: true, fullName: true, studentId: true, ageGroup: true, position: true, photo: true, parentName: true, parentPhone: true },
            },
          },
          orderBy: { addedAt: 'desc' },
        },
      },
    })
    if (!event) return res.status(404).json({ error: 'Event tidak ditemukan' })
    res.json(event)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', authenticate, authorize('head_coach', 'admin'), async (req, res) => {
  const { title, description, type, ageGroup, date, registrationDeadline, location, fee, status, branchId } = req.body
  try {
    const event = await prisma.event.create({
      data: {
        title, description, type, ageGroup,
        date: new Date(date),
        registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : null,
        location, fee: fee || 0, status: status || 'open',
        branchId: branchId || null,
        createdById: req.user.id,
      },
    })

    const creator = await prisma.user.findUnique({ where: { id: req.user.id } })
    await notifyRole('admin', {
      type: 'event_created',
      title: 'Event Baru',
      message: `${creator?.name || 'Head Coach'} membuat event "${title}" (${type}).`,
      link: '/admin/event',
    })

    res.status(201).json(event)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:id', authenticate, authorize('head_coach', 'admin'), async (req, res) => {
  const { title, description, type, ageGroup, date, registrationDeadline, location, fee, status, branchId } = req.body
  try {
    const event = await prisma.event.update({
      where: { id: req.params.id },
      data: {
        title, description, type, ageGroup,
        date: date ? new Date(date) : undefined,
        registrationDeadline: registrationDeadline !== undefined ? (registrationDeadline ? new Date(registrationDeadline) : null) : undefined,
        location, fee, status,
        branchId: branchId !== undefined ? (branchId || null) : undefined,
      },
    })
    res.json(event)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:id', authenticate, authorize('head_coach', 'admin'), async (req, res) => {
  try {
    await prisma.event.delete({ where: { id: req.params.id } })
    res.json({ message: 'Event dihapus' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/:id/participants', authenticate, authorize('head_coach', 'admin'), async (req, res) => {
  const { studentId } = req.body
  if (!studentId) return res.status(400).json({ error: 'studentId wajib diisi' })
  try {
    const event = await prisma.event.findUnique({ where: { id: req.params.id } })
    if (!event) return res.status(404).json({ error: 'Event tidak ditemukan' })

    const student = await prisma.student.findUnique({ where: { id: studentId }, include: { user: true } })
    if (!student) return res.status(404).json({ error: 'Siswa tidak ditemukan' })

    const existing = await prisma.eventParticipant.findUnique({
      where: { eventId_studentId: { eventId: req.params.id, studentId } },
    })
    if (existing) return res.status(400).json({ error: 'Siswa sudah terdaftar di event ini' })

    const participant = await prisma.eventParticipant.create({
      data: { eventId: req.params.id, studentId },
    })

    await notifyUser(student.userId, {
      type: 'event_added',
      title: 'Event Baru',
      message: `Ananda ${student.fullName} direkomendasikan untuk event "${event.title}".`,
      link: '/dashboard',
    })

    res.status(201).json(participant)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:id/participants/:studentId', authenticate, authorize('head_coach', 'admin'), async (req, res) => {
  try {
    const participant = await prisma.eventParticipant.findUnique({
      where: { eventId_studentId: { eventId: req.params.id, studentId: req.params.studentId } },
      include: { event: true, student: { include: { user: true } } },
    })
    if (!participant) return res.status(404).json({ error: 'Peserta tidak ditemukan' })

    await prisma.eventParticipant.delete({
      where: { eventId_studentId: { eventId: req.params.id, studentId: req.params.studentId } },
    })

    await notifyUser(participant.student.userId, {
      type: 'event_removed',
      title: 'Event Dibatalkan',
      message: `Ananda ${participant.student.fullName} tidak lagi direkomendasikan untuk event "${participant.event.title}".`,
      link: '/dashboard',
    })

    res.json({ message: 'Peserta dihapus' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:id/participants/:studentId', authenticate, authorize('admin'), async (req, res) => {
  const { paymentStatus, status } = req.body
  try {
    const participant = await prisma.eventParticipant.update({
      where: { eventId_studentId: { eventId: req.params.id, studentId: req.params.studentId } },
      data: {
        paymentStatus: paymentStatus || undefined,
        status: status || undefined,
      },
      include: { event: true, student: { include: { user: true } } },
    })

    if (paymentStatus === 'paid') {
      await notifyUser(participant.student.userId, {
        type: 'payment_confirmed',
        title: 'Pembayaran Dikonfirmasi',
        message: `Pembayaran event "${participant.event.title}" untuk ${participant.student.fullName} telah dikonfirmasi.`,
        link: '/dashboard',
      })
    }

    res.json(participant)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
