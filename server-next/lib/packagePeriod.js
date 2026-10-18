// A package period always ends at a calendar month boundary — the last day
// of the month that is (durationMonths - 1) months after the start month.
// E.g. a 1-month package starting any day in June always ends June 30; a
// 3-month package starting June 20 ends Aug 31. Sessions for the first
// (possibly partial) month are prorated by how many weeks actually remain
// until that boundary, floored at 1 so a package is never assigned zero;
// every additional full month gets the package's normal weekly*4 allocation.
export function computePackagePeriod(startDate, pkg) {
  const packageEndDate = new Date(startDate.getFullYear(), startDate.getMonth() + pkg.durationMonths, 0)

  const daysInStartMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate()
  const daysRemaining = daysInStartMonth - startDate.getDate() + 1
  const firstMonthSessions = Math.max(1, Math.round((daysRemaining / 7) * pkg.sessionsPerWeek))
  const totalSessions = firstMonthSessions + (pkg.durationMonths - 1) * pkg.sessionsPerWeek * 4

  return { packageEndDate, totalSessions }
}

export function parsePackageDates(start, end) {
  const parse = (value) => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Tanggal periode tidak valid')
    const [year, month, day] = value.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    if (year < 2000 || year > 2200 || date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) throw new Error('Tanggal periode tidak valid')
    return date
  }
  const packageStartDate = parse(start)
  const packageEndDate = parse(end)
  if (packageEndDate < packageStartDate) throw new Error('Tanggal akhir harus sama atau setelah tanggal mulai')
  return { packageStartDate, packageEndDate }
}
