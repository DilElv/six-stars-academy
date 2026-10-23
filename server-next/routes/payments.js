import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { checkoutPayment, applyPaymentSuccess, applyPaymentFailed, convertPendingRegistration, failPendingRegistration, syncPaymentWithRintisan, releasePendingPayment } from '../lib/paymentHelpers.js'
import { verifyCallback, verifyCallbackToken, PAYMENT_METHODS, isSupportedPaymentMethod, isDuplicatePartnerTrxError } from '../lib/rintisan.js'
import { logPaymentAudit } from '../lib/paymentAudit.js'
import { missingProofWhere } from '../lib/paymentProof.js'
import { getUserBranchIds } from '../lib/branchAccess.js'

const router = Router()

// Snapshot field pembayaran yang relevan untuk jejak audit.
function paymentSnapshot(p) {
  if (!p) return null
  return {
    status: p.status,
    paymentType: p.paymentType,
    paymentMethod: p.paymentMethod,
    note: p.note,
    amount: p.amount,
    registrationFee: p.registrationFee,
    totalAmount: p.totalAmount,
    paidAt: p.paidAt ? new Date(p.paidAt).toISOString() : null,
  }
}

function paymentDiff(before, after) {
  if (!before || !after) return ''
  const changed = []
  for (const key of Object.keys(after)) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      changed.push(`${key}: ${before[key] ?? '—'} → ${after[key] ?? '—'}`)
    }
  }
  return changed.join(', ')
}

router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const where = {}
    if (req.query.status) where.status = req.query.status
    if (req.query.proof === 'missing') Object.assign(where, missingProofWhere())
    else if (req.query.proof === 'present') where.proofUrl = { not: null }
    const payments = await prisma.payment.findMany({
      where,
      include: { package: true, cartItems: true, student: { select: { fullName: true, studentId: true, parentName: true, parentPhone: true } } },
      orderBy: { createdAt: 'desc' },
    })
    res.json(payments)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/methods', (req, res) => {
  res.json(PAYMENT_METHODS)
})

router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  const { status, paymentMethod, paymentType, amount, registrationFee, totalAmount, paidAt, note } = req.body
  try {
    const existing = await prisma.payment.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ error: 'Pembayaran tidak ditemukan' })
    for (const value of [amount, registrationFee, totalAmount]) {
      if (value !== undefined && (value === '' || value === null || !Number.isSafeInteger(Number(value)) || Number(value) < 0)) return res.status(400).json({ error: 'Nominal harus bilangan bulat minimal 0' })
    }
    if (paidAt !== undefined && paidAt !== null && paidAt !== '' && Number.isNaN(new Date(paidAt).getTime())) return res.status(400).json({ error: 'Tanggal pembayaran tidak valid' })
    if (paymentType !== undefined && paymentType !== existing.paymentType) return res.status(400).json({ error: 'Jenis transaksi tidak dapat diubah; koreksi nominal atau metode pembayaran saja' })
    if ((status ?? existing.status) === 'success' && paidAt !== undefined && !paidAt) return res.status(400).json({ error: 'Tanggal lunas wajib diisi untuk transaksi lunas' })

    if (status !== undefined && !['pending', 'success', 'failed'].includes(status)) return res.status(400).json({ error: 'Status pembayaran tidak valid' })
    if (paymentType !== undefined && !['registration', 'renewal', 'event', 'cart'].includes(paymentType)) return res.status(400).json({ error: 'Jenis pembayaran tidak valid' })

    const numericAmount = amount !== undefined ? Math.max(0, Math.round(Number(amount) || 0)) : existing.amount
    const numericFee = registrationFee !== undefined ? Math.max(0, Math.round(Number(registrationFee) || 0)) : existing.registrationFee
    const numericTotal = totalAmount !== undefined ? Math.max(0, Math.round(Number(totalAmount) || 0)) : numericAmount + numericFee

    const baseData = {
      paymentMethod: paymentMethod !== undefined ? (paymentMethod || null) : undefined,
      note: note !== undefined ? (note?.trim() || null) : undefined,
      paymentType: paymentType || undefined,
      amount: amount !== undefined ? numericAmount : undefined,
      registrationFee: registrationFee !== undefined ? numericFee : undefined,
      totalAmount: totalAmount !== undefined || amount !== undefined || registrationFee !== undefined ? numericTotal : undefined,
      paidAt: paidAt !== undefined ? (paidAt ? new Date(paidAt) : null) : undefined,
    }
    const edited = await prisma.payment.update({ where: { id: req.params.id }, data: baseData })

    // Delegates to the same applyPaymentSuccess/applyPaymentFailed used by
    // the online (Rintisan) payment flow — so an admin correcting a payment's
    // status here (Keuangan > Pemasukan edit, or recording a cash/offline
    // payment) correctly applies renewal-type side effects too (session
    // reset, package period activation), not just a bare status flip. No
    // behavior change for registration/event payments — those helpers already
    // do exactly what the old inline update here did.
    let payment
    if (status === 'success') {
      payment = await applyPaymentSuccess(edited)
    } else if (status === 'failed') {
      payment = await prisma.payment.update({ where: { id: req.params.id }, data: { status: 'failed', paidAt: null }, include: { student: true, package: true } })
    } else if (status === 'pending') {
      payment = await prisma.payment.update({ where: { id: req.params.id }, data: { status, paidAt: null }, include: { student: true, package: true } })
    } else {
      payment = await prisma.payment.findUnique({ where: { id: req.params.id }, include: { student: true, package: true } })
    }

    const before = paymentSnapshot(existing)
    const after = paymentSnapshot(payment)
    await logPaymentAudit({
      paymentId: payment.id,
      action: 'edit',
      actor: req.user,
      studentId: payment.studentId,
      amount: payment.totalAmount,
      before,
      after,
      note: paymentDiff(before, after) || 'Tidak ada perubahan nilai',
    })

    res.json(payment)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/admin/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const payment = await prisma.payment.findUnique({ where: { id: req.params.id } })
    if (!payment) return res.status(404).json({ error: 'Pembayaran tidak ditemukan' })
    await prisma.payment.delete({ where: { id: payment.id } })
    await logPaymentAudit({
      paymentId: payment.id,
      action: 'delete',
      actor: req.user,
      studentId: payment.studentId,
      amount: payment.totalAmount,
      before: paymentSnapshot(payment),
      note: `Menghapus pembayaran ${payment.paymentType}`,
    })
    res.json({ message: 'Pembayaran dihapus' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/me', authenticate, authorize('parent'), async (req, res) => {
  try {
    const student = await prisma.student.findFirst({ where: { userId: req.user.id } })
    if (!student) return res.json([])
    const payments = await prisma.payment.findMany({
      where: { studentId: student.id },
      include: { package: true, cartItems: true, eventParticipant: { include: { event: true } } },
      orderBy: { createdAt: 'desc' },
    })
    res.json(payments)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Unggah bukti pembayaran (foto/screenshot). Parent mengunggah untuk
// pembayarannya sendiri (termasuk QRIS/gateway yang sudah berhasil);
// admin/head_coach boleh mengunggah untuk pembayaran mana pun. Bukti wajib
// ada supaya pembayaran ikut dihitung di laporan keuangan — lihat
// lib/paymentProof.js. `proofUrl` berasal dari POST /api/upload (Cloudinary).
router.post('/:id/proof', authenticate, async (req, res) => {
  const { proofUrl, proofNote } = req.body
  try {
    if (typeof proofUrl !== 'string' || !/^https?:\/\//i.test(proofUrl.trim())) {
      return res.status(400).json({ error: 'Bukti pembayaran wajib diunggah (foto atau screenshot)' })
    }
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id },
      include: { student: { select: { userId: true } } },
    })
    if (!payment) return res.status(404).json({ error: 'Pembayaran tidak ditemukan' })

    const isOwner = req.user.role === 'parent' && payment.student?.userId === req.user.id
    const isStaff = req.user.role === 'admin' || req.user.role === 'head_coach'
    if (!isOwner && !isStaff) return res.status(403).json({ error: 'Tidak berhak mengunggah bukti pembayaran ini' })

    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        proofUrl: proofUrl.trim(),
        proofNote: proofNote?.trim() || null,
        proofUploadedAt: new Date(),
        proofUploadedById: req.user.id,
      },
    })

    await logPaymentAudit({
      paymentId: payment.id,
      action: 'proof_uploaded',
      actor: req.user,
      studentId: payment.studentId,
      amount: payment.totalAmount,
      before: { proofUrl: payment.proofUrl || null },
      after: { proofUrl: updated.proofUrl },
      note: isOwner ? 'Bukti pembayaran diunggah parent' : 'Bukti pembayaran diunggah admin',
    })

    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Admin mengonfirmasi manual pembayaran lunas yang tidak punya bukti. Setelah
// dikonfirmasi, pembayaran dikecualikan dari syarat bukti (`proofExempt`) dan
// langsung masuk laporan pemasukan. Hanya untuk yang belum ada bukti.
router.post('/:id/confirm-no-proof', authenticate, authorize('admin'), async (req, res) => {
  try {
    const payment = await prisma.payment.findUnique({ where: { id: req.params.id } })
    if (!payment) return res.status(404).json({ error: 'Pembayaran tidak ditemukan' })
    if (payment.status !== 'success') return res.status(400).json({ error: 'Hanya pembayaran lunas yang bisa dikonfirmasi' })
    if (payment.proofUrl || payment.proofExempt) return res.status(400).json({ error: 'Pembayaran ini sudah punya bukti atau sudah dikonfirmasi' })

    const updated = await prisma.payment.update({ where: { id: payment.id }, data: { proofExempt: true } })

    await logPaymentAudit({
      paymentId: payment.id,
      action: 'proof_confirmed_manual',
      actor: req.user,
      studentId: payment.studentId,
      amount: payment.totalAmount,
      before: { proofExempt: false },
      after: { proofExempt: true },
      note: 'Dikonfirmasi manual admin tanpa bukti pembayaran',
    })

    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Parent starts a package renewal for their child.
//
// DINONAKTIFKAN: perpanjangan sekarang SATU jalur saja lewat tagihan
// (`POST /cart` → `POST /cart/checkout`, dibayar dari menu Perpanjang Paket),
// supaya satu periode perpanjangan tidak pernah menghasilkan dua record
// pembayaran. Endpoint ini dulu membuat Payment kedua yang tidak terhubung ke
// tagihan admin — akar penyebab duplikasi transaksi.
router.post('/renewal', authenticate, authorize('parent'), async (req, res) => {
  res.status(400).json({
    error: 'Perpanjangan paket sekarang lewat menu Perpanjang Paket di dasbor. Buka menu itu, lalu bayar tagihannya sekali untuk semua item.',
  })
})

// Parent pays for their child's event participation.
router.post('/event', authenticate, authorize('parent'), async (req, res) => {
  const { eventParticipantId, paymentMethod } = req.body
  if (!eventParticipantId || !paymentMethod) return res.status(400).json({ error: 'eventParticipantId dan paymentMethod wajib diisi' })
  if (!isSupportedPaymentMethod(paymentMethod)) return res.status(400).json({ error: 'Metode pembayaran Rintisan tidak valid' })

  try {
    const participant = await prisma.eventParticipant.findUnique({
      where: { id: eventParticipantId },
      include: { event: true, student: { include: { user: true } }, payment: true },
    })
    if (!participant) return res.status(404).json({ error: 'Peserta event tidak ditemukan' })
    if (participant.student.userId !== req.user.id) return res.status(403).json({ error: 'Bukan data anak Anda' })
    if (participant.paymentStatus === 'paid') return res.status(400).json({ error: 'Event ini sudah lunas' })
    if (!participant.event.fee || participant.event.fee <= 0) return res.status(400).json({ error: 'Event ini tidak memerlukan pembayaran' })

    if (participant.payment?.status === 'success') {
      return res.status(400).json({ error: 'Event ini sudah lunas' })
    }

    // Kalau tagihan sudah punya QR/link dari gateway, pakai ulang apa adanya.
    const existing = participant.payment
    if (existing?.status === 'pending' && existing.transactionId && (existing.paymentLink || existing.qrString)) {
      return res.status(201).json({ payment: existing, rintisan: null })
    }

    // PENTING: `partner_trx_id` yang dikirim ke gateway = payment.id, dan id yang
    // sama juga dipakai webhook untuk menemukan pembayaran ini. Jadi id yang sudah
    // pernah dikirim TIDAK boleh dipakai ulang: kalau percobaan sebelumnya sempat
    // membuat tagihan di gateway (responsnya hilang sebelum tersimpan), percobaan
    // berikutnya ditolak "Partner transaction ID sudah pernah dipakai" — dan
    // tagihan lama itu tak bisa dicari lagi (query gateway hanya menerima trx_id
    // gateway). Karena itu tiap percobaan baru memakai baris pembayaran BARU
    // (id baru = partner_trx_id baru). Baris percobaan lama ditandai 'failed'.
    const freshEventPayment = (prev) =>
      prisma.$transaction(async (tx) => {
        if (prev) {
          await tx.payment.update({
            where: { id: prev.id },
            data: { eventParticipantId: null, ...(prev.status === 'pending' ? { status: 'failed' } : {}) },
          })
        }
        return tx.payment.create({
          data: {
            studentId: participant.studentId,
            eventParticipantId: participant.id,
            amount: participant.event.fee,
            registrationFee: 0,
            totalAmount: participant.event.fee,
            paymentType: 'event',
            status: 'pending',
          },
        })
      })

    const billingInput = {
      paymentMethod,
      toName: participant.student.parentName,
      toEmail: participant.student.parentEmail || participant.student.user.email,
      toPhone: participant.student.parentPhone,
      toAddress: participant.student.address,
      note: `Biaya event ${participant.event.title} - ${participant.student.fullName}`,
    }

    let payment = await freshEventPayment(existing)
    let checkout
    try {
      checkout = await checkoutPayment({ payment, ...billingInput })
    } catch (err) {
      // Balapan langka (dua klik bersamaan) masih bisa memicu pesan duplikat;
      // coba sekali lagi dengan baris baru sebelum menyerah.
      if (!isDuplicatePartnerTrxError(err)) throw err
      payment = await freshEventPayment(payment)
      checkout = await checkoutPayment({ payment, ...billingInput })
    }

    res.status(201).json({ payment: checkout.payment, rintisan: checkout.rintisan })
  } catch (err) {
    console.error(err)
    const message = isDuplicatePartnerTrxError(err)
      ? 'Tagihan ini sudah pernah dibuat di gateway. Muat ulang halaman lalu coba lagi; jika masih gagal hubungi admin.'
      : err.message || 'Gagal membuat tagihan event'
    res.status(400).json({ error: message })
  }
})

// Admin/head coach membatalkan pembayaran keranjang/perpanjangan parent yang
// menggantung (pending). Item dikembalikan ke tagihan terbuka; kalau gateway
// ternyata sudah menerima pembayaran, pembatalan ditolak.
router.post('/:id/cancel', authenticate, authorize('admin', 'head_coach'), async (req, res) => {
  try {
    const payment = await prisma.payment.findUnique({ where: { id: req.params.id }, include: { student: true } })
    if (!payment) return res.status(404).json({ error: 'Pembayaran tidak ditemukan' })
    if (req.user.role === 'head_coach' && !(await getUserBranchIds(req.user.id)).includes(payment.student.branchId)) {
      return res.status(403).json({ error: 'Anda hanya dapat mengelola pembayaran anak di cabang Anda' })
    }
    if (payment.status !== 'pending') return res.status(400).json({ error: 'Hanya pembayaran yang masih menunggu dibayar yang bisa dibatalkan' })
    const fresh = payment.transactionId ? await syncPaymentWithRintisan(payment) : payment
    if (fresh.status === 'success') return res.status(409).json({ error: 'Pembayaran ini sudah lunas, tidak bisa dibatalkan' })
    const released = await releasePendingPayment(payment)
    if (!released.released) return res.status(400).json({ error: 'Pembayaran sudah tidak menunggu dibayar' })
    await logPaymentAudit({
      paymentId: payment.id,
      action: 'cancel',
      actor: req.user,
      studentId: payment.studentId,
      amount: payment.totalAmount,
      before: paymentSnapshot(payment),
      note: `${req.user.role === 'admin' ? 'Admin' : 'Head coach'} membatalkan pembayaran yang menggantung`,
    })
    res.json({ message: 'Dibatalkan' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Parent-facing polling target: actively asks Rintisan whether this payment
// has been paid yet (on top of the passive webhook), so "lunas" detection
// doesn't depend on Rintisan's callback URL being reachable/registered.
router.get('/:id/sync', authenticate, authorize('parent'), async (req, res) => {
  try {
    const payment = await prisma.payment.findUnique({ where: { id: req.params.id }, include: { student: true } })
    if (!payment || payment.student.userId !== req.user.id) return res.status(404).json({ error: 'Pembayaran tidak ditemukan' })

    const fresh = await syncPaymentWithRintisan(payment)
    res.json({ status: fresh.status, paidAt: fresh.paidAt, paymentMethod: fresh.paymentMethod })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Parent cancels a payment they changed their mind about — only while still
// pending (nothing to undo yet: session/package/registration state is only
// touched once applyPaymentSuccess runs). Status failed dipakai sebagai jejak
// pembatalan agar transaksi gateway tidak pernah hilang dari audit.
router.delete('/:id', authenticate, authorize('parent'), async (req, res) => {
  try {
    const payment = await prisma.payment.findUnique({ where: { id: req.params.id }, include: { student: true } })
    if (!payment || payment.student.userId !== req.user.id) return res.status(404).json({ error: 'Pembayaran tidak ditemukan' })
    if (payment.status !== 'pending') return res.status(400).json({ error: 'Hanya pembayaran yang masih menunggu dibayar yang bisa dibatalkan' })

    // Tanya gateway dulu: kalau ternyata sudah dibayar, jangan dibatalkan
    // (uang masuk tapi tagihan hilang).
    const fresh = payment.transactionId ? await syncPaymentWithRintisan(payment) : payment
    if (fresh.status === 'success') return res.status(409).json({ error: 'Pembayaran ini sudah lunas, tidak bisa dibatalkan' })

    // Item keranjang dikembalikan ke status 'open' supaya bisa di-checkout ulang;
    // pembatalan dicatat sebagai failed, bukan menghapus riwayat transaksi.
    const released = await releasePendingPayment(payment, { mode: 'fail', reason: 'Dibatalkan oleh parent' })
    if (!released.released) return res.status(400).json({ error: 'Pembayaran sudah tidak menunggu dibayar' })
    await logPaymentAudit({
      paymentId: payment.id,
      action: 'cancel',
      actor: req.user,
      studentId: payment.studentId,
      amount: payment.totalAmount,
      before: paymentSnapshot(payment),
      note: 'Parent membatalkan pembayaran yang masih pending',
    })
    res.json({ message: 'Dibatalkan' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Rintisan calls this URL when a payment's status changes (mainly PAID).
// No `authenticate` middleware: verified manually via signature + callback token.
router.post('/rintisan/callback', async (req, res) => {
  try {
    const signature = req.headers['x-signature']
    const callbackToken = req.headers['x-callback-token']
    const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body)

    if (!verifyCallbackToken(callbackToken)) {
      console.warn('Rintisan callback: invalid callback token')
      return res.status(401).json({ responseCode: '401', responseMessage: 'Invalid callback token' })
    }

    let signatureValid
    try {
      signatureValid = verifyCallback(rawBody, signature)
    } catch (err) {
      console.error('Rintisan callback: signature verification error', err.message)
      return res.status(500).json({ responseCode: '500', responseMessage: 'Signature verification not configured' })
    }
    if (!signatureValid) {
      console.warn('Rintisan callback: invalid signature')
      return res.status(401).json({ responseCode: '401', responseMessage: 'Invalid signature' })
    }

    const body = req.body
    const partnerTrxId = body.partner_trx_id
    const statusCode = String(body.status?.code || '')

    const payment = await prisma.payment.findUnique({ where: { id: partnerTrxId } })
    if (payment) {
      await prisma.payment.update({ where: { id: payment.id }, data: { callbackPayload: body } })
      if (statusCode === '200') {
        await applyPaymentSuccess(payment)
        await logPaymentAudit({ paymentId: payment.id, action: 'callback_paid', studentId: payment.studentId, amount: payment.totalAmount, note: body.status?.message || 'Konfirmasi lunas dari gateway' })
      } else {
        await applyPaymentFailed(payment, body.status?.message)
        await logPaymentAudit({ paymentId: payment.id, action: 'callback_failed', studentId: payment.studentId, amount: payment.totalAmount, note: body.status?.message || 'Konfirmasi gagal dari gateway' })
      }
      return res.json({ responseCode: '2005600', responseMessage: 'Successful' })
    }

    // Not an existing Payment — check if it's a brand-new registration whose
    // account doesn't exist yet (see PendingRegistration in schema.prisma).
    const pending = await prisma.pendingRegistration.findUnique({ where: { id: partnerTrxId } })
    if (pending) {
      await prisma.pendingRegistration.update({ where: { id: pending.id }, data: { callbackPayload: body } })
      if (statusCode === '200') {
        await convertPendingRegistration(pending)
      } else {
        await failPendingRegistration(pending, body.status?.message)
      }
      return res.json({ responseCode: '2005600', responseMessage: 'Successful' })
    }

    console.warn('Rintisan callback: no payment or pending registration found for partner_trx_id', partnerTrxId)
    return res.status(404).json({ responseCode: '404', responseMessage: 'Payment not found' })
  } catch (err) {
    console.error('Rintisan callback error:', err)
    res.status(400).json({ responseCode: '400', responseMessage: 'Bad request' })
  }
})

export default router
