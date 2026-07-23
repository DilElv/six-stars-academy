import { Router } from 'express'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { notifyUser } from '../lib/notify.js'

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

const AGE_GROUP_BRACKETS = [
  { label: 'U-8', min: 0, max: 8 },
  { label: 'U-10', min: 9, max: 10 },
  { label: 'U-12', min: 11, max: 12 },
  { label: 'U-14', min: 13, max: 14 },
  { label: 'U-16', min: 15, max: 16 },
  { label: 'U-18', min: 17, max: 999 },
]

function calcAge(dob) {
  const birth = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

function assignAgeGroup(dob) {
  const age = calcAge(dob)
  const bracket = AGE_GROUP_BRACKETS.find((b) => age >= b.min && age <= b.max)
  return bracket ? bracket.label : AGE_GROUP_BRACKETS[0].label
}

router.post('/register', async (req, res) => {
  const {
    packageId, fullName, dateOfBirth, position, photo,
    parentName, parentPhone, address, email, password, branchId,
    amount, registrationFee: regFeeOverride,
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

    const ageGroup = assignAgeGroup(dateOfBirth)
    const hashed = await bcrypt.hash(password, 10)
    const registrationFee = regFeeOverride ?? await getRegistrationFee(branchId)
    const pkgAmount = amount ?? pkg.price

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name: parentName, email, password: hashed, role: 'parent', phone: parentPhone },
      })

      const count = await tx.student.count()
      const studentId = `SS-${String(count + 1).padStart(4, '0')}`

      const packageStartDate = new Date()
      const packageEndDate = new Date(packageStartDate)
      packageEndDate.setMonth(packageEndDate.getMonth() + pkg.durationMonths)

      const student = await tx.student.create({
        data: {
          userId: user.id,
          studentId,
          fullName,
          dateOfBirth: new Date(dateOfBirth),
          position,
          ageGroup,
          photo: photo || null,
          parentName,
          parentPhone,
          parentEmail: email,
          address,
          packageId: pkg.id,
          packageStartDate,
          packageEndDate,
          branchId: branchId || null,
        },
      })

      const totalAmount = pkgAmount + registrationFee
      const payment = await tx.payment.create({
        data: {
          studentId: student.id,
          packageId: pkg.id,
          amount: pkgAmount,
          registrationFee,
          totalAmount,
          paymentType: 'registration',
          status: 'pending',
        },
      })

      const card = await tx.studentCard.create({
        data: {
          studentId: student.id,
          qrCode: crypto.randomBytes(16).toString('hex'),
          cardNumber: student.studentId,
        },
      })

      return { user, student, payment, card }
    })

    await notifyUser(result.user.id, {
      type: 'registration_success',
      title: 'Pendaftaran Berhasil',
      message: `Selamat datang! ${result.student.fullName} (${result.student.studentId}) berhasil terdaftar.`,
      link: '/dashboard',
    })

    const token = jwt.sign({ id: result.user.id, email: result.user.email, role: result.user.role }, process.env.JWT_SECRET, { expiresIn: '7d' })
    const { password: _pw, ...profile } = result.user
    res.status(201).json({ token, profile, student: result.student, payment: result.payment })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, include: { branch: true } })
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
  const { name, phone, photo, bio, branchId, password } = req.body
  try {
    const data = { name, phone, photo, bio }
    if (password) {
      if (password.length < 6) return res.status(400).json({ error: 'Password minimal 6 karakter' })
      data.password = await bcrypt.hash(password, 10)
    }
    if (req.user.role === 'coach' || req.user.role === 'head_coach') {
      data.branchId = undefined
    } else {
      data.branchId = branchId !== undefined ? (branchId || null) : undefined
    }
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data,
      include: { branch: true },
    })
    const { password: _pw, ...profile } = user
    res.json(profile)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
