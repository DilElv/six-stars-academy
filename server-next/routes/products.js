import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { authenticate, authorize } from '../middleware/auth.js'

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

router.get('/all', authenticate, authorize('admin'), async (_req, res) => {
  try {
    const products = await prisma.product.findMany({ orderBy: [{ category: 'asc' }, { name: 'asc' }] })
    res.json(products)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', authenticate, authorize('admin'), async (req, res) => {
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

router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
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

router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
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
