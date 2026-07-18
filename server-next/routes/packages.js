import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { authenticate, authorize } from '../middleware/auth.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const packages = await prisma.package.findMany({ where: { status: 'active' }, orderBy: [{ durationMonths: 'asc' }, { sessionsPerWeek: 'asc' }] })
    res.json(packages)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/all', authenticate, authorize('admin'), async (req, res) => {
  try {
    const packages = await prisma.package.findMany({ orderBy: [{ durationMonths: 'asc' }, { sessionsPerWeek: 'asc' }] })
    res.json(packages)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  const { price, status } = req.body
  try {
    const pkg = await prisma.package.update({ where: { id: req.params.id }, data: { price, status } })
    res.json(pkg)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
