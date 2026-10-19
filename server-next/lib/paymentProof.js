// Aturan bukti pembayaran.
//
// Setiap pembayaran baru wajib punya bukti (foto/screenshot) supaya ikut
// dihitung sebagai pemasukan di laporan keuangan. Pembayaran yang sudah ada
// sebelum fitur ini ditandai `proofExempt = true` oleh migrasi, sehingga tetap
// dihitung apa adanya (sesuai keputusan: "biarkan apa adanya").

// Benar bila pembayaran ini sudah memenuhi syarat bukti.
export function hasProof(payment) {
  if (!payment) return false
  return !!payment.proofUrl || !!payment.proofExempt
}

// Filter Prisma untuk pembayaran yang BOLEH masuk laporan keuangan:
// punya bukti, ATAU dikecualikan (data lama).
export function incomeProofWhere() {
  return { OR: [{ proofUrl: { not: null } }, { proofExempt: true }] }
}

// Filter Prisma untuk pembayaran lunas yang BELUM punya bukti dan seharusnya
// punya (pembayaran baru) — dipakai daftar "Belum ada bukti" untuk admin.
export function missingProofWhere() {
  return { status: 'success', proofUrl: null, proofExempt: false }
}
