import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { notifyRole, notifyUser } from '../lib/notify.js'
import { assertBranchAccess } from '../lib/branchAccess.js'

const router = Router()

function startOfDay(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

router.post('/checkin', authenticate, authorize('coach', 'head_coach'), async (req, res) => {
  const { photo, latitude, longitude, locationName, branchId } = req.body
  if (!photo) return res.status(400).json({ error: 'Foto selfie wajib diambil' })
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } })
    if (req.user.role === 'coach') {
      if (!branchId) return res.status(400).json({ error: 'Pilih cabang terlebih dahulu' })
      await assertBranchAccess(req.user.id, branchId)
    }
    const day = startOfDay()
    const now = new Date()
    const record = await prisma.staffAttendance.upsert({
      where: { userId_date: { userId: req.user.id, date: day } },
      update: {
        status: 'hadir',
        checkInTime: now,
        branchId: branchId || null,
        photo,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        locationName: locationName || null,
        verifyStatus: 'pending',
        verifiedById: null,
        verifiedAt: null,
        rejectReason: null,
      },
      create: {
        userId: req.user.id,
        branchId: branchId || null,
        date: day,
        status: 'hadir',
        checkInTime: now,
        photo,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        locationName: locationName || null,
        verifyStatus: 'pending',
      },
    })

    await notifyRole('admin', {
      type: 'staff_checkin_pending',
      title: 'Absen Coach Menunggu Verifikasi',
      message: `${user.name} melakukan absen dan menunggu verifikasi Anda.`,
      link: '/admin/absensi',
    })

    res.json(record)
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/checkout', authenticate, authorize('coach', 'head_coach'), async (req, res) => {
  const { photo, latitude, longitude, locationName } = req.body
  if (!photo) return res.status(400).json({ error: 'Foto selfie wajib diambil' })
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } })
    const day = startOfDay()
    const existing = await prisma.staffAttendance.findUnique({ where: { userId_date: { userId: req.user.id, date: day } } })
    if (!existing || !existing.checkInTime) {
      return res.status(400).json({ error: 'Absen masuk dulu sebelum absen pulang' })
    }
    const now = new Date()
    const record = await prisma.staffAttendance.update({
      where: { id: existing.id },
      data: {
        checkOutTime: now,
        checkOutPhoto: photo,
        checkOutLatitude: latitude ?? null,
        checkOutLongitude: longitude ?? null,
        checkOutLocationName: locationName || null,
        checkOutVerifyStatus: 'pending',
        checkOutVerifiedById: null,
        checkOutVerifiedAt: null,
        checkOutRejectReason: null,
      },
    })

    await notifyRole('admin', {
      type: 'staff_checkout_pending',
      title: 'Absen Pulang Coach Menunggu Verifikasi',
      message: `${user.name} melakukan absen pulang dan menunggu verifikasi Anda.`,
      link: '/admin/absensi',
    })

    res.json(record)
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/me', authenticate, authorize('coach', 'head_coach'), async (req, res) => {
  try {
    const day = startOfDay(req.query.date)
    const record = await prisma.staffAttendance.findUnique({ where: { userId_date: { userId: req.user.id, date: day } } })
    res.json(record)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const where = {}
    if (req.query.month && req.query.year) {
      const start = new Date(Number(req.query.year), Number(req.query.month) - 1, 1)
      const end = new Date(Number(req.query.year), Number(req.query.month), 1)
      where.date = { gte: start, lt: end }
    } else {
      where.date = startOfDay(req.query.date)
    }
    if (req.query.branchId) where.branchId = req.query.branchId
    if (req.query.verifyStatus) where.verifyStatus = req.query.verifyStatus
    if (req.query.role) where.user = { role: req.query.role }
    const records = await prisma.staffAttendance.findMany({
      where,
      include: {
        user: { select: { name: true, role: true, photo: true } },
        branch: true,
        verifiedBy: { select: { name: true } },
        checkOutVerifiedBy: { select: { name: true } },
      },
      orderBy: { checkInTime: 'desc' },
    })
    res.json(records)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:id/approve', authenticate, authorize('admin'), async (req, res) => {
  try {
    const record = await prisma.staffAttendance.update({
      where: { id: req.params.id },
      data: { verifyStatus: 'approved', verifiedById: req.user.id, verifiedAt: new Date(), rejectReason: null },
      include: { user: true },
    })

    await notifyUser(record.userId, {
      type: 'staff_checkin_approved',
      title: 'Absen Disetujui',
      message: `Absen Anda hari ini pukul ${new Date(record.checkInTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} telah diverifikasi admin.`,
      link: '/coach',
    })

    res.json(record)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:id/reject', authenticate, authorize('admin'), async (req, res) => {
  const { reason } = req.body
  try {
    const record = await prisma.staffAttendance.update({
      where: { id: req.params.id },
      data: { verifyStatus: 'rejected', verifiedById: req.user.id, verifiedAt: new Date(), rejectReason: reason || null },
      include: { user: true },
    })

    await notifyUser(record.userId, {
      type: 'staff_checkin_rejected',
      title: 'Absen Ditolak',
      message: reason
        ? `Absen Anda ditolak: ${reason}. Silakan absen ulang di lapangan.`
        : 'Absen Anda ditolak admin. Silakan absen ulang di lapangan.',
      link: '/coach',
    })

    res.json(record)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:id/checkout/approve', authenticate, authorize('admin'), async (req, res) => {
  try {
    const record = await prisma.staffAttendance.update({
      where: { id: req.params.id },
      data: { checkOutVerifyStatus: 'approved', checkOutVerifiedById: req.user.id, checkOutVerifiedAt: new Date(), checkOutRejectReason: null },
      include: { user: true },
    })

    await notifyUser(record.userId, {
      type: 'staff_checkout_approved',
      title: 'Absen Pulang Disetujui',
      message: `Absen pulang Anda hari ini pukul ${new Date(record.checkOutTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} telah diverifikasi admin.`,
      link: '/coach',
    })

    res.json(record)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:id/checkout/reject', authenticate, authorize('admin'), async (req, res) => {
  const { reason } = req.body
  try {
    const record = await prisma.staffAttendance.update({
      where: { id: req.params.id },
      data: { checkOutVerifyStatus: 'rejected', checkOutVerifiedById: req.user.id, checkOutVerifiedAt: new Date(), checkOutRejectReason: reason || null },
      include: { user: true },
    })

    await notifyUser(record.userId, {
      type: 'staff_checkout_rejected',
      title: 'Absen Pulang Ditolak',
      message: reason
        ? `Absen pulang Anda ditolak: ${reason}. Silakan absen ulang di lapangan.`
        : 'Absen pulang Anda ditolak admin. Silakan absen ulang di lapangan.',
      link: '/coach',
    })

    res.json(record)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
