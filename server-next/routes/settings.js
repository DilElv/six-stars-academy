import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { authenticate, authorize } from '../middleware/auth.js'

const router = Router()

const DEFAULTS = {
  registrationFee: 750000,
  ssbName: 'SixStars Academy Indonesia',
  ssbAddress: '',
  ssbPhone: '',
  ssbEmail: '',
}

router.get('/', async (req, res) => {
  try {
    const row = await prisma.cmsContent.findFirst({ where: { section: 'settings' } })
    res.json({ ...DEFAULTS, ...(row?.content || {}) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const existing = await prisma.cmsContent.findFirst({ where: { section: 'settings' } })
    const row = existing
      ? await prisma.cmsContent.update({ where: { id: existing.id }, data: { content: req.body } })
      : await prisma.cmsContent.create({ data: { section: 'settings', content: req.body } })
    res.json(row.content)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
