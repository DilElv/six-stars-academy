import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { runBpjsBilling, getBpjsStatus } from '../lib/bpjsBilling.js'

const router = Router()

const DEFAULTS = {
  registrationFee: 750000,
  ssbName: 'SixStars Academy Indonesia',
  ssbAddress: '',
  ssbPhone: '',
  ssbEmail: 'sixstarsindonesiaacademy@gmail.com',
  ssbInstagram: '@sisxstarsacademy',
  // Nomor WhatsApp tujuan tombol "Chat Admin" di dashboard pengguna.
  waAdminNumber: '6285215021228',
  // Billing BPJS otomatis: nominal global per bulan untuk semua anak terdaftar.
  bpjsEnabled: false,
  bpjsAmount: 0,
  bpjsDay: 1,
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

// Ringkasan billing BPJS periode berjalan (atau periode tertentu via query).
router.get('/bpjs/status', authenticate, authorize('admin'), async (req, res) => {
  try {
    res.json(await getBpjsStatus({ month: req.query.month, year: req.query.year }))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Jalankan penagihan BPJS sekarang (idempoten — anak yang sudah tertagih
// periode itu dilewati). Bisa dipakai untuk bulan lain lewat body.
router.post('/bpjs/run', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { month, year, amount, studentIds } = req.body || {}
    res.json(await runBpjsBilling({ month, year, amount, studentIds }))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
