// Kategori nomor punggung disamakan dengan registry di server. Data siswa
// memakai label per tahun (U-7, U-11, ...), yang dipetakan ke kategori even.
export const JERSEY_AGE_GROUPS = ['U6', 'U8', 'U10', 'U12', 'U14']

export const JERSEY_STATUS = {
  available: { label: 'Tersedia', cell: 'bg-white border-gray-200 text-navy-700 hover:border-gold-400 hover:bg-gold-50' },
  blocked: { label: 'Diblokir Manual', cell: 'bg-gray-100 border-gray-200 text-gray-400 line-through' },
  reserved: { label: 'Dipesan', cell: 'bg-amber-100 border-amber-200 text-amber-700' },
  used: { label: 'Terpakai', cell: 'bg-navy-900 border-navy-900 text-white' },
}

export function toJerseyAgeGroup(value) {
  const key = String(value || '').toUpperCase().replace(/[^0-9A-Z]/g, '')
  if (JERSEY_AGE_GROUPS.includes(key)) return key
  const age = Number((key.match(/(\d+)/) || [])[1])
  if (!Number.isFinite(age) || age <= 0) return null
  if (age <= 6) return 'U6'
  if (age <= 8) return 'U8'
  if (age <= 10) return 'U10'
  if (age <= 12) return 'U12'
  return 'U14'
}

export function isJerseyNumberField(product, field) {
  if (!field || field.type !== 'number' || !field.unique) return false
  return /jersey|nomor|number/i.test(`${product?.category || ''} ${field.key || ''} ${field.label || ''}`)
}

export function jerseyNumberField(product) {
  return (product?.customFields || []).find((field) => isJerseyNumberField(product, field)) || null
}
