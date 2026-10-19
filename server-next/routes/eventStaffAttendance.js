import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { getUserBranchIds } from '../lib/branchAccess.js'
import { notifyUser } from '../lib/notify.js'
import { windowState, closedMessage } from '../lib/coachAttendance.js'

const router = Router()

function dayStart(value = new Date()) {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

function sameDay(a, b = new Date()) {
  return dayStart(a).getTime() === dayStart(b).getTime()
}

// Jadwal absensi event/tournament yang berlaku untuk cabang coach tersebut.
async function sessionForEvent(event, branchId) {
  const day = dayStart(event.date)
  if (branchId) {
    const exact = await prisma.coachAttendanceSession.findFirst({
      where: { eventId: event.id, branchId, date: day, status: 'active' },
    })
    if (exact) return exact
  }
  return prisma.coachAttendanceSession.findFirst({
    where: { eventId: event.id, branchId: null, date: day, status: 'active' },
  })
}

async function accessibleEvent(userId, eventId, branchId) {
  const branchIds = await getUserBranchIds(userId)
  const event = await prisma.event.findUnique({ where: { id: eventId }, include: { branches: true } })
  if (!event) throw Object.assign(new Error('Event tidak ditemukan'), { status: 404 })
  if (event.status !== 'open') throw Object.assign(new Error('Event tidak aktif'), { status: 400 })
  if (!sameDay(event.date)) throw Object.assign(new Error('Absensi event hanya tersedia pada tanggal event'), { status: 400 })
  if (branchIds.length === 0) {
    if (event.branches.length > 0) throw Object.assign(new Error('Event ini bukan untuk cabang Anda'), { status: 403 })
    return { event, branchId: null }
  }
  const allowed = event.branches.length ? event.branches.map((row) => row.branchId) : branchIds
  const candidates = branchIds.filter((id) => allowed.includes(id))
  const selected = branchId || candidates[0]
  if (!selected || !candidates.includes(selected)) throw Object.assign(new Error('Event ini bukan untuk cabang Anda'), { status: 403 })
  return { event, branchId: selected }
}

async function canVerify(req, record) {
  if (req.user.role === 'admin') return true
  if (!record || record.user?.role !== 'coach') return false
  return req.user.role === 'head_coach'
}

router.get('/today', authenticate, authorize('coach', 'head_coach'), async (req, res) => {
  try {
    const branchIds = await getUserBranchIds(req.user.id)
    const start = dayStart()
    const end = new Date(start); end.setDate(end.getDate() + 1)
    const events = await prisma.event.findMany({
      where: {
        date: { gte: start, lt: end },
        status: 'open',
        OR: [{ branches: { none: {} } }, { branches: { some: { branchId: { in: branchIds } } } }],
      },
      include: {
        branches: { include: { branch: true } },
        staffAttendances: { where: { userId: req.user.id }, include: { branch: true } },
        attendanceSessions: { where: { date: start, status: 'active' } },
      },
      orderBy: { date: 'asc' },
    })
    res.json(events.map((event) => {
      const sessions = event.attendanceSessions || []
      const session = sessions.find((row) => row.branchId && branchIds.includes(row.branchId)) || sessions.find((row) => !row.branchId) || null
      return {
        ...event,
        myAttendance: event.staffAttendances[0] || null,
        attendanceSession: session,
        window: session ? windowState(session) : null,
      }
    }))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/checkin', authenticate, authorize('coach', 'head_coach'), async (req, res) => {
  const { eventId, branchId, photo, latitude, longitude, locationName } = req.body
  if (!eventId || !photo) return res.status(400).json({ error: 'Event dan foto selfie wajib diisi' })
  try {
    const access = await accessibleEvent(req.user.id, eventId, branchId)
    const session = await sessionForEvent(access.event, access.branchId)
    if (!session) return res.status(400).json({ error: 'Jadwal absensi event ini belum dibuat admin/head coach' })
    const state = windowState(session)
    if (!state.canCheckIn) return res.status(400).json({ error: closedMessage(session, state) })
    const existing = await prisma.eventStaffAttendance.findUnique({ where: { eventId_userId: { eventId, userId: req.user.id } } })
    if (existing?.checkInTime && existing.verifyStatus !== 'rejected') return res.status(409).json({ error: 'Absen masuk event sudah tercatat' })
    const now = new Date()
    const record = await prisma.eventStaffAttendance.upsert({
      where: { eventId_userId: { eventId, userId: req.user.id } },
      // Verifikasi dihapus: absen event langsung sah (masuk laporan + timestamp).
      update: { branchId: access.branchId, date: dayStart(access.event.date), checkInTime: now, photo, latitude: latitude ?? null, longitude: longitude ?? null, locationName: locationName || null, verifyStatus: 'approved', verifiedById: null, verifiedAt: now, rejectReason: null },
      create: { eventId, userId: req.user.id, branchId: access.branchId, date: dayStart(access.event.date), checkInTime: now, photo, latitude: latitude ?? null, longitude: longitude ?? null, locationName: locationName || null, verifyStatus: 'approved', verifiedAt: now },
      include: { event: true, branch: true },
    })
    res.json(record)
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message })
    console.error(err); res.status(500).json({ error: 'Server error' })
  }
})

router.post('/checkout', authenticate, authorize('coach', 'head_coach'), async (req, res) => {
  const { eventId, branchId, photo, latitude, longitude, locationName } = req.body
  if (!eventId || !photo) return res.status(400).json({ error: 'Event dan foto selfie wajib diisi' })
  try {
    const access = await accessibleEvent(req.user.id, eventId, branchId)
    const session = await sessionForEvent(access.event, access.branchId)
    if (!session) return res.status(400).json({ error: 'Jadwal absensi event ini belum dibuat admin/head coach' })
    const state = windowState(session)
    if (!state.canCheckOut) return res.status(400).json({ error: `Batas absen pulang event sudah lewat (pukul ${session.checkOutClose}).` })
    const existing = await prisma.eventStaffAttendance.findUnique({ where: { eventId_userId: { eventId, userId: req.user.id } }, include: { event: true } })
    if (!existing?.checkInTime) return res.status(400).json({ error: 'Absen masuk event terlebih dahulu' })
    if (existing.verifyStatus === 'rejected') return res.status(400).json({ error: 'Perbaiki absen masuk yang ditolak terlebih dahulu' })
    if (existing.checkOutTime && existing.checkOutVerifyStatus !== 'rejected') return res.status(409).json({ error: 'Absen pulang event sudah tercatat' })
    const record = await prisma.eventStaffAttendance.update({
      where: { id: existing.id },
      data: { checkOutTime: new Date(), checkOutPhoto: photo, checkOutLatitude: latitude ?? null, checkOutLongitude: longitude ?? null, checkOutLocationName: locationName || null, checkOutVerifyStatus: 'approved', checkOutVerifiedById: null, checkOutVerifiedAt: new Date(), checkOutRejectReason: null },
      include: { event: true, branch: true },
    })
    res.json(record)
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message })
    console.error(err); res.status(500).json({ error: 'Server error' })
  }
})

router.get('/', authenticate, authorize('admin', 'head_coach'), async (req, res) => {
  try {
    const where = {}
    if (req.query.month && req.query.year) {
      const start = new Date(Number(req.query.year), Number(req.query.month) - 1, 1)
      const end = new Date(Number(req.query.year), Number(req.query.month), 1)
      where.date = { gte: start, lt: end }
    }
    if (req.query.verifyStatus) where.verifyStatus = req.query.verifyStatus
    if (req.user.role === 'head_coach') {
      where.user = { role: 'coach' }
    } else if (req.query.role) where.user = { role: req.query.role }
    const records = await prisma.eventStaffAttendance.findMany({
      where,
      include: { event: true, branch: true, user: { select: { name: true, role: true, photo: true } }, verifiedBy: { select: { name: true } }, checkOutVerifiedBy: { select: { name: true } } },
      orderBy: { checkInTime: 'desc' },
    })
    res.json(records)
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }) }
})

async function verify(req, res, type, approved) {
  const record = await prisma.eventStaffAttendance.findUnique({ where: { id: req.params.id }, include: { user: true, event: true } })
  if (!record) return res.status(404).json({ error: 'Absensi event tidak ditemukan' })
  if (!await canVerify(req, record)) return res.status(403).json({ error: 'Head Coach hanya dapat memverifikasi absensi coach' })
  const checkout = type === 'checkout'
  if (checkout && !record.checkOutTime) return res.status(400).json({ error: 'Belum ada absen pulang untuk diverifikasi' })
  if (!checkout && !record.checkInTime) return res.status(400).json({ error: 'Belum ada absen masuk untuk diverifikasi' })
  const data = checkout
    ? { checkOutVerifyStatus: approved ? 'approved' : 'rejected', checkOutVerifiedById: req.user.id, checkOutVerifiedAt: new Date(), checkOutRejectReason: approved ? null : (req.body?.reason || null) }
    : { verifyStatus: approved ? 'approved' : 'rejected', verifiedById: req.user.id, verifiedAt: new Date(), rejectReason: approved ? null : (req.body?.reason || null) }
  const updated = await prisma.eventStaffAttendance.update({ where: { id: record.id }, data })
  await notifyUser(record.userId, { type: `event_staff_${type}_${approved ? 'approved' : 'rejected'}`, title: `Absen ${checkout ? 'Pulang ' : ''}Event ${approved ? 'Disetujui' : 'Ditolak'}`, message: `Absensi event ${record.event.title} ${approved ? 'telah disetujui' : 'ditolak'}.`, link: '/coach' })
  res.json(updated)
}

router.put('/:id/approve', authenticate, authorize('admin', 'head_coach'), (req, res) => verify(req, res, 'checkin', true).catch((err) => { console.error(err); res.status(500).json({ error: 'Server error' }) }))
router.put('/:id/reject', authenticate, authorize('admin', 'head_coach'), (req, res) => verify(req, res, 'checkin', false).catch((err) => { console.error(err); res.status(500).json({ error: 'Server error' }) }))
router.put('/:id/checkout/approve', authenticate, authorize('admin', 'head_coach'), (req, res) => verify(req, res, 'checkout', true).catch((err) => { console.error(err); res.status(500).json({ error: 'Server error' }) }))
router.put('/:id/checkout/reject', authenticate, authorize('admin', 'head_coach'), (req, res) => verify(req, res, 'checkout', false).catch((err) => { console.error(err); res.status(500).json({ error: 'Server error' }) }))

export default router
