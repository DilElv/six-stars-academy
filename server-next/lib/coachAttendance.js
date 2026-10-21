import prisma from './prisma.js'
import { getUserBranchIds } from './branchAccess.js'

// Absensi coach sekarang berbasis sesi. Helper ini menyatukan aturan:
// - format jam "HH:mm" (WIB, server berjalan di Asia/Jakarta),
// - status jendela absen (sebelum buka / terbuka / sudah tutup),
// - pembuatan jadwal otomatis dari sesi latihan & event,
// - pembatasan akses admin vs head coach.
export const DEFAULT_WINDOWS = { checkInOpen: '00:00', checkInClose: '23:59', checkOutClose: '23:59' }
// Contoh default yang dipakai form manual (bisa diubah admin/head coach).
export const EXAMPLE_WINDOWS = { checkInOpen: '15:30', checkInClose: '16:00', checkOutClose: '23:59' }

export function isTime(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || ''))
}

export function timeToMinutes(value) {
  const [h, m] = String(value).split(':').map(Number)
  return h * 60 + m
}

export function startOfDay(value = new Date()) {
  const d = new Date(value)
  d.setHours(0, 0, 0, 0)
  return d
}

export function sameDay(a, b = new Date()) {
  return startOfDay(a).getTime() === startOfDay(b).getTime()
}

// Jam jadwal lama diketik bebas ("16.00", "9:30", "9"); jadikan "HH:mm" atau null.
export function normalizeClock(value) {
  const match = String(value ?? '').trim().match(/^(\d{1,2})(?:[.:](\d{1,2}))?$/)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = match[2] === undefined ? 0 : Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function minutesToTime(total) {
  const clamped = Math.min(23 * 60 + 59, Math.max(0, total))
  return `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`
}

// Jendela absen dari jam mulai/selesai kegiatan: buka 30 menit sebelum mulai,
// tutup 30 menit sesudah mulai, absen pulang sampai 60 menit setelah selesai
// (atau 2 jam setelah mulai bila jam selesai kosong). Null bila jam mulai tidak valid.
export function windowFromTimes(startTimeRaw, endTimeRaw) {
  const startTime = normalizeClock(startTimeRaw)
  const endTime = normalizeClock(endTimeRaw)
  if (!startTime) return null
  const start = timeToMinutes(startTime)
  const end = endTime && timeToMinutes(endTime) > start ? timeToMinutes(endTime) : start + 120
  const checkInClose = Math.min(23 * 60 + 59, start + 30)
  return {
    checkInOpen: minutesToTime(Math.min(start - 30, checkInClose - 1)),
    checkInClose: minutesToTime(checkInClose),
    checkOutClose: minutesToTime(Math.max(checkInClose, end + 60)),
  }
}

export function normalizeWindow(body) {
  const checkInOpen = body.checkInOpen || '00:00'
  const checkInClose = body.checkInClose || '23:59'
  const checkOutClose = body.checkOutClose || '23:59'
  for (const value of [checkInOpen, checkInClose, checkOutClose]) {
    if (!isTime(value)) return { error: 'Format jam harus HH:mm (contoh 15:30)' }
  }
  if (timeToMinutes(checkInOpen) >= timeToMinutes(checkInClose)) {
    return { error: 'Jam buka absen masuk harus lebih awal dari jam tutup' }
  }
  if (timeToMinutes(checkOutClose) < timeToMinutes(checkInClose)) {
    return { error: 'Batas absen pulang tidak boleh sebelum jam tutup absen masuk' }
  }
  return { checkInOpen, checkInClose, checkOutClose }
}

export function windowState(session, now = new Date()) {
  const open = timeToMinutes(session.checkInOpen)
  const close = timeToMinutes(session.checkInClose)
  const outClose = timeToMinutes(session.checkOutClose)
  const minutes = now.getHours() * 60 + now.getMinutes()
  return {
    checkInOpen: session.checkInOpen,
    checkInClose: session.checkInClose,
    checkOutClose: session.checkOutClose,
    minutes,
    beforeOpen: minutes < open,
    canCheckIn: minutes >= open && minutes <= close,
    afterCheckInClose: minutes > close,
    canCheckOut: minutes <= outClose,
    afterCheckOutClose: minutes > outClose,
    label: `${session.checkInOpen}–${session.checkInClose}`,
  }
}

export function closedMessage(session, state) {
  if (state.beforeOpen) return `Absen masuk baru dibuka pukul ${session.checkInOpen} (ditutup ${session.checkInClose}).`
  if (state.afterCheckInClose) return `Batas absen masuk sudah lewat (ditutup pukul ${session.checkInClose}).`
  return 'Absen masuk sudah ditutup.'
}

// Admin bebas; head coach hanya untuk sesi di cabangnya (atau sesi semua cabang).
export async function canManageSession(user, session) {
  if (user.role === 'admin') return true
  if (user.role !== 'head_coach') return false
  if (!session?.branchId) return true
  const branchIds = await getUserBranchIds(user.id)
  return branchIds.includes(session.branchId)
}

export async function assertManageSession(user, session) {
  if (!(await canManageSession(user, session))) {
    throw Object.assign(new Error('Anda hanya dapat mengatur absensi di cabang Anda'), { status: 403 })
  }
}

// Sinkronisasi jadwal dari sesi latihan. Jam yang sudah diatur admin TIDAK
// ditimpa saat sesi latihan diedit — hanya judul/tanggal/cabang/coach.
export async function ensureTrainingSessionAttendance(trainingSession, defaults = DEFAULT_WINDOWS) {
  if (!trainingSession) return null
  const date = startOfDay(trainingSession.date)
  const title = trainingSession.topicTitle || `Latihan ${trainingSession.ageGroup || ''}`.trim()
  const existing = await prisma.coachAttendanceSession.findUnique({ where: { trainingSessionId: trainingSession.id } })

  // Cabang yang punya jadwal latihan di hari itu memakai sesi absensi dari
  // jadwal (jam & coach bertugas ikut jadwal). Sesi topik tidak dibuat lagi
  // supaya tidak ada dua absen untuk latihan yang sama; yang sudah ada dan
  // belum dipakai absen dihapus.
  if (trainingSession.branchId) {
    const scheduled = await prisma.coachAttendanceSession.findFirst({
      where: { scheduleId: { not: null }, branchId: trainingSession.branchId, date, status: 'active' },
      select: { id: true },
    })
    if (scheduled) {
      if (existing) {
        const used = await prisma.staffAttendance.count({ where: { sessionId: existing.id } })
        if (used === 0) await prisma.coachAttendanceSession.delete({ where: { id: existing.id } })
      }
      return null
    }
  }

  if (existing) {
    return prisma.coachAttendanceSession.update({
      where: { id: existing.id },
      data: {
        title,
        date,
        branchId: trainingSession.branchId || null,
        coachId: trainingSession.coachId || null,
      },
    })
  }
  return prisma.coachAttendanceSession.create({
    data: {
      type: 'training',
      title,
      date,
      branchId: trainingSession.branchId || null,
      coachId: trainingSession.coachId || null,
      trainingSessionId: trainingSession.id,
      ...defaults,
    },
  })
}

// Event dengan daftar cabang mendapat satu jadwal per cabang; event "semua
// cabang" memakai satu jadwal branchId null. Jam yang sudah diatur tidak
// ditimpa.
export async function ensureEventAttendance(event, defaults = DEFAULT_WINDOWS, { coachIds } = {}) {
  if (!event) return []
  const date = startOfDay(event.date)
  const type = event.type === 'tournament' ? 'tournament' : 'event'
  const branchIds = (event.branches || []).map((row) => row.branchId)
  const targets = branchIds.length > 0 ? branchIds : [null]
  const out = []
  for (const branchId of targets) {
    const existing = await prisma.coachAttendanceSession.findFirst({ where: { eventId: event.id, branchId: branchId ?? null } })
    const fromTimes = windowFromTimes(event.startTime, event.endTime)
    if (existing) {
      // Jam dari event hanya menimpa jam yang belum diatur manual.
      out.push(await prisma.coachAttendanceSession.update({
        where: { id: existing.id },
        data: { title: event.title, date, type, ...(fromTimes && !existing.windowManual ? fromTimes : {}) },
      }))
    } else {
      out.push(await prisma.coachAttendanceSession.create({
        data: { type, title: event.title, date, branchId, eventId: event.id, ...defaults, ...(fromTimes || {}) },
      }))
    }
    // coachIds undefined = jangan sentuh penugasan yang sudah ada.
    if (Array.isArray(coachIds)) await setSessionCoaches(out[out.length - 1].id, coachIds)
  }
  return out
}

// Ganti daftar coach yang ditugaskan pada satu sesi. Kosong = semua coach cabang.
export async function setSessionCoaches(sessionId, coachIds) {
  const ids = [...new Set((coachIds || []).filter(Boolean))]
  await prisma.$transaction([
    prisma.coachAttendanceSessionCoach.deleteMany({ where: { sessionId, ...(ids.length ? { userId: { notIn: ids } } : {}) } }),
    ...(ids.length
      ? [prisma.coachAttendanceSessionCoach.createMany({ data: ids.map((userId) => ({ sessionId, userId })), skipDuplicates: true })]
      : []),
  ])
  return ids
}

// Coach boleh absen di sesi ini bila tidak ada penugasan (semua coach cabang),
// atau namanya termasuk dalam daftar. `coachId` lama (sesi latihan) tetap berlaku.
export async function isCoachAssigned(session, userId) {
  if (session.coachId) return session.coachId === userId
  const assigned = session.assignedCoaches
    ? session.assignedCoaches.map((row) => row.userId)
    : (await prisma.coachAttendanceSessionCoach.findMany({ where: { sessionId: session.id }, select: { userId: true } })).map((row) => row.userId)
  return assigned.length === 0 || assigned.includes(userId)
}

// Sesi absensi coach dari jadwal latihan (Schedule). Jam absen dihitung dari
// jam jadwal selama belum diatur manual; coach bertugas = daftar di jadwal
// (kosong = semua coach cabang). Jadwal nonaktif membatalkan sesinya.
export async function ensureScheduleAttendance(schedule, { coachIds } = {}) {
  if (!schedule) return null
  const date = startOfDay(schedule.date)
  const status = schedule.status === 'active' ? 'active' : 'cancelled'
  const fromTimes = windowFromTimes(schedule.startTime, schedule.endTime)
  const title = `Latihan${schedule.location ? ` — ${schedule.location}` : ''}`
  const existing = await prisma.coachAttendanceSession.findUnique({ where: { scheduleId: schedule.id } })
  let session
  if (existing) {
    session = await prisma.coachAttendanceSession.update({
      where: { id: existing.id },
      data: {
        title, date, status,
        branchId: schedule.branchId,
        ...(fromTimes && !existing.windowManual ? fromTimes : {}),
      },
    })
  } else {
    session = await prisma.coachAttendanceSession.create({
      data: { type: 'training', title, date, status, branchId: schedule.branchId, scheduleId: schedule.id, ...DEFAULT_WINDOWS, ...(fromTimes || {}) },
    })
  }
  if (Array.isArray(coachIds)) await setSessionCoaches(session.id, coachIds)

  // Sesi absensi dari topik latihan di cabang & hari yang sama digantikan sesi jadwal.
  if (status === 'active') {
    const duplicates = await prisma.coachAttendanceSession.findMany({
      where: { id: { not: session.id }, scheduleId: null, trainingSessionId: { not: null }, branchId: schedule.branchId, date },
      select: { id: true },
    })
    for (const dup of duplicates) {
      const used = await prisma.staffAttendance.count({ where: { sessionId: dup.id } })
      if (used === 0) await prisma.coachAttendanceSession.delete({ where: { id: dup.id } })
    }
  }
  return session
}

// Ganti daftar coach bertugas pada jadwal latihan (tabel ScheduleCoach).
export async function setScheduleCoaches(scheduleId, coachIds) {
  const ids = [...new Set((coachIds || []).filter(Boolean))]
  await prisma.$transaction([
    prisma.scheduleCoach.deleteMany({ where: { scheduleId, ...(ids.length ? { userId: { notIn: ids } } : {}) } }),
    ...(ids.length ? [prisma.scheduleCoach.createMany({ data: ids.map((userId) => ({ scheduleId, userId })), skipDuplicates: true })] : []),
  ])
  return ids
}

// Dipakai tombol "Generate Jadwal Bulan Ini": melengkapi jadwal untuk semua
// sesi latihan & event pada bulan terpilih. `branchIds` membatasi head coach
// ke cabangnya sendiri.
export async function generateMonthAttendanceSessions(year, month, branchIds = null) {
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 1)
  const branchFilter = branchIds ? { OR: [{ branchId: { in: branchIds } }, { branchId: null }] } : {}
  const [trainings, events] = await Promise.all([
    prisma.trainingSession.findMany({ where: { date: { gte: start, lt: end }, ...branchFilter } }),
    prisma.event.findMany({
      where: {
        date: { gte: start, lt: end },
        ...(branchIds ? { OR: [{ branches: { none: {} } }, { branches: { some: { branchId: { in: branchIds } } } }] } : {}),
      },
      include: { branches: true },
    }),
  ])

  let created = 0
  let existing = 0
  const schedules = await prisma.schedule.findMany({
    where: { date: { gte: start, lt: end }, ...(branchIds ? { branchId: { in: branchIds } } : {}) },
    include: { coaches: true },
  })
  for (const schedule of schedules) {
    const has = await prisma.coachAttendanceSession.findUnique({ where: { scheduleId: schedule.id }, select: { id: true } })
    if (has) {
      existing += 1
      continue
    }
    await ensureScheduleAttendance(schedule, { coachIds: schedule.coaches.map((row) => row.userId) })
    created += 1
  }
  for (const training of trainings) {
    const has = await prisma.coachAttendanceSession.findUnique({ where: { trainingSessionId: training.id }, select: { id: true } })
    if (has) {
      existing += 1
      continue
    }
    await ensureTrainingSessionAttendance(training)
    created += 1
  }
  for (const event of events) {
    const eventBranchIds = event.branches.map((row) => row.branchId)
    const targets = eventBranchIds.length > 0 ? eventBranchIds.filter((id) => !branchIds || branchIds.includes(id)) : [null]
    for (const branchId of targets) {
      const has = await prisma.coachAttendanceSession.findFirst({ where: { eventId: event.id, branchId: branchId ?? null }, select: { id: true } })
      if (has) {
        existing += 1
        continue
      }
      await prisma.coachAttendanceSession.create({
        data: {
          type: event.type === 'tournament' ? 'tournament' : 'event',
          title: event.title,
          date: startOfDay(event.date),
          branchId,
          eventId: event.id,
          ...DEFAULT_WINDOWS,
          ...(windowFromTimes(event.startTime, event.endTime) || {}),
        },
      })
      created += 1
    }
  }
  return { created, existing }
}
