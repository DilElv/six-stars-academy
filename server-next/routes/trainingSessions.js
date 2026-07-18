import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { notifyRole } from '../lib/notify.js'

const router = Router()

router.get('/', authenticate, authorize('coach', 'head_coach', 'admin'), async (req, res) => {
  try {
    const where = req.query.ageGroup ? { ageGroup: req.query.ageGroup } : {}
    const sessions = await prisma.trainingSession.findMany({
      where,
      include: { coach: { select: { name: true } } },
      orderBy: { date: 'desc' },
    })
    res.json(sessions)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', authenticate, authorize('coach', 'head_coach', 'admin'), async (req, res) => {
  const { ageGroup, date, topicTitle, topicDescription, objective, duration, equipment } = req.body
  try {
    const session = await prisma.trainingSession.create({
      data: { coachId: req.user.id, ageGroup, date: new Date(date), topicTitle, topicDescription, objective, duration, equipment },
    })

    const coach = await prisma.user.findUnique({ where: { id: req.user.id } })
    for (const role of ['head_coach', 'admin']) {
      await notifyRole(role, {
        type: 'training_session_created',
        title: 'Topik Latihan Baru',
        message: `${coach?.name || 'Coach'} membuat topik "${topicTitle}" untuk kelompok ${ageGroup}.`,
      })
    }

    res.status(201).json(session)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:id', authenticate, authorize('coach', 'head_coach', 'admin'), async (req, res) => {
  const { ageGroup, date, topicTitle, topicDescription, objective, duration, equipment } = req.body
  try {
    const session = await prisma.trainingSession.update({
      where: { id: req.params.id },
      data: { ageGroup, date: date ? new Date(date) : undefined, topicTitle, topicDescription, objective, duration, equipment },
    })
    res.json(session)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:id', authenticate, authorize('coach', 'head_coach', 'admin'), async (req, res) => {
  try {
    await prisma.trainingSession.delete({ where: { id: req.params.id } })
    res.json({ message: 'Deleted' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
