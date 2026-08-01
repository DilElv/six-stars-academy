import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { authenticate, authorize } from '../middleware/auth.js'

const router = Router()

async function assertHeadCoach(coachId) {
  if (!coachId) return
  const coach = await prisma.user.findUnique({ where: { id: coachId } })
  if (!coach || coach.role !== 'head_coach') {
    throw Object.assign(new Error('Coach yang dipilih harus head coach'), { status: 400 })
  }
}

// Narrow, read-only list for the "assign a coach" dropdown — head_coach
// users need this too (they create schedules for their own branch), but
// the full user-management endpoint under /admin/users is admin-only, so
// this can't reuse that one.
router.get('/head-coaches', authenticate, authorize('admin', 'head_coach'), async (req, res) => {
  try {
    const coaches = await prisma.user.findMany({
      where: { role: 'head_coach' },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })
    res.json(coaches)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/', authenticate, async (req, res) => {
  try {
    const where = {}
    if (req.query.branchId) where.branchId = req.query.branchId
    const schedules = await prisma.schedule.findMany({
      where,
      include: { coach: { select: { name: true } }, branch: true },
      orderBy: { date: 'asc' },
    })
    res.json(schedules)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', authenticate, authorize('admin', 'head_coach'), async (req, res) => {
  const { dates, startTime, endTime, location, coachId, branchId } = req.body
  try {
    if (!Array.isArray(dates) || dates.length === 0) return res.status(400).json({ error: 'Pilih minimal satu tanggal' })
    if (!branchId) return res.status(400).json({ error: 'Cabang wajib dipilih — jadwal tanpa cabang tidak akan muncul di halaman head coach/coach' })
    await assertHeadCoach(coachId)

    const schedules = await prisma.$transaction(
      dates.map((date) =>
        prisma.schedule.create({
          data: { date: new Date(date), startTime, endTime, location, coachId: coachId || null, branchId },
        })
      )
    )
    res.status(201).json(schedules)
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:id', authenticate, authorize('admin', 'head_coach'), async (req, res) => {
  const { date, startTime, endTime, location, coachId, status, branchId } = req.body
  try {
    if (branchId !== undefined && !branchId) return res.status(400).json({ error: 'Cabang wajib dipilih — jadwal tanpa cabang tidak akan muncul di halaman head coach/coach' })
    await assertHeadCoach(coachId)
    const data = { startTime, endTime, location, coachId: coachId || null, status, branchId: branchId || undefined }
    if (date !== undefined) data.date = new Date(date)
    const schedule = await prisma.schedule.update({ where: { id: req.params.id }, data })
    res.json(schedule)
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message })
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
