import { Router } from 'express'
import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { incomeProofWhere } from '../lib/paymentProof.js'
import { cleanPhone, isValidPhone, PHONE_ERROR } from '../lib/phone.js'

const router = Router()

router.use(authenticate, authorize('admin'))

router.get('/stats', async (req, res) => {
  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0)
    const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999)

    const [totalAnak, totalHeadCoach, totalCoach, pendapatanBulanIni, absensiHariIni, pembayaranPending, raporBelumDibuat] = await Promise.all([
      // 'needs_renewal' students are still enrolled, just quota-exhausted —
      // only true withdrawals ('inactive') should drop out of this count.
      prisma.student.count({ where: { status: { not: 'inactive' } } }),
      prisma.user.count({ where: { role: 'head_coach' } }),
      prisma.user.count({ where: { role: 'coach' } }),
      prisma.payment.aggregate({ _sum: { totalAmount: true }, where: { status: 'success', paidAt: { gte: startOfMonth }, ...incomeProofWhere() } }),
      prisma.attendance.count({ where: { date: { gte: startOfToday, lte: endOfToday } } }),
      prisma.payment.count({ where: { status: 'pending' } }),
      prisma.assessment.count({ where: { month: now.getMonth() + 1, year: now.getFullYear(), reports: { none: {} } } }),
    ])

    res.json({
      totalAnak,
      totalHeadCoach,
      totalCoach,
      pendapatanBulanIni: pendapatanBulanIni._sum.totalAmount || 0,
      absensiHariIni,
      pembayaranPending,
      raporBelumDibuat,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/revenue-trend', async (req, res) => {
  try {
    const now = new Date()
    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({ year: d.getFullYear(), month: d.getMonth() + 1 })
    }
    const rangeStart = new Date(months[0].year, months[0].month - 1, 1)
    const payments = await prisma.payment.findMany({
      where: { status: 'success', paidAt: { gte: rangeStart }, ...incomeProofWhere() },
      select: { totalAmount: true, paidAt: true },
    })
    const MONTH_LABEL = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
    const result = months.map(({ year, month }) => {
      const total = payments
        .filter((p) => p.paidAt && p.paidAt.getFullYear() === year && p.paidAt.getMonth() + 1 === month)
        .reduce((sum, p) => sum + p.totalAmount, 0)
      return { label: `${MONTH_LABEL[month]} ${year}`, total }
    })
    res.json(result)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/users', async (req, res) => {
  try {
    const where = {}
    if (req.query.role) where.role = req.query.role
    if (req.query.branchId) where.branches = { some: { branchId: req.query.branchId } }
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true, name: true, email: true, role: true, phone: true, photo: true, bio: true, status: true, dailyRate: true, createdAt: true,
        branches: { select: { branch: true } },
        _count: { select: { coachAttendances: true, trainingSessions: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json(users)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/users', async (req, res) => {
  const { name, email, password, role, phone, branchIds, dailyRate } = req.body
  try {
    if (['coach', 'head_coach'].includes(role) && !email?.toLowerCase().endsWith('@sixstars.id')) {
      return res.status(400).json({ error: `Email ${role === 'coach' ? 'coach' : 'head coach'} harus menggunakan domain @sixstars.id` })
    }
    if (dailyRate !== undefined && dailyRate !== '' && (!Number.isSafeInteger(Number(dailyRate)) || Number(dailyRate) < 0)) {
      return res.status(400).json({ error: 'Honor harian harus bilangan bulat minimal 0' })
    }
    // Nomor HP wajib: diawali 0, hanya angka, tanpa spasi (lihat lib/phone.js).
    if (phone !== undefined && phone !== '' && !isValidPhone(phone)) {
      return res.status(400).json({ error: PHONE_ERROR })
    }
    const hashed = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: {
        name, email, password: hashed, role,
        phone: phone === '' ? null : cleanPhone(phone),
        dailyRate: dailyRate ? Number(dailyRate) : 0,
        branches: branchIds?.length ? { create: branchIds.map((branchId) => ({ branchId })) } : undefined,
      },
    })
    const { password: _pw, ...profile } = user
    res.status(201).json(profile)
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Email sudah terdaftar' })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/users/:id', async (req, res) => {
  const { name, phone, status, password, branchIds, dailyRate } = req.body
  try {
    const data = { name, phone, status }
    if (dailyRate !== undefined && dailyRate !== '' && (!Number.isSafeInteger(Number(dailyRate)) || Number(dailyRate) < 0)) {
      return res.status(400).json({ error: 'Honor harian harus bilangan bulat minimal 0' })
    }
    // Nomor HP wajib: diawali 0, hanya angka, tanpa spasi (lihat lib/phone.js).
    if (phone !== undefined && phone !== '' && !isValidPhone(phone)) {
      return res.status(400).json({ error: PHONE_ERROR })
    }
    if (dailyRate !== undefined && dailyRate !== '') data.dailyRate = Number(dailyRate)
    if (name === undefined) delete data.name
    if (phone === undefined) delete data.phone
    else data.phone = phone === '' ? null : cleanPhone(phone)
    if (status === undefined) delete data.status
    if (password) data.password = await bcrypt.hash(password, 10)
    if (branchIds !== undefined) {
      data.branches = { deleteMany: {}, create: branchIds.map((branchId) => ({ branchId })) }
    }
    const user = await prisma.user.update({ where: { id: req.params.id }, data })
    const { password: _pw, ...profile } = user
    res.json(profile)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Hapus akun coach/head_coach/admin.
//
// Sebelumnya handler ini memanggil `prisma.user.delete()` langsung, sehingga
// gagal (P2003) begitu user punya relasi ber-FK wajib — paling sering
// `TrainingSession.coachId` (topik latihan yang pernah dibuat). Sekarang
// dibersihkan dulu dalam satu transaksi:
//   - topik latihan milik user  -> dihapus (kolom coachId wajib diisi)
//   - absensi/jadwal/keranjang/password-reset -> tautan dilepas (kolom nullable),
//     supaya riwayat kehadiran anak tetap utuh
//   - relasi lain (UserBranch, StaffAttendance, EventStaffAttendance,
//     CoachPayroll, Notification) sudah `onDelete: Cascade`; Payment & audit log SetNull.
// Bila masih ada relasi wajib lain yang mengikat (mis. penilaian rapor, jurnal
// keuangan, atau event yang dibuat user ini), kembalikan pesan jelas alih-alih 500.
router.delete('/users/:id', async (req, res) => {
  const { id } = req.params
  try {
    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) return res.status(404).json({ error: 'Pengguna tidak ditemukan' })

    await prisma.$transaction(async (tx) => {
      await tx.trainingSession.deleteMany({ where: { coachId: id } })
      await tx.attendance.updateMany({ where: { coachId: id }, data: { coachId: null } })
      await tx.schedule.updateMany({ where: { coachId: id }, data: { coachId: null } })
      await tx.cartItem.updateMany({ where: { addedById: id }, data: { addedById: null } })
      await tx.passwordReset.updateMany({ where: { userId: id }, data: { userId: null } })
      await tx.user.delete({ where: { id } })
    })

    res.json({ message: 'Deleted' })
  } catch (err) {
    if (err.code === 'P2003') {
      return res.status(409).json({
        error: 'Akun ini masih terhubung dengan data yang tidak dihapus otomatis (mis. penilaian rapor, jurnal keuangan, atau event yang dibuat akun ini). Nonaktifkan akun ini sebagai gantinya.',
      })
    }
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
