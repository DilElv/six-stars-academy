import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { authenticate, authorize } from '../middleware/auth.js'

const router = Router()

router.get('/public', async (req, res) => {
  const { branchId } = req.query
  try {
    const where = branchId ? { branchId } : {}
    const prices = await prisma.branchPackage.findMany({
      where,
      include: { package: true, branch: { select: { name: true, code: true, registrationFee: true } } },
    })
    res.json(prices)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const prices = await prisma.branchPackage.findMany({
      include: { package: true, branch: { select: { name: true, code: true, registrationFee: true } } },
      orderBy: [{ branch: { code: 'asc' } }, { package: { durationMonths: 'asc' } }],
    })
    res.json(prices)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  const { price } = req.body
  try {
    const updated = await prisma.branchPackage.update({
      where: { id: req.params.id },
      data: { price },
    })
    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', authenticate, authorize('admin'), async (req, res) => {
  const { branchId, packageId, price } = req.body
  try {
    const exists = await prisma.branchPackage.findUnique({
      where: { branchId_packageId: { branchId, packageId } },
    })
    if (exists) return res.status(400).json({ error: 'Harga paket untuk cabang ini sudah ada' })
    const bp = await prisma.branchPackage.create({ data: { branchId, packageId, price } })
    res.status(201).json(bp)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
