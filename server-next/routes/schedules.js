import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { notifyUser } from '../lib/notify.js'
import { getUserBranchIds } from '../lib/branchAccess.js'
import { ensureScheduleAttendance, setScheduleCoaches, normalizeClock } from '../lib/coachAttendance.js'

const router = Router()

async function assertHeadCoach(coachId) {
  if (!coachId) return
  const coach = await prisma.user.findUnique({ where: { id: coachId } })
  if (!coach || coach.role !== 'head_coach') {
    throw Object.assign(new Error('Coach yang dipilih harus head coach'), { status: 400 })
  }
}

// Coach bertugas harus coach/head coach yang ditugaskan di cabang jadwal itu.
async function assertDutyCoaches(coachIds, branchId) {
  if (!Array.isArray(coachIds) || coachIds.length === 0) return
  const valid = await prisma.user.count({
    where: { id: { in: coachIds }, role: { in: ['coach', 'head_coach'] }, status: { not: 'inactive' }, branches: { some: { branchId } } },
  })
  if (valid !== new Set(coachIds).size) {
    throw Object.assign(new Error('Ada coach yang belum ditugaskan di cabang ini. Atur dulu di menu Penugasan Coach.'), { status: 400 })
  }
}

// Menyimpan coach bertugas lalu membuat/menyegarkan sesi absensi coach dari jadwal.
// Kegagalan sinkronisasi tidak menggagalkan jadwal; bisa diulang dari menu Absensi Coach.
async function syncScheduleAttendance(schedule, coachIds) {
  try {
    if (Array.isArray(coachIds)) await setScheduleCoaches(schedule.id, coachIds)
    const coaches = await prisma.scheduleCoach.findMany({ where: { scheduleId: schedule.id }, select: { userId: true } })
    await ensureScheduleAttendance(schedule, { coachIds: coaches.map((row) => row.userId) })
  } catch (err) {
    console.error('Gagal menyinkronkan absensi coach dari jadwal:', err)
  }
}

function cleanNote(value) {
  const text = String(value ?? '').trim().slice(0, 500)
  return text || null
}

function formatScheduleDate(date) {
  return new Date(date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' })
}

// Beri tahu coach yang bertugas lewat notifikasi (tidak menggagalkan penyimpanan jadwal).
async function notifyDutyCoaches(schedule, userIds, { updated = false } = {}) {
  try {
    const ids = [...new Set(userIds)].filter(Boolean)
    if (ids.length === 0) return
    const note = schedule.coachNote ? ` Catatan: ${schedule.coachNote}` : ''
    for (const userId of ids) {
      await notifyUser(userId, {
        type: updated ? 'schedule_duty_updated' : 'schedule_duty_assigned',
        title: updated ? 'Jadwal Latihan Diperbarui' : 'Anda Bertugas Melatih',
        message: `${formatScheduleDate(schedule.date)}, ${schedule.startTime}–${schedule.endTime} di ${schedule.location}.${note}`,
        link: '/coach/jadwal',
      })
    }
  } catch (err) {
    console.error('Gagal mengirim notifikasi jadwal ke coach:', err)
  }
}

// Narrow, read-only list for the "assign a coach" dropdown — head_coach
// users need this too (they create schedules for their own branch), but
// the full user-management endpoint under /admin/users is admin-only, so
// this can't reuse that one.
router.get('/head-coaches', authenticate, authorize('admin', 'head_coach'), async (req, res) => {
  try {
    const coaches = await prisma.user.findMany({
      where: { role: 'head_coach' },
      select: { id: true, name: true, branches: { select: { branch: { select: { name: true, code: true } } } } },
      orderBy: { name: 'asc' },
    })
    res.json(coaches)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/', authenticate, async (req, res) => {
  try {
    const where = {}
    if (req.query.branchId) where.branchId = req.query.branchId
    // Coach hanya melihat jadwal cabang yang ditugaskan kepadanya.
    if (req.user.role === 'coach') {
      const branchIds = await getUserBranchIds(req.user.id)
      where.branchId = req.query.branchId && branchIds.includes(req.query.branchId) ? req.query.branchId : { in: branchIds.length ? branchIds : ['__none__'] }
      if (req.query.branchId && !branchIds.includes(req.query.branchId)) where.branchId = '__none__'
    }
    // Coach bertugas & jendela absen hanya untuk staf; parent cukup jadwalnya.
    const staff = ['admin', 'head_coach', 'coach'].includes(req.user.role)
    const schedules = await prisma.schedule.findMany({
      where,
      include: {
        coach: { select: { name: true } },
        branch: true,
        ...(staff ? {
          coaches: { include: { user: { select: { id: true, name: true, photo: true } } } },
          attendanceSession: { select: { id: true, checkInOpen: true, checkInClose: true, checkOutClose: true, windowManual: true } },
        } : {}),
      },
      orderBy: { date: 'asc' },
    })
    res.json(schedules.map((schedule) => {
      if (!staff) {
        const { coachNote: _note, ...publicSchedule } = schedule
        return publicSchedule
      }
      // Daftar kosong = semua coach cabang bertugas.
      const assignedToMe = req.user.role === 'coach'
        ? schedule.coaches.length === 0 || schedule.coaches.some((row) => row.userId === req.user.id)
        : undefined
      // Catatan hanya untuk staf dan coach yang bertugas pada jadwal itu.
      if (req.user.role === 'coach' && !assignedToMe) {
        const { coachNote: _note, ...rest } = schedule
        return { ...rest, assignedToMe }
      }
      return { ...schedule, assignedToMe }
    }))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', authenticate, authorize('admin', 'head_coach'), async (req, res) => {
  const { dates, startTime, endTime, location, coachId, coachIds, coachNote, branchId } = req.body
  try {
    if (!Array.isArray(dates) || dates.length === 0) return res.status(400).json({ error: 'Pilih minimal satu tanggal' })
    if (!branchId) return res.status(400).json({ error: 'Cabang wajib dipilih — jadwal tanpa cabang tidak akan muncul di halaman head coach/coach' })
    await assertHeadCoach(coachId)
    await assertDutyCoaches(coachIds, branchId)

    // Same-branch, same-date is a double-booking — the DB unique index
    // catches races too, but checking here gives a specific error message
    // instead of a generic constraint-violation 500.
    const existing = await prisma.schedule.findMany({
      where: { branchId, date: { in: dates.map((d) => new Date(d)) } },
      select: { date: true },
    })
    if (existing.length > 0) {
      const clash = existing[0].date.toISOString().slice(0, 10)
      return res.status(409).json({ error: `Cabang ini sudah punya jadwal di tanggal ${clash}` })
    }

    const schedules = await prisma.$transaction(
      dates.map((date) =>
        prisma.schedule.create({
          data: { date: new Date(date), startTime: normalizeClock(startTime) || startTime, endTime: normalizeClock(endTime) || endTime, location, coachNote: cleanNote(coachNote), coachId: coachId || null, branchId },
        })
      )
    )
    for (const schedule of schedules) {
      await syncScheduleAttendance(schedule, Array.isArray(coachIds) ? coachIds : [])
      await notifyDutyCoaches(schedule, Array.isArray(coachIds) ? coachIds : [])
    }
    res.status(201).json(schedules)
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message })
    if (err.code === 'P2002') return res.status(409).json({ error: 'Cabang ini sudah punya jadwal di salah satu tanggal yang dipilih' })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:id', authenticate, authorize('admin', 'head_coach'), async (req, res) => {
  const { date, startTime, endTime, location, coachId, coachIds, coachNote, status, branchId } = req.body
  try {
    if (branchId !== undefined && !branchId) return res.status(400).json({ error: 'Cabang wajib dipilih — jadwal tanpa cabang tidak akan muncul di halaman head coach/coach' })
    await assertHeadCoach(coachId)
    if (Array.isArray(coachIds)) {
      const target = branchId || (await prisma.schedule.findUnique({ where: { id: req.params.id }, select: { branchId: true } }))?.branchId
      await assertDutyCoaches(coachIds, target)
    }

    if (date !== undefined) {
      const current = await prisma.schedule.findUnique({ where: { id: req.params.id } })
      if (!current) return res.status(404).json({ error: 'Jadwal tidak ditemukan' })
      const effectiveBranch = branchId || current.branchId
      const clash = await prisma.schedule.findFirst({
        where: { branchId: effectiveBranch, date: new Date(date), NOT: { id: req.params.id } },
      })
      if (clash) return res.status(409).json({ error: 'Cabang ini sudah punya jadwal di tanggal tersebut' })
    }

    const previous = await prisma.schedule.findUnique({ where: { id: req.params.id }, include: { coaches: true } })
    if (!previous) return res.status(404).json({ error: 'Jadwal tidak ditemukan' })
    const data = { startTime: startTime === undefined ? undefined : (normalizeClock(startTime) || startTime), endTime: endTime === undefined ? undefined : (normalizeClock(endTime) || endTime), location, coachId: coachId || null, status, branchId: branchId || undefined }
    if (coachNote !== undefined) data.coachNote = cleanNote(coachNote)
    if (date !== undefined) data.date = new Date(date)
    const schedule = await prisma.schedule.update({ where: { id: req.params.id }, data })
    await syncScheduleAttendance(schedule, coachIds)

    // Coach baru dikabari; coach lama hanya bila tanggal/jam/lokasi/catatan berubah.
    const before = previous.coaches.map((row) => row.userId)
    const after = Array.isArray(coachIds) ? [...new Set(coachIds)] : before
    const changed = previous.startTime !== schedule.startTime || previous.endTime !== schedule.endTime
      || previous.location !== schedule.location || (previous.coachNote || '') !== (schedule.coachNote || '')
      || new Date(previous.date).getTime() !== new Date(schedule.date).getTime()
    const added = after.filter((id) => !before.includes(id))
    await notifyDutyCoaches(schedule, added)
    if (changed) await notifyDutyCoaches(schedule, after.filter((id) => before.includes(id)), { updated: true })
    res.json(schedule)
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message })
    if (err.code === 'P2002') return res.status(409).json({ error: 'Cabang ini sudah punya jadwal di tanggal tersebut' })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:id', authenticate, authorize('admin', 'head_coach'), async (req, res) => {
  try {
    // Sesi absensi dari jadwal ini: dihapus bila belum ada yang absen; bila
    // sudah ada catatan absen, dibatalkan dan dilepas dari jadwal supaya
    // rekap kehadiran coach tidak hilang.
    const session = await prisma.coachAttendanceSession.findUnique({ where: { scheduleId: req.params.id }, select: { id: true } })
    if (session) {
      const used = await prisma.staffAttendance.count({ where: { sessionId: session.id } })
      if (used === 0) await prisma.coachAttendanceSession.delete({ where: { id: session.id } })
      else await prisma.coachAttendanceSession.update({ where: { id: session.id }, data: { status: 'cancelled', scheduleId: null, note: 'Jadwal latihan dihapus' } })
    }
    await prisma.schedule.delete({ where: { id: req.params.id } })
    res.json({ message: 'Deleted' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
