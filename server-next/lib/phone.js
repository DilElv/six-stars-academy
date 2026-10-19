// Normalisasi & validasi nomor telepon Indonesia.
//
// Aturan input (disepakati): nomor WAJIB diawali angka 0, hanya berisi angka,
// tanpa spasi / tanda hubung / tanda lain. Contoh benar: 081234567890.
//
// Penyimpanan memakai format lokal "0..." sesuai aturan input. Gateway
// (Rintisan) membutuhkan format internasional "62..." — lihat toGatewayPhone().
const PHONE_RE = /^0[0-9]{7,14}$/

// Bersihkan input apa pun menjadi bentuk kanonik "0...".
// Mengembalikan null bila kosong. Catatan: ini mentoleransi spasi/tanda supaya
// data lama masih bisa dibaca & diperbaiki; validasi ketat ada di isValidPhone().
export function cleanPhone(input) {
  if (input === null || input === undefined) return null
  let s = String(input).trim()
  if (!s) return null
  // buang spasi dan pemisah umum (+62 tetap dikenali sebelum ini)
  s = s.replace(/[\s().\-\u2013\u2014/]/g, '')
  if (s.startsWith('+62')) s = '0' + s.slice(3)
  else if (s.startsWith('0062')) s = '0' + s.slice(4)
  else if (s.startsWith('62')) s = '0' + s.slice(2)
  s = s.replace(/\D/g, '')
  return s || null
}

// True bila nomor sah: diawali 0, hanya angka, panjang wajar (8–15 digit).
export function isValidPhone(input) {
  const s = cleanPhone(input)
  return Boolean(s) && PHONE_RE.test(s)
}

// Format untuk gateway Rintisan: "08..." -> "628...". null bila tidak bisa.
export function toGatewayPhone(input) {
  const s = cleanPhone(input)
  if (!s) return null
  if (s.startsWith('0')) return '62' + s.slice(1)
  return s.startsWith('62') ? s : '62' + s
}

export const PHONE_ERROR =
  'Nomor HP harus diawali angka 0, hanya angka, tanpa spasi (contoh: 081234567890)'

export default { cleanPhone, isValidPhone, toGatewayPhone, PHONE_ERROR }
