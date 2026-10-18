// Rekonsiliasi duplikat PERPANJANGAN PAKET.
//
// Latar belakang: sebelum alur pembayaran disatukan (lihat routes/students.js
// POST /:id/renew dan routes/payments.js POST /renewal), perpanjangan bisa
// ditulis oleh dua jalur sekaligus — admin mencatat manual DAN parent membayar
// lewat gateway — sehingga satu periode menghasilkan beberapa Payment lunas.
// Akibatnya laporan Keuangan menghitung pendapatan yang sama lebih dari sekali.
//
// Skrip ini TIDAK menyentuh tanggal paket siswa (periode yang sudah
// diperpanjang tetap sebagaimana adanya); ia hanya membersihkan Payment
// duplikat supaya pemasukan tidak dobel.
//
// Pemakaian:
//   node scripts/reconcile-renewals.mjs                            # laporan saja (default, 45 hari)
//   node scripts/reconcile-renewals.mjs --window-days=3            # laporan dengan rentang lebih ketat
//   node scripts/reconcile-renewals.mjs --window-days=3 --apply    # hapus duplikatnya
//
// Aturan: dalam satu kelompok (siswa + paket yang sama, dalam rentang
// DUPLICATE_WINDOW_DAYS hari DARI pembayaran pertama di kelompok itu) hanya satu
// pembayaran yang dipertahankan — yaitu yang paling awal; sisanya dihapus dan
// dicatat ke jejak audit.
//
// PENTING: jendela 45 hari bawaan terlalu lebar untuk paket bulanan — dua
// perpanjangan sah yang berjarak ~30 hari ikut dianggap duplikat. Untuk
// pembersihan aman di produksi gunakan --window-days=3 (hanya pasangan yang
// benar-benar dobel pada hari yang sama / berdekatan).

import prisma from '../lib/prisma.js'

const APPLY = process.argv.includes('--apply')
const windowArg = process.argv.find((a) => a.startsWith('--window-days='))
const DUPLICATE_WINDOW_DAYS = windowArg ? Number(windowArg.split('=')[1]) : 45
if (!Number.isFinite(DUPLICATE_WINDOW_DAYS) || DUPLICATE_WINDOW_DAYS < 0) {
  console.error('Opsi --window-days harus berupa angka >= 0.')
  process.exit(1)
}

const fmt = (n) => 'Rp' + (n || 0).toLocaleString('id-ID')
const day = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '-')

function clusters(rows) {
  const sorted = [...rows].sort((a, b) => new Date(a.paidAt || a.createdAt) - new Date(b.paidAt || b.createdAt))
  const out = []
  for (const row of sorted) {
    const t = new Date(row.paidAt || row.createdAt).getTime()
    const last = out[out.length - 1]
    if (last && (t - new Date(last[0].paidAt || last[0].createdAt).getTime()) / 86400000 <= DUPLICATE_WINDOW_DAYS) {
      last.push(row)
    } else {
      out.push([row])
    }
  }
  return out
}

async function main() {
  const payments = await prisma.payment.findMany({
    where: { paymentType: 'renewal', status: 'success' },
    orderBy: { createdAt: 'asc' },
    include: { student: { select: { id: true, fullName: true, studentId: true, packageEndDate: true } }, package: { select: { name: true } } },
  })

  const groups = new Map()
  for (const p of payments) {
    const key = `${p.studentId}|${p.packageId || ''}`
    const list = groups.get(key) || []
    list.push(p)
    groups.set(key, list)
  }

  let removable = 0
  let removedAmount = 0
  const plan = []

  for (const rows of groups.values()) {
    for (const cluster of clusters(rows)) {
      if (cluster.length < 2) continue
      const keep = cluster[0]
      const drop = cluster.slice(1)
      plan.push({ keep, drop })
      removable += drop.length
      removedAmount += drop.reduce((s, p) => s + (p.totalAmount || 0), 0)
    }
  }

  console.log(`Mode            : ${APPLY ? 'APPLY (menghapus)' : 'DRY-RUN (laporan saja)'}`)
  console.log(`Jendela dobel   : ${DUPLICATE_WINDOW_DAYS} hari`)
  console.log(`Pembayaran lunas: ${payments.length} baris renewal`)
  console.log(`Kelompok ganda  : ${plan.length}`)
  console.log(`Akan dihapus    : ${removable} baris (total ${fmt(removedAmount)})`)
  console.log('')

  for (const { keep, drop } of plan) {
    console.log(`• ${keep.student.fullName} (${keep.student.studentId}) — paket "${keep.package?.name || '-'}"`)
    console.log(`  DIPERTAHANKAN  ${keep.id}  ${day(keep.paidAt)}  ${fmt(keep.totalAmount)}  ${keep.paymentMethod || '-'}`)
    for (const p of drop) {
      console.log(`  DIHAPUS        ${p.id}  ${day(p.paidAt)}  ${fmt(p.totalAmount)}  ${p.paymentMethod || '-'}`)
    }
    console.log(`  akhir paket saat ini: ${day(keep.student.packageEndDate)} (tidak diubah)`)
    console.log('')
  }

  if (!APPLY) {
    console.log('Tidak ada yang diubah. Jalankan ulang dengan --apply untuk mengeksekusi.')
    return
  }

  let done = 0
  for (const { keep, drop } of plan) {
    for (const p of drop) {
      // Lepaskan item keranjang (kalau ada) supaya tidak jadi item "checked_out"
      // tanpa pembayaran.
      await prisma.cartItem.updateMany({ where: { paymentId: p.id }, data: { paymentId: null, status: 'canceled' } })
      await prisma.payment.delete({ where: { id: p.id } })
      await prisma.paymentAuditLog.create({
        data: {
          paymentId: p.id,
          action: 'delete',
          actorRole: 'sistem',
          studentId: p.studentId,
          amount: p.totalAmount,
          before: { status: p.status, paymentType: p.paymentType, paymentMethod: p.paymentMethod, amount: p.amount, totalAmount: p.totalAmount, paidAt: p.paidAt },
          note: `Rekonsiliasi duplikat perpanjangan — dipertahankan ${keep.id}`,
        },
      })
      done++
    }
  }
  console.log(`Selesai: ${done} baris duplikat dihapus.`)
}

main()
  .catch((err) => { console.error(err); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
