import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { notifyRole } from '../lib/notify.js'
import { getUserBranchIds, assertBranchAccess } from '../lib/branchAccess.js'

const router = Router()

router.get('/', authenticate, authorize('coach', 'head_coach', 'admin', 'parent'), async (req, res) => {
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

    if (req.user.role === 'coach') {
      const branchIds = await getUserBranchIds(req.user.id)
      where.branchId = req.query.branchId && branchIds.includes(req.query.branchId) ? req.query.branchId : '__none__'
    }

    const sessions = await prisma.trainingSession.findMany({
      where,
      include: {
        coach: { select: { name: true } },
        field: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true, code: true } },
      },
      orderBy: { date: 'desc' },
    })
    res.json(sessions)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', authenticate, authorize('coach', 'head_coach', 'admin'), async (req, res) => {
  const { ageGroups, date, topicTitle, topicDescription, objective, duration, equipment, fieldId, branchId } = req.body
  try {
    if (!Array.isArray(ageGroups) || ageGroups.length === 0) return res.status(400).json({ error: 'Pilih minimal satu kelompok umur' })
    const coach = await prisma.user.findUnique({ where: { id: req.user.id } })

    if (req.user.role === 'coach') {
      if (!branchId) {
        return res.status(400).json({ error: 'Pilih cabang terlebih dahulu' })
      }
      await assertBranchAccess(req.user.id, branchId)
      if (fieldId) {
        const field = await prisma.field.findUnique({ where: { id: fieldId } })
        if (!field || field.branchId !== branchId) {
          return res.status(403).json({ error: 'Lapangan tidak sesuai dengan cabang Anda' })
        }
      }
    }

    const ageGroup = ageGroups.join(',')
    const session = await prisma.trainingSession.create({
      data: {
        coachId: req.user.id,
        ageGroup,
        date: new Date(date),
        topicTitle,
        topicDescription,
        objective,
        duration,
        equipment,
        fieldId: fieldId || null,
        branchId: branchId || null,
      },
    })

    for (const role of ['head_coach', 'admin']) {
      await notifyRole(role, {
        type: 'training_session_created',
        title: 'Topik Latihan Baru',
        message: `${coach?.name || 'Coach'} membuat topik "${topicTitle}" untuk kelompok ${ageGroup}.`,
      })
    }

    res.status(201).json(session)
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:id', authenticate, authorize('coach', 'head_coach', 'admin'), async (req, res) => {
  const { ageGroups, date, topicTitle, topicDescription, objective, duration, equipment, fieldId, branchId } = req.body
  try {
    if (req.user.role === 'coach' && branchId) {
      await assertBranchAccess(req.user.id, branchId)
    }
    if (req.user.role === 'coach' && fieldId) {
      const field = await prisma.field.findUnique({ where: { id: fieldId } })
      const branchIds = await getUserBranchIds(req.user.id)
      if (!field || !branchIds.includes(field.branchId)) {
        return res.status(403).json({ error: 'Lapangan tidak sesuai dengan cabang Anda' })
      }
    }

    const session = await prisma.trainingSession.update({
      where: { id: req.params.id },
      data: {
        ageGroup: Array.isArray(ageGroups) ? ageGroups.join(',') : undefined,
        date: date ? new Date(date) : undefined,
        topicTitle,
        topicDescription,
        objective,
        duration,
        equipment,
        fieldId: fieldId !== undefined ? (fieldId || null) : undefined,
        branchId: branchId || undefined,
      },
    })
    res.json(session)
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message })
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
