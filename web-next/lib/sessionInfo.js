// Mirrors computeSessionStats() in server-next/routes/students.js so list
// cards can show total sessions without an extra per-student fetch.
export function totalSessionsFor(student) {
  return student.package ? student.package.sessionsPerWeek * 4 * student.package.durationMonths : 0
}

export const PAYMENT_STATUS_BADGE = {
  success: { label: 'Lunas', color: 'bg-emerald-50 text-emerald-700' },
  pending: { label: 'Belum Lunas', color: 'bg-amber-50 text-amber-700' },
  failed: { label: 'Gagal', color: 'bg-red-50 text-red-600' },
}

// Student.status — 'needs_renewal' means quota-exhausted (see
// server-next/routes/attendance.js), not withdrawn, so it gets its own
// amber state distinct from 'active'/'inactive'.
export const STUDENT_STATUS_BADGE = {
  active: { label: 'Aktif', color: 'bg-emerald-400/20 text-emerald-300' },
  needs_renewal: { label: 'Perlu Perpanjang', color: 'bg-amber-400/20 text-amber-300' },
  inactive: { label: 'Nonaktif', color: 'bg-white/10 text-gray-300' },
}
