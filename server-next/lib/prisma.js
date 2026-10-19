import pkg from '@prisma/client'

const { PrismaClient } = pkg

// Pool koneksi eksplisit.
//
// Kenapa penting: VPS ini hanya 1 vCPU, jadi Prisma memakai default
// `connection_limit = num_cpus * 2 + 1 = 3`. Transaksi interaktif
// (`prisma.$transaction(async (tx) => ...)`) memegang SATU koneksi selama
// transaksi berjalan. Begitu ada >3 transaksi bersamaan, transaksi berikutnya
// mengantre dan bila melebihi `maxWait` (default 2 dtk) muncul error
// P2028 "Unable to start a transaction in the given time" — sumber error
// transaction timeout yang pernah membanjiri log (lihat lib/sessionQuota.js).
//
// PostgreSQL di server ini punya max_connections=100 dan hanya terpakai ~9,
// jadi pool 10 aman. Nilai bisa diubah lewat env tanpa mengubah kode.
const CONNECTION_LIMIT = process.env.PRISMA_CONNECTION_LIMIT || '10'
const POOL_TIMEOUT = process.env.PRISMA_POOL_TIMEOUT || '20'

// Ditambahkan sebagai teks biasa (bukan lewat `new URL().toString()`) supaya
// karakter di password tidak ikut di-encode ulang.
function appendParam(url, key, value) {
  if (new RegExp(`[?&]${key}=`).test(url)) return url
  return `${url}${url.includes('?') ? '&' : '?'}${key}=${value}`
}

function withPoolParams(rawUrl) {
  if (!rawUrl) return rawUrl
  return appendParam(appendParam(rawUrl, 'connection_limit', CONNECTION_LIMIT), 'pool_timeout', POOL_TIMEOUT)
}

if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = withPoolParams(process.env.DATABASE_URL)
}

const prisma = new PrismaClient({
  // Beri ruang tunggu lebih lega supaya lonjakan singkat tidak langsung gagal;
  // transaksi kita semua pendek, jadi timeout ini tidak akan tercapai normal.
  transactionOptions: {
    maxWait: Number(process.env.PRISMA_TX_MAX_WAIT) || 15000,
    timeout: Number(process.env.PRISMA_TX_TIMEOUT) || 20000,
  },
})

export default prisma
