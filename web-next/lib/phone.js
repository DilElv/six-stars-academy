// Aturan nomor HP di frontend — satu sumber supaya input selalu bersih.
// Input dipaksa: hanya angka, diawali 0, tanpa spasi/tanda lain.
// Server tetap memvalidasi ulang (lib/phone.js di server-next).
export function sanitizePhoneInput(value) {
  let v = String(value ?? '').replace(/[^\d]/g, '')
  if (v.startsWith('62')) v = `0${v.slice(2)}`
  else if (v && v[0] !== '0') v = `0${v}`
  return v
}

// Diawali 0, hanya angka, panjang wajar (8–15 digit).
export function isValidPhone(value) {
  return /^0\d{7,14}$/.test(String(value ?? ''))
}

export const PHONE_ERROR =
  'Nomor HP harus diawali angka 0, hanya angka, tanpa spasi (contoh: 081234567890)'

export const PHONE_PLACEHOLDER = '08xxxxxxxxxx'

export default { sanitizePhoneInput, isValidPhone, PHONE_ERROR, PHONE_PLACEHOLDER }
