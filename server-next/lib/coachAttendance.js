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
export async function ensureEventAttendance(event, defaults = DEFAULT_WINDOWS) {
  if (!event) return []
  const date = startOfDay(event.date)
  const type = event.type === 'tournament' ? 'tournament' : 'event'
  const branchIds = (event.branches || []).map((row) => row.branchId)
  const targets = branchIds.length > 0 ? branchIds : [null]
  const out = []
  for (const branchId of targets) {
    const existing = await prisma.coachAttendanceSession.findFirst({ where: { eventId: event.id, branchId: branchId ?? null } })
    if (existing) {
      out.push(await prisma.coachAttendanceSession.update({
        where: { id: existing.id },
        data: { title: event.title, date, type },
      }))
    } else {
      out.push(await prisma.coachAttendanceSession.create({
        data: { type, title: event.title, date, branchId, eventId: event.id, ...defaults },
      }))
    }
  }
  return out
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
        },
      })
      created += 1
    }
  }
  return { created, existing }
}
