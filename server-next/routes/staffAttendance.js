import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { notifyRole, notifyUser } from '../lib/notify.js'

const router = Router()

function startOfDay(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

router.post('/checkin', authenticate, authorize('coach', 'head_coach'), async (req, res) => {
  const { photo, latitude, longitude, locationName } = req.body
  if (!photo) return res.status(400).json({ error: 'Foto selfie wajib diambil' })
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } })
    const day = startOfDay()
    const now = new Date()
    const record = await prisma.staffAttendance.upsert({
      where: { userId_date: { userId: req.user.id, date: day } },
      update: {
        status: 'hadir',
        checkInTime: now,
        branchId: user.branchId,
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
        branchId: user.branchId,
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
    const day = startOfDay(req.query.date)
    const where = { date: day }
    if (req.query.branchId) where.branchId = req.query.branchId
    if (req.query.verifyStatus) where.verifyStatus = req.query.verifyStatus
    const records = await prisma.staffAttendance.findMany({
      where,
      include: {
        user: { select: { name: true, role: true, photo: true } },
        branch: true,
        verifiedBy: { select: { name: true } },
      },
      orderBy: { checkInTime: 'asc' },
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

export default router
