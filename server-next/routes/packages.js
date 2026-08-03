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
    // Hidden per-student legacy packages (Package.isCustom, created via
    // POST /students/:id/renew for "anak lama") never show in the general
    // catalog admin manages here.
    const packages = await prisma.package.findMany({ where: { isCustom: false }, orderBy: [{ durationMonths: 'asc' }, { sessionsPerWeek: 'asc' }] })
    res.json(packages)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', authenticate, authorize('admin'), async (req, res) => {
  const { name, durationMonths, sessionsPerWeek, price } = req.body
  try {
    if (!name?.trim()) return res.status(400).json({ error: 'Nama paket wajib diisi' })
    if (!durationMonths || Number(durationMonths) <= 0) return res.status(400).json({ error: 'Durasi (bulan) harus lebih dari 0' })
    if (!sessionsPerWeek || Number(sessionsPerWeek) <= 0) return res.status(400).json({ error: 'Sesi per minggu harus lebih dari 0' })
    if (price === undefined || Number(price) < 0) return res.status(400).json({ error: 'Harga tidak valid' })

    const pkg = await prisma.package.create({
      data: {
        name: name.trim(),
        durationMonths: Math.round(Number(durationMonths)),
        sessionsPerWeek: Math.round(Number(sessionsPerWeek)),
        price: Math.round(Number(price)),
      },
    })
    res.status(201).json(pkg)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  const { name, durationMonths, sessionsPerWeek, price, status } = req.body
  try {
    const data = { price, status }
    if (name !== undefined) data.name = name.trim()
    if (durationMonths !== undefined) data.durationMonths = Math.round(Number(durationMonths))
    if (sessionsPerWeek !== undefined) data.sessionsPerWeek = Math.round(Number(sessionsPerWeek))
    const pkg = await prisma.package.update({ where: { id: req.params.id }, data })
    res.json(pkg)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [studentsUsing, paymentsUsing] = await Promise.all([
      prisma.student.count({ where: { packageId: req.params.id } }),
      prisma.payment.count({ where: { packageId: req.params.id } }),
    ])
    if (studentsUsing > 0 || paymentsUsing > 0) {
      // Deactivate instead of hard-delete when students are on this package
      // (Package.students has no onDelete: Cascade — a hard delete would
      // either fail on the FK or silently orphan those students' packageId).
      const pkg = await prisma.package.update({ where: { id: req.params.id }, data: { status: 'inactive' } })
      return res.json({ message: 'Paket dinonaktifkan (masih dipakai oleh siswa)', package: pkg })
    }
    await prisma.package.delete({ where: { id: req.params.id } })
    res.json({ message: 'Deleted' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
