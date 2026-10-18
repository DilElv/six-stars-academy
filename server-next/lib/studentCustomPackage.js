import prisma from './prisma.js'

// Keep the chosen price even if its payment fails; payment status does not
// cancel a student's pricing agreement. A newer standard quote replaces it.
export async function findExistingCustomPackage(student, client = prisma) {
  const latest = await client.payment.findFirst({
    where: { studentId: student.id, paymentType: 'renewal' },
    orderBy: { createdAt: 'desc' },
    include: { package: true },
  })
  if (latest) return latest.package?.isCustom ? latest.package : null
  return student.package?.isCustom ? student.package : null
}

// Creates (or reuses) the hidden, student-specific custom-priced Package used
// by "anak lama" / "custom" renewals. Reused only when every field matches, so
// the same quote never produces a duplicate Package row.
export async function resolveCustomPackage(student, customData, client = prisma) {
  const existing = await findExistingCustomPackage(student, client)
  if (existing && Object.entries(customData).every(([key, value]) => existing[key] === value)) {
    return existing
  }
  return client.package.create({ data: { ...customData, status: 'inactive', isCustom: true } })
}
