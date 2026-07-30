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
