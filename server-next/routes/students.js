import { Router } from 'express'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import QRCode from 'qrcode'
import prisma from '../lib/prisma.js'
import { authenticate, authorize } from '../middleware/auth.js'

const router = Router()

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

async function ensureCard(studentId) {
  let card = await prisma.studentCard.findUnique({ where: { studentId } })
  if (!card) {
    const student = await prisma.student.findUnique({ where: { id: studentId } })
    card = await prisma.studentCard.create({
      data: { studentId, qrCode: crypto.randomBytes(16).toString('hex'), cardNumber: student.studentId },
    })
  }
  return card
}

async function sendQrImage(res, qrCode) {
  const png = await QRCode.toBuffer(qrCode, { width: 300, margin: 1 })
  res.set('Content-Type', 'image/png')
  res.send(png)
}

// Session/attendance progress for the student's CURRENT package period — same
// numbers shown on the parent dashboard, reused here so admin/head_coach see
// the exact same "sesi ke-X dari Y" and attendance breakdown.
async function computeSessionStats(student) {
  const totalSessions = student.package
    ? student.package.sessionsPerWeek * 4 * student.package.durationMonths
    : 0

  if (!student.packageStartDate || !student.packageEndDate) {
    return { totalSessions, attendedSessions: 0, attendanceSummary: { hadir: 0, izin: 0, sakit: 0, alfa: 0, total: 0 } }
  }

  // Attendance.date is always normalized to local start-of-day (see
  // startOfDay() in routes/attendance.js). packageStartDate/EndDate are exact
  // creation timestamps, so comparing them directly skews by the server's UTC
  // offset — e.g. on WIB (UTC+7), local midnight becomes 17:00 UTC the
  // previous calendar day, which falls BEFORE a same-day packageStartDate
  // timestamp and silently excludes the registration day's attendance. Round
  // both bounds to local day boundaries so the ranges compare like-for-like.
  const rangeStart = new Date(student.packageStartDate)
  rangeStart.setHours(0, 0, 0, 0)
  const rangeEnd = new Date(student.packageEndDate)
  rangeEnd.setHours(23, 59, 59, 999)

  const attendances = await prisma.attendance.findMany({
    where: { studentId: student.id, date: { gte: rangeStart, lte: rangeEnd } },
    select: { status: true },
  })
  const attendanceSummary = {
    hadir: attendances.filter((a) => a.status === 'hadir').length,
    izin: attendances.filter((a) => a.status === 'izin').length,
    sakit: attendances.filter((a) => a.status === 'sakit').length,
    alfa: attendances.filter((a) => a.status === 'alfa').length,
    total: attendances.length,
  }
  return { totalSessions, attendedSessions: attendanceSummary.hadir, attendanceSummary }
}

router.post('/', authenticate, authorize('admin', 'head_coach'), async (req, res) => {
  const {
    parentName, parentEmail, parentPhone, parentPassword,
    fullName, dateOfBirth, position, photo,
    packageId, branchId,
    paymentStatus, amount, registrationFee, promoCode,
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
        let totalAmount = pkgAmount + regFee

        let discount = 0
        if (promoCode) {
          const promo = await tx.promoCode.findUnique({ where: { code: promoCode.toUpperCase() }, include: { packages: true } })
          if (!promo) throw new Error('Kode promo tidak ditemukan')
          if (promo.status !== 'active') throw new Error('Kode promo sudah tidak aktif')
          if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) throw new Error('Kode promo sudah kadaluarsa')
          if (promo.usedCount >= promo.maxUses) throw new Error('Kode promo sudah habis dipakai')
          if (!promo.allPackages) {
            const valid = promo.packages.some((p) => p.packageId === pkg.id)
            if (!valid) throw new Error('Kode promo tidak berlaku untuk paket ini')
          }
          const discountBase = pkgAmount + (promo.appliesToRegistrationFee ? regFee : 0)
          discount = Math.round(discountBase * promo.discountPercent / 100)
          totalAmount -= discount
        }

        const payment = await tx.payment.create({
          data: {
            studentId: student.id,
            packageId: pkg.id,
            amount: pkgAmount,
            registrationFee: regFee,
            totalAmount,
            paymentType: 'registration',
            status: paymentStatus || 'pending',
            paidAt: paymentStatus === 'success' ? new Date() : null,
          },
        })

        if (promoCode) {
          const promo = await tx.promoCode.findUnique({ where: { code: promoCode.toUpperCase() } })
          await tx.promoCode.update({
            where: { id: promo.id },
            data: { usedCount: { increment: 1 } },
          })
          await tx.promoCodeUsage.create({
            data: { promoCodeId: promo.id, paymentId: payment.id },
          })
        }
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
    res.status(500).json({ error: err.message || 'Server error' })
  }
})

router.get('/', authenticate, authorize('coach', 'head_coach', 'admin'), async (req, res) => {
  try {
    const where = {}
    if (req.query.ageGroup) where.ageGroup = req.query.ageGroup
    if (req.query.branchId) where.branchId = req.query.branchId

    if (req.user.role === 'coach') {
      const coach = await prisma.user.findUnique({ where: { id: req.user.id } })
      where.branchId = coach?.branchId || '__none__'
    }

    const students = await prisma.student.findMany({
      where,
      include: {
        package: true,
        branch: true,
        payments: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { fullName: 'asc' },
    })
    res.json(students)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/me', authenticate, authorize('parent'), async (req, res) => {
  try {
    const student = await prisma.student.findFirst({
      where: { userId: req.user.id },
      include: { package: true, branch: true },
      orderBy: { createdAt: 'asc' },
    })
    if (!student) return res.status(404).json({ error: 'Data anak tidak ditemukan' })

    const stats = await computeSessionStats(student)
    res.json({ ...student, ...stats })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/me/qrcode.png', authenticate, authorize('parent'), async (req, res) => {
  try {
    const student = await prisma.student.findFirst({ where: { userId: req.user.id } })
    if (!student) return res.status(404).json({ error: 'Data anak tidak ditemukan' })
    const card = await ensureCard(student.id)
    await sendQrImage(res, card.qrCode)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/:id', authenticate, authorize('head_coach', 'admin'), async (req, res) => {
  try {
    const student = await prisma.student.findUnique({
      where: { id: req.params.id },
      include: {
        package: true,
        branch: true,
        payments: { orderBy: { createdAt: 'desc' } },
        assessments: { orderBy: [{ year: 'desc' }, { month: 'desc' }] },
        studentCard: true,
      },
    })
    if (!student) return res.status(404).json({ error: 'Siswa tidak ditemukan' })
    const stats = await computeSessionStats(student)
    res.json({ ...student, ...stats })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:id', authenticate, authorize('head_coach', 'admin'), async (req, res) => {
  const { fullName, dateOfBirth, position, ageGroup, address, parentName, parentPhone, photo, status, branchId } = req.body
  try {
    const student = await prisma.student.update({
      where: { id: req.params.id },
      data: {
        fullName, position, ageGroup, address, parentName, parentPhone, photo, status,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        branchId: branchId !== undefined ? (branchId || null) : undefined,
      },
    })
    res.json(student)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/:id/qrcode.png', authenticate, authorize('head_coach', 'admin'), async (req, res) => {
  try {
    const card = await ensureCard(req.params.id)
    await sendQrImage(res, card.qrCode)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    await prisma.student.delete({ where: { id: req.params.id } })
    res.json({ message: 'Deleted' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
