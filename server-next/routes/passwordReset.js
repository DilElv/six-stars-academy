import { Router } from 'express'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { notifyUser } from '../lib/notify.js'

const router = Router()

router.post('/request', async (req, res) => {
  const { email } = req.body
  try {
    if (!email) return res.status(400).json({ error: 'Email harus diisi' })

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return res.status(404).json({ error: 'Email tidak ditemukan' })

    const existing = await prisma.passwordReset.findFirst({
      where: { email, status: { in: ['pending', 'approved'] } },
    })
    if (existing) return res.status(400).json({ error: 'Sudah ada permintaan reset untuk email ini. Tunggu konfirmasi admin.' })

    const token = crypto.randomBytes(32).toString('hex')
    await prisma.passwordReset.create({
      data: { email, userId: user.id, token },
    })

    const admins = await prisma.user.findMany({ where: { role: 'admin' }, select: { id: true } })
    for (const admin of admins) {
      await notifyUser(admin.id, {
        type: 'password_reset_request',
        title: 'Permintaan Reset Password',
        message: `${user.name} (${email}) meminta reset password. Kelola di menu Data Anak.`,
        link: '/admin/data-anak',
      })
    }

    res.json({ message: 'Permintaan reset password terkirim. Tunggu konfirmasi admin.' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

async function getPhone(userId, role) {
  if (role === 'parent') {
    const student = await prisma.student.findFirst({ where: { userId }, select: { parentPhone: true } })
    return student?.parentPhone || null
  }
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { phone: true } })
  return user?.phone || null
}

function waLink(phone, text) {
  const clean = phone.replace(/^0+/, '62').replace(/[^0-9]/g, '')
  return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`
}

router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const requests = await prisma.passwordReset.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, email: true, role: true, phone: true } } },
    })

    const enriched = await Promise.all(requests.map(async (r) => {
      const phone = r.userId ? await getPhone(r.userId, r.user?.role) : null
      const baseUrl = process.env.BASE_URL || 'http://localhost:3000'
      const resetLink = `${baseUrl}/reset-password?token=${r.token}`
      const waText = `Link update password telah disetujui: ${resetLink}`
      return { ...r, phone, waLink: phone ? waLink(phone, waText) : null, resetLink }
    }))

    res.json(enriched)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:id/approve', authenticate, authorize('admin'), async (req, res) => {
  try {
    const record = await prisma.passwordReset.findUnique({
      where: { id: req.params.id },
      include: { user: { select: { name: true, role: true } } },
    })
    if (!record) return res.status(404).json({ error: 'Permintaan tidak ditemukan' })
    if (record.status !== 'pending') return res.status(400).json({ error: `Permintaan sudah ${record.status === 'approved' ? 'disetujui' : record.status === 'used' ? 'digunakan' : 'ditolak'}` })

    await prisma.passwordReset.update({
      where: { id: req.params.id },
      data: { status: 'approved' },
    })

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000'
    const resetLink = `${baseUrl}/reset-password?token=${record.token}`

    if (record.userId) {
      await notifyUser(record.userId, {
        type: 'password_reset_approved',
        title: 'Reset Password Disetujui',
        message: 'Permintaan reset password kamu sudah disetujui. Buka link berikut untuk membuat password baru.',
        link: `/reset-password?token=${record.token}`,
      })
    }

    const phone = record.userId ? await getPhone(record.userId, record.user?.role) : null
    const waText = `Link update password telah disetujui: ${resetLink}`

    res.json({
      message: 'Permintaan disetujui. User akan mendapat notifikasi.',
      token: record.token,
      resetLink,
      phone,
      waLink: phone ? waLink(phone, waText) : null,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:id/reject', authenticate, authorize('admin'), async (req, res) => {
  try {
    const record = await prisma.passwordReset.findUnique({ where: { id: req.params.id } })
    if (!record) return res.status(404).json({ error: 'Permintaan tidak ditemukan' })
    if (record.status !== 'pending') return res.status(400).json({ error: 'Permintaan sudah diproses' })

    await prisma.passwordReset.update({
      where: { id: req.params.id },
      data: { status: 'expired' },
    })

    if (record.userId) {
      await notifyUser(record.userId, {
        type: 'password_reset_rejected',
        title: 'Reset Password Ditolak',
        message: 'Permintaan reset password kamu ditolak. Hubungi admin untuk informasi lebih lanjut.',
      })
    }

    res.json({ message: 'Permintaan ditolak.' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/reset', async (req, res) => {
  const { token, password } = req.body
  try {
    if (!token || !password) return res.status(400).json({ error: 'Token dan password harus diisi' })
    if (password.length < 6) return res.status(400).json({ error: 'Password minimal 6 karakter' })

    const record = await prisma.passwordReset.findUnique({ where: { token } })
    if (!record) return res.status(404).json({ error: 'Token tidak valid' })
    if (record.status === 'used') return res.status(400).json({ error: 'Token sudah digunakan' })
    if (record.status === 'expired') return res.status(400).json({ error: 'Token sudah kadaluarsa' })
    if (record.status !== 'approved') return res.status(400).json({ error: 'Belum disetujui admin' })

    const hashed = await bcrypt.hash(password, 10)
    await prisma.user.update({
      where: { id: record.userId },
      data: { password: hashed },
    })

    await prisma.passwordReset.update({
      where: { id: record.id },
      data: { status: 'used' },
    })

    await notifyUser(record.userId, {
      type: 'password_reset_success',
      title: 'Password Berhasil Diubah',
      message: 'Password kamu sudah berhasil direset. Silakan login dengan password baru.',
      link: '/login',
    })

    res.json({ message: 'Password berhasil diubah. Silakan login.' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/check', async (req, res) => {
  const { token } = req.query
  try {
    if (!token) return res.status(400).json({ error: 'Token diperlukan' })
    const record = await prisma.passwordReset.findUnique({ where: { token } })
    if (!record) return res.status(404).json({ error: 'Token tidak valid' })
    if (record.status === 'used') return res.status(400).json({ error: 'Token sudah digunakan' })
    if (record.status === 'expired') return res.status(400).json({ error: 'Token sudah kadaluarsa' })
    if (record.status !== 'approved') return res.status(400).json({ error: 'Belum disetujui admin' })
    res.json({ valid: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
