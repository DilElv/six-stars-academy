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
      select: { id: true, name: true, branches: { select: { branch: { select: { name: true, code: true } } } } },
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

    // Same-branch, same-date is a double-booking — the DB unique index
    // catches races too, but checking here gives a specific error message
    // instead of a generic constraint-violation 500.
    const existing = await prisma.schedule.findMany({
      where: { branchId, date: { in: dates.map((d) => new Date(d)) } },
      select: { date: true },
    })
    if (existing.length > 0) {
      const clash = existing[0].date.toISOString().slice(0, 10)
      return res.status(409).json({ error: `Cabang ini sudah punya jadwal di tanggal ${clash}` })
    }

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
    if (err.code === 'P2002') return res.status(409).json({ error: 'Cabang ini sudah punya jadwal di salah satu tanggal yang dipilih' })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:id', authenticate, authorize('admin', 'head_coach'), async (req, res) => {
  const { date, startTime, endTime, location, coachId, status, branchId } = req.body
  try {
    if (branchId !== undefined && !branchId) return res.status(400).json({ error: 'Cabang wajib dipilih — jadwal tanpa cabang tidak akan muncul di halaman head coach/coach' })
    await assertHeadCoach(coachId)

    if (date !== undefined) {
      const current = await prisma.schedule.findUnique({ where: { id: req.params.id } })
      if (!current) return res.status(404).json({ error: 'Jadwal tidak ditemukan' })
      const effectiveBranch = branchId || current.branchId
      const clash = await prisma.schedule.findFirst({
        where: { branchId: effectiveBranch, date: new Date(date), NOT: { id: req.params.id } },
      })
      if (clash) return res.status(409).json({ error: 'Cabang ini sudah punya jadwal di tanggal tersebut' })
    }

    const data = { startTime, endTime, location, coachId: coachId || null, status, branchId: branchId || undefined }
    if (date !== undefined) data.date = new Date(date)
    const schedule = await prisma.schedule.update({ where: { id: req.params.id }, data })
    res.json(schedule)
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message })
    if (err.code === 'P2002') return res.status(409).json({ error: 'Cabang ini sudah punya jadwal di tanggal tersebut' })
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
