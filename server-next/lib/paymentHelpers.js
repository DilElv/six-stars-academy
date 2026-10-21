import crypto from 'crypto'
import prisma from './prisma.js'
import { createBilling, queryPayment } from './rintisan.js'
import { notifyUser } from './notify.js'
import { assignAgeGroup } from './ageGroup.js'
import { computePackagePeriod } from './packagePeriod.js'
import { monthlySessionLimit } from './sessionQuota.js'
import { toGatewayPhone } from './phone.js'

function formatDateForRintisan(d) {
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  return `${day}-${month}-${d.getFullYear()}`
}

// Low-level: requests a billing on Rintisan for any record with an `id` and
// `totalAmount` (a Payment row, or a PendingRegistration row before the
// account/student even exist). Does not write anything back — callers persist
// the result onto their own record shape.
export async function createBillingFor({ id, totalAmount, paymentMethod, toName, toEmail, toPhone, toAddress, note }) {
  // Nomor HP wajib valid sebelum dikirim ke gateway — nomor ber-spasi membuat
  // Rintisan menolak dengan "Input data tidak lengkap / tidak sesuai".
  const gatewayPhone = toGatewayPhone(toPhone)
  if (!gatewayPhone) {
    throw new Error('Nomor HP orang tua belum diisi atau tidak valid (harus diawali 0, tanpa spasi)')
  }

  const today = new Date()
  const deadline = new Date(today)
  deadline.setDate(deadline.getDate() + 2)

  const body = {
    partner_identifier_id: id,
    partner_trx_id: id,
    to_name: toName,
    to_email: toEmail,
    to_phone: gatewayPhone,
    to_address: toAddress || null,
    invoice_date: formatDateForRintisan(today),
    deadline_date: formatDateForRintisan(deadline),
    note: note || '',
    payment_method: paymentMethod,
    amount: totalAmount,
  }

  return createBilling(body)
}

// Requests a billing on Rintisan for an existing pending Payment row, and
// saves back the payment link / trx id / qr string onto that row.
export async function checkoutPayment({ payment, paymentMethod, toName, toEmail, toPhone, toAddress, note }) {
  const result = await createBillingFor({ id: payment.id, totalAmount: payment.totalAmount, paymentMethod, toName, toEmail, toPhone, toAddress, note })

  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      paymentMethod,
      transactionId: result.trx_id || null,
      paymentLink: result.rintisan_billing_link || result.payment_link || null,
      qrString: result.qr_string || null,
    },
  })

  return { payment: updated, rintisan: result }
}

// Actively asks Rintisan whether a still-pending payment has actually been
// paid, instead of only waiting passively for their webhook callback — a
// second, self-sufficient path to "lunas" that doesn't depend on Rintisan's
// callback URL being reachable/registered correctly. Safe to call repeatedly
// (e.g. from frontend polling): a no-op once the payment is no longer pending.
export async function syncPaymentWithRintisan(payment) {
  if (payment.status === 'success' && !payment.effectsAppliedAt) return applyPaymentSuccess(payment)
  if (payment.status !== 'pending' || !payment.transactionId) return payment

  try {
    const result = await queryPayment(payment.transactionId)
    if (result?.payment_status === 'PAID') {
      return applyPaymentSuccess(payment)
    }
  } catch (err) {
    console.error('Rintisan query payment error:', err.message)
  }
  return payment
}

// Melepas pembayaran yang masih menunggu: item keranjang yang terikat
// dikembalikan ke status 'open' supaya tidak menggantung di "checked_out".
// mode 'delete' menghapus barisnya (batal oleh parent/admin); mode 'fail'
// menandainya gagal agar riwayat tetap ada (kedaluwarsa). Aman dipanggil
// berulang dan tidak menyentuh pembayaran yang sudah lunas.
export async function releasePendingPayment(payment, { mode = 'delete', reason } = {}) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${payment.id}))`
    const current = await tx.payment.findUnique({ where: { id: payment.id } })
    if (!current || current.status !== 'pending' || current.effectsAppliedAt) {
      return { released: false, status: current?.status ?? null }
    }
    await tx.cartItem.updateMany({ where: { paymentId: current.id }, data: { paymentId: null, status: 'open' } })
    if (mode === 'fail') {
      await tx.payment.update({ where: { id: current.id }, data: { status: 'failed', failReason: reason || null } })
    } else {
      await tx.payment.delete({ where: { id: current.id } })
    }
    return { released: true, status: mode === 'fail' ? 'failed' : 'deleted' }
  })
}

// Applies the business effect of a successful payment, based on its type.
// Idempotent: safe to call more than once for the same payment.
export async function applyPaymentSuccess(payment) {
  const outcome = await prisma.$transaction(async (tx) => {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${payment.id}))`
  const current = await tx.payment.findUnique({
    where: { id: payment.id },
    include: { student: true, package: true, eventParticipant: { include: { event: true } }, cartItems: true },
  })
  if (!current) throw new Error('Pembayaran tidak ditemukan')
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${current.studentId}))`
  if (current.effectsAppliedAt) {
    const updated = await tx.payment.update({ where: { id: current.id }, data: { status: 'success', paidAt: current.paidAt || new Date() } })
    return { updated, alreadyApplied: true }
  }

  const updated = await tx.payment.update({
    where: { id: current.id },
    data: { status: 'success', paidAt: current.paidAt || new Date() },
    include: { student: true, package: true, eventParticipant: { include: { event: true } }, cartItems: true },
  })

  let renewedUntil = null
  if (updated.paymentType === 'renewal' && updated.package) {
    const student = updated.student
    // Renewing early (before the current period actually expires) starts the
    // new period the day AFTER the existing end date — not ON it — so the
    // month-end proration in computePackagePeriod sees a fresh full month
    // instead of the tail end of the old one.
    let base = new Date()
    if (student.packageEndDate && new Date(student.packageEndDate) > new Date()) {
      base = new Date(student.packageEndDate)
      base.setDate(base.getDate() + 1)
    }
    const period = computePackagePeriod(base, updated.package)
    renewedUntil = period.packageEndDate
    const startsThisMonth = base.getMonth() === new Date().getMonth() && base.getFullYear() === new Date().getFullYear()

    await tx.student.update({
      where: { id: student.id },
      data: {
        packageId: updated.package.id,
        packageStartDate: base,
        packageEndDate: period.packageEndDate,
        totalSessions: startsThisMonth ? monthlySessionLimit(updated.package) : student.totalSessions,
        sessionsUsed: startsThisMonth ? 0 : student.sessionsUsed,
        sessionMonth: startsThisMonth ? base.getMonth() + 1 : student.sessionMonth,
        sessionYear: startsThisMonth ? base.getFullYear() : student.sessionYear,
        status: 'active',
      },
    })
  }

  if (updated.paymentType === 'event' && updated.eventParticipant) {
    await tx.eventParticipant.update({
      where: { id: updated.eventParticipant.id },
      data: { paymentStatus: 'paid' },
    })
  }

  // Pembayaran gabungan (keranjang): terapkan efek tiap item. Item paket
  // (perpanjangan) memperpanjang masa berlaku; item merchandise dari katalog
  // mengurangi stok produk. BPJS & merchandise manual hanya tercatat lunas
  // (CartItem.paymentId sudah terisi saat checkout).
  if (updated.paymentType === 'cart') {
    const packageItem = updated.cartItems?.find((i) => i.type === 'package' && i.metadata?.packageId)
    if (packageItem) {
      const pkg = await tx.package.findUnique({ where: { id: packageItem.metadata.packageId } })
      if (pkg) {
        const student = updated.student
        let base = new Date()
        if (student.packageEndDate && new Date(student.packageEndDate) > new Date()) {
          base = new Date(student.packageEndDate)
          base.setDate(base.getDate() + 1)
        }
        const period = computePackagePeriod(base, pkg)
        renewedUntil = period.packageEndDate
        const startsThisMonth = base.getMonth() === new Date().getMonth() && base.getFullYear() === new Date().getFullYear()
        await tx.student.update({
          where: { id: student.id },
          data: {
            packageId: pkg.id,
            packageStartDate: base,
            packageEndDate: period.packageEndDate,
            totalSessions: startsThisMonth ? monthlySessionLimit(pkg) : student.totalSessions,
            sessionsUsed: startsThisMonth ? 0 : student.sessionsUsed,
            sessionMonth: startsThisMonth ? base.getMonth() + 1 : student.sessionMonth,
            sessionYear: startsThisMonth ? base.getFullYear() : student.sessionYear,
            status: 'active',
          },
        })
      }
    }

    // Merchandise dari katalog: kurangi stok (NULL = stok tak terbatas).
    for (const item of updated.cartItems?.filter((i) => i.type === 'merchandise' && i.productId) || []) {
      const product = await tx.product.findUnique({ where: { id: item.productId } })
      if (product && product.stock !== null) {
        await tx.product.update({ where: { id: product.id }, data: { stock: Math.max(0, product.stock - 1) } })
      }
    }
  }

  const appliedAt = new Date()
  await tx.payment.update({ where: { id: updated.id }, data: { effectsAppliedAt: appliedAt } })
  updated.effectsAppliedAt = appliedAt
  return { updated, renewedUntil, alreadyApplied: false }
  })
  const { updated, renewedUntil, alreadyApplied } = outcome
  if (alreadyApplied) return updated

  const parentUserId = updated.student.userId
  const titleByType = {
    registration: 'Pendaftaran Berhasil Dibayar',
    renewal: 'Perpanjangan Paket Berhasil',
    event: 'Pembayaran Event Berhasil',
    cart: 'Pembayaran Berhasil',
  }
  const messageByType = {
    registration: `Pembayaran pendaftaran ${updated.student.fullName} sudah lunas. Akun sudah aktif sepenuhnya.`,
    renewal: `Perpanjangan paket untuk ${updated.student.fullName} berhasil. Paket aktif sampai ${renewedUntil ? renewedUntil.toLocaleDateString('id-ID') : '-'}.`,
    event: `Pembayaran event "${updated.eventParticipant?.event?.title || ''}" untuk ${updated.student.fullName} berhasil dikonfirmasi.`,
    cart: `Pembayaran tagihan untuk ${updated.student.fullName} berhasil${renewedUntil ? `. Paket aktif sampai ${renewedUntil.toLocaleDateString('id-ID')}` : ''}.`,
  }

  await notifyUser(parentUserId, {
    type: `payment_${payment.paymentType}_success`,
    title: titleByType[payment.paymentType] || 'Pembayaran Berhasil',
    message: messageByType[payment.paymentType] || 'Pembayaran Anda telah berhasil.',
    link: '/dashboard/pembayaran',
  })

  return updated
}

// Called only once the Rintisan webhook confirms the FIRST payment for a new
// registration succeeded. Creates the real User/Student/StudentCard/Payment
// rows — nothing exists in the main tables before this point.
// Idempotent: safe to call more than once for the same pending registration.
export async function convertPendingRegistration(pending) {
  if (pending.status === 'success') return null

  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${pending.id}))`
    // Re-check under the lock: Rintisan's webhook, the registration wizard's
    // polling endpoint, and the background reconciler can all race to convert
    // the same pending registration — only the first one wins.
    const current = await tx.pendingRegistration.findUnique({ where: { id: pending.id } })
    if (!current || current.status === 'success') return null

    const user = await tx.user.create({
      data: { name: pending.parentName, email: pending.email, password: pending.passwordHash, role: 'parent', phone: pending.parentPhone },
    })

    const pkg = await tx.package.findUnique({ where: { id: pending.packageId } })

    const count = await tx.student.count()
    const studentId = `SS-${String(count + 1).padStart(4, '0')}`

    const packageStartDate = new Date()
    const period = computePackagePeriod(packageStartDate, pkg)

    const student = await tx.student.create({
      data: {
        userId: user.id,
        studentId,
        fullName: pending.fullName,
        dateOfBirth: pending.dateOfBirth,
        position: pending.position,
        ageGroup: assignAgeGroup(pending.dateOfBirth),
        photo: pending.photo || null,
        parentName: pending.parentName,
        parentPhone: pending.parentPhone,
        parentEmail: pending.email,
        address: pending.address,
        packageId: pkg.id,
        packageStartDate,
        packageEndDate: period.packageEndDate,
        totalSessions: monthlySessionLimit(pkg),
        sessionMonth: packageStartDate.getMonth() + 1,
        sessionYear: packageStartDate.getFullYear(),
        branchId: pending.branchId || null,
      },
    })

    const payment = await tx.payment.create({
      data: {
        studentId: student.id,
        packageId: pkg.id,
        amount: pending.amount,
        registrationFee: pending.registrationFee,
        totalAmount: pending.totalAmount,
        paymentType: 'registration',
        status: 'success',
        paymentMethod: pending.paymentMethod,
        transactionId: pending.transactionId,
        paymentLink: pending.paymentLink,
        qrString: pending.qrString,
        paidAt: new Date(),
        effectsAppliedAt: new Date(),
      },
    })

    const card = await tx.studentCard.create({
      data: {
        studentId: student.id,
        qrCode: crypto.randomBytes(16).toString('hex'),
        cardNumber: student.studentId,
      },
    })

    await tx.pendingRegistration.update({
      where: { id: pending.id },
      data: { status: 'success', studentId: student.id },
    })

    return { user, student, payment, card }
  })

  if (!result) return null

  await notifyUser(result.user.id, {
    type: 'registration_success',
    title: 'Pendaftaran Berhasil',
    message: `Selamat datang! ${result.student.fullName} (${result.student.studentId}) berhasil terdaftar.`,
    link: '/dashboard',
  })

  return result
}

export async function failPendingRegistration(pending, reason) {
  if (pending.status === 'success') return pending
  return prisma.pendingRegistration.update({
    where: { id: pending.id },
    data: { status: 'failed', failReason: reason || null },
  })
}

export async function applyPaymentFailed(payment, reason) {
  const changed = await prisma.payment.updateMany({
    where: { id: payment.id, status: 'pending', effectsAppliedAt: null },
    data: { status: 'failed', failReason: reason || null },
  })
  const updated = await prisma.payment.findUnique({ where: { id: payment.id }, include: { student: true } })
  if (!changed.count) return updated

  await notifyUser(updated.student.userId, {
    type: `payment_${payment.paymentType}_failed`,
    title: 'Pembayaran Gagal',
    message: reason
      ? `Pembayaran untuk ${updated.student.fullName} gagal: ${reason}.`
      : `Pembayaran untuk ${updated.student.fullName} gagal. Silakan coba lagi.`,
    link: '/dashboard/pembayaran',
  })

  return updated
}
