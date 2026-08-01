import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { authenticate, authorize } from '../middleware/auth.js'

const router = Router()

// Optional ?branchId= overrides each package's `price` with that branch's
// BranchPackage price (set in Pengaturan > Harga Paket) when one exists —
// the single place every picker (Tambah/Edit Anak, Perpanjang Paket) should
// read from so what's shown always matches what actually gets billed.
router.get('/', async (req, res) => {
  try {
    const { branchId } = req.query
    const packages = await prisma.package.findMany({ where: { status: 'active' }, orderBy: [{ durationMonths: 'asc' }, { sessionsPerWeek: 'asc' }] })
    if (!branchId) return res.json(packages)

    const overrides = await prisma.branchPackage.findMany({ where: { branchId } })
    const overrideMap = new Map(overrides.map((o) => [o.packageId, o.price]))
    res.json(packages.map((p) => ({ ...p, price: overrideMap.get(p.id) ?? p.price })))
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
