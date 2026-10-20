import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { authenticate, authorize } from '../middleware/auth.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const branches = await prisma.branch.findMany({ where: { status: 'active' }, orderBy: { name: 'asc' } })
    res.json(branches)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Buat cabang cepat dari form (opsi "ketik manual"): hanya butuh nama, kode dibuat
// otomatis. Nama yang sudah ada (tanpa memperhatikan huruf besar/kecil) dipakai
// ulang supaya tidak terjadi cabang ganda. Head coach otomatis ditugaskan ke
// cabang baru agar langsung terlihat di daftar-daftar yang dibatasi cabang.
router.post('/quick', authenticate, authorize('admin', 'head_coach'), async (req, res) => {
  const name = String(req.body?.name || '').trim().replace(/\s+/g, ' ')
  if (name.length < 2) return res.status(400).json({ error: 'Nama cabang minimal 2 karakter' })
  if (name.length > 60) return res.status(400).json({ error: 'Nama cabang maksimal 60 karakter' })
  try {
    let branch = await prisma.branch.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } })
    if (!branch) {
      const base = (name.split(' ').map((w) => w[0]).join('').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 4)) || 'CAB'
      let code = base
      for (let i = 2; await prisma.branch.findUnique({ where: { code } }); i++) code = `${base}${i}`
      branch = await prisma.branch.create({ data: { name, code } })
    } else if (branch.status !== 'active') {
      branch = await prisma.branch.update({ where: { id: branch.id }, data: { status: 'active' } })
    }
    if (req.user.role === 'head_coach') {
      await prisma.userBranch.upsert({
        where: { userId_branchId: { userId: req.user.id, branchId: branch.id } },
        update: {},
        create: { userId: req.user.id, branchId: branch.id },
      })
    }
    res.status(201).json(branch)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', authenticate, authorize('admin'), async (req, res) => {
  const { name, code } = req.body
  try {
    const branch = await prisma.branch.create({ data: { name, code: code.toUpperCase() } })
    res.status(201).json(branch)
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Kode cabang sudah dipakai' })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  const { name, code, status, registrationFee } = req.body
  try {
    const branch = await prisma.branch.update({
      where: { id: req.params.id },
      data: { name, code: code ? code.toUpperCase() : undefined, status, registrationFee },
    })
    res.json(branch)
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Kode cabang sudah dipakai' })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    await prisma.branch.delete({ where: { id: req.params.id } })
    res.json({ message: 'Deleted' })
  } catch (err) {
    if (err.code === 'P2003') return res.status(400).json({ error: 'Cabang masih dipakai, tidak bisa dihapus' })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
