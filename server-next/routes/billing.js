import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { getUserBranchIds } from '../lib/branchAccess.js'
import { toGatewayPhone } from '../lib/phone.js'
import { syncPaymentWithRintisan, releasePendingPayment } from '../lib/paymentHelpers.js'
import { logPaymentAudit } from '../lib/paymentAudit.js'

const router = Router()

router.use(authenticate, authorize('admin', 'head_coach'))

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000

// Bulan/tahun berjalan menurut WIB.
function currentPeriodWib() {
  const d = new Date(Date.now() + WIB_OFFSET_MS)
  return { month: d.getUTCMonth() + 1, year: d.getUTCFullYear() }
}

// Bulan jatuh tempo sebuah tagihan: periode untuk BPJS, bulan dibuat untuk lainnya.
function dueOf(item) {
  if (item.periodMonth && item.periodYear) return { month: item.periodMonth, year: item.periodYear }
  const d = new Date(item.createdAt.getTime() + WIB_OFFSET_MS)
  return { month: d.getUTCMonth() + 1, year: d.getUTCFullYear() }
}

// Head coach dibatasi ke cabang yang ditugaskan; bila belum ada penugasan,
// tidak dibatasi (sama seperti peran lain yang tidak terikat cabang).
async function scopeBranchIds(user) {
  if (user.role !== 'head_coach') return null
  const ids = await getUserBranchIds(user.id)
  return ids.length ? ids : null
}

// GET /unpaid?branchId=&status=all|current|overdue
// Data langsung dari tagihan yang BENAR-BENAR belum lunas: item keranjang
// `open`, atau sudah di-checkout tetapi pembayarannya masih menggantung.
// Item `canceled` atau yang pembayarannya sudah lunas tidak pernah muncul.
// Dikelompokkan per parent supaya satu orang tua tidak muncul berkali-kali.
router.get('/unpaid', async (req, res) => {
  try {
    const where = { OR: [{ status: 'open' }, { status: 'checked_out', payment: { status: 'pending' } }] }
    const branchScope = await scopeBranchIds(req.user)
    const studentWhere = { status: { not: 'inactive' } }
    if (branchScope) studentWhere.branchId = { in: branchScope }
    if (req.query.branchId) studentWhere.branchId = req.query.branchId
    where.student = studentWhere

    const items = await prisma.cartItem.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: {
        student: {
          select: {
            id: true, fullName: true, userId: true, parentName: true, parentPhone: true,
            branch: { select: { id: true, name: true, code: true } },
            paymentReminders: { orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true, sentBy: { select: { name: true } } } },
          },
        },
        payment: { select: { status: true } },
      },
    })

    const now = currentPeriodWib()
    const nowIndex = now.year * 12 + now.month
    const groups = new Map()
    for (const it of items) {
      const st = it.student
      const key = st.userId || st.id
      let g = groups.get(key)
      if (!g) {
        g = { key, parentName: st.parentName, parentPhone: st.parentPhone, whatsapp: null, students: new Map(), items: [], total: 0, overdue: false, lastReminder: null }
        groups.set(key, g)
      }
      if (!g.parentPhone && st.parentPhone) g.parentPhone = st.parentPhone
      if (!g.students.has(st.id)) g.students.set(st.id, { id: st.id, fullName: st.fullName, branch: st.branch })
      const due = dueOf(it)
      const overdue = due.year * 12 + due.month < nowIndex
      if (overdue) g.overdue = true
      g.items.push({
        id: it.id,
        studentId: st.id,
        studentName: st.fullName,
        label: it.label,
        category: it.category,
        type: it.type,
        amount: it.amount,
        dueMonth: due.month,
        dueYear: due.year,
        overdue,
        awaitingPayment: it.status === 'checked_out',
        createdAt: it.createdAt,
      })
      g.total += it.amount
      const r = st.paymentReminders[0]
      if (r && (!g.lastReminder || r.createdAt > g.lastReminder.at)) g.lastReminder = { at: r.createdAt, by: r.sentBy?.name || null }
    }

    let parents = Array.from(groups.values()).map((g) => ({
      ...g,
      whatsapp: toGatewayPhone(g.parentPhone),
      students: Array.from(g.students.values()),
    }))
    const status = req.query.status
    if (status === 'overdue') parents = parents.filter((p) => p.overdue)
    else if (status === 'current') parents = parents.filter((p) => !p.overdue)
    parents.sort((a, b) => Number(b.overdue) - Number(a.overdue) || b.total - a.total)

    const all = Array.from(groups.values())
    res.json({
      period: now,
      summary: {
        parents: all.length,
        total: all.reduce((s, g) => s + g.total, 0),
        overdueParents: all.filter((g) => g.overdue).length,
        currentParents: all.filter((g) => !g.overdue).length,
      },
      parents,
      updatedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /remind { studentIds: string[], amount } — catat bahwa pengingat WhatsApp
// sudah dikirim, supaya staf lain tahu kapan terakhir parent diingatkan.
router.post('/remind', async (req, res) => {
  try {
    const { studentIds, amount } = req.body
    if (!Array.isArray(studentIds) || studentIds.length === 0) return res.status(400).json({ error: 'studentIds wajib diisi' })
    const branchScope = await scopeBranchIds(req.user)
    const students = await prisma.student.findMany({
      where: { id: { in: studentIds }, ...(branchScope ? { branchId: { in: branchScope } } : {}) },
      select: { id: true },
    })
    if (students.length === 0) return res.status(404).json({ error: 'Anak tidak ditemukan' })
    await prisma.paymentReminder.createMany({
      data: students.map((s) => ({ studentId: s.id, sentById: req.user.id, amount: Number(amount) || 0 })),
    })
    res.json({ ok: true, at: new Date().toISOString() })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /delete { itemIds: string[] } — hapus manual tagihan belum lunas (sekali
// atau banyak sekaligus). Item ditandai `canceled`, bukan dihapus permanen, supaya
// penagihan otomatis (mis. BPJS) tidak membuatnya lagi untuk periode yang sama.
// Tagihan yang sudah di-checkout dilepas dulu dari pembayaran yang menggantung;
// yang ternyata sudah lunas di gateway dilewati.
router.post('/delete', async (req, res) => {
  try {
    const { itemIds } = req.body
    if (!Array.isArray(itemIds) || itemIds.length === 0) return res.status(400).json({ error: 'itemIds wajib diisi' })
    const branchScope = await scopeBranchIds(req.user)
    const items = await prisma.cartItem.findMany({
      where: {
        id: { in: itemIds },
        OR: [{ status: 'open' }, { status: 'checked_out', payment: { status: 'pending' } }],
        ...(branchScope ? { student: { branchId: { in: branchScope } } } : {}),
      },
      include: { payment: true },
    })

    let deleted = 0
    let skipped = 0
    const handledPayments = new Set()
    for (const item of items) {
      if (item.payment && item.status === 'checked_out') {
        if (!handledPayments.has(item.payment.id)) {
          handledPayments.add(item.payment.id)
          const fresh = item.payment.transactionId ? await syncPaymentWithRintisan(item.payment) : item.payment
          if (fresh.status === 'success') { skipped++; continue }
          const released = await releasePendingPayment(item.payment)
          if (!released.released) { skipped++; continue }
        }
      }
      const result = await prisma.cartItem.updateMany({ where: { id: item.id, status: { in: ['open', 'checked_out'] } }, data: { status: 'canceled', paymentId: null } })
      if (result.count === 0) { skipped++; continue }
      deleted++
      await logPaymentAudit({
        studentId: item.studentId,
        action: 'invoice_delete',
        actor: req.user,
        amount: item.amount,
        note: `Hapus tagihan dari Tagihan Parent: ${item.label}`,
      })
    }
    res.json({ deleted, skipped })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
