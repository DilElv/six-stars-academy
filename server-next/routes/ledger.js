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
        description: `${PAYMENT_TYPE_LABEL[p.paymentType] || p.paymentType} — ${p.student?.fullName || '-'}`,
        amount: p.totalAmount,
        date: p.paidAt,
        branch: p.student?.branch || null,
      })),
      ...manualEntries.map((e) => ({
        id: e.id,
        source: 'manual',
        description: e.description,
        amount: e.amount,
        date: e.date,
        branch: e.branch || null,
        createdBy: e.createdBy?.name,
      })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date))

    const total = items.reduce((sum, i) => sum + i.amount, 0)
    res.json({ items, total })
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
    res.json({ items: entries, total })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /laba?month=&year=&branchId= — admin only profit/loss overview
router.get('/laba', authorize('admin'), async (req, res) => {
  try {
    const { month, year, branchId } = req.query
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

    res.json({ income, expense, laba: income - expense })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST / — add a manual income or expense entry
router.post('/', async (req, res) => {
  const { type, description, amount, branchId, date } = req.body
  try {
    if (!['income', 'expense'].includes(type)) return res.status(400).json({ error: 'Tipe harus income atau expense' })
    if (!description?.trim()) return res.status(400).json({ error: 'Deskripsi wajib diisi' })
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Nominal harus lebih dari 0' })

    const entry = await prisma.ledgerEntry.create({
      data: {
        type,
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
