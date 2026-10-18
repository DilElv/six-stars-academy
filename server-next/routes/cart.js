import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { resolvePackagePrice } from '../lib/pricing.js'
import { checkoutPayment, applyPaymentSuccess } from '../lib/paymentHelpers.js'
import { isSupportedPaymentMethod } from '../lib/rintisan.js'
import { notifyUser } from '../lib/notify.js'
import { getUserBranchIds } from '../lib/branchAccess.js'
import { resolveCustomPackage } from '../lib/studentCustomPackage.js'
import { logPaymentAudit } from '../lib/paymentAudit.js'

const router = Router()

// Catatan rilis: UI keranjang (menu Keranjang/Toko & tombol titip item) sedang
// disembunyikan dan akan dibuka di rilis berikutnya. Mekanisme di file ini tetap
// aktif karena merupakan satu-satunya jalur tagihan: admin membuat tagihan,
// parent melihat & membayarnya dari menu Perpanjang Paket.

// Kategori pemasukan di laporan keuangan per tipe item keranjang. Dipakai
// supaya satu pembayaran gabungan tetap terpecah sesuai kategorinya di
// Keuangan > Pemasukan.
const TYPE_CATEGORY = {
  package: 'Perpanjangan Paket',
  bpjs: 'BPJS',
  merchandise: 'Merchandise',
}

const CART_TYPES = Object.keys(TYPE_CATEGORY)

async function resolveStudentCart(studentId, user) {
  if (!studentId) return { error: { status: 400, message: 'studentId wajib diisi' } }
  const student = await prisma.student.findUnique({ where: { id: studentId }, include: { package: true } })
  if (!student) return { error: { status: 404, message: 'Siswa tidak ditemukan' } }
  if (user.role === 'head_coach' && !(await getUserBranchIds(user.id)).includes(student.branchId)) {
    return { error: { status: 403, message: 'Anda hanya dapat mengelola keranjang anak di cabang Anda' } }
  }
  return { student }
}

async function listCart(studentId) {
  const items = await prisma.cartItem.findMany({
    where: { studentId, status: 'open' },
    orderBy: { createdAt: 'asc' },
    include: { addedBy: { select: { name: true, role: true } } },
  })
  const total = items.reduce((sum, i) => sum + i.amount, 0)
  return { items, total }
}

function itemNote(metadata) {
  return metadata && typeof metadata === 'object' && typeof metadata.note === 'string' ? metadata.note : null
}

// Parent: keranjang anaknya sendiri.
router.get('/me', authenticate, authorize('parent'), async (req, res) => {
  try {
    const student = await prisma.student.findFirst({ where: { userId: req.user.id } })
    if (!student) return res.json({ items: [], total: 0 })
    res.json(await listCart(student.id))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Admin/head_coach: keranjang milik satu anak (dipakai layar Data Anak).
router.get('/student/:studentId', authenticate, authorize('admin', 'head_coach'), async (req, res) => {
  try {
    const { student, error } = await resolveStudentCart(req.params.studentId, req.user)
    if (error) return res.status(error.status).json({ error: error.message })
    res.json(await listCart(student.id))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Tambah item ke keranjang. Parent hanya boleh menambahkan perpanjangan paket
// anaknya; admin/head_coach boleh menitipkan item apa pun (paket, BPJS,
// merchandise, atau paket harga khusus) supaya parent tinggal checkout.
//
// Anti-duplikasi: satu anak hanya boleh punya SATU tagihan perpanjangan paket
// dan SATU tagihan BPJS per periode yang masih "open" — supaya parent tidak
// pernah ditagih dua kali untuk hal yang sama.
router.post('/', authenticate, authorize('parent', 'admin', 'head_coach'), async (req, res) => {
  const { type, packageId, productId, label, amount, metadata, note, customPackage } = req.body
  if (!CART_TYPES.includes(type)) return res.status(400).json({ error: 'Tipe item keranjang tidak valid' })

  // Validasi nominal lebih dulu supaya paket custom tidak pernah terbuat
  // (orphan) gara-gara nominal yang tidak valid.
  const amountProvided = amount !== undefined && amount !== ''
  if (amountProvided) {
    const numericAmount = Math.round(Number(amount))
    if (!Number.isSafeInteger(numericAmount) || numericAmount < 0) return res.status(400).json({ error: 'Nominal item tidak valid' })
  }

  try {
    let student
    if (req.user.role === 'parent') {
      // Parent boleh menambah perpanjangan paket, atau merchandise yang diambil
      // dari katalog (harga & nama dari produk, bukan dari klien). Item manual
      // (BPJS, harga khusus) hanya untuk admin/head_coach.
      const allowed = type === 'package' || (type === 'merchandise' && productId)
      if (!allowed) return res.status(403).json({ error: 'Parent hanya dapat menambahkan perpanjangan paket atau merchandise dari katalog' })
      if (customPackage || amount !== undefined) return res.status(403).json({ error: 'Harga item ditentukan admin' })
      student = await prisma.student.findFirst({ where: { userId: req.user.id }, include: { package: true } })
      if (!student) return res.status(404).json({ error: 'Data anak tidak ditemukan' })
    } else {
      const resolved = await resolveStudentCart(req.body.studentId, req.user)
      if (resolved.error) return res.status(resolved.error.status).json({ error: resolved.error.message })
      student = resolved.student
    }

    let itemData
    if (type === 'package') {
      // Sekali tagih: cegah tagihan perpanjangan kedua untuk anak yang sama —
      // baik tagihan yang masih terbuka maupun checkout yang masih menunggu
      // pembayaran (kalau tidak, parent bisa membuat tagihan kedua).
      const [existing, pendingCheckout] = await Promise.all([
        prisma.cartItem.findFirst({ where: { studentId: student.id, type: 'package', status: 'open' } }),
        prisma.payment.findFirst({
          where: { studentId: student.id, paymentType: 'cart', status: 'pending', cartItems: { some: { type: 'package' } } },
          select: { id: true },
        }),
      ])
      if (existing) {
        return res.status(400).json({ error: 'Sudah ada tagihan perpanjangan paket yang belum dibayar untuk anak ini. Selesaikan atau hapus dulu.' })
      }
      if (pendingCheckout) {
        return res.status(400).json({ error: 'Masih ada pembayaran perpanjangan paket yang belum selesai. Selesaikan atau batalkan dulu pembayaran itu.' })
      }

      let pkg
      if (customPackage) {
        // Harga khusus ("anak lama"/"custom") — hanya admin/head_coach.
        if (req.user.role === 'parent') return res.status(403).json({ error: 'Harga khusus hanya dapat diatur admin' })
        const { name, sessionsPerWeek, durationMonths, price } = customPackage
        if (!name?.trim()) return res.status(400).json({ error: 'Nama paket custom wajib diisi' })
        if (!Number.isSafeInteger(Number(sessionsPerWeek)) || Number(sessionsPerWeek) <= 0) return res.status(400).json({ error: 'Sesi per minggu harus lebih dari 0' })
        if (!Number.isSafeInteger(Number(durationMonths)) || Number(durationMonths) <= 0) return res.status(400).json({ error: 'Durasi (bulan) harus lebih dari 0' })
        if (price === undefined || price === '' || !Number.isSafeInteger(Number(price)) || Number(price) < 0) return res.status(400).json({ error: 'Harga tidak valid' })
        pkg = await resolveCustomPackage(student, {
          name: name.trim(),
          sessionsPerWeek: Math.round(Number(sessionsPerWeek)),
          durationMonths: Math.round(Number(durationMonths)),
          price: Math.round(Number(price)),
        })
      } else {
        if (!packageId) return res.status(400).json({ error: 'Pilih paket terlebih dahulu' })
        pkg = await prisma.package.findUnique({ where: { id: packageId } })
        if (!pkg) return res.status(400).json({ error: 'Paket tidak ditemukan' })
        if (!pkg.isCustom && pkg.status !== 'active') return res.status(400).json({ error: 'Paket tidak tersedia' })
      }
      // Satu sumber harga (lib/pricing.js) supaya nominal di tagihan admin sama
      // dengan yang dibayar parent. Harga khusus = harga final, tanpa beasiswa
      // SPP tambahan.
      let finalAmount = await resolvePackagePrice(pkg, student)

      // Admin/head_coach boleh menimpa nominal (mis. potongan khusus);
      // parent tidak pernah boleh menentukan harga sendiri.
      if (amountProvided && req.user.role !== 'parent') {
        finalAmount = Math.round(Number(amount))
      }

      itemData = {
        type,
        label: `Perpanjangan Paket — ${pkg.name}`,
        category: TYPE_CATEGORY.package,
        amount: finalAmount,
        metadata: { packageId: pkg.id, packageName: pkg.name, custom: !!pkg.isCustom, note: note?.trim() || null },
      }
    } else if (type === 'merchandise' && productId) {
      // Item diambil dari katalog merchandise: nama & harga selalu dari produk
      // (bukan dari klien) supaya tidak bisa dimanipulasi.
      const product = await prisma.product.findUnique({ where: { id: productId } })
      if (!product || !product.isActive) return res.status(400).json({ error: 'Produk tidak tersedia' })
      if (product.stock !== null && product.stock <= 0) return res.status(400).json({ error: 'Stok produk habis' })
      itemData = {
        type,
        label: product.name,
        category: TYPE_CATEGORY.merchandise,
        amount: product.price,
        productId: product.id,
        metadata: { productId: product.id, productName: product.name, productCategory: product.category, note: note?.trim() || null },
      }
    } else {
      const trimmed = typeof label === 'string' ? label.trim() : ''
      if (!trimmed) return res.status(400).json({ error: 'Nama item wajib diisi' })
      const numericAmount = Math.round(Number(amount))
      if (!Number.isSafeInteger(numericAmount) || numericAmount < 0) return res.status(400).json({ error: 'Nominal item tidak valid' })
      itemData = {
        type,
        label: trimmed,
        category: TYPE_CATEGORY[type],
        amount: numericAmount,
        metadata: { ...(metadata && typeof metadata === 'object' ? metadata : {}), note: note?.trim() || null },
      }
      // Item BPJS manual ikut mencatat periode (default bulan berjalan) supaya
      // penagihan otomatis tidak membuat item ganda untuk periode yang sama.
      if (type === 'bpjs') {
        const now = new Date()
        itemData.periodMonth = Math.min(12, Math.max(1, Math.round(Number(metadata?.periodMonth) || now.getMonth() + 1)))
        itemData.periodYear = Math.round(Number(metadata?.periodYear) || now.getFullYear())
        const duplicate = await prisma.cartItem.findFirst({
          where: { studentId: student.id, type: 'bpjs', status: 'open', periodMonth: itemData.periodMonth, periodYear: itemData.periodYear },
        })
        if (duplicate) return res.status(400).json({ error: 'Tagihan BPJS untuk periode ini sudah ada di keranjang' })
      }
    }

    const item = await prisma.cartItem.create({
      data: { ...itemData, studentId: student.id, addedById: req.user.id, status: 'open' },
    })

    if (req.user.role !== 'parent') {
      await notifyUser(student.userId, {
        type: 'cart_item_added',
        title: 'Tagihan Baru dari Admin',
        message: `${itemData.label} telah ditambahkan ke tagihan ${student.fullName}. Silakan buka menu Perpanjang Paket untuk membayar.`,
        link: '/dashboard/pembayaran',
      })
      await logPaymentAudit({
        studentId: student.id,
        action: 'invoice_created',
        actor: req.user,
        amount: itemData.amount,
        note: `${itemData.label}${itemData.metadata?.note ? ` — ${itemData.metadata.note}` : ''}`,
      })
    }

    res.status(201).json(item)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Ubah item tagihan yang masih belum dibayar (harga/keterangan). Hanya
// admin/head_coach — parent tidak boleh menentukan harga sendiri.
router.patch('/:id', authenticate, authorize('admin', 'head_coach'), async (req, res) => {
  const { label, amount, note } = req.body
  try {
    const item = await prisma.cartItem.findUnique({ where: { id: req.params.id }, include: { student: true } })
    if (!item) return res.status(404).json({ error: 'Item tidak ditemukan' })
    if (item.status !== 'open') return res.status(400).json({ error: 'Item sudah checkout, tidak bisa diubah' })
    if (req.user.role === 'head_coach' && !(await getUserBranchIds(req.user.id)).includes(item.student.branchId)) {
      return res.status(403).json({ error: 'Anda hanya dapat mengelola keranjang anak di cabang Anda' })
    }

    const data = {}
    if (label !== undefined) {
      const trimmed = typeof label === 'string' ? label.trim() : ''
      if (!trimmed) return res.status(400).json({ error: 'Nama item wajib diisi' })
      data.label = trimmed
    }
    if (amount !== undefined) {
      const numericAmount = Math.round(Number(amount))
      if (!Number.isSafeInteger(numericAmount) || numericAmount < 0) return res.status(400).json({ error: 'Nominal tagihan tidak valid' })
      data.amount = numericAmount
    }
    if (note !== undefined) {
      data.metadata = { ...(item.metadata && typeof item.metadata === 'object' ? item.metadata : {}), note: note?.trim() || null }
    }
    if (Object.keys(data).length === 0) return res.status(400).json({ error: 'Tidak ada perubahan' })

    const updated = await prisma.cartItem.update({ where: { id: item.id }, data })
    await logPaymentAudit({
      studentId: item.studentId,
      action: 'invoice_edit',
      actor: req.user,
      amount: updated.amount,
      before: { label: item.label, amount: item.amount, note: itemNote(item.metadata) },
      after: { label: updated.label, amount: updated.amount, note: itemNote(updated.metadata) },
      note: `Ubah tagihan: ${updated.label}`,
    })
    res.json(updated)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Hapus satu item keranjang (hanya yang masih 'open'). Parent boleh menghapus
// item yang dititipkan admin, admin/head_coach boleh menghapus item apa pun di
// cabangnya.
router.delete('/:id', authenticate, authorize('parent', 'admin', 'head_coach'), async (req, res) => {
  try {
    const item = await prisma.cartItem.findUnique({ where: { id: req.params.id }, include: { student: true } })
    if (!item) return res.status(404).json({ error: 'Item tidak ditemukan' })
    if (item.status !== 'open') return res.status(400).json({ error: 'Item sudah checkout, tidak bisa dihapus' })
    if (req.user.role === 'parent' && item.student.userId !== req.user.id) return res.status(403).json({ error: 'Bukan keranjang anak Anda' })
    if (req.user.role === 'head_coach' && !(await getUserBranchIds(req.user.id)).includes(item.student.branchId)) {
      return res.status(403).json({ error: 'Anda hanya dapat mengelola keranjang anak di cabang Anda' })
    }
    await prisma.cartItem.delete({ where: { id: item.id } })
    await logPaymentAudit({
      studentId: item.studentId,
      action: 'invoice_delete',
      actor: req.user,
      amount: item.amount,
      note: `Hapus tagihan: ${item.label}`,
    })
    res.json({ message: 'Item dihapus' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Tandai lunas MANUAL (cash / transfer pribadi / kebijakan khusus) oleh
// admin/head_coach. Membuat satu Payment lunas untuk item yang dipilih lalu
// langsung menerapkan efeknya (paket diperpanjang) dan mencatat jejak audit —
// jadi tidak pernah ada "Menunggu Verifikasi".
router.post('/mark-paid', authenticate, authorize('admin', 'head_coach'), async (req, res) => {
  const { studentId, itemIds, paymentMethod, note } = req.body
  try {
    const { student, error } = await resolveStudentCart(studentId, req.user)
    if (error) return res.status(error.status).json({ error: error.message })

    const where = { studentId: student.id, status: 'open' }
    if (Array.isArray(itemIds) && itemIds.length) where.id = { in: itemIds }
    const items = await prisma.cartItem.findMany({ where, orderBy: { createdAt: 'asc' } })
    if (items.length === 0) return res.status(400).json({ error: 'Tidak ada tagihan yang bisa ditandai lunas' })

    const method = typeof paymentMethod === 'string' && paymentMethod.trim() ? paymentMethod.trim().slice(0, 40) : 'cash'
    const total = items.reduce((sum, i) => sum + i.amount, 0)

    const created = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          studentId: student.id,
          amount: total,
          registrationFee: 0,
          totalAmount: total,
          paymentType: 'cart',
          status: 'pending',
          paymentMethod: method,
          note: note?.trim() || `Ditandai lunas manual (${method})`,
          paidAt: new Date(),
        },
      })
      // Item dengan nominal 0 tidak dianggap pembayaran (tidak menghitung
      // pendapatan) tetapi paketnya tetap diaktifkan oleh applyPaymentSuccess.
      await tx.cartItem.updateMany({ where: { id: { in: items.map((i) => i.id) } }, data: { paymentId: payment.id, status: 'checked_out' } })
      return payment
    })

    const payment = await applyPaymentSuccess(created)

    // Kalau perpanjangan paket sudah ditandai lunas, batalkan checkout pending
    // yang mungkin masih dipegang parent untuk anak ini supaya tidak dobel.
    if (items.some((i) => i.type === 'package')) {
      const pending = await prisma.payment.findMany({
        where: { studentId: student.id, paymentType: 'cart', status: 'pending' },
        include: { cartItems: true },
      })
      for (const p of pending) {
        await prisma.$transaction(async (tx) => {
          const packageItems = p.cartItems.filter((c) => c.type === 'package')
          if (packageItems.length) await tx.cartItem.deleteMany({ where: { id: { in: packageItems.map((c) => c.id) } } })
          await tx.cartItem.updateMany({ where: { paymentId: p.id }, data: { paymentId: null, status: 'open' } })
          await tx.payment.delete({ where: { id: p.id } })
        })
      }
    }

    await logPaymentAudit({
      paymentId: payment.id,
      action: 'mark_paid_manual',
      actor: req.user,
      studentId: student.id,
      amount: total,
      after: { status: payment.status, paymentMethod: payment.paymentMethod, totalAmount: payment.totalAmount },
      note: payment.note,
    })

    res.status(201).json({ payment, items })
  } catch (err) {
    console.error(err)
    res.status(400).json({ error: err.message || 'Gagal menandai lunas' })
  }
})

// Checkout seluruh keranjang jadi SATU pembayaran Rintisan. Tiap item tetap
// terpisah sebagai baris kategori di laporan keuangan (lihat routes/ledger.js).
router.post('/checkout', authenticate, authorize('parent'), async (req, res) => {
  const { paymentMethod } = req.body
  if (!isSupportedPaymentMethod(paymentMethod)) return res.status(400).json({ error: 'Metode pembayaran Rintisan tidak valid' })

  try {
    const student = await prisma.student.findFirst({ where: { userId: req.user.id }, include: { user: true } })
    if (!student) return res.status(404).json({ error: 'Data anak tidak ditemukan' })

    const items = await prisma.cartItem.findMany({ where: { studentId: student.id, status: 'open' }, orderBy: { createdAt: 'asc' } })
    if (items.length === 0) return res.status(400).json({ error: 'Belum ada tagihan yang harus dibayar' })

    // Satu periode perpanjangan = satu item. Ini jaring pengaman terakhir
    // supaya parent tidak pernah ditagih dua kali untuk paket yang sama.
    const packageItems = items.filter((i) => i.type === 'package')
    if (packageItems.length > 1) {
      return res.status(400).json({ error: 'Ada lebih dari satu tagihan perpanjangan paket. Hapus yang tidak perlu dulu sebelum checkout.' })
    }

    const total = items.reduce((sum, i) => sum + i.amount, 0)
    const itemIds = items.map((i) => i.id)

    const payment = await prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({
        data: {
          studentId: student.id,
          amount: total,
          registrationFee: 0,
          totalAmount: total,
          paymentType: 'cart',
          status: 'pending',
        },
      })
      await tx.cartItem.updateMany({ where: { id: { in: itemIds } }, data: { paymentId: created.id, status: 'checked_out' } })
      return created
    })

    // Gratis penuh (mis. beasiswa 100%): tidak ada yang bisa ditagih Rintisan,
    // jadi langsung terapkan efek sukses.
    if (total === 0) {
      const updated = await applyPaymentSuccess(payment)
      return res.status(201).json({ payment: updated, rintisan: null })
    }

    try {
      const { payment: updated, rintisan } = await checkoutPayment({
        payment,
        paymentMethod,
        toName: student.parentName,
        toEmail: student.parentEmail || student.user.email,
        toPhone: student.parentPhone,
        toAddress: student.address,
        note: `Tagihan ${student.fullName}`,
      })
      res.status(201).json({ payment: updated, rintisan })
    } catch (err) {
      // Billing gagal dibuat: kembalikan item ke keranjang agar bisa dicoba lagi.
      await prisma.cartItem.updateMany({ where: { id: { in: itemIds } }, data: { paymentId: null, status: 'open' } })
      await prisma.payment.delete({ where: { id: payment.id } }).catch(() => {})
      throw err
    }
  } catch (err) {
    console.error(err)
    res.status(400).json({ error: err.message || 'Gagal membuat tagihan' })
  }
})

// Admin/head_coach: semua tagihan yang belum dibayar lintas anak — dipakai
// panel "Tagihan Belum Dibayar" di Keuangan supaya admin tahu siapa yang masih
// menunggak. Tagihan di sini TIDAK pernah ikut dihitung sebagai pendapatan.
router.get('/outstanding', authenticate, authorize('admin', 'head_coach'), async (req, res) => {
  try {
    const where = { status: 'open' }
    if (req.user.role === 'head_coach') {
      const branchIds = await getUserBranchIds(req.user.id)
      where.student = { branchId: { in: branchIds } }
    }
    const items = await prisma.cartItem.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: {
        student: { select: { id: true, fullName: true, studentId: true, branch: { select: { code: true } } } },
        addedBy: { select: { name: true, role: true } },
      },
    })
    const total = items.reduce((sum, i) => sum + i.amount, 0)
    res.json({ items, total })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
