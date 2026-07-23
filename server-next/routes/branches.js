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
