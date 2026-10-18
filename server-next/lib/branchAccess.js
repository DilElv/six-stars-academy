import prisma from './prisma.js'

// A coach can be assigned to multiple branches (UserBranch join table).
// head_coach and admin are unrestricted regardless of assignment — this
// helper is only meant to gate the `coach` role.
export async function getUserBranchIds(userId) {
  const rows = await prisma.userBranch.findMany({ where: { userId }, select: { branchId: true } })
  return rows.map((r) => r.branchId)
}

// Throws a 403 if branchId isn't one of the coach's assigned branches.
export async function assertBranchAccess(userId, branchId) {
  const branchIds = await getUserBranchIds(userId)
  if (!branchId || !branchIds.includes(branchId)) {
    throw Object.assign(new Error('Anda tidak memiliki akses ke cabang ini'), { status: 403 })
  }
}

// Gate read-only report/assessment access for the `coach` role: a coach may
// only read a student who belongs to one of their assigned branches.
// head_coach and admin pass through unrestricted. Throws 404/403.
export async function assertCoachStudentAccess(user, studentId) {
  if (user.role !== 'coach') return
  const student = await prisma.student.findUnique({ where: { id: studentId }, select: { branchId: true } })
  if (!student) throw Object.assign(new Error('Siswa tidak ditemukan'), { status: 404 })
  const branchIds = await getUserBranchIds(user.id)
  if (!student.branchId || !branchIds.includes(student.branchId)) {
    throw Object.assign(new Error('Anda tidak memiliki akses ke data siswa ini'), { status: 403 })
  }
}
