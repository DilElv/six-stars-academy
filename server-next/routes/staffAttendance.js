import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { notifyUser } from '../lib/notify.js'
import { assertBranchAccess, getUserBranchIds } from '../lib/branchAccess.js'

import { windowState, closedMessage } from '../lib/coachAttendance.js'

const router = Router()

function startOfDay(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

// A coach/head-coach with no branches assigned yet (e.g. not set up by
// admin) falls back to the pre-branch behavior: one plain record a day,
// branchId left null. Since absensi coach kini per sesi, baris legacy
// (sessionId null) dicari manual, bukan lewat compound unique lama.
async function findTodayRecord(userId, day, branchId) {
  return prisma.staffAttendance.findFirst({ where: { userId, date: day, branchId: branchId ?? null, sessionId: null } })
}

async function findCoachSession(user, sessionId, assignedBranchIds) {
  const session = await prisma.coachAttendanceSession.findUnique({ where: { id: sessionId }, include: { branch: true } })
  if (!session) throw Object.assign(new Error('Sesi absensi tidak ditemukan'), { status: 404 })
  if (session.status !== 'active') throw Object.assign(new Error('Sesi absensi sudah dibatalkan'), { status: 400 })
  if (session.type !== 'training') throw Object.assign(new Error('Sesi ini memakai absensi event'), { status: 400 })
  if (startOfDay(session.date).getTime() !== startOfDay().getTime()) {
    throw Object.assign(new Error('Sesi absensi bukan untuk hari ini'), { status: 400 })
  }
  if (session.coachId && session.coachId !== user.id) {
    throw Object.assign(new Error('Sesi absensi ini bukan untuk Anda'), { status: 403 })
  }
  if (session.branchId && !assignedBranchIds.includes(session.branchId)) {
    throw Object.assign(new Error('Anda tidak memiliki akses ke cabang ini'), { status: 403 })
  }
  return session
}

async function canVerifyRecord(req, record) {
  if (req.user.role === 'admin') return true
  if (!record || record.user?.role !== 'coach') return false
  const branchIds = await getUserBranchIds(req.user.id)
  return !!record.branchId && branchIds.includes(record.branchId)
}

router.post('/checkin', authenticate, authorize('coach', 'head_coach'), async (req, res) => {
  const { photo, latitude, longitude, locationName, sessionId } = req.body
  let { branchId } = req.body
  if (!photo) return res.status(400).json({ error: 'Foto selfie wajib diambil' })
  try {
    const assignedBranchIds = await getUserBranchIds(req.user.id)

    // Coach: absensi hanya lewat sesi yang dijadwalkan admin/head coach dan
    // hanya di dalam jendela jam buka-tutup.
    if (req.user.role === 'coach') {
      if (!sessionId) return res.status(400).json({ error: 'Pilih sesi absensi terlebih dahulu' })
      const session = await findCoachSession(req.user, sessionId, assignedBranchIds)
      const state = windowState(session)
      if (!state.canCheckIn) return res.status(400).json({ error: closedMessage(session, state) })

      branchId = session.branchId || (branchId && assignedBranchIds.includes(branchId) ? branchId : null)
      const existing = await prisma.staffAttendance.findUnique({
        where: { userId_sessionId: { userId: req.user.id, sessionId } },
      })
      if (existing?.checkInTime && existing.verifyStatus !== 'rejected') {
        return res.status(409).json({ error: 'Absen masuk sesi ini sudah tercatat' })
      }
      const now = new Date()
      const day = startOfDay(session.date)
      const data = {
        status: 'hadir',
        date: day,
        sessionId,
        branchId,
        checkInTime: now,
        photo,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        locationName: locationName || null,
        // Absen langsung sah (foto + timestamp), tanpa antrean verifikasi.
        verifyStatus: 'approved',
        verifiedById: null,
        verifiedAt: now,
        rejectReason: null,
      }
      const record = existing
        ? await prisma.staffAttendance.update({ where: { id: existing.id }, data, include: { branch: true, session: true } })
        : await prisma.staffAttendance.create({ data: { ...data, userId: req.user.id }, include: { branch: true, session: true } })
      return res.json(record)
    }

    // Head coach: tetap absen harian bebas per cabang.
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
      verifyStatus: 'approved',
      verifiedById: null,
      verifiedAt: now,
      rejectReason: null,
    }
    const record = existing
      ? await prisma.staffAttendance.update({ where: { id: existing.id }, data, include: { branch: true } })
      : await prisma.staffAttendance.create({ data: { ...data, userId: req.user.id, branchId, date: day }, include: { branch: true } })

    res.json(record)
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/checkout', authenticate, authorize('coach', 'head_coach'), async (req, res) => {
  const { photo, latitude, longitude, locationName, sessionId } = req.body
  let { branchId } = req.body
  if (!photo) return res.status(400).json({ error: 'Foto selfie wajib diambil' })
  try {
    const assignedBranchIds = await getUserBranchIds(req.user.id)

    if (req.user.role === 'coach') {
      if (!sessionId) return res.status(400).json({ error: 'Pilih sesi absensi terlebih dahulu' })
      const session = await findCoachSession(req.user, sessionId, assignedBranchIds)
      const existing = await prisma.staffAttendance.findUnique({
        where: { userId_sessionId: { userId: req.user.id, sessionId } },
      })
      if (!existing?.checkInTime) return res.status(400).json({ error: 'Absen masuk dulu di sesi ini sebelum absen pulang' })
      if (existing.verifyStatus === 'rejected') return res.status(400).json({ error: 'Perbaiki absen masuk yang ditolak terlebih dahulu' })
      if (existing.checkOutTime && existing.checkOutVerifyStatus !== 'rejected') {
        return res.status(409).json({ error: 'Absen pulang sesi ini sudah tercatat' })
      }
      const state = windowState(session)
      if (!state.canCheckOut) {
        return res.status(400).json({ error: `Batas absen pulang sudah lewat (pukul ${session.checkOutClose}).` })
      }
      const now = new Date()
      if (now < new Date(existing.checkInTime)) return res.status(400).json({ error: 'Waktu absen pulang tidak valid' })
      const record = await prisma.staffAttendance.update({
        where: { id: existing.id },
        data: {
          checkOutTime: now,
          checkOutPhoto: photo,
          checkOutLatitude: latitude ?? null,
          checkOutLongitude: longitude ?? null,
          checkOutLocationName: locationName || null,
          checkOutVerifyStatus: 'approved',
          checkOutVerifiedById: null,
          checkOutVerifiedAt: now,
          checkOutRejectReason: null,
        },
        include: { branch: true, session: true },
      })
      return res.json(record)
    }

    // Head coach: absen pulang harian bebas per cabang.
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
    if (existing.checkOutTime && existing.checkOutVerifyStatus !== 'rejected') {
      return res.status(409).json({ error: 'Absen pulang hari ini sudah tercatat' })
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
        checkOutVerifyStatus: 'approved',
        checkOutVerifiedById: null,
        checkOutVerifiedAt: now,
        checkOutRejectReason: null,
      },
      include: { branch: true },
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
      include: {
        branch: true,
        session: { select: { id: true, title: true, type: true, checkInOpen: true, checkInClose: true, checkOutClose: true } },
      },
    })
    res.json(records)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/', authenticate, authorize('admin', 'head_coach'), async (req, res) => {
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
    if (req.user.role === 'head_coach') {
      const branchIds = await getUserBranchIds(req.user.id)
      where.branchId = req.query.branchId && branchIds.includes(req.query.branchId)
        ? req.query.branchId
        : { in: branchIds }
      where.user = { role: 'coach' }
    }
    const records = await prisma.staffAttendance.findMany({
      where,
      include: {
        user: { select: { name: true, role: true, photo: true } },
        branch: true,
        verifiedBy: { select: { name: true } },
        checkOutVerifiedBy: { select: { name: true } },
        session: { select: { id: true, title: true, type: true, checkInOpen: true, checkInClose: true, checkOutClose: true } },
      },
      orderBy: { checkInTime: 'desc' },
    })
    res.json(records)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Rekap kehadiran coach sebulan (menu "Absensi Coach"): satu grup per coach
// berisi hari hadir terverifikasi + status lain, plus detail harian untuk
// ditelusuri. Memakai aturan hari yang sama dengan payroll (satu hari = satu
// tanggal unik; check-in ke dua cabang tetap 1 hari).
router.get('/recap', authenticate, authorize('admin', 'head_coach'), async (req, res) => {
  const month = Number(req.query.month)
  const year = Number(req.query.year)
  if (!month || !year) return res.status(400).json({ error: 'month dan year wajib diisi' })
  try {
    const isHeadCoach = req.user.role === 'head_coach'
    let branchFilter = req.query.branchId || null
    let branchIds = null
    if (isHeadCoach) {
      branchIds = await getUserBranchIds(req.user.id)
      if (branchFilter && !branchIds.includes(branchFilter)) branchFilter = null
    }

    const userWhere = isHeadCoach ? { role: 'coach' } : { role: { in: ['coach', 'head_coach'] } }
    if (branchFilter) userWhere.branches = { some: { branchId: branchFilter } }
    else if (isHeadCoach) userWhere.branches = { some: { branchId: { in: branchIds } } }

    const coaches = await prisma.user.findMany({
      where: userWhere,
      select: { id: true, name: true, photo: true, role: true, branches: { select: { branch: { select: { id: true, name: true, code: true } } } } },
      orderBy: { name: 'asc' },
    })

    const recordWhere = {
      userId: { in: coaches.map((c) => c.id) },
      date: { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) },
    }
    if (branchFilter) recordWhere.branchId = branchFilter
    else if (branchIds) recordWhere.branchId = { in: branchIds }

    const records = await prisma.staffAttendance.findMany({
      where: recordWhere,
      include: {
        branch: true,
        session: { select: { id: true, title: true, type: true, checkInOpen: true, checkInClose: true, checkOutClose: true } },
      },
      orderBy: [{ date: 'asc' }, { checkInTime: 'asc' }],
    })

    const byUser = new Map()
    for (const record of records) {
      const entry = byUser.get(record.userId) || { records: [], days: new Set(), pending: 0, rejected: 0, missingCheckout: 0 }
      entry.records.push(record)
      if (record.verifyStatus === 'approved') {
        entry.days.add(new Date(record.date).toISOString().slice(0, 10))
        if (record.checkOutVerifyStatus !== 'approved') entry.missingCheckout += 1
      } else if (record.verifyStatus === 'rejected') {
        entry.rejected += 1
      } else {
        entry.pending += 1
      }
      byUser.set(record.userId, entry)
    }

    const entries = coaches.map((coach) => {
      const entry = byUser.get(coach.id) || { records: [], days: new Set(), pending: 0, rejected: 0, missingCheckout: 0 }
      return {
        coach,
        stats: {
          daysPresent: entry.days.size,
          pending: entry.pending,
          rejected: entry.rejected,
          missingCheckout: entry.missingCheckout,
          totalRecords: entry.records.length,
        },
        records: entry.records.map((r) => ({
          id: r.id,
          date: r.date,
          branch: r.branch,
          checkInTime: r.checkInTime,
          checkOutTime: r.checkOutTime,
          verifyStatus: r.verifyStatus,
          checkOutVerifyStatus: r.checkOutVerifyStatus,
          photo: r.photo,
          checkOutPhoto: r.checkOutPhoto,
          locationName: r.locationName,
          checkOutLocationName: r.checkOutLocationName,
          rejectReason: r.rejectReason,
          checkOutRejectReason: r.checkOutRejectReason,
          session: r.session,
        })),
      }
    })

    res.json({
      month,
      year,
      coaches: entries,
      totals: {
        coaches: entries.length,
        daysPresent: entries.reduce((sum, e) => sum + e.stats.daysPresent, 0),
        pending: entries.reduce((sum, e) => sum + e.stats.pending, 0),
        rejected: entries.reduce((sum, e) => sum + e.stats.rejected, 0),
        missingCheckout: entries.reduce((sum, e) => sum + e.stats.missingCheckout, 0),
        totalRecords: entries.reduce((sum, e) => sum + e.stats.totalRecords, 0),
      },
    })
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:id/approve', authenticate, authorize('admin', 'head_coach'), async (req, res) => {
  try {
    const existing = await prisma.staffAttendance.findUnique({ where: { id: req.params.id }, include: { user: true } })
    if (!await canVerifyRecord(req, existing)) return res.status(403).json({ error: 'Anda hanya dapat memverifikasi coach di cabang Anda' })
    const record = await prisma.staffAttendance.update({
      where: { id: req.params.id },
      data: { verifyStatus: 'approved', verifiedById: req.user.id, verifiedAt: new Date(), rejectReason: null },
      include: { user: true },
    })

    await notifyUser(record.userId, {
      type: 'staff_checkin_approved',
      title: 'Absen Disetujui',
      message: `Absen Anda hari ini pukul ${new Date(record.checkInTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} telah diverifikasi.`,
      link: '/coach',
    })

    res.json(record)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:id/reject', authenticate, authorize('admin', 'head_coach'), async (req, res) => {
  const { reason } = req.body
  try {
    const existing = await prisma.staffAttendance.findUnique({ where: { id: req.params.id }, include: { user: true } })
    if (!await canVerifyRecord(req, existing)) return res.status(403).json({ error: 'Anda hanya dapat memverifikasi coach di cabang Anda' })
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
        : 'Absen Anda ditolak. Silakan absen ulang di lapangan.',
      link: '/coach',
    })

    res.json(record)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:id/checkout/approve', authenticate, authorize('admin', 'head_coach'), async (req, res) => {
  try {
    const existing = await prisma.staffAttendance.findUnique({ where: { id: req.params.id }, include: { user: true } })
    if (!await canVerifyRecord(req, existing)) return res.status(403).json({ error: 'Anda hanya dapat memverifikasi coach di cabang Anda' })
    const record = await prisma.staffAttendance.update({
      where: { id: req.params.id },
      data: { checkOutVerifyStatus: 'approved', checkOutVerifiedById: req.user.id, checkOutVerifiedAt: new Date(), checkOutRejectReason: null },
      include: { user: true },
    })

    await notifyUser(record.userId, {
      type: 'staff_checkout_approved',
      title: 'Absen Pulang Disetujui',
      message: `Absen pulang Anda hari ini pukul ${new Date(record.checkOutTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} telah diverifikasi.`,
      link: '/coach',
    })

    res.json(record)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:id/checkout/reject', authenticate, authorize('admin', 'head_coach'), async (req, res) => {
  const { reason } = req.body
  try {
    const existing = await prisma.staffAttendance.findUnique({ where: { id: req.params.id }, include: { user: true } })
    if (!await canVerifyRecord(req, existing)) return res.status(403).json({ error: 'Anda hanya dapat memverifikasi coach di cabang Anda' })
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
        : 'Absen pulang Anda ditolak. Silakan absen ulang di lapangan.',
      link: '/coach',
    })

    res.json(record)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
