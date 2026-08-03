import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { checkoutPayment, applyPaymentSuccess, applyPaymentFailed, convertPendingRegistration, failPendingRegistration, syncPaymentWithRintisan } from '../lib/paymentHelpers.js'
import { verifyCallback, verifyCallbackToken, PAYMENT_METHODS } from '../lib/rintisan.js'
import { getEffectivePrice } from '../lib/pricing.js'

const router = Router()

router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const where = {}
    if (req.query.status) where.status = req.query.status
    const payments = await prisma.payment.findMany({
      where,
      include: { package: true, student: { select: { fullName: true, studentId: true, parentName: true, parentPhone: true } } },
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
  const { status, paymentMethod } = req.body
  try {
    const existing = await prisma.payment.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ error: 'Pembayaran tidak ditemukan' })

    if (paymentMethod !== undefined) {
      await prisma.payment.update({ where: { id: req.params.id }, data: { paymentMethod } })
    }

    // Delegates to the same applyPaymentSuccess/applyPaymentFailed used by
    // the online (Rintisan) payment flow — so admin manually verifying a
    // payment here (e.g. the "Verifikasi" button in Keuangan Pemasukan)
    // correctly applies renewal-type side effects too (session reset,
    // package period activation), not just a bare status flip. No behavior
    // change for registration/event payments — those helpers already do
    // exactly what the old inline update here did.
    let payment
    if (status === 'success') {
      payment = await applyPaymentSuccess(existing)
    } else if (status === 'failed') {
      payment = await applyPaymentFailed(existing)
    } else {
      payment = await prisma.payment.update({ where: { id: req.params.id }, data: { status }, include: { student: true } })
    }

    res.json(payment)
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
      include: { package: true, eventParticipant: { include: { event: true } } },
      orderBy: { createdAt: 'desc' },
    })
    res.json(payments)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Parent starts a package renewal for their child. Creates a pending Payment
// and immediately requests a billing link from Rintisan.
router.post('/renewal', authenticate, authorize('parent'), async (req, res) => {
  const { packageId, paymentMethod } = req.body
  if (!packageId || !paymentMethod) return res.status(400).json({ error: 'packageId dan paymentMethod wajib diisi' })

  try {
    const student = await prisma.student.findFirst({ where: { userId: req.user.id }, include: { user: true } })
    if (!student) return res.status(404).json({ error: 'Data anak tidak ditemukan' })

    const pkg = await prisma.package.findUnique({ where: { id: packageId } })
    if (!pkg) return res.status(400).json({ error: 'Paket tidak ditemukan' })

    // Resolves to the student's branch's BranchPackage override (Pengaturan
    // > Harga Paket) when one exists, not the package's raw base price.
    const effectivePrice = await getEffectivePrice(pkg.id, student.branchId)

    // Beasiswa SPP is set by admin on the student (Data Anak) and applies
    // automatically here — no code entry needed from the parent.
    const scholarshipPercent = student.sppScholarshipPercent || 0
    const discount = Math.round(effectivePrice * scholarshipPercent / 100)

    const totalAmount = Math.max(0, effectivePrice - discount)
    const payment = await prisma.payment.create({
      data: {
        studentId: student.id,
        packageId: pkg.id,
        amount: effectivePrice,
        registrationFee: 0,
        totalAmount,
        paymentType: 'renewal',
        status: 'pending',
      },
    })

    // 100% scholarship makes totalAmount 0 — Rintisan can't create a real
    // billing/QRIS for Rp 0, so there's nothing to actually pay. Apply the
    // same success side-effects (extend package, reset sessions) directly.
    if (totalAmount === 0) {
      const updated = await applyPaymentSuccess(payment)
      return res.status(201).json({ payment: updated, rintisan: null, scholarshipPercent })
    }

    const { payment: updated, rintisan } = await checkoutPayment({
      payment,
      paymentMethod,
      toName: student.parentName,
      toEmail: student.parentEmail || student.user.email,
      toPhone: student.parentPhone,
      toAddress: student.address,
      note: `Perpanjangan paket ${pkg.name} - ${student.fullName}`,
    })

    res.status(201).json({ payment: updated, rintisan, scholarshipPercent })
  } catch (err) {
    console.error(err)
    res.status(400).json({ error: err.message || 'Gagal membuat tagihan perpanjangan' })
  }
})

// Parent pays for their child's event participation.
router.post('/event', authenticate, authorize('parent'), async (req, res) => {
  const { eventParticipantId, paymentMethod } = req.body
  if (!eventParticipantId || !paymentMethod) return res.status(400).json({ error: 'eventParticipantId dan paymentMethod wajib diisi' })

  try {
    const participant = await prisma.eventParticipant.findUnique({
      where: { id: eventParticipantId },
      include: { event: true, student: { include: { user: true } }, payment: true },
    })
    if (!participant) return res.status(404).json({ error: 'Peserta event tidak ditemukan' })
    if (participant.student.userId !== req.user.id) return res.status(403).json({ error: 'Bukan data anak Anda' })
    if (participant.paymentStatus === 'paid') return res.status(400).json({ error: 'Event ini sudah lunas' })
    if (!participant.event.fee || participant.event.fee <= 0) return res.status(400).json({ error: 'Event ini tidak memerlukan pembayaran' })

    let payment = participant.payment
    if (!payment || payment.status === 'failed') {
      payment = await prisma.payment.create({
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
    } else if (payment.status === 'success') {
      return res.status(400).json({ error: 'Event ini sudah lunas' })
    }

    const { payment: updated, rintisan } = await checkoutPayment({
      payment,
      paymentMethod,
      toName: participant.student.parentName,
      toEmail: participant.student.parentEmail || participant.student.user.email,
      toPhone: participant.student.parentPhone,
      toAddress: participant.student.address,
      note: `Biaya event ${participant.event.title} - ${participant.student.fullName}`,
    })

    res.status(201).json({ payment: updated, rintisan })
  } catch (err) {
    console.error(err)
    res.status(400).json({ error: err.message || 'Gagal membuat tagihan event' })
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
// touched once applyPaymentSuccess runs). Hard-deleted, not soft-cancelled,
// so it doesn't clutter their payment history with a dead row.
router.delete('/:id', authenticate, authorize('parent'), async (req, res) => {
  try {
    const payment = await prisma.payment.findUnique({ where: { id: req.params.id }, include: { student: true } })
    if (!payment || payment.student.userId !== req.user.id) return res.status(404).json({ error: 'Pembayaran tidak ditemukan' })
    if (payment.status !== 'pending') return res.status(400).json({ error: 'Hanya pembayaran yang masih menunggu verifikasi yang bisa dibatalkan' })

    await prisma.payment.delete({ where: { id: payment.id } })
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
      } else {
        await applyPaymentFailed(payment, body.status?.message)
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
