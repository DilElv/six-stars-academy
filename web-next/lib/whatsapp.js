const DEFAULT_ADMIN_WHATSAPP = '6285215021228'

const REGISTER_MESSAGE = 'Halo, saya ingin mendaftarkan anak saya ke SixStars Academy Indonesia. Mohon info lebih lanjut mengenai proses pendaftarannya.'

export const ADMIN_WHATSAPP = DEFAULT_ADMIN_WHATSAPP

// Menormalkan nomor telepon apa pun ("0852-1502-1228", "+62 852 1502 1228",
// "85215021228") menjadi digit format wa.me (62…). Kosong → '' supaya pemanggil
// bisa memakai fallback.
export function normalizeWaNumber(input) {
  const digits = String(input || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('62')) return digits
  if (digits.startsWith('0')) return `62${digits.slice(1)}`
  if (digits.startsWith('8')) return `62${digits}`
  return digits
}

// Tautan WhatsApp ke nomor admin (fallback ke nomor bawaan bila belum diatur).
export function waHref(number, message) {
  const target = normalizeWaNumber(number) || DEFAULT_ADMIN_WHATSAPP
  const query = message ? `?text=${encodeURIComponent(message)}` : ''
  return `https://wa.me/${target}${query}`
}

export const REGISTER_WHATSAPP_URL = waHref(DEFAULT_ADMIN_WHATSAPP, REGISTER_MESSAGE)
