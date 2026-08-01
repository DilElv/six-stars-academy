import crypto from 'crypto'
import prisma from './prisma.js'
import { createBilling } from './rintisan.js'
import { notifyUser } from './notify.js'
import { assignAgeGroup } from './ageGroup.js'

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
  const today = new Date()
  const deadline = new Date(today)
  deadline.setDate(deadline.getDate() + 2)

  const body = {
    partner_identifier_id: id,
    partner_trx_id: id,
    to_name: toName,
    to_email: toEmail,
    to_phone: toPhone.startsWith('62') ? toPhone : `62${toPhone.replace(/^0/, '')}`,
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

// Applies the business effect of a successful payment, based on its type.
// Idempotent: safe to call more than once for the same payment.
export async function applyPaymentSuccess(payment) {
  if (payment.status === 'success') return payment

  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: { status: 'success', paidAt: new Date() },
    include: { student: { include: { user: true } }, package: true, eventParticipant: { include: { event: true } } },
  })

  let renewedUntil = null
  if (payment.paymentType === 'renewal' && updated.package) {
    const student = updated.student
    const base = student.packageEndDate && new Date(student.packageEndDate) > new Date()
      ? new Date(student.packageEndDate)
      : new Date()
    const newEnd = new Date(base)
    newEnd.setMonth(newEnd.getMonth() + updated.package.durationMonths)
    renewedUntil = newEnd

    await prisma.student.update({
      where: { id: student.id },
      data: {
        packageId: updated.package.id,
        packageStartDate: student.packageStartDate || new Date(),
        packageEndDate: newEnd,
        totalSessions: updated.package.durationMonths * updated.package.sessionsPerWeek * 4,
        sessionsUsed: 0,
        status: 'active',
      },
    })
  }

  if (payment.paymentType === 'event' && updated.eventParticipant) {
    await prisma.eventParticipant.update({
      where: { id: updated.eventParticipant.id },
      data: { paymentStatus: 'paid' },
    })
  }

  const parentUserId = updated.student.userId
  const titleByType = {
    registration: 'Pendaftaran Berhasil Dibayar',
    renewal: 'Perpanjangan Paket Berhasil',
    event: 'Pembayaran Event Berhasil',
  }
  const messageByType = {
    registration: `Pembayaran pendaftaran ${updated.student.fullName} sudah lunas. Akun sudah aktif sepenuhnya.`,
    renewal: `Perpanjangan paket untuk ${updated.student.fullName} berhasil. Paket aktif sampai ${renewedUntil ? renewedUntil.toLocaleDateString('id-ID') : '-'}.`,
    event: `Pembayaran event "${updated.eventParticipant?.event?.title || ''}" untuk ${updated.student.fullName} berhasil dikonfirmasi.`,
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
    const user = await tx.user.create({
      data: { name: pending.parentName, email: pending.email, password: pending.passwordHash, role: 'parent', phone: pending.parentPhone },
    })

    const pkg = await tx.package.findUnique({ where: { id: pending.packageId } })

    const count = await tx.student.count()
    const studentId = `SS-${String(count + 1).padStart(4, '0')}`

    const packageStartDate = new Date()
    const packageEndDate = new Date(packageStartDate)
    packageEndDate.setMonth(packageEndDate.getMonth() + pkg.durationMonths)

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
        packageEndDate,
        totalSessions: pkg.durationMonths * pkg.sessionsPerWeek * 4,
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
  if (payment.status === 'success') return payment

  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: { status: 'failed', failReason: reason || null },
    include: { student: true },
  })

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
