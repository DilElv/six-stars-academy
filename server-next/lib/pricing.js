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

// The final amount a student actually pays for a package: the branch override
// (Pengaturan > Harga Paket) or the package's own price, minus the student's
// SPP scholarship. Single source of truth so the amount the admin puts on a
// tagihan is exactly the amount the parent sees in the cart — a mismatch would
// mean the tagihan overcharges or undercharges.
//
// Custom (hidden, per-student) packages are quoted explicitly by the admin, so
// their price is already final and no scholarship is stacked on top of it.
export async function resolvePackagePrice(pkg, student) {
  if (!pkg) return 0
  if (pkg.isCustom) return Math.max(0, Math.round(pkg.price || 0))
  const base = await getEffectivePrice(pkg.id, student?.branchId)
  const percent = student?.sppScholarshipPercent || 0
  const discount = Math.round(base * percent / 100)
  return Math.max(0, base - discount)
}
