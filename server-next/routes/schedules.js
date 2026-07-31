import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { authenticate, authorize } from '../middleware/auth.js'

const router = Router()

export const WEEKDAYS = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu']

router.get('/', authenticate, async (req, res) => {
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
    if (req.query.branchId) where.branchId = req.query.branchId
    const schedules = await prisma.schedule.findMany({
      where,
      include: { coach: { select: { name: true } }, branch: true },
      orderBy: { day: 'asc' },
    })
    res.json(schedules)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', authenticate, authorize('admin', 'head_coach'), async (req, res) => {
  const { ageGroups, weekdays, startTime, endTime, location, coachId, branchId } = req.body
  try {
    if (!Array.isArray(weekdays) || weekdays.length === 0) return res.status(400).json({ error: 'Pilih minimal satu hari' })
    if (weekdays.some((d) => !WEEKDAYS.includes(d))) return res.status(400).json({ error: 'Hari tidak valid' })
    const ageGroup = Array.isArray(ageGroups) ? ageGroups.join(',') : ''

    const schedules = await prisma.$transaction(
      weekdays.map((day) =>
        prisma.schedule.create({
          data: { ageGroup, day, startTime, endTime, location, coachId: coachId || null, branchId: branchId || null },
        })
      )
    )
    res.status(201).json(schedules)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:id', authenticate, authorize('admin', 'head_coach'), async (req, res) => {
  const { ageGroups, day, startTime, endTime, location, coachId, status, branchId } = req.body
  try {
    if (day !== undefined && !WEEKDAYS.includes(day)) return res.status(400).json({ error: 'Hari tidak valid' })
    const data = { day, startTime, endTime, location, coachId: coachId || null, status, branchId: branchId !== undefined ? (branchId || null) : undefined }
    if (ageGroups !== undefined) data.ageGroup = Array.isArray(ageGroups) ? ageGroups.join(',') : ''
    const schedule = await prisma.schedule.update({ where: { id: req.params.id }, data })
    res.json(schedule)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:id', authenticate, authorize('admin', 'head_coach'), async (req, res) => {
  try {
    await prisma.schedule.delete({ where: { id: req.params.id } })
    res.json({ message: 'Deleted' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
