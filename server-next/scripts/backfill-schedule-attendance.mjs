// Membuat sesi absensi coach untuk jadwal latihan yang dibuat sebelum fitur
// "coach bertugas" ada. Idempoten: jadwal yang sudah punya sesi hanya
// disegarkan (jam yang diatur manual tidak ditimpa).
// Jalankan sekali: node scripts/backfill-schedule-attendance.mjs
import 'dotenv/config'
import prisma from '../lib/prisma.js'
import { ensureScheduleAttendance } from '../lib/coachAttendance.js'

const from = new Date()
from.setDate(1)
from.setHours(0, 0, 0, 0)

const schedules = await prisma.schedule.findMany({ where: { date: { gte: from } }, include: { coaches: true } })
let done = 0
for (const schedule of schedules) {
  await ensureScheduleAttendance(schedule, { coachIds: schedule.coaches.map((row) => row.userId) })
  done += 1
}
console.log(`Sesi absensi disinkronkan untuk ${done} jadwal (mulai ${from.toISOString().slice(0, 10)})`)
await prisma.$disconnect()
