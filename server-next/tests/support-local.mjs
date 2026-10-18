import './gateway-fixture.mjs'
import 'dotenv/config'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import express from 'express'
import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma.js'
import attendanceRoutes from '../routes/attendance.js'
import eventStaffRoutes from '../routes/eventStaffAttendance.js'
import studentsRoutes from '../routes/students.js'
import paymentsRoutes from '../routes/payments.js'
import ledgerRoutes from '../routes/ledger.js'
import cartRoutes from '../routes/cart.js'
import productsRoutes from '../routes/products.js'
import payrollRoutes from '../routes/payroll.js'
import settingsRoutes from '../routes/settings.js'
import assessmentsRoutes from '../routes/assessments.js'
import reportsRoutes from '../routes/reports.js'
import staffAttendanceRoutes from '../routes/staffAttendance.js'
import authRoutes from '../routes/auth.js'
import bcrypt from 'bcryptjs'
import { ensureCurrentSessionMonth } from '../lib/sessionQuota.js'
import { applyPaymentSuccess, applyPaymentFailed } from '../lib/paymentHelpers.js'

const db = new URL(process.env.DATABASE_URL)
assert(['localhost', '127.0.0.1'].includes(db.hostname), 'Tests require a local database')
const tag = `support-test-${crypto.randomUUID()}`
const app = express()
app.use(express.json())
app.use('/attendance', attendanceRoutes)
app.use('/event-staff', eventStaffRoutes)
app.use('/students', studentsRoutes)
app.use('/payments', paymentsRoutes)
app.use('/ledger', ledgerRoutes)
app.use('/cart', cartRoutes)
app.use('/products', productsRoutes)
app.use('/payroll', payrollRoutes)
app.use('/staff-attendance', staffAttendanceRoutes)
app.use('/settings', settingsRoutes)
app.use('/assessments', assessmentsRoutes)
app.use('/reports', reportsRoutes)
app.use('/auth', authRoutes)
const server = app.listen(0, '127.0.0.1')
await new Promise((resolve) => server.once('listening', resolve))
let user, student, branch, coach, headCoach, event, settingsRow, payrollSeed
try {
  const pkg = await prisma.package.findFirst({ where: { durationMonths: 1, sessionsPerWeek: 2 } })
  assert(pkg)
  user = await prisma.user.create({ data: { name: tag, email: `${tag}@example.invalid`, password: await bcrypt.hash(tag, 4), role: 'admin' } })
  const now = new Date()
  student = await prisma.student.create({ data: {
    userId: user.id, studentId: tag, fullName: tag, dateOfBirth: new Date(2015, 1, 1), position: 'GK', ageGroup: 'U-12',
    parentName: tag, parentPhone: '0800000000', address: 'local test', packageId: pkg.id,
    packageStartDate: new Date(now.getFullYear(), now.getMonth(), 1), packageEndDate: new Date(now.getFullYear(), now.getMonth() + 1, 0),
    totalSessions: 8, sessionsUsed: 7, sessionMonth: now.getMonth() + 1, sessionYear: now.getFullYear(),
  } })
  const token = jwt.sign({ id: user.id, role: 'admin', email: user.email }, process.env.JWT_SECRET)
  const dateKey = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  async function submit(date, status = 'hadir') {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/attendance`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify({ date: dateKey(date), records: [{ studentId: student.id, status }] }) })
    assert.equal(response.status, 200)
    return response.json()
  }
  const concurrent = await Promise.all([submit(now), submit(now, 'izin')])
  assert.equal(concurrent.reduce((n, r) => n + r.count, 0), 2)
  assert.equal((await prisma.student.findUnique({ where: { id: student.id } })).sessionsUsed, 8)
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1)
  if (yesterday.getMonth() === now.getMonth()) {
    const afterQuota = await submit(yesterday, 'alfa')
    assert.equal(afterQuota.count, 1)
    assert.deepEqual(afterQuota.renewalWarnings, [student.id])
  }
  const previous = new Date(now.getFullYear(), now.getMonth(), 0)
  assert.equal((await submit(previous, 'sakit')).count, 1)
  assert.equal((await prisma.student.findUnique({ where: { id: student.id } })).sessionsUsed, 8)
  console.log('PASS: concurrent attendance, quota warning without overflow, historical attendance')

  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const expired = await ensureCurrentSessionMonth(student.id, prisma, nextMonth)
  assert.equal(expired.sessionsUsed, 8)
  assert.equal(expired.status, 'needs_renewal')
  await prisma.student.update({ where: { id: student.id }, data: { sessionMonth: now.getMonth() + 1, sessionYear: now.getFullYear(), packageEndDate: new Date(now.getFullYear(), now.getMonth() + 2, 0) } })
  const reset = await ensureCurrentSessionMonth(student.id, prisma, nextMonth)
  assert.equal(reset.sessionsUsed, 0)
  assert.equal(reset.totalSessions, 8)
  assert.equal(reset.user, undefined)
  console.log('PASS: monthly reset and response fields')

  await prisma.student.update({ where: { id: student.id }, data: { packageEndDate: previous, sessionsUsed: 8, status: 'needs_renewal' } })
  const payment = await prisma.payment.create({ data: { studentId: student.id, packageId: pkg.id, amount: 100, totalAmount: 100, status: 'success', paymentType: 'renewal' } })
  await Promise.all([applyPaymentSuccess(payment), applyPaymentSuccess(payment)])
  const renewed = await prisma.student.findUnique({ where: { id: student.id } })
  assert.equal(renewed.sessionsUsed, 0)
  assert.equal(renewed.status, 'active')
  assert.equal(renewed.packageEndDate.getMonth(), now.getMonth())
  assert((await prisma.payment.findUnique({ where: { id: payment.id } })).effectsAppliedAt)
  const lateFailure = await applyPaymentFailed({ ...payment, status: 'pending' }, 'late failure test')
  assert.equal(lateFailure.status, 'success')
  console.log('PASS: paid renewal activates/resets once under simultaneous confirmation')
  async function request(path, actor, method = 'GET', data, expectedStatus = 200) {
    const auth = jwt.sign({ id: actor.id, role: actor.role, email: actor.email }, process.env.JWT_SECRET)
    const res = await fetch(`http://127.0.0.1:${server.address().port}${path}`, { method, headers: { authorization: `Bearer ${auth}`, 'content-type': 'application/json' }, body: data === undefined ? undefined : JSON.stringify(data) })
    const body = await res.json()
    assert.equal(res.status, expectedStatus, JSON.stringify(body))
    return body
  }
  const manual = await request(`/students/${student.id}`, user, 'PUT', { packageId: pkg.id, sessionsUsed: 3, totalSessions: 10 })
  assert.equal(manual.sessionsUsed, 3)
  assert.equal(manual.totalSessions, 10)
  assert.equal(new Date(manual.packageEndDate).getTime(), renewed.packageEndDate.getTime())
  console.log('PASS: manual used/total session correction preserves package dates')
  const login = await request('/auth/login', user, 'POST', { email: ` ${user.email.toUpperCase()} `, password: tag })
  assert.equal(login.profile.id, user.id)
  assert.equal(login.profile.password, undefined)
  await request(`/payments/${payment.id}`, user, 'PUT', { totalAmount: -1 }, 400)
  await request(`/payments/${payment.id}`, user, 'PUT', { paidAt: 'not-a-date' }, 400)
  await request(`/payments/${payment.id}`, user, 'PUT', { paymentType: 'event' }, 400)
  console.log('PASS: login normalization and invalid payment corrections rejected')

  branch = await prisma.branch.create({ data: { name: tag, code: tag } })
  for (const role of ['coach', 'head_coach']) {
    const actor = await prisma.user.create({ data: { name: tag, email: `${role}-${tag}@example.invalid`, password: 'unusable', role, branches: { create: { branchId: branch.id } } } })
    if (role === 'coach') coach = actor
    else headCoach = actor
  }
  const scholarship = await request(`/students/${student.id}`, headCoach, 'PUT', { registrationScholarshipPercent: 25, sppScholarshipPercent: 50 })
  assert.equal(scholarship.registrationScholarshipPercent, 25)
  assert.equal(scholarship.sppScholarshipPercent, 50)
  console.log('PASS: Head Coach can update registration and package scholarships')
  event = await prisma.event.create({ data: { title: tag, type: 'friendly_match', date: now, createdById: user.id, branches: { create: { branchId: branch.id } } } })
  const todayEvents = await request('/event-staff/today', coach)
  assert(todayEvents.some((row) => row.id === event.id))
  const checkin = await request('/event-staff/checkin', coach, 'POST', { eventId: event.id, branchId: branch.id, photo: '/test-selfie.png', latitude: -6, longitude: 106 })
  const approved = await request(`/event-staff/${checkin.id}/approve`, headCoach, 'PUT', {})
  assert.equal(approved.verifyStatus, 'approved')
  await request('/event-staff/checkin', coach, 'POST', { eventId: event.id, photo: '/test-selfie.png' }, 409)
  await request(`/event-staff/${checkin.id}/checkout/approve`, headCoach, 'PUT', {}, 400)
  await request('/event-staff/checkout', coach, 'POST', { eventId: event.id, photo: '/test-selfie.png' })
  const checkout = await request(`/event-staff/${checkin.id}/checkout/approve`, headCoach, 'PUT', {})
  assert.equal(checkout.checkOutVerifyStatus, 'approved')
  await prisma.userBranch.deleteMany({ where: { userId: headCoach.id } })
  const visible = await request('/event-staff', headCoach)
  assert(visible.some((row) => row.id === checkin.id))
  await request(`/event-staff/${checkin.id}/approve`, headCoach, 'PUT', {})
  await request(`/event-staff/${checkin.id}/approve`, coach, 'PUT', {}, 403)
  await prisma.userBranch.create({ data: { userId: headCoach.id, branchId: branch.id } })
  console.log('PASS: Head Coach verifies across branches; coach cannot verify')
  await prisma.event.update({ where: { id: event.id }, data: { fee: 100000 } })
  const participant = await prisma.eventParticipant.create({ data: { eventId: event.id, studentId: student.id } })
  const invoice = await prisma.payment.create({ data: { studentId: student.id, eventParticipantId: participant.id, paymentType: 'event', amount: 100000, totalAmount: 100000, transactionId: tag, paymentLink: 'https://example.invalid/invoice', paymentMethod: 'QRIS' } })
  const resumed = await request('/payments/event', { ...user, role: 'parent' }, 'POST', { eventParticipantId: participant.id, paymentMethod: 'QRIS' }, 201)
  assert.equal(resumed.payment.id, invoice.id)
  assert.equal(resumed.payment.paymentLink, invoice.paymentLink)
  await prisma.payment.update({ where: { id: invoice.id }, data: { status: 'failed' } })
  const originalFetch = globalThis.fetch
  let retried
  globalThis.fetch = async (url, options) => {
    if (String(url).includes('/api/v1/billing/payin/partner/create')) {
      assert.equal(JSON.parse(options.body).amount, 100000)
      return new Response(JSON.stringify({ response_code: '200', trx_id: `${tag}-retry`, payment_link: 'https://example.invalid/retry' }), { status: 200 })
    }
    return originalFetch(url, options)
  }
  try {
    retried = await request('/payments/event', { ...user, role: 'parent' }, 'POST', { eventParticipantId: participant.id, paymentMethod: 'QRIS' }, 201)
  } finally { globalThis.fetch = originalFetch }
  assert.notEqual(retried.payment.id, invoice.id)
  assert.equal((await prisma.payment.findUnique({ where: { id: invoice.id } })).status, 'failed')
  await applyPaymentSuccess(retried.payment)
  assert.equal((await prisma.eventParticipant.findUnique({ where: { id: participant.id } })).paymentStatus, 'paid')
  await request('/payments/event', { ...user, role: 'parent' }, 'POST', { eventParticipantId: participant.id, paymentMethod: 'QRIS' }, 400)

  // Pembayaran event yang BERHASIL langsung masuk laporan keuangan (kategori
  // "Biaya Event") tanpa verifikasi admin; yang gagal tidak pernah masuk.
  const eventLedger = await request('/ledger/pemasukan', user)
  const paidEventRow = eventLedger.items.filter((i) => i.id === retried.payment.id)
  assert.equal(paidEventRow.length, 1)
  assert.equal(paidEventRow[0].category, 'Biaya Event')
  assert.equal(paidEventRow[0].amount, 100000)
  assert.equal(paidEventRow[0].source, 'payment')
  assert(!eventLedger.items.some((i) => i.id === invoice.id), 'pembayaran gagal tidak boleh muncul di pemasukan')
  console.log('PASS: event invoice resumes and paid confirmation updates participant')
  console.log('PASS: event check-in/out and head coach verification')
  await prisma.student.update({ where: { id: student.id }, data: { branchId: branch.id, sessionsUsed: 3 } })
  const bulkReset = await request('/students/sessions/reset-all', headCoach, 'POST', { branchId: branch.id })
  assert.equal(bulkReset.count, 1)
  assert.equal((await prisma.student.findUnique({ where: { id: student.id } })).sessionsUsed, 0)
  await prisma.student.update({ where: { id: student.id }, data: { sessionsUsed: 3 } })
  console.log('PASS: head coach bulk session reset stays inside assigned branch')
  const editedPayment = await request(`/payments/${payment.id}`, user, 'PUT', { totalAmount: 75 })
  assert.equal(editedPayment.totalAmount, 75)
  const correctedStatus = await request(`/payments/${payment.id}`, user, 'PUT', { status: 'failed' })
  assert.equal(correctedStatus.status, 'failed')
  await request(`/payments/admin/${payment.id}`, user, 'DELETE')
  assert.equal(await prisma.payment.findUnique({ where: { id: payment.id } }), null)
  assert.equal((await prisma.student.findUnique({ where: { id: student.id } })).sessionsUsed, 3)
  console.log('PASS: payment edit/delete preserves student sessions')

  if (yesterday.getMonth() === now.getMonth()) {
    yesterday.setHours(0, 0, 0, 0)
    await prisma.attendance.deleteMany({ where: { studentId: student.id, date: yesterday } })
    await prisma.student.update({ where: { id: student.id }, data: { branchId: branch.id } })
    await prisma.schedule.create({ data: { branchId: branch.id, date: yesterday, startTime: '09:00', endTime: '10:00', location: tag } })
    const parent = { ...user, role: 'parent' }
    const before = await request('/students/me', parent)
    assert.equal(before.missedAttendanceDates.length, 1)
    await submit(yesterday, 'alfa')
    const after = await request('/students/me', parent)
    assert.equal(after.missedAttendanceDates.length, 0)
    console.log('PASS: parent reminder disappears after an alfa attendance correction')
  }
  const dates = { packageStartDate: `${now.getFullYear()}-01-01`, packageEndDate: `${now.getFullYear()}-12-31` }
  const countBefore = await prisma.payment.count({ where: { studentId: student.id } })
  const beforePeriod = await prisma.student.findUnique({ where: { id: student.id } })
  const corrected = await request(`/students/${student.id}/package-period`, headCoach, 'PUT', dates)
  assert.equal(corrected.sessionsUsed, beforePeriod.sessionsUsed)
  assert.equal(new Date(corrected.packageEndDate).getMonth(), 11)
  assert.equal(await prisma.payment.count({ where: { studentId: student.id } }), countBefore)
  await request(`/students/${student.id}/package-period`, user, 'PUT', { ...dates, packageEndDate: '2026-02-30' }, 400)
  await request(`/students/${student.id}/package-period`, user, 'PUT', { ...dates, packageEndDate: '2020-01-01' }, 400)
  await request(`/students/${student.id}/package-period`, { ...user, role: 'parent' }, 'PUT', dates, 403)
  await prisma.student.update({ where: { id: student.id }, data: { branchId: null } })
  await request(`/students/${student.id}/package-period`, headCoach, 'PUT', dates, 403)
  await prisma.student.update({ where: { id: student.id }, data: { branchId: branch.id } })
  // Admin/head_coach renewals are recorded as already paid and take effect
  // immediately — there is no pending "Verifikasi" step anymore.
  const beforeRenewals = await prisma.student.findUnique({ where: { id: student.id } })
  let lastEnd = beforeRenewals.packageEndDate
  for (const price of [599000, 399000]) {
    const quote = await request(`/students/${student.id}/renew`, user, 'POST', {
      isOldMember: false,
      customPackage: { name: tag, sessionsPerWeek: 2, durationMonths: 1, price },
    })
    assert.equal(quote.payment.amount, price)
    assert.equal(quote.payment.status, 'success')
    assert.equal(quote.paid, true)
    assert.equal((await request(`/students/${student.id}`, user)).customPackage.price, price)
    assert.equal((await request('/students/me', { ...user, role: 'parent' })).customPackage.price, price)
    const renewed = await prisma.student.findUnique({ where: { id: student.id } })
    assert.equal(renewed.status, 'active')
    assert(renewed.packageEndDate.getTime() > lastEnd.getTime())
    lastEnd = renewed.packageEndDate
  }
  await request(`/students/${student.id}/renew`, user, 'POST', { customPackage: { name: tag, sessionsPerWeek: 1, durationMonths: 1, price: 'invalid' } }, 400)
  await request(`/students/${student.id}/renew`, user, 'POST', { isOldMember: false, packageId: pkg.id })
  assert.equal((await request('/students/me', { ...user, role: 'parent' })).customPackage, null)
  console.log('PASS: paid admin renewals persist custom quotes and activate immediately; period corrections preserve payments and sessions with role/branch validation')

  // Keranjang & pembayaran gabungan: beberapa item (paket + BPJS) jadi satu
  // transaksi, tapi pemasukan tetap dipecah per kategori di laporan keuangan.
  const cartPackage = await request('/cart', user, 'POST', { studentId: student.id, type: 'package', packageId: pkg.id }, 201)
  assert.equal(cartPackage.category, 'Perpanjangan Paket')
  const cartBpjs = await request('/cart', user, 'POST', { studentId: student.id, type: 'bpjs', label: `${tag} BPJS`, amount: 50000 }, 201)
  assert.equal(cartBpjs.category, 'BPJS')
  const cartBefore = await request(`/cart/student/${student.id}`, user)
  assert.equal(cartBefore.items.length, 2)
  assert.equal(cartBefore.total, cartPackage.amount + 50000)
  assert.equal((await request('/cart/me', { ...user, role: 'parent' })).items.length, 2)

  const originalFetchCart = globalThis.fetch
  globalThis.fetch = async (url, options) => {
    if (String(url).includes('/api/v1/billing/payin/partner/create')) {
      return new Response(JSON.stringify({ response_code: '200', trx_id: `${tag}-cart`, payment_link: 'https://example.invalid/cart' }), { status: 200 })
    }
    return originalFetchCart(url, options)
  }
  let cartCheckout
  try {
    cartCheckout = await request('/cart/checkout', { ...user, role: 'parent' }, 'POST', { paymentMethod: 'QRIS' }, 201)
  } finally { globalThis.fetch = originalFetchCart }
  assert.equal(cartCheckout.payment.paymentType, 'cart')
  assert.equal(cartCheckout.payment.totalAmount, cartBefore.total)
  assert.equal(cartCheckout.payment.status, 'pending')
  assert.equal((await request('/cart/me', { ...user, role: 'parent' })).items.length, 0)

  const endBeforeCart = (await prisma.student.findUnique({ where: { id: student.id } })).packageEndDate
  await applyPaymentSuccess(cartCheckout.payment)
  const afterCart = await prisma.student.findUnique({ where: { id: student.id } })
  assert.equal(afterCart.status, 'active')
  assert(afterCart.packageEndDate.getTime() > endBeforeCart.getTime())
  const pemasukan = await request('/ledger/pemasukan', user)
  const cartRows = pemasukan.items.filter((i) => i.paymentType === 'cart')
  assert.equal(cartRows.length, 2)
  assert.deepEqual(cartRows.map((r) => r.category).sort(), ['BPJS', 'Perpanjangan Paket'])
  console.log('PASS: combined cart checkout splits into per-category ledger rows and applies package effect')

  // Alur "buat tagihan dulu, bayar kemudian": admin/head coach membuat TAGIHAN
  // (belum dibayar) yang langsung muncul sebagai tagihan di keranjang anak.
  // Selama belum dibayar: tidak ada Payment, paket belum diperpanjang, dan
  // TIDAK dihitung sebagai pendapatan. Parent membayar tagihan yang SAMA.
  const pemasukanBeforeInvoice = await request('/ledger/pemasukan', user)
  const successBeforeInvoice = await prisma.payment.count({ where: { studentId: student.id, status: 'success' } })
  const endBeforeInvoice = (await prisma.student.findUnique({ where: { id: student.id } })).packageEndDate

  const adminInvoice = await request(`/students/${student.id}/renew`, user, 'POST', { packageId: pkg.id, mode: 'invoice', note: `${tag} titipan` }, 201)
  assert.equal(adminInvoice.invoice, true)
  assert.equal(adminInvoice.cartItem.status, 'open')
  assert.equal(adminInvoice.amount, adminInvoice.cartItem.amount)
  assert.equal(adminInvoice.cartItem.category, 'Perpanjangan Paket')

  assert.equal(await prisma.payment.count({ where: { studentId: student.id, status: 'success' } }), successBeforeInvoice)
  assert.equal((await prisma.student.findUnique({ where: { id: student.id } })).packageEndDate.getTime(), endBeforeInvoice.getTime())
  assert.equal((await request('/ledger/pemasukan', user)).total, pemasukanBeforeInvoice.total)

  // Anti-duplikasi: tagihan paket kedua untuk anak yang sama ditolak, baik dari
  // admin maupun dari parent — satu periode = satu tagihan.
  await request(`/students/${student.id}/renew`, user, 'POST', { packageId: pkg.id, mode: 'invoice' }, 400)
  await request('/cart', { ...user, role: 'parent' }, 'POST', { type: 'package', packageId: pkg.id }, 400)

  // Tagihan tampil di panel "Tagihan Belum Dibayar" (bukan pendapatan).
  const outstanding = await request('/cart/outstanding', user)
  assert(outstanding.items.some((i) => i.id === adminInvoice.cartItem.id))
  await request('/cart/outstanding', { ...user, role: 'parent' }, 'GET', undefined, 403)

  // Parent membayar tagihan itu lewat keranjang: satu Payment, satu baris
  // pemasukan, paket diperpanjang sekali.
  const originalFetchInvoice = globalThis.fetch
  globalThis.fetch = async (url, options) => {
    if (String(url).includes('/api/v1/billing/payin/partner/create')) {
      return new Response(JSON.stringify({ response_code: '200', trx_id: `${tag}-inv`, payment_link: 'https://example.invalid/inv' }), { status: 200 })
    }
    return originalFetchInvoice(url, options)
  }
  let invoiceCheckout
  try {
    invoiceCheckout = await request('/cart/checkout', { ...user, role: 'parent' }, 'POST', { paymentMethod: 'QRIS' }, 201)
  } finally { globalThis.fetch = originalFetchInvoice }
  assert.equal(invoiceCheckout.payment.totalAmount, adminInvoice.amount)
  assert.equal(invoiceCheckout.payment.status, 'pending')

  await applyPaymentSuccess(invoiceCheckout.payment)
  assert((await prisma.student.findUnique({ where: { id: student.id } })).packageEndDate.getTime() > endBeforeInvoice.getTime())
  const pemasukanAfterInvoice = await request('/ledger/pemasukan', user)
  assert.equal(pemasukanAfterInvoice.total - pemasukanBeforeInvoice.total, adminInvoice.amount)
  assert.equal(pemasukanAfterInvoice.items.filter((i) => i.category === 'Perpanjangan Paket' && i.note === `${tag} titipan`).length, 1)
  assert.equal((await prisma.cartItem.findUnique({ where: { id: adminInvoice.cartItem.id } })).status, 'checked_out')

  // Perpanjangan paket MANDIRI dari menu Perpanjang Paket: parent membuat
  // tagihannya sendiri lalu langsung membayarnya. Begitu gateway mengonfirmasi,
  // paket diperpanjang dan barisnya muncul di Keuangan kategori "Perpanjangan
  // Paket" — tanpa langkah verifikasi admin.
  const endBeforeSelf = (await prisma.student.findUnique({ where: { id: student.id } })).packageEndDate
  const pemasukanBeforeSelf = await request('/ledger/pemasukan', user)
  const selfTagihan = await request('/cart', { ...user, role: 'parent' }, 'POST', { type: 'package', packageId: pkg.id }, 201)
  assert.equal(selfTagihan.category, 'Perpanjangan Paket')
  assert.equal(selfTagihan.status, 'open')
  const originalFetchSelf = globalThis.fetch
  globalThis.fetch = async (url, options) => {
    if (String(url).includes('/api/v1/billing/payin/partner/create')) {
      return new Response(JSON.stringify({ response_code: '200', trx_id: `${tag}-self`, payment_link: 'https://example.invalid/self' }), { status: 200 })
    }
    return originalFetchSelf(url, options)
  }
  let selfCheckout
  try {
    selfCheckout = await request('/cart/checkout', { ...user, role: 'parent' }, 'POST', { paymentMethod: 'QRIS' }, 201)
  } finally { globalThis.fetch = originalFetchSelf }
  assert.equal(selfCheckout.payment.totalAmount, selfTagihan.amount)
  await applyPaymentSuccess(selfCheckout.payment)
  const pemasukanAfterSelf = await request('/ledger/pemasukan', user)
  assert.equal(pemasukanAfterSelf.total - pemasukanBeforeSelf.total, selfTagihan.amount)
  assert.equal(pemasukanAfterSelf.items.filter((i) => i.id === selfCheckout.payment.id && i.category === 'Perpanjangan Paket').length, 1)
  assert((await prisma.student.findUnique({ where: { id: student.id } })).packageEndDate.getTime() > endBeforeSelf.getTime())
  console.log('PASS: parent self-service renewal lands in the finance report as "Perpanjangan Paket" without admin verification')

  // Endpoint lama pembuatan pembayaran perpanjangan sudah dinonaktifkan supaya
  // tidak ada jalur tulis kedua yang bisa menduplikasi transaksi.
  await request('/payments/renewal', { ...user, role: 'parent' }, 'POST', { packageId: pkg.id, paymentMethod: 'QRIS' }, 400)

  // "Tandai Lunas" manual (cash / transfer pribadi) oleh admin/head coach:
  // Payment lunas + efek langsung + metode & keterangan tersimpan, tanpa
  // antrean verifikasi.
  const cashItem = await request('/cart', user, 'POST', { studentId: student.id, type: 'bpjs', label: `${tag} BPJS manual`, amount: 25000, note: `${tag} cash` }, 201)
  await request('/cart/mark-paid', { ...user, role: 'parent' }, 'POST', { studentId: student.id, itemIds: [cashItem.id] }, 403)
  const cashPaid = await request('/cart/mark-paid', user, 'POST', { studentId: student.id, itemIds: [cashItem.id], paymentMethod: 'cash', note: `${tag} cash` }, 201)
  assert.equal(cashPaid.payment.status, 'success')
  assert.equal(cashPaid.payment.paymentMethod, 'cash')
  assert.equal(cashPaid.payment.note, `${tag} cash`)
  assert.equal(cashPaid.payment.totalAmount, 25000)
  assert(cashPaid.payment.effectsAppliedAt)
  assert.equal((await prisma.cartItem.findUnique({ where: { id: cashItem.id } })).status, 'checked_out')

  // Tagihan bisa diubah & dihapus selama belum dibayar (CRUD admin + parent
  // boleh membuang item yang dititipkan admin).
  const editable = await request('/cart', user, 'POST', { studentId: student.id, type: 'bpjs', label: `${tag} BPJS edit`, amount: 10000 }, 201)
  const edited = await request(`/cart/${editable.id}`, user, 'PATCH', { amount: 12000, note: `${tag} revisi` })
  assert.equal(edited.amount, 12000)
  assert.equal(edited.metadata.note, `${tag} revisi`)
  await request(`/cart/${editable.id}`, { ...user, role: 'parent' }, 'DELETE')
  assert.equal(await prisma.cartItem.count({ where: { id: editable.id } }), 0)

  // "Tandai Lunas" pada perpanjangan membatalkan tagihan paket yang masih
  // terbuka supaya periode yang sama tidak dibayar dua kali.
  await request(`/students/${student.id}/renew`, user, 'POST', { packageId: pkg.id, mode: 'invoice' }, 201)
  const paidManual = await request(`/students/${student.id}/renew`, user, 'POST', { packageId: pkg.id, mode: 'paid', paymentMethod: 'transfer_manual', note: `${tag} transfer` })
  assert.equal(paidManual.payment.status, 'success')
  assert.equal(paidManual.payment.note, `${tag} transfer`)
  assert.equal(await prisma.cartItem.count({ where: { studentId: student.id, type: 'package', status: 'open' } }), 0)
  console.log('PASS: admin invoice stays unpaid and out of income until the parent pays that same tagihan once')

  // Katalog merchandise: admin mengelola produk, parent membelinya lewat
  // keranjang, dan stok berkurang saat pembayaran lunas.
  const product = await request('/products', user, 'POST', { name: `${tag} Jersey`, category: 'Jersey', price: 150000, stock: 2 }, 201)
  assert.equal(product.stock, 2)
  assert.equal(product.isActive, true)
  assert.equal((await request('/products', user)).some((p) => p.id === product.id), true)
  await request(`/products/${product.id}`, { ...user, role: 'parent' }, 'PUT', { price: 1000 }, 403)

  const cartProduct = await request('/cart', { ...user, role: 'parent' }, 'POST', { type: 'merchandise', productId: product.id }, 201)
  assert.equal(cartProduct.category, 'Merchandise')
  assert.equal(cartProduct.amount, 150000)
  assert.equal(cartProduct.productId, product.id)

  const originalFetchProduct = globalThis.fetch
  globalThis.fetch = async (url, options) => {
    if (String(url).includes('/api/v1/billing/payin/partner/create')) {
      return new Response(JSON.stringify({ response_code: '200', trx_id: `${tag}-product`, payment_link: 'https://example.invalid/product' }), { status: 200 })
    }
    return originalFetchProduct(url, options)
  }
  let productCheckout
  try {
    productCheckout = await request('/cart/checkout', { ...user, role: 'parent' }, 'POST', { paymentMethod: 'QRIS' }, 201)
  } finally { globalThis.fetch = originalFetchProduct }
  assert.equal(productCheckout.payment.totalAmount, 150000)
  await applyPaymentSuccess(productCheckout.payment)
  assert.equal((await prisma.product.findUnique({ where: { id: product.id } })).stock, 1)

  await request(`/products/${product.id}`, user, 'PUT', { stock: 0 })
  await request('/cart', { ...user, role: 'parent' }, 'POST', { type: 'merchandise', productId: product.id }, 400)
  await request(`/products/${product.id}`, user, 'PUT', { isActive: false })
  assert.equal((await request('/products', user)).some((p) => p.id === product.id), false)
  console.log('PASS: merchandise catalog feeds the cart, decrements stock, and hides sold-out/inactive products')

  // Billing BPJS otomatis: satu item BPJS periode berjalan masuk ke keranjang
  // setiap anak terdaftar, dan penagihan ulang idempoten (tidak menggandakan).
  // Scoped ke anak uji saja agar tidak menyentuh data lain di snapshot lokal.
  // (Tes keranjang di atas sudah menagih BPJS periode ini lewat jalur manual —
  // bukti dedup jalan — jadi dibersihkan dulu agar bisa menguji job-nya.)
  settingsRow = await prisma.cmsContent.findFirst({ where: { section: 'settings' } })
  await request('/settings', user, 'PUT', { ...(settingsRow?.content || {}), bpjsEnabled: true, bpjsAmount: 35000, bpjsDay: 1 })
  await prisma.cartItem.deleteMany({ where: { studentId: student.id, type: 'bpjs' } })
  const statusBefore = await request('/settings/bpjs/status', user)
  const bpjsRun = await request('/settings/bpjs/run', user, 'POST', { studentIds: [student.id] })
  assert.equal(bpjsRun.amount, 35000)
  assert.equal(bpjsRun.eligible, 1, JSON.stringify(bpjsRun))
  assert.equal(bpjsRun.created, 1, JSON.stringify(bpjsRun))
  const bpjsRunAgain = await request('/settings/bpjs/run', user, 'POST', { studentIds: [student.id] })
  assert.equal(bpjsRunAgain.created, 0)
  const bpjsItem = await prisma.cartItem.findFirst({ where: { studentId: student.id, type: 'bpjs', periodMonth: statusBefore.period.month, periodYear: statusBefore.period.year } })
  assert(bpjsItem)
  assert.equal(bpjsItem.amount, 35000)
  assert.equal(bpjsItem.category, 'BPJS')
  const statusAfter = await request('/settings/bpjs/status', user)
  assert.equal(statusAfter.billed, statusBefore.billed + 1)
  console.log('PASS: monthly BPJS billing fills every active student cart exactly once (idempotent)')

  // Audit Pembayaran: deteksi anomali + jejak perubahan.
  await request('/payments/audit', { ...user, role: 'parent' }, 'GET', undefined, 403)

  const stuck = await prisma.payment.create({ data: { studentId: student.id, amount: 100000, totalAmount: 100000, paymentType: 'renewal', status: 'pending', createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) } })
  const noEffects = await prisma.payment.create({ data: { studentId: student.id, amount: 200000, totalAmount: 200000, paymentType: 'renewal', status: 'success' } })
  await prisma.payment.create({ data: { studentId: student.id, amount: 300000, totalAmount: 300000, paymentType: 'renewal', status: 'pending' } })
  await prisma.payment.create({ data: { studentId: student.id, amount: 300000, totalAmount: 300000, paymentType: 'renewal', status: 'pending' } })

  const audit = await request('/payments/audit', user)
  const anomalyTypes = new Set(audit.anomalies.map((a) => a.type))
  assert(anomalyTypes.has('stuck_pending'))
  assert(anomalyTypes.has('success_no_effects'))
  assert(anomalyTypes.has('duplicate_pending'))
  assert(audit.anomalies.some((a) => a.type === 'stuck_pending' && a.paymentId === stuck.id))
  assert(audit.anomalies.some((a) => a.type === 'success_no_effects' && a.paymentId === noEffects.id))
  assert(audit.summary.anomalies === audit.anomalies.length)

  // Edit admin tercatat di jejak audit (pelaku + ringkasan perubahan).
  await request(`/payments/${stuck.id}`, user, 'PUT', { status: 'failed' })
  const auditEdited = await request('/payments/audit', user)
  const editLog = auditEdited.logs.find((l) => l.action === 'edit' && l.paymentId === stuck.id)
  assert(editLog)
  assert.equal(editLog.actorName, tag)
  assert.equal(editLog.actorRole, 'admin')
  assert(editLog.note.includes('status'))

  // Pembatalan oleh parent juga tercatat.
  const cancelTarget = await prisma.payment.create({ data: { studentId: student.id, amount: 50000, totalAmount: 50000, paymentType: 'cart', status: 'pending' } })
  await request(`/payments/${cancelTarget.id}`, { ...user, role: 'parent' }, 'DELETE', undefined, 200)
  const auditCancelled = await request('/payments/audit', user)
  assert(auditCancelled.logs.some((l) => l.action === 'cancel' && l.paymentId === cancelTarget.id))

  // Sinkronisasi manual admin tetap berjalan (no-op untuk pembayaran non-pending).
  const syncRes = await request(`/payments/audit/${stuck.id}/sync`, user, 'POST', {})
  assert.equal(syncRes.status, 'failed')
  await request(`/payments/audit/${stuck.id}/sync`, { ...user, role: 'parent' }, 'POST', {}, 403)
  await request(`/payments/audit/${cancelTarget.id}/sync`, user, 'POST', {}, 404)
  console.log('PASS: payment audit flags anomalies and records an audit trail of changes')

  // Menu Laporan Coach: coach bisa membaca penilaian & rapor siswa di cabangnya.
  const lapMonth = now.getMonth() + 1
  const lapYear = now.getFullYear()
  const assessment = await request('/assessments', headCoach, 'POST', {
    studentId: student.id, month: lapMonth, year: lapYear, endMonth: lapMonth, endYear: lapYear, coachComment: tag,
  })
  const coachAssessment = await request(`/assessments?studentId=${student.id}&month=${lapMonth}&year=${lapYear}`, coach)
  assert.equal(coachAssessment.id, assessment.id)
  assert.equal(coachAssessment.coachComment, tag)

  const reportRow = await prisma.report.create({ data: { studentId: student.id, month: lapMonth, year: lapYear, endMonth: lapMonth, endYear: lapYear, assessmentId: assessment.id, pdfUrl: 'https://example.invalid/rapor.pdf' } })
  const coachReport = await request(`/reports?studentId=${student.id}&month=${lapMonth}&year=${lapYear}`, coach)
  assert.equal(coachReport.id, reportRow.id)
  assert.equal(coachReport.pdfUrl, 'https://example.invalid/rapor.pdf')

  // Tanpa cabang yang cocok, coach ditolak — akses tetap branch-scoped & read-only.
  await prisma.userBranch.deleteMany({ where: { userId: coach.id } })
  await request(`/assessments?studentId=${student.id}&month=${lapMonth}&year=${lapYear}`, coach, 'GET', undefined, 403)
  await request(`/reports?studentId=${student.id}&month=${lapMonth}&year=${lapYear}`, coach, 'GET', undefined, 403)
  await prisma.userBranch.create({ data: { userId: coach.id, branchId: branch.id } })
  await request('/assessments', coach, 'POST', { studentId: student.id, month: lapMonth, year: lapYear }, 403)
  console.log('PASS: coach can open the student report/assessment content of their branch (read-only)')

  // Payroll coach: honor harian x hari hadir terverifikasi + bonus/potongan.
  await request('/payroll?month=1&year=2026', { ...user, role: 'coach' }, 'GET', undefined, 403)
  await prisma.user.update({ where: { id: coach.id }, data: { dailyRate: 100000 } })
  const payMonth = now.getMonth() + 1
  const payYear = now.getFullYear()
  const staffDays = [5, 6, 7, 8].map((d) => new Date(payYear, payMonth - 1, d))
  await prisma.staffAttendance.create({ data: { userId: coach.id, branchId: branch.id, date: staffDays[0], status: 'hadir', checkInTime: staffDays[0], verifyStatus: 'approved', checkOutTime: staffDays[0], checkOutVerifyStatus: 'approved' } })
  await prisma.staffAttendance.create({ data: { userId: coach.id, branchId: branch.id, date: staffDays[1], status: 'hadir', checkInTime: staffDays[1], verifyStatus: 'approved', checkOutVerifyStatus: 'pending' } })
  await prisma.staffAttendance.create({ data: { userId: coach.id, branchId: branch.id, date: staffDays[2], status: 'hadir', checkInTime: staffDays[2], verifyStatus: 'pending' } })
  await prisma.staffAttendance.create({ data: { userId: coach.id, branchId: branch.id, date: staffDays[3], status: 'hadir', checkInTime: staffDays[3], verifyStatus: 'rejected' } })

  const payrollList = await request(`/payroll?month=${payMonth}&year=${payYear}`, user)
  const coachEntry = payrollList.entries.find((e) => e.coach.id === coach.id)
  assert.equal(coachEntry.stats.daysPresent, 2)
  assert.equal(coachEntry.stats.pending, 1)
  assert.equal(coachEntry.stats.rejected, 1)
  assert.equal(coachEntry.stats.missingCheckout, 1)
  assert.equal(coachEntry.estimate, 200000)

  payrollSeed = (await prisma.coachPayroll.findMany({ select: { id: true } })).map((r) => r.id)
  const generated = await request('/payroll/generate', user, 'POST', { month: payMonth, year: payYear })
  assert(generated.created >= 2) // coach + head coach fixture

  const afterGen = await request(`/payroll?month=${payMonth}&year=${payYear}`, user)
  const slip = afterGen.entries.find((e) => e.coach.id === coach.id).payroll
  assert.equal(slip.daysPresent, 2)
  assert.equal(slip.dailyRate, 100000)
  assert.equal(slip.total, 200000)

  const correctedSlip = await request(`/payroll/${slip.id}`, user, 'PUT', { bonus: 50000, deduction: 20000, note: tag })
  assert.equal(correctedSlip.total, 230000)
  await request(`/payroll/${slip.id}`, user, 'PUT', { bonus: -1 }, 400)

  const paidSlip = await request(`/payroll/${slip.id}/pay`, user, 'POST', {})
  assert.equal(paidSlip.status, 'paid')
  assert(paidSlip.paidAt)

  const regen = await request('/payroll/generate', user, 'POST', { month: payMonth, year: payYear })
  assert.equal(regen.skipped, 1)
  const afterRegen = await request(`/payroll?month=${payMonth}&year=${payYear}`, user)
  assert.equal(afterRegen.entries.find((e) => e.coach.id === coach.id).payroll.total, 230000)
  await request(`/payroll/${slip.id}`, { ...user, role: 'coach' }, 'DELETE', undefined, 403)
  console.log('PASS: coach payroll derives honor from verified attendance and locks paid slips')

  // Absensi Coach: rekap bulanan per coach (dasar honor payroll).
  const recap = await request(`/staff-attendance/recap?month=${payMonth}&year=${payYear}`, user)
  const recapCoach = recap.coaches.find((c) => c.coach.id === coach.id)
  assert.equal(recapCoach.stats.daysPresent, 2)
  assert.equal(recapCoach.stats.pending, 1)
  assert.equal(recapCoach.stats.rejected, 1)
  assert.equal(recapCoach.stats.missingCheckout, 1)
  assert.equal(recapCoach.records.length, 4)
  assert(recap.totals.coaches >= 2)
  assert(recap.totals.daysPresent >= 2)

  // Head coach hanya melihat coach di cabangnya; coach tidak boleh mengakses.
  const headRecap = await request(`/staff-attendance/recap?month=${payMonth}&year=${payYear}`, headCoach)
  assert(headRecap.coaches.some((c) => c.coach.id === coach.id))
  assert(headRecap.coaches.every((c) => c.coach.role === 'coach'))
  await request(`/staff-attendance/recap?month=${payMonth}&year=${payYear}`, { ...user, role: 'coach' }, 'GET', undefined, 403)
  await request(`/staff-attendance/recap?month=${payMonth}`, user, 'GET', undefined, 400)
  console.log('PASS: coach attendance recap summarises verified days and scopes head coach to their branch')

  // Verifikasi absensi coach/head coach dihapus: absen masuk & pulang langsung
  // sah ('approved') sehingga langsung masuk laporan (foto + timestamp) dan
  // payroll, tanpa antrean verifikasi admin.
  const selfieIn = `https://example.invalid/${tag}-in.jpg`
  const checkinStaff = await request('/staff-attendance/checkin', coach, 'POST', {
    photo: selfieIn,
    branchId: branch.id,
    locationName: `Lapangan ${tag}`,
  })
  assert.equal(checkinStaff.verifyStatus, 'approved')
  assert(checkinStaff.verifiedAt)
  assert.equal(checkinStaff.rejectReason, null)

  const checkoutStaff = await request('/staff-attendance/checkout', coach, 'POST', {
    photo: `https://example.invalid/${tag}-out.jpg`,
    branchId: branch.id,
  })
  assert.equal(checkoutStaff.checkOutVerifyStatus, 'approved')
  assert(checkoutStaff.checkOutVerifiedAt)

  const recapAfter = await request(`/staff-attendance/recap?month=${payMonth}&year=${payYear}`, user)
  const recapCoachAfter = recapAfter.coaches.find((c) => c.coach.id === coach.id)
  const freshRecord = recapCoachAfter.records.find((r) => r.photo === selfieIn)
  assert(freshRecord)
  assert.equal(freshRecord.verifyStatus, 'approved')
  assert.equal(freshRecord.checkOutVerifyStatus, 'approved')
  assert(recapCoachAfter.stats.pending <= recapCoach.stats.pending) // absen baru tidak menambah antrean verifikasi
  assert.equal(recapAfter.totals.totalRecords, recapAfter.coaches.reduce((sum, c) => sum + c.stats.totalRecords, 0))
  console.log('PASS: staff check-in/check-out is auto-approved (no admin verification) and lands in the report')

  // Tombol Chat Admin (#6): nomor WhatsApp tujuan tersedia di pengaturan publik.
  const publicSettings = await request('/settings', user)
  assert(publicSettings.waAdminNumber)
  console.log('PASS: public settings expose the WhatsApp admin number used by the dashboard Chat Admin button')

} finally {
  await prisma.notification.deleteMany({ where: { message: { contains: tag } } })
  if (student) await prisma.paymentAuditLog.deleteMany({ where: { studentId: student.id } })
  if (student) await prisma.student.delete({ where: { id: student.id } })
  if (payrollSeed) await prisma.coachPayroll.deleteMany({ where: { id: { notIn: payrollSeed } } })
  await prisma.product.deleteMany({ where: { name: { contains: tag } } })
  if (settingsRow) await prisma.cmsContent.update({ where: { id: settingsRow.id }, data: { content: settingsRow.content } })
  else await prisma.cmsContent.deleteMany({ where: { section: 'settings' } })
  await prisma.package.deleteMany({ where: { name: tag, isCustom: true } })
  if (event) await prisma.event.delete({ where: { id: event.id } })
  for (const actor of [coach, headCoach]) if (actor) await prisma.user.delete({ where: { id: actor.id } })
  if (branch) {
    await prisma.schedule.deleteMany({ where: { branchId: branch.id } })
    await prisma.branch.delete({ where: { id: branch.id } })
  }
  if (user) {
    await prisma.notification.deleteMany({ where: { userId: user.id } })
    await prisma.user.delete({ where: { id: user.id } })
  }
  await new Promise((resolve) => server.close(resolve))
  await prisma.$disconnect()
}
