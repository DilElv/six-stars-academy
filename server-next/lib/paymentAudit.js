import prisma from './prisma.js'

// Audit Pembayaran: (1) jejak audit setiap perubahan/konfirmasi penting, dan
// (2) pendeteksi anomali dari data pembayaran yang ada. Semua tulis-audit
// dibungkus try/catch supaya kegagalan mencatat tidak pernah menggagalkan
// operasi pembayaran itu sendiri.

const AUDIT_ACTION_LABEL = {
  edit: 'Diubah admin',
  delete: 'Dihapus admin',
  cancel: 'Dibatalkan parent',
  callback_paid: 'Konfirmasi gateway (lunas)',
  callback_failed: 'Konfirmasi gateway (gagal)',
  reconcile_paid: 'Rekonsiliasi otomatis (lunas)',
  sync_paid: 'Sinkronisasi manual (lunas)',
  invoice_created: 'Tagihan dibuat',
  invoice_edit: 'Tagihan diubah',
  invoice_delete: 'Tagihan dihapus',
  mark_paid_manual: 'Ditandai lunas manual',
}

export function auditActionLabel(action) {
  return AUDIT_ACTION_LABEL[action] || action
}

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

const EFFECT_TYPES = new Set(['renewal', 'event', 'cart'])
const STUCK_PENDING_HOURS = 24

function hoursSince(date) {
  return (Date.now() - new Date(date).getTime()) / (60 * 60 * 1000)
}

function studentLabel(student) {
  if (!student) return '—'
  return student.fullName + (student.studentId ? ` (${student.studentId})` : '')
}

// Membangun daftar anomali dari data pembayaran. Tidak menulis apa pun.
export function detectPaymentAnomalies(payments, now = new Date()) {
  const anomalies = []
  const push = (payment, type, severity, title, detail) => {
    anomalies.push({
      id: `${type}:${payment.id}`,
      type,
      severity,
      title,
      detail,
      paymentId: payment.id,
      paymentType: payment.paymentType,
      status: payment.status,
      studentName: studentLabel(payment.student),
      amount: payment.totalAmount ?? payment.amount ?? 0,
      createdAt: payment.createdAt,
    })
  }

  const pendingGroups = new Map()
  const successRenewals = new Map()
  for (const payment of payments) {
    const total = payment.totalAmount ?? payment.amount ?? 0

    // 1) Pending terlalu lama — mungkin gateway tidak pernah mengonfirmasi.
    if (payment.status === 'pending' && hoursSince(payment.createdAt) > STUCK_PENDING_HOURS) {
      const hours = Math.floor(hoursSince(payment.createdAt))
      push(payment, 'stuck_pending', 'warning', 'Pending terlalu lama', `Sudah ${hours} jam menunggu konfirmasi ${payment.paymentType}.`)
    }

    // 2) Lunas tetapi efek data belum diterapkan (mismatch status vs efek).
    if (payment.status === 'success' && !payment.effectsAppliedAt && EFFECT_TYPES.has(payment.paymentType)) {
      push(payment, 'success_no_effects', 'warning', 'Lunas tanpa efek', 'Status lunas tetapi paket/sesi/event belum terterap.')
    }

    // 3) Total pembayaran keranjang tidak sama dengan jumlah itemnya.
    if (payment.paymentType === 'cart' && Array.isArray(payment.cartItems)) {
      const itemsTotal = payment.cartItems.reduce((sum, item) => sum + (item.amount || 0), 0)
      if (itemsTotal !== total) {
        push(payment, 'cart_total_mismatch', 'warning', 'Total keranjang tidak cocok', `Total pembayaran ${total} ≠ jumlah item ${itemsTotal}.`)
      }
    }

    // 4) Pending tanpa referensi gateway (pembuatan billing gagal di tengah jalan).
    if (payment.status === 'pending' && !payment.transactionId && total > 0) {
      push(payment, 'missing_gateway_ref', 'info', 'Tanpa referensi gateway', 'Pending tetapi belum punya ID transaksi gateway.')
    }

    // Kumpulkan kandidat duplikat pending.
    if (payment.status === 'pending') {
      const key = `${payment.studentId}|${payment.paymentType}|${payment.packageId || ''}|${total}`
      const group = pendingGroups.get(key) || []
      group.push(payment)
      pendingGroups.set(key, group)
    }

    // Kumpulkan perpanjangan yang sudah lunas untuk deteksi perpanjangan ganda.
    if (payment.status === 'success' && payment.paymentType === 'renewal') {
      const key = `${payment.studentId}|${payment.packageId || ''}`
      const group = successRenewals.get(key) || []
      group.push(payment)
      successRenewals.set(key, group)
    }
  }

  // 6) Beberapa perpanjangan LUNAS untuk paket & anak yang sama dalam rentang
  //    singkat — tanda periode yang sama ditagih lebih dari sekali.
  const DUPLICATE_RENEWAL_DAYS = 45
  for (const group of successRenewals.values()) {
    if (group.length < 2) continue
    const times = group.map((p) => new Date(p.paidAt || p.createdAt).getTime()).sort((a, b) => a - b)
    const spanDays = (times[times.length - 1] - times[0]) / (24 * 60 * 60 * 1000)
    if (spanDays > DUPLICATE_RENEWAL_DAYS) continue
    for (const payment of group) {
      push(payment, 'duplicate_renewal', 'warning', 'Perpanjangan ganda', `Ada ${group.length} perpanjangan lunas untuk paket & anak yang sama dalam ${Math.round(spanDays)} hari. Periksa apakah periode yang sama tertagih dua kali.`)
    }
  }

  // 5) Beberapa pembayaran pending identik untuk anak & jenis yang sama.
  for (const group of pendingGroups.values()) {
    if (group.length > 1) {
      for (const payment of group) {
        push(payment, 'duplicate_pending', 'info', 'Kemungkinan ganda', `Ada ${group.length} pembayaran pending identik (${payment.paymentType}).`)
      }
    }
  }

  const order = { warning: 0, info: 1 }
  anomalies.sort((a, b) => (order[a.severity] - order[b.severity]) || (new Date(b.createdAt) - new Date(a.createdAt)))
  return anomalies
}

// Ringkasan + anomali + jejak audit terbaru untuk halaman Audit Pembayaran.
export async function getPaymentAudit({ days = 90, logLimit = 60 } = {}) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const payments = await prisma.payment.findMany({
    where: { OR: [{ createdAt: { gte: since } }, { status: 'pending' }] },
    include: {
      cartItems: { select: { amount: true } },
      student: { select: { id: true, fullName: true, studentId: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const anomalies = detectPaymentAnomalies(payments)

  const summary = {
    scanned: payments.length,
    pending: payments.filter((p) => p.status === 'pending').length,
    success: payments.filter((p) => p.status === 'success').length,
    failed: payments.filter((p) => p.status === 'failed').length,
    warnings: anomalies.filter((a) => a.severity === 'warning').length,
    anomalies: anomalies.length,
    days,
  }

  const logs = await prisma.paymentAuditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: logLimit,
    include: {
      actor: { select: { id: true, name: true, role: true } },
    },
  })

  const studentIds = [...new Set(logs.map((l) => l.studentId).filter(Boolean))]
  const students = studentIds.length
    ? await prisma.student.findMany({ where: { id: { in: studentIds } }, select: { id: true, fullName: true, studentId: true } })
    : []
  const studentMap = new Map(students.map((s) => [s.id, s]))

  return {
    generatedAt: new Date(),
    summary,
    anomalies,
    logs: logs.map((l) => ({
      id: l.id,
      action: l.action,
      actionLabel: auditActionLabel(l.action),
      paymentId: l.paymentId,
      actorName: l.actor?.name || (l.actorRole ? l.actorRole : 'Sistem'),
      actorRole: l.actorRole,
      studentName: studentLabel(studentMap.get(l.studentId)),
      amount: l.amount,
      before: l.before,
      after: l.after,
      note: l.note,
      createdAt: l.createdAt,
    })),
  }
}
