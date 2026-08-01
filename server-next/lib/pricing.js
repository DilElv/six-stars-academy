import prisma from './prisma.js'

// Resolves what a specific branch actually pays for a package: the branch's
// override set in Pengaturan > Harga Paket (BranchPackage), falling back to
// the package's own base price when that branch has no override for it.
export async function getEffectivePrice(packageId, branchId) {
  if (branchId) {
    const bp = await prisma.branchPackage.findUnique({
      where: { branchId_packageId: { branchId, packageId } },
    })
    if (bp) return bp.price
  }
  const pkg = await prisma.package.findUnique({ where: { id: packageId }, select: { price: true } })
  return pkg?.price ?? 0
}
