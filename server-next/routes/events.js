import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { notifyRole, notifyUser } from '../lib/notify.js'

const router = Router()

async function setEventBranches(tx, eventId, branchIds) {
  await tx.eventBranch.deleteMany({ where: { eventId } })
  if (Array.isArray(branchIds) && branchIds.length > 0) {
    await tx.eventBranch.createMany({ data: branchIds.map((branchId) => ({ eventId, branchId })) })
  }
}

router.get('/', authenticate, authorize('coach', 'head_coach', 'admin'), async (req, res) => {
  try {
    const where = {}
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

    let branchScopeId = req.query.branchId || null
    if (req.user.role === 'coach') {
      const user = await prisma.user.findUnique({ where: { id: req.user.id } })
      branchScopeId = user?.branchId || '__none__'
    }
    if (branchScopeId) {
      where.OR = [
        ...(where.OR || []),
        { branches: { none: {} } },
        { branches: { some: { branchId: branchScopeId } } },
      ]
    }

    const events = await prisma.event.findMany({
      where,
      include: {
        createdBy: { select: { name: true } },
        branches: { include: { branch: { select: { id: true, name: true, code: true } } } },
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
            branches: { include: { branch: { select: { name: true, code: true } } } },
            createdBy: { select: { name: true } },
          },
        },
        payment: true,
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
        branches: { include: { branch: { select: { id: true, name: true, code: true } } } },
        participants: {
          include: {
            student: {
              select: { id: true, fullName: true, studentId: true, ageGroup: true, position: true, photo: true, parentName: true, parentPhone: true, branchId: true },
            },
            payment: true,
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
  const { title, description, type, ageGroup, date, registrationDeadline, location, fee, status, branchIds } = req.body
  try {
    const event = await prisma.$transaction(async (tx) => {
      const created = await tx.event.create({
        data: {
          title, description, type, ageGroup,
          date: new Date(date),
          registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : null,
          location, fee: fee || 0, status: status || 'open',
          createdById: req.user.id,
        },
      })
      await setEventBranches(tx, created.id, branchIds)
      return created
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
  const { title, description, type, ageGroup, date, registrationDeadline, location, fee, status, branchIds } = req.body
  try {
    const event = await prisma.$transaction(async (tx) => {
      const updated = await tx.event.update({
        where: { id: req.params.id },
        data: {
          title, description, type, ageGroup,
          date: date ? new Date(date) : undefined,
          registrationDeadline: registrationDeadline !== undefined ? (registrationDeadline ? new Date(registrationDeadline) : null) : undefined,
          location, fee, status,
        },
      })
      if (branchIds !== undefined) await setEventBranches(tx, req.params.id, branchIds)
      return updated
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
    const event = await prisma.event.findUnique({ where: { id: req.params.id }, include: { branches: true } })
    if (!event) return res.status(404).json({ error: 'Event tidak ditemukan' })

    const student = await prisma.student.findUnique({ where: { id: studentId }, include: { user: true } })
    if (!student) return res.status(404).json({ error: 'Siswa tidak ditemukan' })

    if (event.branches.length > 0 && !event.branches.some((b) => b.branchId === student.branchId)) {
      return res.status(400).json({ error: 'Siswa ini bukan dari cabang yang dituju event ini' })
    }

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

// Manual payment override — used when a parent pays cash instead of via
// Rintisan, or when a head-coach/admin needs to correct a payment mistake.
// Setting paymentStatus to 'paid' requires a paymentMethod (e.g. 'cash') and
// upserts a real Payment row so this stays consistent with what the Rintisan
// webhook path already produces (applyPaymentSuccess in paymentHelpers.js) —
// previously this only flipped EventParticipant.paymentStatus in isolation,
// leaving admin's payment view out of sync with manually-confirmed events.
router.put('/:id/participants/:studentId', authenticate, authorize('head_coach', 'admin'), async (req, res) => {
  const { paymentStatus, status, paymentMethod } = req.body
  if (paymentStatus === 'paid' && !paymentMethod) {
    return res.status(400).json({ error: 'Metode pembayaran wajib dipilih saat mengubah status ke lunas' })
  }
  try {
    const participant = await prisma.$transaction(async (tx) => {
      const current = await tx.eventParticipant.findUnique({
        where: { eventId_studentId: { eventId: req.params.id, studentId: req.params.studentId } },
        include: { event: true, student: { include: { user: true } }, payment: true },
      })
      if (!current) throw Object.assign(new Error('Peserta tidak ditemukan'), { status: 404 })

      if (paymentStatus !== undefined) {
        if (paymentStatus === 'paid') {
          if (current.payment) {
            await tx.payment.update({
              where: { id: current.payment.id },
              data: { status: 'success', paymentMethod, paidAt: new Date() },
            })
          } else {
            await tx.payment.create({
              data: {
                studentId: current.studentId,
                eventParticipantId: current.id,
                amount: current.event.fee,
                totalAmount: current.event.fee,
                paymentType: 'event',
                status: 'success',
                paymentMethod,
                paidAt: new Date(),
              },
            })
          }
        } else if (current.payment) {
          await tx.payment.update({ where: { id: current.payment.id }, data: { status: 'pending', paidAt: null } })
        }
      }

      return tx.eventParticipant.update({
        where: { eventId_studentId: { eventId: req.params.id, studentId: req.params.studentId } },
        data: { paymentStatus: paymentStatus || undefined, status: status || undefined },
        include: { event: true, student: { include: { user: true } }, payment: true },
      })
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
    if (err.status) return res.status(err.status).json({ error: err.message })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
