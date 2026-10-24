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

// Atur honor per hari. Disimpan di profil coach (dipakai semua periode berikutnya)
// dan langsung menghitung ulang slip DRAFT periode yang sedang dibuka. Slip yang
// sudah dibayar tidak diubah. Head coach hanya boleh mengatur honor coach.
async function applyDailyRate(actor, userIds, dailyRate, { month, year } = {}) {
  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, role: { in: actor.role === 'admin' ? PAYROLL_ROLES : ['coach'] } },
    select: { id: true },
  })
  const ids = users.map((u) => u.id)
  if (ids.length === 0) return { updated: 0 }
  await prisma.user.updateMany({ where: { id: { in: ids } }, data: { dailyRate } })
  if (month && year) {
    const drafts = await prisma.coachPayroll.findMany({ where: { coachId: { in: ids }, month, year, status: { not: 'paid' } } })
    for (const draft of drafts) {
      await prisma.coachPayroll.update({
        where: { id: draft.id },
        data: { dailyRate, total: computeTotal({ dailyRate, daysPresent: draft.daysPresent, bonus: draft.bonus, deduction: draft.deduction }) },
      })
    }
  }
  return { updated: ids.length }
}

router.put('/rate/:userId', async (req, res) => {
  const { dailyRate } = req.body
  if (!isNonNegInt(dailyRate)) return res.status(400).json({ error: 'Honor harian harus bilangan bulat minimal 0' })
  try {
    const { month, year } = parsePeriod(req.body)
    const result = await applyDailyRate(req.user, [req.params.userId], Number(dailyRate), { month, year })
    if (result.updated === 0) return res.status(403).json({ error: 'Anda tidak dapat mengatur honor akun ini' })
    res.json({ ok: true, dailyRate: Number(dailyRate) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Honor massal: satu nominal untuk banyak coach sekaligus ("coach" atau semua).
router.put('/rate', async (req, res) => {
  const { dailyRate, scope } = req.body
  if (!isNonNegInt(dailyRate)) return res.status(400).json({ error: 'Honor harian harus bilangan bulat minimal 0' })
  try {
    const { month, year } = parsePeriod(req.body)
    const roles = req.user.role === 'admin' && scope === 'all' ? PAYROLL_ROLES : ['coach']
    const targets = await prisma.user.findMany({ where: { role: { in: roles }, status: 'active' }, select: { id: true } })
    const result = await applyDailyRate(req.user, targets.map((t) => t.id), Number(dailyRate), { month, year })
    res.json({ ok: true, ...result })
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
