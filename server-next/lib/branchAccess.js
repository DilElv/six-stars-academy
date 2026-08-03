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
