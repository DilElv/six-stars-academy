import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { runBpjsBilling, getBpjsStatus, listBpjsStudents, setBpjsExempt } from '../lib/bpjsBilling.js'

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

// Simpan hanya pengaturan BPJS (dipakai halaman BPJS admin & head coach).
// Dipisah dari PUT / (yang mengganti seluruh blob pengaturan) supaya head coach
// dapat mengubah setelan BPJS tanpa bisa menimpa setelan lain.
router.put('/bpjs', authenticate, authorize('admin', 'head_coach'), async (req, res) => {
  try {
    const { bpjsEnabled, bpjsAmount, bpjsDay } = req.body || {}
    const existing = await prisma.cmsContent.findFirst({ where: { section: 'settings' } })
    const content = { ...(existing?.content || {}) }
    if (bpjsEnabled !== undefined) content.bpjsEnabled = !!bpjsEnabled
    if (bpjsAmount !== undefined) content.bpjsAmount = Math.max(0, Math.round(Number(bpjsAmount) || 0))
    if (bpjsDay !== undefined) content.bpjsDay = Math.min(28, Math.max(1, Math.round(Number(bpjsDay) || 1)))
    const row = existing
      ? await prisma.cmsContent.update({ where: { id: existing.id }, data: { content } })
      : await prisma.cmsContent.create({ data: { section: 'settings', content } })
    res.json(row.content)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Ringkasan billing BPJS periode berjalan (atau periode tertentu via query).
router.get('/bpjs/status', authenticate, authorize('admin', 'head_coach'), async (req, res) => {
  try {
    res.json(await getBpjsStatus({ month: req.query.month, year: req.query.year }))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Semua anak + status BPJS (dikecualikan / sudah ditagih) untuk periode terpilih.
router.get('/bpjs/students', authenticate, authorize('admin', 'head_coach'), async (req, res) => {
  try {
    res.json(await listBpjsStudents({ month: req.query.month, year: req.query.year }))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Atur anak yang dikecualikan dari tagihan BPJS (exemptIds) atau ditagih lagi (includeIds).
router.put('/bpjs/students', authenticate, authorize('admin', 'head_coach'), async (req, res) => {
  try {
    const { exemptIds, includeIds } = req.body || {}
    if (exemptIds !== undefined && !Array.isArray(exemptIds)) return res.status(400).json({ error: 'exemptIds harus berupa daftar' })
    if (includeIds !== undefined && !Array.isArray(includeIds)) return res.status(400).json({ error: 'includeIds harus berupa daftar' })
    res.json(await setBpjsExempt({ exemptIds: exemptIds || [], includeIds: includeIds || [] }))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Jalankan penagihan BPJS sekarang (idempoten — anak yang sudah tertagih
// periode itu dilewati). Bisa dipakai untuk bulan lain lewat body.
router.post('/bpjs/run', authenticate, authorize('admin', 'head_coach'), async (req, res) => {
  try {
    const { month, year, amount, studentIds } = req.body || {}
    res.json(await runBpjsBilling({ month, year, amount, studentIds }))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
