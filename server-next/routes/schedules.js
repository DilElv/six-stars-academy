import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { authenticate, authorize } from '../middleware/auth.js'

const router = Router()

router.get('/', authenticate, async (req, res) => {
  try {
    const where = req.query.ageGroup ? { ageGroup: req.query.ageGroup } : {}
    const schedules = await prisma.schedule.findMany({
      where,
      include: { coach: { select: { name: true } } },
      orderBy: { ageGroup: 'asc' },
    })
    res.json(schedules)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', authenticate, authorize('admin'), async (req, res) => {
  const { ageGroup, day, startTime, endTime, location, coachId } = req.body
  try {
    const schedule = await prisma.schedule.create({ data: { ageGroup, day, startTime, endTime, location, coachId: coachId || null } })
    res.status(201).json(schedule)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  const { ageGroup, day, startTime, endTime, location, coachId, status } = req.body
  try {
    const schedule = await prisma.schedule.update({
      where: { id: req.params.id },
      data: { ageGroup, day, startTime, endTime, location, coachId: coachId || null, status },
    })
    res.json(schedule)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    await prisma.schedule.delete({ where: { id: req.params.id } })
    res.json({ message: 'Deleted' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
