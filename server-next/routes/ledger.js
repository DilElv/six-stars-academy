import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { authenticate, authorize } from '../middleware/auth.js'

const router = Router()

router.use(authenticate, authorize('admin', 'head_coach'))

const PAYMENT_TYPE_LABEL = {
  registration: 'Pendaftaran',
  renewal: 'Perpanjangan Paket',
  event: 'Biaya Event',
}

function monthRange(month, year) {
  if (!month || !year) return null
  const start = new Date(Number(year), Number(month) - 1, 1)
  const end = new Date(Number(year), Number(month), 1)
  return { gte: start, lt: end }
}

function previousMonth(month, year) {
  const m = Number(month), y = Number(year)
  return m === 1 ? { month: 12, year: y - 1 } : { month: m - 1, year: y }
}

function pctChange(current, previous) {
  if (!previous) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 1000) / 10
}

// GET /pemasukan?month=&year=&branchId=
// Combines successful Payment rows (registration/renewal/event) with manual
// LedgerEntry(type=income) rows into a single normalized, date-sorted feed.
router.get('/pemasukan', async (req, res) => {
  try {
    const { month, year, branchId } = req.query
    const range = monthRange(month, year)

    const paymentWhere = { status: 'success' }
    if (range) paymentWhere.paidAt = range
    if (branchId) paymentWhere.student = { branchId }

    const ledgerWhere = { type: 'income' }
    if (range) ledgerWhere.date = range
    if (branchId) ledgerWhere.branchId = branchId

    const [payments, manualEntries] = await Promise.all([
      prisma.payment.findMany({
        where: paymentWhere,
        include: { student: { select: { fullName: true, branchId: true, branch: true } } },
        orderBy: { paidAt: 'desc' },
      }),
      prisma.ledgerEntry.findMany({
        where: ledgerWhere,
        include: { branch: true, createdBy: { select: { name: true } } },
        orderBy: { date: 'desc' },
      }),
    ])

    const items = [
      ...payments.map((p) => ({
        id: p.id,
        source: 'payment',
        category: PAYMENT_TYPE_LABEL[p.paymentType] || p.paymentType,
        description: `${PAYMENT_TYPE_LABEL[p.paymentType] || p.paymentType} — ${p.student?.fullName || '-'}`,
        amount: p.totalAmount,
        date: p.paidAt,
        branch: p.student?.branch || null,
      })),
      ...manualEntries.map((e) => ({
        id: e.id,
        source: 'manual',
        category: e.category || 'Lainnya',
        description: e.description,
        amount: e.amount,
        date: e.date,
        branch: e.branch || null,
        branchId: e.branchId,
        createdBy: e.createdBy?.name,
        createdById: e.createdById,
      })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date))

    const total = items.reduce((sum, i) => sum + i.amount, 0)

    const breakdownMap = {}
    for (const item of items) {
      breakdownMap[item.category] = (breakdownMap[item.category] || 0) + item.amount
    }
    const breakdown = Object.entries(breakdownMap).map(([label, value]) => ({ label, value }))

    res.json({ items, total, breakdown })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /pengeluaran?month=&year=&branchId= — manual expense entries only
router.get('/pengeluaran', async (req, res) => {
  try {
    const { month, year, branchId } = req.query
    const range = monthRange(month, year)

    const where = { type: 'expense' }
    if (range) where.date = range
    if (branchId) where.branchId = branchId

    const entries = await prisma.ledgerEntry.findMany({
      where,
      include: { branch: true, createdBy: { select: { name: true } } },
      orderBy: { date: 'desc' },
    })
    const total = entries.reduce((sum, e) => sum + e.amount, 0)

    const breakdownMap = {}
    for (const e of entries) {
      const label = e.category || 'Lainnya'
      breakdownMap[label] = (breakdownMap[label] || 0) + e.amount
    }
    const breakdown = Object.entries(breakdownMap).map(([label, value]) => ({ label, value }))

    res.json({ items: entries, total, breakdown })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

async function sumIncomeExpense(month, year, branchId) {
  const range = monthRange(month, year)
  const paymentWhere = { status: 'success' }
  if (range) paymentWhere.paidAt = range
  if (branchId) paymentWhere.student = { branchId }

  const incomeLedgerWhere = { type: 'income' }
  const expenseLedgerWhere = { type: 'expense' }
  if (range) { incomeLedgerWhere.date = range; expenseLedgerWhere.date = range }
  if (branchId) { incomeLedgerWhere.branchId = branchId; expenseLedgerWhere.branchId = branchId }

  const [paymentSum, manualIncomeSum, manualExpenseSum] = await Promise.all([
    prisma.payment.aggregate({ _sum: { totalAmount: true }, where: paymentWhere }),
    prisma.ledgerEntry.aggregate({ _sum: { amount: true }, where: incomeLedgerWhere }),
    prisma.ledgerEntry.aggregate({ _sum: { amount: true }, where: expenseLedgerWhere }),
  ])

  const income = (paymentSum._sum.totalAmount || 0) + (manualIncomeSum._sum.amount || 0)
  const expense = manualExpenseSum._sum.amount || 0
  return { income, expense, laba: income - expense }
}

// GET /laba?month=&year=&branchId= — admin only profit/loss overview, with
// month-over-month comparison so admin can see growth/decline at a glance.
router.get('/laba', authorize('admin'), async (req, res) => {
  try {
    const { month, year, branchId } = req.query
    const current = await sumIncomeExpense(month, year, branchId)
    const prev = previousMonth(month, year)
    const previous = await sumIncomeExpense(prev.month, prev.year, branchId)

    res.json({
      ...current,
      previousMonth: previous,
      incomeChangePercent: pctChange(current.income, previous.income),
      expenseChangePercent: pctChange(current.expense, previous.expense),
      labaChangePercent: pctChange(current.laba, previous.laba),
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /trend?months=6&branchId= — last N months of income vs expense, for
// the Laba tab chart. Admin only, same as /laba.
router.get('/trend', authorize('admin'), async (req, res) => {
  try {
    const months = Math.min(Math.max(Number(req.query.months) || 6, 1), 24)
    const { branchId } = req.query
    const now = new Date()
    const periods = []
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      periods.push({ year: d.getFullYear(), month: d.getMonth() + 1 })
    }
    const rangeStart = new Date(periods[0].year, periods[0].month - 1, 1)

    const paymentWhere = { status: 'success', paidAt: { gte: rangeStart } }
    if (branchId) paymentWhere.student = { branchId }
    const ledgerWhere = { date: { gte: rangeStart } }
    if (branchId) ledgerWhere.branchId = branchId

    const [payments, ledgerEntries] = await Promise.all([
      prisma.payment.findMany({ where: paymentWhere, select: { totalAmount: true, paidAt: true } }),
      prisma.ledgerEntry.findMany({ where: ledgerWhere, select: { type: true, amount: true, date: true } }),
    ])

    const MONTH_LABEL = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
    const result = periods.map(({ year, month }) => {
      const income = payments
        .filter((p) => p.paidAt && p.paidAt.getFullYear() === year && p.paidAt.getMonth() + 1 === month)
        .reduce((sum, p) => sum + p.totalAmount, 0)
        + ledgerEntries
          .filter((e) => e.type === 'income' && e.date.getFullYear() === year && e.date.getMonth() + 1 === month)
          .reduce((sum, e) => sum + e.amount, 0)
      const expense = ledgerEntries
        .filter((e) => e.type === 'expense' && e.date.getFullYear() === year && e.date.getMonth() + 1 === month)
        .reduce((sum, e) => sum + e.amount, 0)
      return { label: `${MONTH_LABEL[month]} ${year}`, month, year, income, expense, laba: income - expense }
    })
    res.json(result)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST / — add a manual income or expense entry
router.post('/', async (req, res) => {
  const { type, category, description, amount, branchId, date } = req.body
  try {
    if (!['income', 'expense'].includes(type)) return res.status(400).json({ error: 'Tipe harus income atau expense' })
    if (!description?.trim()) return res.status(400).json({ error: 'Deskripsi wajib diisi' })
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Nominal harus lebih dari 0' })

    const entry = await prisma.ledgerEntry.create({
      data: {
        type,
        category: category?.trim() || null,
        description: description.trim(),
        amount: Math.round(amount),
        branchId: branchId || null,
        date: date ? new Date(date) : new Date(),
        createdById: req.user.id,
      },
      include: { branch: true, createdBy: { select: { name: true } } },
    })
    res.status(201).json(entry)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:id', async (req, res) => {
  const { type, category, description, amount, branchId, date } = req.body
  try {
    const existing = await prisma.ledgerEntry.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ error: 'Entri tidak ditemukan' })
    if (req.user.role !== 'admin' && existing.createdById !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    if (type && !['income', 'expense'].includes(type)) return res.status(400).json({ error: 'Tipe harus income atau expense' })
    if (description !== undefined && !description.trim()) return res.status(400).json({ error: 'Deskripsi wajib diisi' })
    if (amount !== undefined && (!amount || amount <= 0)) return res.status(400).json({ error: 'Nominal harus lebih dari 0' })

    const entry = await prisma.ledgerEntry.update({
      where: { id: req.params.id },
      data: {
        type: type || undefined,
        category: category !== undefined ? (category?.trim() || null) : undefined,
        description: description !== undefined ? description.trim() : undefined,
        amount: amount !== undefined ? Math.round(amount) : undefined,
        branchId: branchId !== undefined ? (branchId || null) : undefined,
        date: date ? new Date(date) : undefined,
      },
      include: { branch: true, createdBy: { select: { name: true } } },
    })
    res.json(entry)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const entry = await prisma.ledgerEntry.findUnique({ where: { id: req.params.id } })
    if (!entry) return res.status(404).json({ error: 'Entri tidak ditemukan' })
    if (req.user.role !== 'admin' && entry.createdById !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    await prisma.ledgerEntry.delete({ where: { id: req.params.id } })
    res.json({ message: 'Deleted' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
