import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.get('/', authenticate, async (req, res) => {
  try {
    const where = req.query.branchId ? { branchId: req.query.branchId } : {}
    const fields = await prisma.field.findMany({
      where,
      include: { branch: { select: { name: true, code: true } } },
      orderBy: { name: 'asc' },
    })
    res.json(fields)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
