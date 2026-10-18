import prisma from './prisma.js'

export function monthlySessionLimit(pkg) {
  return pkg ? Math.max(0, Number(pkg.sessionsPerWeek || 0) * 4) : 0
}

export function isCurrentSessionMonth(student, now = new Date()) {
  return student.sessionMonth === now.getMonth() + 1 && student.sessionYear === now.getFullYear()
}

export async function ensureCurrentSessionMonth(studentOrId, client = prisma, now = new Date()) {
  if (client === prisma) {
    if (typeof studentOrId === 'object' && isCurrentSessionMonth(studentOrId, now)) return studentOrId
    const id = typeof studentOrId === 'string' ? studentOrId : studentOrId?.id
    if (!id) return studentOrId
    const fresh = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))`
      return ensureCurrentSessionMonth(id, tx, now)
    })
    return typeof studentOrId === 'object' ? { ...studentOrId, ...fresh } : fresh
  }
  const student = typeof studentOrId === 'string'
    ? await client.student.findUnique({ where: { id: studentOrId }, include: { package: true } })
    : studentOrId
  if (!student || isCurrentSessionMonth(student, now)) return student

  const packageExpired = student.packageEndDate && new Date(student.packageEndDate) < new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const legacy = student.sessionMonth == null || student.sessionYear == null
  await client.student.updateMany({
    where: { id: student.id, sessionMonth: student.sessionMonth, sessionYear: student.sessionYear },
    data: {
      sessionsUsed: legacy || packageExpired || !student.package || student.status === 'inactive' ? student.sessionsUsed : 0,
      totalSessions: legacy || packageExpired || !student.package || student.status === 'inactive' ? student.totalSessions : monthlySessionLimit(student.package),
      sessionMonth: now.getMonth() + 1,
      sessionYear: now.getFullYear(),
      status: legacy || student.status === 'inactive' ? student.status : packageExpired ? 'needs_renewal' : 'active',
    },
  })
  const updated = await client.student.findUnique({ where: { id: student.id }, include: { package: true, branch: true } })
  return { ...student, ...updated }
}

export function isDateInCurrentMonth(date, now = new Date()) {
  const value = new Date(date)
  return value.getMonth() === now.getMonth() && value.getFullYear() === now.getFullYear()
}

export function startMonthlySessionReset() {
  let running = false
  async function sweep() {
    if (running) return
    running = true
    try {
      const now = new Date()
      const students = await prisma.student.findMany({
        where: { OR: [{ sessionMonth: null }, { sessionYear: null }, { sessionMonth: { not: now.getMonth() + 1 } }, { sessionYear: { not: now.getFullYear() } }] },
        include: { package: true },
      })
      for (const student of students) await ensureCurrentSessionMonth(student, prisma, now)
    } catch (err) {
      console.error('Monthly session reset failed:', err.message)
    } finally { running = false }
  }
  void sweep()
  const timer = setInterval(sweep, 60_000)
  timer.unref()
  return timer
}
