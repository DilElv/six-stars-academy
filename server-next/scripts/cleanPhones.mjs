// Pembersihan nomor HP lama (spasi / tanda / format 62).
//
// Latar belakang: beberapa nomor HP orang tua disimpan dengan spasi di depan
// (mis. " 085966617252"). Saat dikirim ke gateway Rintisan, nomor itu menjadi
// "62 085966617252" dan ditolak dengan "Input data tidak lengkap / tidak
// sesuai" — sehingga checkout keranjang gagal. Kode baru sudah membersihkan
// nomor di createBillingFor (lib/phone.js), tetapi data lama perlu dirapikan
// sekali agar pengiriman langsung benar.
//
// Aturan baru: nomor HP diawali 0, hanya angka, tanpa spasi.
//
// Pemakaian:
//   node scripts/cleanPhones.mjs            # laporan saja (default)
//   node scripts/cleanPhones.mjs --apply    # simpan perbaikan
//
// Skrip ini hanya merapikan format; ia tidak mengubah angka nomor selain
// menormalkan prefix (62 -> 0). Nomor yang tetap tidak valid dilaporkan untuk
// dicek manual, bukan ditebak.

import 'dotenv/config'
import prisma from '../lib/prisma.js'
import { cleanPhone, isValidPhone } from '../lib/phone.js'

const APPLY = process.argv.includes('--apply')

async function collect() {
  const rows = []
  const students = await prisma.student.findMany({ select: { id: true, fullName: true, parentPhone: true } })
  for (const s of students) {
    const cleaned = cleanPhone(s.parentPhone)
    if (cleaned !== s.parentPhone) {
      rows.push({ table: 'student', id: s.id, label: s.fullName, field: 'parentPhone', from: s.parentPhone, to: cleaned, valid: isValidPhone(s.parentPhone) })
    }
  }
  const users = await prisma.user.findMany({ select: { id: true, name: true, role: true, phone: true } })
  for (const u of users) {
    if (u.phone === null || u.phone === undefined || u.phone === '') continue
    const cleaned = cleanPhone(u.phone)
    if (cleaned !== u.phone) {
      rows.push({ table: 'user', id: u.id, label: `${u.name} (${u.role})`, field: 'phone', from: u.phone, to: cleaned, valid: isValidPhone(u.phone) })
    }
  }
  const pending = await prisma.pendingRegistration.findMany({ select: { id: true, parentName: true, parentPhone: true } })
  for (const p of pending) {
    const cleaned = cleanPhone(p.parentPhone)
    if (cleaned !== p.parentPhone) {
      rows.push({ table: 'pendingRegistration', id: p.id, label: p.parentName, field: 'parentPhone', from: p.parentPhone, to: cleaned, valid: isValidPhone(p.parentPhone) })
    }
  }
  return rows
}

async function apply(row) {
  if (row.table === 'student') {
    return prisma.student.update({ where: { id: row.id }, data: { parentPhone: row.to } })
  }
  if (row.table === 'user') {
    return prisma.user.update({ where: { id: row.id }, data: { phone: row.to } })
  }
  return prisma.pendingRegistration.update({ where: { id: row.id }, data: { parentPhone: row.to } })
}

async function main() {
  const rows = await collect()
  const fixable = rows.filter((r) => r.to && isValidPhone(r.to))
  const needManual = rows.filter((r) => !r.to || !isValidPhone(r.to))

  console.log(`Ditemukan ${rows.length} nomor HP yang perlu dirapikan (${fixable.length} bisa otomatis, ${needManual.length} perlu cek manual).\n`)
  for (const r of fixable) {
    console.log(`  [${r.table}] ${r.label}: ${JSON.stringify(r.from)} -> ${JSON.stringify(r.to)}`)
  }
  if (needManual.length) {
    console.log('\nPerlu cek manual (format tetap tidak valid):')
    for (const r of needManual) {
      console.log(`  [${r.table}] ${r.label}: ${JSON.stringify(r.from)}`)
    }
  }

  if (!APPLY) {
    console.log('\nMode laporan saja. Jalankan dengan --apply untuk menyimpan perbaikan.')
    return
  }

  let updated = 0
  for (const r of fixable) {
    await apply(r)
    updated += 1
  }
  console.log(`\nSelesai. ${updated} nomor diperbarui.`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
