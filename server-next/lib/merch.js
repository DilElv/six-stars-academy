import prisma from './prisma.js'

// Opsi custom merchandise. Disimpan di Product.customFields sebagai array:
//   { key, label, type: 'text' | 'select' | 'number', required,
//     choices?, maxLength?, min?, max?, unique?, blockedNumbers? }
// Field bertipe 'number' dengan `unique` dipakai untuk nomor punggung: satu nomor
// hanya boleh dipakai satu pesanan per produk. Nomor "terpakai" = ditutup manual
// oleh admin (blockedNumbers) + sudah dipesan (item keranjang aktif atau lunas).
export const FIELD_TYPES = ['text', 'select', 'number']
const MAX_FIELDS = 8

function slug(label) {
  return String(label).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 30) || 'opsi'
}

function intIn(value, min, max, fallback) {
  const n = Math.round(Number(value))
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

// Rapikan input dari admin. Mengembalikan { fields } atau { error }.
export function sanitizeCustomFields(input) {
  if (input === undefined) return { fields: undefined }
  if (input === null || (Array.isArray(input) && input.length === 0)) return { fields: null }
  if (!Array.isArray(input)) return { error: 'Opsi custom tidak valid' }
  if (input.length > MAX_FIELDS) return { error: `Maksimal ${MAX_FIELDS} opsi custom per produk` }

  const usedKeys = new Set()
  const fields = []
  for (const raw of input) {
    const label = typeof raw?.label === 'string' ? raw.label.trim().slice(0, 40) : ''
    if (!label) return { error: 'Nama opsi custom wajib diisi' }
    const type = FIELD_TYPES.includes(raw.type) ? raw.type : 'text'
    let key = typeof raw.key === 'string' && /^[a-z0-9_]{1,30}$/.test(raw.key) ? raw.key : slug(label)
    let n = 2
    while (usedKeys.has(key)) key = `${slug(label)}_${n++}`.slice(0, 30)
    usedKeys.add(key)

    const field = { key, label, type, required: !!raw.required }
    if (type === 'text') {
      field.maxLength = intIn(raw.maxLength, 1, 100, 20)
    } else if (type === 'select') {
      const choices = [...new Set((Array.isArray(raw.choices) ? raw.choices : []).map((c) => String(c).trim()).filter(Boolean))].slice(0, 30)
      if (choices.length === 0) return { error: `Opsi "${label}" butuh minimal satu pilihan` }
      field.choices = choices
    } else {
      field.min = intIn(raw.min, 0, 999, 1)
      field.max = intIn(raw.max, field.min, 999, Math.max(field.min, 99))
      field.unique = raw.unique !== false
      field.blockedNumbers = [...new Set((Array.isArray(raw.blockedNumbers) ? raw.blockedNumbers : []).map((v) => Math.round(Number(v))).filter((v) => Number.isInteger(v) && v >= field.min && v <= field.max))].sort((a, b) => a - b)
    }
    fields.push(field)
  }
  return { fields }
}

export function productFields(product) {
  return Array.isArray(product?.customFields) ? product.customFields : []
}

// Nomor yang sudah dipesan untuk satu field pada satu produk.
// `client` boleh prisma biasa atau transaksi.
export async function orderedNumbers(client, productId, fieldKey) {
  const items = await client.cartItem.findMany({
    where: { productId, status: { in: ['open', 'checked_out'] } },
    select: {
      id: true, status: true, metadata: true,
      student: { select: { fullName: true } },
      payment: { select: { status: true } },
    },
  })
  const out = []
  for (const item of items) {
    const custom = Array.isArray(item.metadata?.custom) ? item.metadata.custom : []
    const entry = custom.find((c) => c.key === fieldKey)
    const number = entry ? Number(entry.value) : NaN
    if (!Number.isInteger(number)) continue
    out.push({
      number,
      itemId: item.id,
      studentName: item.student?.fullName || null,
      paid: item.payment?.status === 'success',
    })
  }
  return out
}

// Validasi isian pembeli terhadap definisi produk.
// Mengembalikan { custom: [{ key, label, value }] } atau { error }.
export function validateCustomValues(product, values) {
  const fields = productFields(product)
  const input = values && typeof values === 'object' ? values : {}
  const custom = []
  for (const field of fields) {
    const raw = input[field.key]
    const text = raw === undefined || raw === null ? '' : String(raw).trim()
    if (!text) {
      if (field.required) return { error: `${field.label} wajib diisi` }
      continue
    }
    if (field.type === 'text') {
      if (text.length > (field.maxLength || 20)) return { error: `${field.label} maksimal ${field.maxLength || 20} karakter` }
      custom.push({ key: field.key, label: field.label, value: text })
    } else if (field.type === 'select') {
      if (!field.choices.includes(text)) return { error: `${field.label} tidak valid` }
      custom.push({ key: field.key, label: field.label, value: text })
    } else {
      const n = Number(text)
      if (!Number.isInteger(n) || n < field.min || n > field.max) return { error: `${field.label} harus angka ${field.min}–${field.max}` }
      if (field.blockedNumbers?.includes(n)) return { error: `${field.label} ${n} sudah dipakai` }
      custom.push({ key: field.key, label: field.label, value: n })
    }
  }
  return { custom }
}

// Cek bentrok nomor (unique) terhadap pesanan lain. Mengembalikan pesan error atau null.
export async function findNumberConflict(client, product, custom) {
  for (const field of productFields(product)) {
    if (field.type !== 'number' || !field.unique) continue
    const entry = custom.find((c) => c.key === field.key)
    if (!entry) continue
    const taken = await orderedNumbers(client, product.id, field.key)
    if (taken.some((t) => t.number === entry.value)) return `${field.label} ${entry.value} sudah dipesan orang lain. Pilih nomor lain.`
  }
  return null
}

export function customSummary(custom) {
  return custom.map((c) => `${c.label}: ${c.value}`).join(', ')
}

export const FULFILLMENT = ['baru', 'diproses', 'siap', 'selesai']
