import prisma from './prisma.js'

// Payroll Coach: honor harian x hari hadir terverifikasi + bonus/potongan
// manual. Dipisah dari route supaya rekap absensi bisa dipakai bersama menu
// Absensi Coach nanti.
export const PAYROLL_ROLES = ['coach', 'head_coach']

export function periodRange(month, year) {
  return { start: new Date(year, month - 1, 1), end: new Date(year, month, 1) }
}

export function computeTotal({ dailyRate = 0, daysPresent = 0, bonus = 0, deduction = 0 }) {
  return Math.max(0, (Number(dailyRate) || 0) * (Number(daysPresent) || 0) + (Number(bonus) || 0) - (Number(deduction) || 0))
}

const EMPTY_STATS = { daysPresent: 0, eventDays: 0, pending: 0, rejected: 0, missingCheckout: 0, totalRecords: 0 }

// Rekap absensi staf sebulan, dikelompokkan per user:
// - daysPresent: jumlah HARI (tanggal unik) yang absen masuknya sudah
//   diverifikasi admin — dasar honor harian. Check-in ke 2 cabang pada hari
//   yang sama tetap dihitung 1 hari.
// - missingCheckout: hadir tapi absen pulangnya belum diverifikasi.
export async function attendanceRecap(month, year, userIds) {
  const where = { date: { gte: periodRange(month, year).start, lt: periodRange(month, year).end } }
  if (userIds) where.userId = { in: userIds }
  const select = { userId: true, date: true, verifyStatus: true, checkOutVerifyStatus: true }
  const [records, eventRecords] = await Promise.all([
    prisma.staffAttendance.findMany({ where, select }),
    prisma.eventStaffAttendance.findMany({ where, select }),
  ])

  // Absensi latihan dan absensi event dihitung bersama: satu hari = satu tanggal
  // unik, jadi coach yang latihan sekaligus bertugas di event pada hari yang sama
  // tetap dihitung 1 hari honor.
  const byUser = new Map()
  const addRecord = (record, isEvent) => {
    const entry = byUser.get(record.userId) || { days: new Set(), eventDates: new Set(), pending: 0, rejected: 0, missingCheckout: 0, totalRecords: 0 }
    entry.totalRecords += 1
    if (record.verifyStatus === 'approved') {
      const day = new Date(record.date).toISOString().slice(0, 10)
      entry.days.add(day)
      if (isEvent) entry.eventDates.add(day)
      if (record.checkOutVerifyStatus !== 'approved') entry.missingCheckout += 1
    } else if (record.verifyStatus === 'rejected') {
      entry.rejected += 1
    } else {
      entry.pending += 1
    }
    byUser.set(record.userId, entry)
  }
  records.forEach((r) => addRecord(r, false))
  eventRecords.forEach((r) => addRecord(r, true))

  const out = new Map()
  for (const [userId, entry] of byUser) {
    out.set(userId, {
      daysPresent: entry.days.size,
      eventDays: entry.eventDates.size,
      pending: entry.pending,
      rejected: entry.rejected,
      missingCheckout: entry.missingCheckout,
      totalRecords: entry.totalRecords,
    })
  }
  return out
}

export function statsFor(recap, userId) {
  return recap.get(userId) || { ...EMPTY_STATS }
}
