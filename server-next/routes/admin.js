import { Router } from 'express'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma.js'
import { authenticate, authorize } from '../middleware/auth.js'

const router = Router()

router.use(authenticate, authorize('admin'))

router.get('/stats', async (req, res) => {
  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0)
    const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999)

    const [totalAnak, totalHeadCoach, totalCoach, pendapatanBulanIni, absensiHariIni, pembayaranPending, raporBelumDibuat] = await Promise.all([
      prisma.student.count({ where: { status: 'active' } }),
      prisma.user.count({ where: { role: 'head_coach' } }),
      prisma.user.count({ where: { role: 'coach' } }),
      prisma.payment.aggregate({ _sum: { totalAmount: true }, where: { status: 'success', paidAt: { gte: startOfMonth } } }),
      prisma.attendance.count({ where: { date: { gte: startOfToday, lte: endOfToday } } }),
      prisma.payment.count({ where: { status: 'pending' } }),
      prisma.assessment.count({ where: { month: now.getMonth() + 1, year: now.getFullYear(), reports: { none: {} } } }),
    ])

    res.json({
      totalAnak,
      totalHeadCoach,
      totalCoach,
      pendapatanBulanIni: pendapatanBulanIni._sum.totalAmount || 0,
      absensiHariIni,
      pembayaranPending,
      raporBelumDibuat,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/revenue-trend', async (req, res) => {
  try {
    const now = new Date()
    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({ year: d.getFullYear(), month: d.getMonth() + 1 })
    }
    const rangeStart = new Date(months[0].year, months[0].month - 1, 1)
    const payments = await prisma.payment.findMany({
      where: { status: 'success', paidAt: { gte: rangeStart } },
      select: { totalAmount: true, paidAt: true },
    })
    const MONTH_LABEL = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
    const result = months.map(({ year, month }) => {
      const total = payments
        .filter((p) => p.paidAt && p.paidAt.getFullYear() === year && p.paidAt.getMonth() + 1 === month)
        .reduce((sum, p) => sum + p.totalAmount, 0)
      return { label: `${MONTH_LABEL[month]} ${year}`, total }
    })
    res.json(result)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/users', async (req, res) => {
  try {
    const where = {}
    if (req.query.role) where.role = req.query.role
    if (req.query.branchId) where.branchId = req.query.branchId
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true, name: true, email: true, role: true, phone: true, photo: true, bio: true, status: true, createdAt: true,
        branchId: true, branch: true,
        _count: { select: { coachAttendances: true, trainingSessions: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json(users)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/users', async (req, res) => {
  const { name, email, password, role, phone, branchId } = req.body
  try {
    if (['coach', 'head_coach'].includes(role) && !email?.toLowerCase().endsWith('@sixstars.id')) {
      return res.status(400).json({ error: `Email ${role === 'coach' ? 'coach' : 'head coach'} harus menggunakan domain @sixstars.id` })
    }
    const hashed = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({ data: { name, email, password: hashed, role, phone, branchId: branchId || null } })
    const { password: _pw, ...profile } = user
    res.status(201).json(profile)
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Email sudah terdaftar' })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/users/:id', async (req, res) => {
  const { name, phone, status, password, branchId } = req.body
  try {
    const data = { name, phone, status, branchId: branchId !== undefined ? (branchId || null) : undefined }
    if (password) data.password = await bcrypt.hash(password, 10)
    const user = await prisma.user.update({ where: { id: req.params.id }, data })
    const { password: _pw, ...profile } = user
    res.json(profile)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/users/:id', async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } })
    res.json({ message: 'Deleted' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

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

router.post('/students', async (req, res) => {
  const {
    parentName, parentEmail, parentPhone, parentPassword,
    fullName, dateOfBirth, position, photo,
    packageId, branchId,
    paymentStatus, amount, registrationFee,
  } = req.body

  try {
    if (!parentEmail) return res.status(400).json({ error: 'Email wajib diisi' })
    if (!parentPassword || parentPassword.length < 6) return res.status(400).json({ error: 'Password minimal 6 karakter' })

    const existing = await prisma.user.findUnique({ where: { email: parentEmail } })
    if (existing) return res.status(400).json({ error: 'Email sudah terdaftar' })

    const pkg = packageId ? await prisma.package.findUnique({ where: { id: packageId } }) : null
    const ageGroup = assignAgeGroup(dateOfBirth)
    const hashed = await bcrypt.hash(parentPassword, 10)

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name: parentName, email: parentEmail, password: hashed, role: 'parent', phone: parentPhone },
      })

      const count = await tx.student.count()
      const studentId = `SS-${String(count + 1).padStart(4, '0')}`
      const startDate = new Date()
      const endDate = pkg ? new Date(startDate.getTime() + pkg.durationMonths * 30 * 24 * 60 * 60 * 1000) : null

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
          parentEmail,
          address: '',
          packageId: pkg?.id || null,
          packageStartDate: startDate,
          packageEndDate: endDate,
          branchId: branchId || null,
        },
      })

      if (pkg) {
        const pkgAmount = amount ?? pkg.price
        const regFee = registrationFee ?? 750000
        await tx.payment.create({
          data: {
            studentId: student.id,
            packageId: pkg.id,
            amount: pkgAmount,
            registrationFee: regFee,
            totalAmount: pkgAmount + regFee,
            paymentType: 'registration',
            status: paymentStatus || 'pending',
            paidAt: paymentStatus === 'success' ? new Date() : null,
          },
        })
      }

      await tx.studentCard.create({
        data: { studentId: student.id, qrCode: crypto.randomBytes(16).toString('hex'), cardNumber: student.studentId },
      })

      return { user: { id: user.id, name: user.name, email: user.email, role: user.role }, student }
    })

    res.status(201).json(result)
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Email sudah terdaftar' })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
