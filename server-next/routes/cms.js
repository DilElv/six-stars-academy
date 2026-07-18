import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { authenticate, authorize } from '../middleware/auth.js'

const router = Router()

router.get('/public', async (req, res) => {
  try {
    const rows = await prisma.cmsContent.findMany()
    const bySection = {}
    for (const row of rows) bySection[row.section] = row.content
    res.json(bySection)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/public/:section', async (req, res) => {
  try {
    const row = await prisma.cmsContent.findFirst({ where: { section: req.params.section } })
    res.json({ data: row?.content ?? null })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:section', authenticate, authorize('admin'), async (req, res) => {
  try {
    const existing = await prisma.cmsContent.findFirst({ where: { section: req.params.section } })
    const row = existing
      ? await prisma.cmsContent.update({ where: { id: existing.id }, data: { content: req.body.data } })
      : await prisma.cmsContent.create({ data: { section: req.params.section, content: req.body.data } })
    res.json(row)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
