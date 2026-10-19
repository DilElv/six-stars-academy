import prisma from './prisma.js'

// Jejak audit pembayaran: mencatat setiap perubahan/konfirmasi penting ke tabel
// `payment_audit_logs`.
//
// Catatan: halaman "Audit Pembayaran" beserta pendeteksi anomalinya dan endpoint
// `GET /payments/audit` / `POST /payments/audit/:id/sync` sudah dihapus. Fungsi
// `logPaymentAudit` SENGAJA dipertahankan karena masih dipakai oleh alur
// pembayaran (payments, cart, events, students) dan rekonsiliasi otomatis
// sebagai jejak audit. Semua tulis-audit dibungkus try/catch supaya kegagalan
// mencatat tidak pernah menggagalkan operasi pembayaran itu sendiri.

// Mencatat satu baris audit. `actor` = { id, role } (opsional; null = sistem).
export async function logPaymentAudit({ paymentId = null, action, actor = null, studentId = null, amount = null, before = null, after = null, note = null }) {
  try {
    await prisma.paymentAuditLog.create({
      data: {
        paymentId,
        action,
        actorId: actor?.id || null,
        actorRole: actor?.role || null,
        studentId,
        amount,
        before: before ?? undefined,
        after: after ?? undefined,
        note,
      },
    })
  } catch (err) {
    console.error('Payment audit log failed:', err.message)
  }
}
