import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { notifyUser } from '../lib/notify.js'
import { PAYROLL_ROLES, attendanceRecap, statsFor, computeTotal } from '../lib/payroll.js'

const router = Router()

// Payroll untuk admin & head coach — menyangkut nominal gaji staf.
router.use(authenticate, authorize('admin', 'head_coach'))

function isNonNegInt(value) {
  return Number.isSafeInteger(Number(value)) && Number(value) >= 0
}

function parsePeriod(source) {
  const month = Number(source.month)
  const year = Number(source.year)
  return { month, year }
}

const COACH_SELECT = {
  id: true, name: true, photo: true, role: true, status: true, dailyRate: true,
  branches: { select: { branch: { select: { id: true, name: true, code: true } } } },
}

// Daftar semua coach/head coach + rekap absensi bulan itu + slip honor (bila
// sudah di-generate). Menu #9 (Absensi Coach) memakai rekap yang sama.
router.get('/', async (req, res) => {
  const { month, year } = parsePeriod(req.query)
  if (!month || !year) return res.status(400).json({ error: 'month dan year wajib diisi' })
  try {
    const coaches = await prisma.user.findMany({
      where: { role: { in: PAYROLL_ROLES } },
      select: COACH_SELECT,
      orderBy: { name: 'asc' },
    })
    const recap = await attendanceRecap(month, year, coaches.map((c) => c.id))
    const rows = await prisma.coachPayroll.findMany({ where: { month, year } })
    const rowByCoach = new Map(rows.map((r) => [r.coachId, r]))

    res.json({
      month,
      year,
      entries: coaches.map((coach) => {
        const stats = statsFor(recap, coach.id)
        const payroll = rowByCoach.get(coach.id) || null
        return { coach, stats, payroll, estimate: payroll ? payroll.total : computeTotal({ dailyRate: coach.dailyRate, daysPresent: stats.daysPresent }) }
      }),
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Membuat/menyegarkan slip honor bulan itu untuk semua coach aktif. Slip yang
// sudah dibayar tidak diubah supaya riwayat pembayaran tetap utuh.
router.post('/generate', async (req, res) => {
  const { month, year } = parsePeriod(req.body)
  if (!month || !year) return res.status(400).json({ error: 'month dan year wajib diisi' })
  try {
    const coaches = await prisma.user.findMany({ where: { role: { in: PAYROLL_ROLES }, status: 'active' }, select: COACH_SELECT })
    const recap = await attendanceRecap(month, year, coaches.map((c) => c.id))
    let created = 0
    let updated = 0
    let skipped = 0

    for (const coach of coaches) {
      const stats = statsFor(recap, coach.id)
      const existing = await prisma.coachPayroll.findUnique({ where: { coachId_month_year: { coachId: coach.id, month, year } } })
      if (existing?.status === 'paid') {
        skipped += 1
        continue
      }
      if (existing) {
        await prisma.coachPayroll.update({
          where: { id: existing.id },
          data: {
            daysPresent: stats.daysPresent,
            dailyRate: coach.dailyRate,
            total: computeTotal({ dailyRate: coach.dailyRate, daysPresent: stats.daysPresent, bonus: existing.bonus, deduction: existing.deduction }),
          },
        })
        updated += 1
      } else {
        await prisma.coachPayroll.create({
          data: {
            coachId: coach.id,
            month,
            year,
            daysPresent: stats.daysPresent,
            dailyRate: coach.dailyRate,
            total: computeTotal({ dailyRate: coach.dailyRate, daysPresent: stats.daysPresent }),
            generatedById: req.user.id,
          },
        })
        created += 1
      }
    }

    res.json({ created, updated, skipped, coaches: coaches.length })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Koreksi manual satu slip: tarif, hari hadir, bonus, potongan, catatan.
router.put('/:id', async (req, res) => {
  const { dailyRate, daysPresent, bonus, deduction, note, status } = req.body
  try {
    const existing = await prisma.coachPayroll.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ error: 'Slip honor tidak ditemukan' })
    for (const value of [dailyRate, daysPresent, bonus, deduction]) {
      if (value !== undefined && !isNonNegInt(value)) return res.status(400).json({ error: 'Nominal harus bilangan bulat minimal 0' })
    }
    if (status !== undefined && !['draft', 'paid'].includes(status)) return res.status(400).json({ error: 'Status tidak valid' })

    const next = {
      dailyRate: dailyRate ?? existing.dailyRate,
      daysPresent: daysPresent ?? existing.daysPresent,
      bonus: bonus ?? existing.bonus,
      deduction: deduction ?? existing.deduction,
    }
    const data = {
      ...next,
      total: computeTotal(next),
      note: note === undefined ? existing.note : note,
    }
    if (status !== undefined) {
      data.status = status
      data.paidAt = status === 'paid' ? existing.paidAt || new Date() : null
    }

    const payroll = await prisma.coachPayroll.update({ where: { id: existing.id }, data })
    res.json(payroll)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Tandai slip sudah dibayar + kabari coach-nya.
router.post('/:id/pay', async (req, res) => {
  try {
    const existing = await prisma.coachPayroll.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ error: 'Slip honor tidak ditemukan' })
    const payroll = await prisma.coachPayroll.update({
      where: { id: existing.id },
      data: { status: 'paid', paidAt: existing.paidAt || new Date() },
    })
    await notifyUser(payroll.coachId, {
      type: 'coach_payroll_paid',
      title: 'Honor Bulanan Dibayar',
      message: `Honor Anda untuk periode ${payroll.month}/${payroll.year} sebesar Rp${payroll.total.toLocaleString('id-ID')} telah dibayar.`,
      link: '/coach',
    })
    res.json(payroll)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const existing = await prisma.coachPayroll.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ error: 'Slip honor tidak ditemukan' })
    await prisma.coachPayroll.delete({ where: { id: existing.id } })
    res.json({ message: 'Slip honor dihapus' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
