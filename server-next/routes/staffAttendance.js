import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { notifyRole, notifyUser } from '../lib/notify.js'
import { assertBranchAccess, getUserBranchIds } from '../lib/branchAccess.js'

const router = Router()

function startOfDay(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

// A coach/head-coach with no branches assigned yet (e.g. not set up by
// admin) falls back to the pre-branch behavior: one plain record a day,
// branchId left null. Prisma's compound unique lookup rejects a literal
// null for branchId, so that case can't reuse `userId_date_branchId` and
// goes through a manual findFirst+create/update instead.
async function findTodayRecord(userId, day, branchId) {
  if (branchId) {
    return prisma.staffAttendance.findUnique({ where: { userId_date_branchId: { userId, date: day, branchId } } })
  }
  return prisma.staffAttendance.findFirst({ where: { userId, date: day, branchId: null } })
}

router.post('/checkin', authenticate, authorize('coach', 'head_coach'), async (req, res) => {
  const { photo, latitude, longitude, locationName } = req.body
  let { branchId } = req.body
  if (!photo) return res.status(400).json({ error: 'Foto selfie wajib diambil' })
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } })
    // A coach/head-coach assigned to multiple branches checks in separately
    // at each one, so both roles need branch selection now (it used to be
    // coach-only, back when a day only ever had one record). Someone with no
    // branches assigned at all keeps the old no-branch behavior instead of
    // being locked out.
    const assignedBranchIds = await getUserBranchIds(req.user.id)
    if (assignedBranchIds.length > 0) {
      if (!branchId) return res.status(400).json({ error: 'Pilih cabang terlebih dahulu' })
      await assertBranchAccess(req.user.id, branchId)
    } else {
      branchId = null
    }
    const day = startOfDay()
    const now = new Date()
    const existing = await findTodayRecord(req.user.id, day, branchId)
    const data = {
      status: 'hadir',
      checkInTime: now,
      photo,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      locationName: locationName || null,
      verifyStatus: 'pending',
      verifiedById: null,
      verifiedAt: null,
      rejectReason: null,
    }
    const record = existing
      ? await prisma.staffAttendance.update({ where: { id: existing.id }, data, include: { branch: true } })
      : await prisma.staffAttendance.create({ data: { ...data, userId: req.user.id, branchId, date: day }, include: { branch: true } })

    await notifyRole('admin', {
      type: 'staff_checkin_pending',
      title: 'Absen Coach Menunggu Verifikasi',
      message: `${user.name} melakukan absen${record.branch ? ` di ${record.branch.name}` : ''} dan menunggu verifikasi Anda.`,
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
  let { branchId } = req.body
  if (!photo) return res.status(400).json({ error: 'Foto selfie wajib diambil' })
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } })
    const assignedBranchIds = await getUserBranchIds(req.user.id)
    if (assignedBranchIds.length > 0) {
      if (!branchId) return res.status(400).json({ error: 'Pilih cabang terlebih dahulu' })
      await assertBranchAccess(req.user.id, branchId)
    } else {
      branchId = null
    }
    const day = startOfDay()
    const existing = await findTodayRecord(req.user.id, day, branchId)
    if (!existing || !existing.checkInTime) {
      return res.status(400).json({ error: 'Absen masuk dulu di cabang ini sebelum absen pulang' })
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
      include: { branch: true },
    })

    await notifyRole('admin', {
      type: 'staff_checkout_pending',
      title: 'Absen Pulang Coach Menunggu Verifikasi',
      message: `${user.name} melakukan absen pulang${record.branch ? ` di ${record.branch.name}` : ''} dan menunggu verifikasi Anda.`,
      link: '/admin/absensi',
    })

    res.json(record)
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Returns every branch the user has already checked into today (array, not
// a single record) — a multi-branch coach/head-coach can have more than one.
router.get('/me', authenticate, authorize('coach', 'head_coach'), async (req, res) => {
  try {
    const day = startOfDay(req.query.date)
    const records = await prisma.staffAttendance.findMany({
      where: { userId: req.user.id, date: day },
      include: { branch: true },
    })
    res.json(records)
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
