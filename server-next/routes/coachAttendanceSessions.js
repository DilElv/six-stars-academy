import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { getUserBranchIds } from '../lib/branchAccess.js'
import {
  startOfDay,
  normalizeWindow,
  windowState,
  windowFromTimes,
  assertManageSession,
  ensureTrainingSessionAttendance,
  generateMonthAttendanceSessions,
  setSessionCoaches,
  setScheduleCoaches,
  ensureSchedulesAttendanceInRange,
} from '../lib/coachAttendance.js'

const router = Router()

const SESSION_INCLUDE = {
  branch: { select: { id: true, name: true, code: true } },
  coach: { select: { id: true, name: true, photo: true } },
  trainingSession: { select: { id: true, topicTitle: true, ageGroup: true, duration: true } },
  event: { select: { id: true, title: true, type: true, startTime: true, endTime: true } },
  schedule: { select: { id: true, startTime: true, endTime: true, location: true, coachNote: true } },
  assignedCoaches: { include: { user: { select: { id: true, name: true, photo: true } } } },
  _count: { select: { attendances: true } },
}

function monthRange(month, year) {
  return { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) }
}

async function headCoachBranchIds(req) {
  if (req.user.role !== 'head_coach') return null
  return getUserBranchIds(req.user.id)
}

// Jadwal absensi untuk admin/head coach, per tanggal atau per bulan.
router.get('/', authenticate, authorize('admin', 'head_coach'), async (req, res) => {
  try {
    const where = {}
    if (req.query.date) {
      where.date = startOfDay(req.query.date)
    } else if (req.query.month && req.query.year) {
      where.date = monthRange(Number(req.query.month), Number(req.query.year))
    }
    if (req.query.type) where.type = req.query.type
    if (req.query.status) where.status = req.query.status

    const branchIds = await headCoachBranchIds(req)
    if (branchIds) {
      if (req.query.branchId) {
        if (!branchIds.includes(req.query.branchId)) return res.status(403).json({ error: 'Anda tidak memiliki akses ke cabang ini' })
        where.branchId = req.query.branchId
      } else {
        where.OR = [{ branchId: { in: branchIds } }, { branchId: null }]
      }
    } else if (req.query.branchId) {
      where.branchId = req.query.branchId
    }

    // Jadwal latihan yang belum punya sesi absensi dilengkapi dulu agar latihan tidak hilang dari daftar.
    const range = req.query.month && req.query.year ? monthRange(Number(req.query.month), Number(req.query.year)) : null
    if (range) {
      try {
        await ensureSchedulesAttendanceInRange(range.gte, range.lt, branchIds)
      } catch (healErr) {
        console.error('Gagal melengkapi sesi absensi dari jadwal:', healErr)
      }
    }

    const sessions = await prisma.coachAttendanceSession.findMany({
      where,
      include: SESSION_INCLUDE,
      orderBy: [{ date: 'asc' }, { checkInOpen: 'asc' }, { title: 'asc' }],
    })
    res.json(sessions)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Daftar coach/head coach untuk pilihan penanggung jawab sesi.
router.get('/coaches', authenticate, authorize('admin', 'head_coach'), async (req, res) => {
  try {
    const branchIds = await headCoachBranchIds(req)
    const requested = req.query.branchId || null
    if (branchIds && requested && !branchIds.includes(requested)) {
      return res.status(403).json({ error: 'Anda tidak memiliki akses ke cabang ini' })
    }
    const where = { role: { in: ['coach', 'head_coach'] }, status: 'active' }
    const branchFilter = requested || null
    if (branchFilter) where.branches = { some: { branchId: branchFilter } }
    else if (branchIds) where.branches = { some: { branchId: { in: branchIds } } }
    const coaches = await prisma.user.findMany({
      where,
      select: {
        id: true, name: true, role: true,
        branches: { select: { branch: { select: { id: true, name: true, code: true } } } },
      },
      orderBy: { name: 'asc' },
    })
    res.json(coaches)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Daftar sesi absensi coach hari ini + status absen milik user.
router.get('/today', authenticate, authorize('coach', 'head_coach'), async (req, res) => {
  try {
    const branchIds = await getUserBranchIds(req.user.id)
    if (req.user.role === 'coach' && branchIds.length === 0) return res.json([])
    try {
      const today = startOfDay()
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      await ensureSchedulesAttendanceInRange(today, tomorrow, branchIds.length ? branchIds : null)
    } catch (healErr) {
      console.error('Gagal melengkapi sesi absensi hari ini dari jadwal:', healErr)
    }
    const sessions = await prisma.coachAttendanceSession.findMany({
      where: {
        type: 'training',
        status: 'active',
        date: startOfDay(),
        AND: [
          { OR: [{ branchId: null }, { branchId: { in: branchIds.length ? branchIds : ['__none__'] } }] },
          // Sesi untuk satu coach (topik latihan), atau sesi dengan daftar coach
          // bertugas (jadwal latihan); daftar kosong = semua coach cabang.
          {
            OR: [
              { coachId: req.user.id },
              { coachId: null, OR: [{ assignedCoaches: { none: {} } }, { assignedCoaches: { some: { userId: req.user.id } } }] },
            ],
          },
        ],
      },
      include: {
        branch: { select: { id: true, name: true, code: true } },
        trainingSession: { select: { id: true, topicTitle: true, ageGroup: true, duration: true } },
        schedule: { select: { id: true, startTime: true, endTime: true, location: true, coachNote: true } },
        attendances: { where: { userId: req.user.id } },
      },
      orderBy: [{ checkInOpen: 'asc' }, { title: 'asc' }],
    })
    const topics = req.user.role === 'coach'
      ? await prisma.trainingSession.findMany({
          where: { coachId: req.user.id, date: { gte: startOfDay(), lt: tomorrow }, topicTitle: { not: '' } },
          select: { branchId: true },
        })
      : []
    res.json(sessions.map(({ attendances, ...session }) => ({
      ...session,
      attendance: attendances[0] || null,
      window: windowState(session),
      // Hanya coach yang perlu membuat topik sebelum timestamp; head coach
      // mempertahankan flow absensi harian existing.
      topicReady: req.user.role !== 'coach' || !!session.trainingSession?.topicTitle?.trim() || topics.some((topic) => !session.branchId || topic.branchId === session.branchId),
    })))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Sumber jadwal: sesi latihan & event pada tanggal itu, plus penanda sudah
// punya jadwal absensi atau belum.
router.get('/sources', authenticate, authorize('admin', 'head_coach'), async (req, res) => {
  const day = startOfDay(req.query.date)
  const end = new Date(day)
  end.setDate(end.getDate() + 1)
  try {
    const branchIds = await headCoachBranchIds(req)
    const branchWhere = branchIds ? { OR: [{ branchId: { in: branchIds } }, { branchId: null }] } : {}
    const eventWhere = branchIds
      ? { OR: [{ branches: { none: {} } }, { branches: { some: { branchId: { in: branchIds } } } }] }
      : {}

    const [trainings, events, sessions] = await Promise.all([
      prisma.trainingSession.findMany({
        where: { date: { gte: day, lt: end }, ...branchWhere },
        include: {
          coach: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true, code: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.event.findMany({
        where: { date: { gte: day, lt: end }, ...eventWhere },
        include: { branches: { include: { branch: { select: { id: true, name: true, code: true } } } } },
        orderBy: { date: 'asc' },
      }),
      prisma.coachAttendanceSession.findMany({
        where: { date: { gte: day, lt: end } },
        select: { trainingSessionId: true, eventId: true, branchId: true, scheduleId: true, status: true },
      }),
    ])
    // Topik latihan di cabang yang jadwalnya sudah punya sesi absensi dianggap sudah tercakup.
    const scheduledBranches = new Set(sessions.filter((s) => s.scheduleId && s.status === 'active' && s.branchId).map((s) => s.branchId))

    const trainingLinks = new Set(sessions.map((s) => s.trainingSessionId).filter(Boolean))
    const eventCounts = new Map()
    const eventBranchLinks = new Map()
    for (const session of sessions) {
      if (!session.eventId) continue
      eventCounts.set(session.eventId, (eventCounts.get(session.eventId) || 0) + 1)
      if (!eventBranchLinks.has(session.eventId)) eventBranchLinks.set(session.eventId, new Set())
      eventBranchLinks.get(session.eventId).add(session.branchId || '__all__')
    }

    res.json({
      trainings: trainings.map((training) => ({ ...training, hasSession: trainingLinks.has(training.id) || (!!training.branchId && scheduledBranches.has(training.branchId)) })),
      events: events.map((event) => {
        const needed = event.branches.length > 0 ? event.branches.length : 1
        return {
          ...event,
          branches: event.branches.map((row) => row.branch.id),
          branchDetails: event.branches.map((row) => row.branch),
          existingBranchIds: Array.from(eventBranchLinks.get(event.id) || []),
          hasSession: (eventCounts.get(event.id) || 0) >= needed,
        }
      }),
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Buat jadwal manual atau dari sesi latihan / event.
router.post('/', authenticate, authorize('admin', 'head_coach'), async (req, res) => {
  const { type, title, date, branchId, coachId, coachIds, trainingSessionId, eventId, note, status } = req.body || {}
  const times = normalizeWindow(req.body || {})
  if (times.error) return res.status(400).json({ error: times.error })
  if (!date && !trainingSessionId && !eventId) return res.status(400).json({ error: 'Tanggal wajib diisi' })
  try {
    let data = {
      type: type || 'training',
      title: title || '',
      date: startOfDay(date),
      branchId: branchId || null,
      coachId: coachId || null,
      note: note || null,
      status: status || 'active',
      ...times,
    }
    const branchIds = await headCoachBranchIds(req)
    let eventWindow = null

    if (trainingSessionId) {
      const training = await prisma.trainingSession.findUnique({ where: { id: trainingSessionId } })
      if (!training) return res.status(404).json({ error: 'Sesi latihan tidak ditemukan' })
      if (branchIds && training.branchId && !branchIds.includes(training.branchId)) {
        return res.status(403).json({ error: 'Anda hanya dapat mengatur absensi di cabang Anda' })
      }
      const linked = await prisma.coachAttendanceSession.findUnique({ where: { trainingSessionId }, select: { id: true } })
      if (linked) return res.status(409).json({ error: 'Jadwal untuk sesi latihan ini sudah ada' })
      if (training.branchId) {
        const fromSchedule = await prisma.coachAttendanceSession.findFirst({
          where: { scheduleId: { not: null }, branchId: training.branchId, date: startOfDay(training.date), status: 'active' },
          select: { id: true },
        })
        if (fromSchedule) return res.status(409).json({ error: 'Cabang ini sudah punya jadwal absensi dari Jadwal Latihan di tanggal itu. Atur coach & jam lewat jadwal tersebut.' })
      }
      data = {
        ...data,
        type: 'training',
        trainingSessionId,
        title: title || training.topicTitle || `Latihan ${training.ageGroup || ''}`.trim(),
        date: startOfDay(training.date),
        branchId: training.branchId || null,
        coachId: training.coachId || null,
      }
    }

    if (eventId) {
      const event = await prisma.event.findUnique({ where: { id: eventId }, include: { branches: true } })
      if (!event) return res.status(404).json({ error: 'Event tidak ditemukan' })
      const eventBranchIds = event.branches.map((row) => row.branchId)
      if (eventBranchIds.length > 0) {
        if (!data.branchId) return res.status(400).json({ error: 'Pilih cabang event yang akan diabsen' })
        if (!eventBranchIds.includes(data.branchId)) return res.status(400).json({ error: 'Cabang tidak termasuk dalam event ini' })
      } else {
        data.branchId = null
      }
      if (branchIds && data.branchId && !branchIds.includes(data.branchId)) {
        return res.status(403).json({ error: 'Anda hanya dapat mengatur absensi di cabang Anda' })
      }
      const duplicate = await prisma.coachAttendanceSession.findFirst({
        where: { eventId, branchId: data.branchId ?? null },
        select: { id: true },
      })
      if (duplicate) return res.status(409).json({ error: 'Jadwal absensi event untuk cabang ini sudah ada' })
      eventWindow = windowFromTimes(event.startTime, event.endTime)
      data = {
        ...data,
        type: event.type === 'tournament' ? 'tournament' : 'event',
        eventId,
        title: title || event.title,
        date: startOfDay(event.date),
      }
    }

    if (branchIds && data.branchId && !branchIds.includes(data.branchId)) {
      return res.status(403).json({ error: 'Anda hanya dapat mengatur absensi di cabang Anda' })
    }
    if (!data.title) return res.status(400).json({ error: 'Nama/judul sesi wajib diisi' })

    // Jam dari form dianggap manual, kecuali sama persis dengan jam yang
    // dihitung dari jam event (tetap ikut berubah bila jam event diubah).
    const sameAsEvent = !!eventWindow
      && eventWindow.checkInOpen === data.checkInOpen
      && eventWindow.checkInClose === data.checkInClose
      && eventWindow.checkOutClose === data.checkOutClose
    const created = await prisma.coachAttendanceSession.create({
      data: { ...data, windowManual: !sameAsEvent, createdById: req.user.id },
    })
    // Jadwal event/manual boleh punya banyak coach bertugas; kosong = semua coach cabang.
    if (Array.isArray(coachIds)) await setSessionCoaches(created.id, coachIds)
    res.status(201).json(await prisma.coachAttendanceSession.findUnique({ where: { id: created.id }, include: SESSION_INCLUDE }))
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Atur coach bertugas untuk banyak jadwal sekaligus (mis. seluruh event satu bulan).
router.put('/coaches', authenticate, authorize('admin', 'head_coach'), async (req, res) => {
  const { month, year, date, type, coachIds } = req.body || {}
  if (!Array.isArray(coachIds)) return res.status(400).json({ error: 'coachIds wajib berupa daftar (boleh kosong = semua coach)' })
  try {
    const where = {}
    if (month && year) where.date = monthRange(Number(month), Number(year))
    else if (date) where.date = startOfDay(date)
    else return res.status(400).json({ error: 'Pilih bulan atau tanggal' })
    // Penugasan massal hanya untuk event/tournament; sesi latihan punya coach sendiri.
    where.type = type && ['event', 'tournament'].includes(type) ? type : { in: ['event', 'tournament'] }

    const branchIds = await headCoachBranchIds(req)
    const requestedBranch = req.body.branchId || null
    if (branchIds) {
      if (requestedBranch && !branchIds.includes(requestedBranch)) {
        return res.status(403).json({ error: 'Anda tidak memiliki akses ke cabang ini' })
      }
      if (requestedBranch) where.branchId = requestedBranch
      else where.OR = [{ branchId: { in: branchIds } }, { branchId: null }]
    } else if (requestedBranch) {
      where.branchId = requestedBranch
    }

    const sessions = await prisma.coachAttendanceSession.findMany({ where, select: { id: true } })
    for (const session of sessions) await setSessionCoaches(session.id, coachIds)
    res.json({ updated: sessions.length })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Atur jam absen untuk banyak jadwal sekaligus (mis. 15:30-16:00 sebulan).
router.put('/window', authenticate, authorize('admin', 'head_coach'), async (req, res) => {
  const times = normalizeWindow(req.body || {})
  if (times.error) return res.status(400).json({ error: times.error })
  try {
    const where = {}
    if (req.body.month && req.body.year) {
      where.date = monthRange(Number(req.body.month), Number(req.body.year))
    } else if (req.body.date) {
      where.date = startOfDay(req.body.date)
    } else {
      return res.status(400).json({ error: 'Pilih bulan atau tanggal' })
    }
    if (req.body.type) where.type = req.body.type

    const branchIds = await headCoachBranchIds(req)
    const requestedBranch = req.body.branchId || null
    if (branchIds) {
      if (requestedBranch && !branchIds.includes(requestedBranch)) {
        return res.status(403).json({ error: 'Anda tidak memiliki akses ke cabang ini' })
      }
      if (requestedBranch) where.branchId = requestedBranch
      else where.OR = [{ branchId: { in: branchIds } }, { branchId: null }]
    } else if (requestedBranch) {
      where.branchId = requestedBranch
    }

    const result = await prisma.coachAttendanceSession.updateMany({ where, data: { ...times, windowManual: true } })
    res.json({ updated: result.count, ...times })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:id', authenticate, authorize('admin', 'head_coach'), async (req, res) => {
  try {
    const existing = await prisma.coachAttendanceSession.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ error: 'Jadwal absensi tidak ditemukan' })
    await assertManageSession(req.user, existing)

    const times = normalizeWindow({ ...existing, ...(req.body || {}) })
    if (times.error) return res.status(400).json({ error: times.error })

    const { title, date, branchId, coachId, coachIds, note, status } = req.body || {}
    if (status !== undefined && !['active', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Status tidak valid' })
    }
    // Mengubah jam lewat form = manual (tidak ditimpa jadwal/event). "resetWindow"
    // mengembalikan jam ke hasil hitung dari jam jadwal/event.
    const body = req.body || {}
    const timesChanged = ['checkInOpen', 'checkInClose', 'checkOutClose'].some((key) => body[key] !== undefined && body[key] !== existing[key])
    let windowData = { ...times, windowManual: timesChanged ? true : existing.windowManual }
    if (body.resetWindow) {
      const source = existing.scheduleId
        ? await prisma.schedule.findUnique({ where: { id: existing.scheduleId }, select: { startTime: true, endTime: true } })
        : existing.eventId
          ? await prisma.event.findUnique({ where: { id: existing.eventId }, select: { startTime: true, endTime: true } })
          : null
      const computed = source ? windowFromTimes(source.startTime, source.endTime) : null
      if (!computed) return res.status(400).json({ error: 'Jadwal/event ini belum punya jam mulai, jam tidak bisa direset' })
      windowData = { ...computed, windowManual: false }
    }
    const data = {
      ...windowData,
      title: title === undefined ? existing.title : title,
      note: note === undefined ? existing.note : (note || null),
      status: status === undefined ? existing.status : status,
      coachId: coachId === undefined ? existing.coachId : (coachId || null),
    }
    // Tanggal/cabang sesi latihan mengikuti sesi latihannya; event mengikuti event.
    if (!existing.trainingSessionId && !existing.eventId && !existing.scheduleId) {
      data.date = date ? startOfDay(date) : existing.date
      data.branchId = branchId === undefined ? existing.branchId : (branchId || null)
      if (req.user.role === 'head_coach' && data.branchId) {
        const branchIds = await getUserBranchIds(req.user.id)
        if (!branchIds.includes(data.branchId)) return res.status(403).json({ error: 'Anda hanya dapat mengatur absensi di cabang Anda' })
      }
    }

    await prisma.coachAttendanceSession.update({ where: { id: existing.id }, data })
    if (Array.isArray(coachIds)) {
      await setSessionCoaches(existing.id, coachIds)
      // Sumber kebenaran coach bertugas jadwal latihan ada di jadwalnya.
      if (existing.scheduleId) await setScheduleCoaches(existing.scheduleId, coachIds)
    }
    res.json(await prisma.coachAttendanceSession.findUnique({ where: { id: existing.id }, include: SESSION_INCLUDE }))
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:id', authenticate, authorize('admin', 'head_coach'), async (req, res) => {
  try {
    const existing = await prisma.coachAttendanceSession.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ error: 'Jadwal absensi tidak ditemukan' })
    await assertManageSession(req.user, existing)
    await prisma.coachAttendanceSession.delete({ where: { id: existing.id } })
    res.json({ message: 'Jadwal absensi dihapus' })
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Melengkapi jadwal sebulan dari sesi latihan & event yang sudah ada.
router.post('/generate', authenticate, authorize('admin', 'head_coach'), async (req, res) => {
  const now = new Date()
  const month = Number(req.body?.month) || now.getMonth() + 1
  const year = Number(req.body?.year) || now.getFullYear()
  try {
    const branchIds = await headCoachBranchIds(req)
    const result = await generateMonthAttendanceSessions(year, month, branchIds)
    res.json({ month, year, ...result })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Sinkronisasi manual satu sesi latihan (dipakai bila jadwal terhapus).
router.post('/sync-training/:trainingSessionId', authenticate, authorize('admin', 'head_coach'), async (req, res) => {
  try {
    const training = await prisma.trainingSession.findUnique({ where: { id: req.params.trainingSessionId } })
    if (!training) return res.status(404).json({ error: 'Sesi latihan tidak ditemukan' })
    const branchIds = await headCoachBranchIds(req)
    if (branchIds && training.branchId && !branchIds.includes(training.branchId)) {
      return res.status(403).json({ error: 'Anda hanya dapat mengatur absensi di cabang Anda' })
    }
    res.json(await ensureTrainingSessionAttendance(training))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
