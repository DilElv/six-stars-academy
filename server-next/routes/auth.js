import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { createBillingFor, convertPendingRegistration, failPendingRegistration } from '../lib/paymentHelpers.js'
import { queryPayment } from '../lib/rintisan.js'

const router = Router()

router.post('/login', async (req, res) => {
  const { email, password } = req.body
  try {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return res.status(401).json({ error: 'Email atau password salah' })

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return res.status(401).json({ error: 'Email atau password salah' })

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' })
    const { password: _pw, ...profile } = user
    res.json({ token, profile })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

const DEFAULT_REGISTRATION_FEE = 750000

async function getRegistrationFee(branchId) {
  if (branchId) {
    const branch = await prisma.branch.findUnique({ where: { id: branchId } })
    if (branch?.registrationFee) return branch.registrationFee
  }
  const row = await prisma.cmsContent.findFirst({ where: { section: 'settings' } })
  return row?.content?.registrationFee ?? DEFAULT_REGISTRATION_FEE
}


// No User/Student/Payment is created here. A PendingRegistration row holds the
// wizard data + billing link; the real account is only created once the
// Rintisan webhook confirms the payment succeeded (see convertPendingRegistration
// in lib/paymentHelpers.js, called from routes/payments.js's callback handler).
router.post('/register', async (req, res) => {
  const {
    packageId, fullName, dateOfBirth, position, photo,
    parentName, parentPhone, address, email, password, branchId,
    amount, registrationFee: regFeeOverride, paymentMethod,
  } = req.body

  try {
    if (!email || !email.toLowerCase().endsWith('@sixstars.id')) {
      return res.status(400).json({ error: 'Email untuk login harus menggunakan domain @sixstars.id' })
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password minimal 6 karakter' })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return res.status(400).json({ error: 'Email sudah terdaftar' })

    const pkg = await prisma.package.findUnique({ where: { id: packageId } })
    if (!pkg) return res.status(400).json({ error: 'Paket tidak ditemukan' })

    const hashed = await bcrypt.hash(password, 10)
    const registrationFee = regFeeOverride ?? await getRegistrationFee(branchId)
    const pkgAmount = amount ?? pkg.price
    const totalAmount = pkgAmount + registrationFee

    // New self-registrations always start with no beasiswa (0%) — admin can
    // grant one afterward via Data Anak, which then applies from the next
    // renewal onward.
    const pending = await prisma.pendingRegistration.create({
      data: {
        fullName,
        dateOfBirth: new Date(dateOfBirth),
        position,
        photo: photo || null,
        branchId: branchId || null,
        parentName,
        parentPhone,
        address,
        email,
        passwordHash: hashed,
        packageId: pkg.id,
        amount: pkgAmount,
        registrationFee,
        totalAmount,
        paymentMethod: paymentMethod || null,
      },
    })

    let rintisan = null
    if (paymentMethod) {
      try {
        const result = await createBillingFor({
          id: pending.id,
          totalAmount: pending.totalAmount,
          paymentMethod,
          toName: parentName,
          toEmail: email,
          toPhone: parentPhone,
          toAddress: address,
          note: `Pendaftaran ${fullName}`,
        })
        await prisma.pendingRegistration.update({
          where: { id: pending.id },
          data: {
            transactionId: result.trx_id || null,
            paymentLink: result.rintisan_billing_link || result.payment_link || null,
            qrString: result.qr_string || null,
          },
        })
        rintisan = result
      } catch (err) {
        console.error('Rintisan checkout error saat registrasi:', err.message)
        // Pending registration tetap tersimpan; parent bisa coba lagi (belum ada akun/token untuk itu saat ini).
      }
    }

    res.status(201).json({ pendingRegistrationId: pending.id, totalAmount: pending.totalAmount, rintisan })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Public: registration wizard polls this to know when the first payment has
// gone through and the real account/student has been created.
router.get('/pending-registration/:id', async (req, res) => {
  try {
    let pending = await prisma.pendingRegistration.findUnique({ where: { id: req.params.id } })
    if (!pending) return res.status(404).json({ error: 'Pendaftaran tidak ditemukan' })

    // Self-heal: don't rely solely on Rintisan's webhook arriving (it can fail
    // to reach us for reasons outside our control, e.g. a misconfigured
    // callback URL on their side). Every time the wizard polls this endpoint
    // while still "pending", ask Rintisan directly whether it's actually paid.
    if (pending.status === 'pending' && pending.transactionId) {
      try {
        const result = await queryPayment(pending.transactionId)
        if (String(result.response_code) === '200' && result.payment_status === 'PAID') {
          await convertPendingRegistration(pending)
          pending = await prisma.pendingRegistration.findUnique({ where: { id: pending.id } })
        }
      } catch (err) {
        console.error('queryPayment self-heal check failed:', err.message)
        // keep returning the current (still pending) status; next poll retries
      }
    }

    res.json({
      status: pending.status,
      paymentLink: pending.paymentLink,
      qrString: pending.qrString,
      paymentMethod: pending.paymentMethod,
      totalAmount: pending.totalAmount,
      failReason: pending.failReason,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, include: { branches: { include: { branch: true } } } })
    if (!user) return res.status(404).json({ error: 'User not found' })
    const { password: _pw, ...profile } = user

    let access = 'full'
    if (user.role === 'parent') {
      const student = await prisma.student.findFirst({ where: { userId: user.id }, orderBy: { createdAt: 'asc' } })
      if (student) {
        const hasPendingPayment = await prisma.payment.findFirst({
          where: { studentId: student.id, status: 'pending' },
        })
        const expired = student.packageEndDate && new Date(student.packageEndDate) < new Date()
        if (hasPendingPayment || expired) {
          access = 'payment-only'
        }
      }
    }

    res.json({ ...profile, access })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/me', authenticate, async (req, res) => {
  const { name, phone, photo, signature, bio, address, email, password } = req.body
  try {
    const data = { name, phone, photo, signature, bio, address }
    if (password) {
      if (password.length < 6) return res.status(400).json({ error: 'Password minimal 6 karakter' })
      data.password = await bcrypt.hash(password, 10)
    }
    if (email !== undefined && email !== req.user.email) {
      if (req.user.role === 'parent' && !email.toLowerCase().endsWith('@sixstars.id')) {
        return res.status(400).json({ error: 'Email untuk login harus menggunakan domain @sixstars.id' })
      }
      const clash = await prisma.user.findUnique({ where: { email } })
      if (clash) return res.status(400).json({ error: 'Email sudah terdaftar' })
      data.email = email
    }
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data,
      include: { branches: { include: { branch: true } } },
    })
    // Student.parentEmail is a denormalized copy of the parent's login email
    // (shown read-only elsewhere, e.g. admin's Edit Data Anak) — keep it in
    // sync so it doesn't silently drift from the credential that actually works.
    if (data.email && req.user.role === 'parent') {
      await prisma.student.updateMany({ where: { userId: req.user.id }, data: { parentEmail: data.email } })
    }
    const { password: _pw, ...profile } = user
    res.json(profile)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
