import { Router } from 'express'
import pkg from '@prisma/client'
import prisma from '../lib/prisma.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { getUserBranchIds } from '../lib/branchAccess.js'
import { sanitizeCustomFields, productFields, orderedNumbers, FULFILLMENT, NUMBER_MIN, NUMBER_MAX } from '../lib/merch.js'

const { Prisma } = pkg
const router = Router()

// Normalisasi input produk. `stock` kosong/null berarti stok tak terbatas.
function parseProductInput(body, { partial = false } = {}) {
  const data = {}
  if (body.name !== undefined) {
    if (!body.name?.trim()) return { error: 'Nama produk wajib diisi' }
    data.name = body.name.trim()
  } else if (!partial) {
    return { error: 'Nama produk wajib diisi' }
  }
  if (body.description !== undefined) data.description = body.description?.trim() || null
  if (body.category !== undefined) data.category = body.category?.trim() || 'Lainnya'
  if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl || null
  if (body.isActive !== undefined) data.isActive = !!body.isActive
  if (body.customFields !== undefined) {
    const parsed = sanitizeCustomFields(body.customFields)
    if (parsed.error) return { error: parsed.error }
    data.customFields = parsed.fields === null ? Prisma.DbNull : parsed.fields
  }
  if (body.price !== undefined) {
    const price = Math.round(Number(body.price))
    if (!Number.isSafeInteger(price) || price < 0) return { error: 'Harga tidak valid' }
    data.price = price
  } else if (!partial) {
    return { error: 'Harga tidak valid' }
  }
  if (body.stock !== undefined) {
    if (body.stock === null || body.stock === '') {
      data.stock = null
    } else {
      const stock = Math.round(Number(body.stock))
      if (!Number.isSafeInteger(stock) || stock < 0) return { error: 'Stok tidak valid' }
      data.stock = stock
    }
  }
  return { data }
}

// Publik (dipakai katalog parent): hanya produk aktif.
router.get('/', async (_req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    })
    res.json(products)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/all', authenticate, authorize('admin', 'head_coach'), async (_req, res) => {
  try {
    const products = await prisma.product.findMany({ orderBy: [{ category: 'asc' }, { name: 'asc' }] })
    res.json(products)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Daftar nomor untuk field angka bernomor-unik (nomor punggung). Parent hanya
// melihat nomor yang terpakai; admin/head coach juga melihat siapa pemesannya.
router.get('/:id/numbers', authenticate, async (req, res) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } })
    if (!product) return res.status(404).json({ error: 'Produk tidak ditemukan' })
    const staff = req.user.role === 'admin' || req.user.role === 'head_coach'
    const fields = []
    for (const field of productFields(product)) {
      if (field.type !== 'number' || !field.unique) continue
      const ordered = await orderedNumbers(prisma, product.id, field.key)
      const blocked = field.blockedNumbers || []
      fields.push({
        key: field.key,
        label: field.label,
        min: NUMBER_MIN,
        max: NUMBER_MAX,
        blocked,
        ordered: ordered.map((o) => ({ number: o.number, paid: o.paid, ...(staff ? { studentName: o.studentName } : {}) })),
        taken: [...new Set([...blocked, ...ordered.map((o) => o.number)])].sort((a, b) => a - b),
      })
    }
    res.json({ productId: product.id, fields })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Tutup/buka nomor secara manual (mis. nomor milik pemain lama).
router.put('/:id/blocked-numbers', authenticate, authorize('admin', 'head_coach'), async (req, res) => {
  const { fieldKey, numbers } = req.body
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } })
    if (!product) return res.status(404).json({ error: 'Produk tidak ditemukan' })
    const fields = productFields(product)
    const field = fields.find((f) => f.key === fieldKey && f.type === 'number')
    if (!field) return res.status(400).json({ error: 'Opsi nomor tidak ditemukan' })
    if (!Array.isArray(numbers)) return res.status(400).json({ error: 'Daftar nomor tidak valid' })
    const next = fields.map((f) => (f.key === fieldKey
      ? { ...f, blockedNumbers: [...new Set(numbers.map((n) => Math.round(Number(n))).filter((n) => Number.isInteger(n) && n >= NUMBER_MIN && n <= NUMBER_MAX))].sort((a, b) => a - b) }
      : f))
    const updated = await prisma.product.update({ where: { id: product.id }, data: { customFields: next } })
    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Pesanan merchandise (admin & head coach): siapa yang memesan, isian custom,
// status bayar, dan progres pengerjaan. Pesanan yang dibatalkan tidak ditampilkan.
router.get('/orders/list', authenticate, authorize('admin', 'head_coach'), async (req, res) => {
  try {
    const where = { type: 'merchandise', status: { in: ['open', 'checked_out'] } }
    if (req.query.productId) where.productId = req.query.productId
    if (req.user.role === 'head_coach') {
      const branchIds = await getUserBranchIds(req.user.id)
      if (branchIds.length) where.student = { branchId: { in: branchIds } }
    }
    const items = await prisma.cartItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        student: { select: { id: true, fullName: true, parentName: true, parentPhone: true, ageGroup: true, branch: { select: { code: true, name: true } } } },
        payment: { select: { id: true, status: true, paidAt: true, paymentMethod: true } },
        product: { select: { id: true, name: true } },
      },
    })
    const orders = items.map((i) => {
      const paid = i.payment?.status === 'success'
      return {
        id: i.id,
        createdAt: i.createdAt,
        productId: i.productId,
        productName: i.product?.name || i.metadata?.productName || i.label,
        label: i.label,
        amount: i.amount,
        custom: Array.isArray(i.metadata?.custom) ? i.metadata.custom : [],
        note: typeof i.metadata?.note === 'string' ? i.metadata.note : null,
        student: i.student,
        paymentStatus: paid ? 'paid' : i.status === 'checked_out' ? 'awaiting' : 'unpaid',
        paidAt: i.payment?.paidAt || null,
        paymentMethod: i.payment?.paymentMethod || null,
        fulfillment: FULFILLMENT.includes(i.metadata?.fulfillment) ? i.metadata.fulfillment : 'baru',
      }
    })
    res.json({
      orders,
      summary: {
        total: orders.length,
        paid: orders.filter((o) => o.paymentStatus === 'paid').length,
        unpaid: orders.filter((o) => o.paymentStatus !== 'paid').length,
        revenue: orders.filter((o) => o.paymentStatus === 'paid').reduce((s, o) => s + o.amount, 0),
      },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.patch('/orders/:itemId/fulfillment', authenticate, authorize('admin', 'head_coach'), async (req, res) => {
  const { fulfillment } = req.body
  if (!FULFILLMENT.includes(fulfillment)) return res.status(400).json({ error: 'Status pesanan tidak valid' })
  try {
    const item = await prisma.cartItem.findUnique({ where: { id: req.params.itemId } })
    if (!item || item.type !== 'merchandise') return res.status(404).json({ error: 'Pesanan tidak ditemukan' })
    const metadata = { ...(item.metadata && typeof item.metadata === 'object' ? item.metadata : {}), fulfillment }
    await prisma.cartItem.update({ where: { id: item.id }, data: { metadata } })
    res.json({ ok: true, fulfillment })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', authenticate, authorize('admin', 'head_coach'), async (req, res) => {
  const { data, error } = parseProductInput(req.body)
  if (error) return res.status(400).json({ error })
  try {
    const product = await prisma.product.create({ data })
    res.status(201).json(product)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:id', authenticate, authorize('admin', 'head_coach'), async (req, res) => {
  const { data, error } = parseProductInput(req.body, { partial: true })
  if (error) return res.status(400).json({ error })
  try {
    const product = await prisma.product.update({ where: { id: req.params.id }, data })
    res.json(product)
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Produk tidak ditemukan' })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:id', authenticate, authorize('admin', 'head_coach'), async (req, res) => {
  try {
    const used = await prisma.cartItem.count({ where: { productId: req.params.id } })
    if (used > 0) {
      // Sudah pernah masuk keranjang/pembayaran: jangan hapus supaya riwayat
      // tetap utuh — cukup nonaktifkan agar hilang dari katalog.
      const product = await prisma.product.update({ where: { id: req.params.id }, data: { isActive: false } })
      return res.json({ message: 'Produk dinonaktifkan (sudah pernah dibeli)', product })
    }
    await prisma.product.delete({ where: { id: req.params.id } })
    res.json({ message: 'Deleted' })
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Produk tidak ditemukan' })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
