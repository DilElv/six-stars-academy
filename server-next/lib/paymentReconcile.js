import prisma from './prisma.js'
import { isConfigured, queryPayment } from './rintisan.js'
import { syncPaymentWithRintisan, convertPendingRegistration } from './paymentHelpers.js'
import { logPaymentAudit } from './paymentAudit.js'

// Background safety net for payments that were never confirmed because
// Rintisan's webhook failed to reach us AND nobody had the app open to poll
// (see GET /payments/:id/sync and the registration wizard's polling).
//
// Admin no longer verifies payments manually (the "Menunggu Verifikasi" step
// was removed), so this sweep is what keeps a stray payment from getting stuck
// `pending` forever: every few minutes it actively asks Rintisan whether a
// still-pending transaction has actually been paid and, if so, applies the
// same success side effects the webhook would have.
const INTERVAL_MS = 5 * 60_000
const PAYMENT_MAX_AGE_DAYS = 14
const PENDING_REGISTRATION_MAX_AGE_DAYS = 3
const BATCH_SIZE = 25

function daysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
}

async function reconcilePayments() {
  const payments = await prisma.payment.findMany({
    where: { status: 'pending', transactionId: { not: null }, createdAt: { gte: daysAgo(PAYMENT_MAX_AGE_DAYS) } },
    orderBy: { createdAt: 'asc' },
    take: BATCH_SIZE,
  })
  for (const payment of payments) {
    try {
      const fresh = await syncPaymentWithRintisan(payment)
      if (payment.status !== 'success' && fresh?.status === 'success') {
        await logPaymentAudit({
          paymentId: fresh.id,
          action: 'reconcile_paid',
          studentId: fresh.studentId,
          amount: fresh.totalAmount,
          note: 'Rekonsiliasi otomatis latar belakang',
        })
      }
    } catch (err) {
      console.error(`Reconcile payment ${payment.id} failed:`, err.message)
    }
  }
}

async function reconcilePendingRegistrations() {
  const pendings = await prisma.pendingRegistration.findMany({
    where: { status: 'pending', transactionId: { not: null }, createdAt: { gte: daysAgo(PENDING_REGISTRATION_MAX_AGE_DAYS) } },
    orderBy: { createdAt: 'asc' },
    take: BATCH_SIZE,
  })
  for (const pending of pendings) {
    try {
      const result = await queryPayment(pending.transactionId)
      if (String(result.response_code) === '200' && result.payment_status === 'PAID') {
        await convertPendingRegistration(pending)
      }
    } catch (err) {
      console.error(`Reconcile pending registration ${pending.id} failed:`, err.message)
    }
  }
}

export function startPaymentReconciler() {
  let running = false
  async function sweep() {
    if (running) return
    if (!isConfigured()) return
    running = true
    try {
      await reconcilePayments()
      await reconcilePendingRegistrations()
    } catch (err) {
      console.error('Payment reconciliation sweep failed:', err.message)
    } finally {
      running = false
    }
  }
  void sweep()
  const timer = setInterval(sweep, INTERVAL_MS)
  timer.unref()
  return timer
}
