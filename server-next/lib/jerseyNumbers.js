// Registry nomor punggung — dipakai route produk & keranjang.

// Kategori nomor punggung yang dipakai antarmuka. Data Student menyimpan
// kelompok umur per tahun (U-7, U-9, ...); dua kelompok ganjil digabung ke
// kategori even di atasnya agar tetap kompatibel tanpa mengubah data siswa.
export const JERSEY_AGE_GROUPS = ['U6', 'U8', 'U10', 'U12', 'U14']
export const JERSEY_NUMBER_MIN = 1
export const JERSEY_NUMBER_MAX = 100
// Reservasi keranjang yang tidak pernah di-checkout dilepas otomatis. Nomor
// yang sudah checkout/pending tetap dipegang sampai pembayaran selesai,
// gagal, dibatalkan, atau kedaluwarsa.
export const RESERVATION_TTL_MS = 24 * 60 * 60 * 1000

const AGE_GROUP_LABEL = {
  U6: 'U6',
  U8: 'U8',
  U10: 'U10',
  U12: 'U12',
  U14: 'U14',
}

export function normalizeJerseyAgeGroup(value) {
  const key = String(value || '').toUpperCase().replace(/[^0-9A-Z]/g, '')
  if (AGE_GROUP_LABEL[key]) return key
  const age = Number((key.match(/(\d+)/) || [])[1])
  if (!Number.isFinite(age) || age <= 0) return null
  if (age <= 6) return 'U6'
  if (age <= 8) return 'U8'
  if (age <= 10) return 'U10'
  if (age <= 12) return 'U12'
  return 'U14'
}

export function jerseyAgeGroupForStudent(student) {
  return normalizeJerseyAgeGroup(student?.ageGroup) || 'U6'
}

export function isJerseyNumberField(product, field) {
  if (!field || field.type !== 'number' || !field.unique) return false
  const haystack = `${product?.category || ''} ${field.key || ''} ${field.label || ''}`
  return /jersey|nomor|number/i.test(haystack)
}

export function jerseyNumberField(product) {
  return (Array.isArray(product?.customFields) ? product.customFields : []).find((field) => isJerseyNumberField(product, field)) || null
}

export function metadataNumber(metadata, fieldKey) {
  if (!fieldKey || !Array.isArray(metadata?.custom)) return NaN
  const entry = metadata.custom.find((item) => item.key === fieldKey)
  return entry ? Number(entry.value) : NaN
}

function validNumber(value) {
  return Number.isInteger(value) && value >= JERSEY_NUMBER_MIN && value <= JERSEY_NUMBER_MAX
}

function isOpenReservationExpired(item, now = Date.now()) {
  return item?.status === 'open' && new Date(item.updatedAt || item.createdAt || 0).getTime() < now - RESERVATION_TTL_MS
}

function isInactiveOrder(item) {
  if (!item) return true
  if (item.status === 'canceled') return true
  if (item.status === 'checked_out') {
    if (!item.payment) return true
    return !['pending', 'success'].includes(item.payment.status)
  }
  return false
}

// Lepas reservasi yang sudah kedaluwarsa/batal. Baris berstatus used tidak
// pernah dilepas di sini.
export async function releaseExpiredReservations(client, productId) {
  const rows = await client.jerseyNumber.findMany({
    where: { productId, status: 'reserved' },
    include: { cartItem: { include: { payment: { select: { status: true } } } } },
  })
  const now = Date.now()
  for (const row of rows) {
    const item = row.cartItem
    const expired = !item || isInactiveOrder(item) || isOpenReservationExpired(item, now)
    if (!expired) continue
    await client.jerseyNumber.updateMany({
      where: { id: row.id, status: 'reserved' },
      data: { status: 'available', studentId: null, cartItemId: null, playerName: null, size: null, reservedAt: null },
    })
  }
}

// Impor data nomor dari pesanan lama ke registry. Tidak menimpa nomor yang
// sudah terpakai/diblokir; bentrok dilaporkan agar Admin menyelesaikannya.
export async function syncLegacyJerseyNumbers(client, product) {
  const field = jerseyNumberField(product)
  if (!field) return { field: null, conflicts: [] }

  // Nomor yang diblokir lewat editor produk lama diimpor SEKALI saat registry
  // belum punya baris apa pun. Setelah itu registry yang menjadi sumber utama,
  // sehingga Admin bisa membuka blokir tanpa diblokir ulang oleh data lama.
  const blocked = (Array.isArray(field.blockedNumbers) ? field.blockedNumbers : [])
    .map((value) => Math.round(Number(value)))
    .filter(validNumber)
  if (blocked.length) {
    const existingCount = await client.jerseyNumber.count({ where: { productId: product.id } })
    if (existingCount === 0) {
      for (const ageGroup of JERSEY_AGE_GROUPS) {
        await client.jerseyNumber.createMany({
          data: [...new Set(blocked)].map((number) => ({ productId: product.id, ageGroup, number, status: 'blocked', note: 'Diblokir manual (data lama)' })),
          skipDuplicates: true,
        })
      }
    }
  }

  const items = await client.cartItem.findMany({
    where: { productId: product.id, status: { in: ['open', 'checked_out'] } },
    include: {
      student: { select: { id: true, fullName: true, ageGroup: true } },
      payment: { select: { status: true } },
      jerseyNumber: { select: { id: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  const conflicts = []
  const now = Date.now()
  for (const item of items) {
    const ageGroup = jerseyAgeGroupForStudent(item.student)
    const number = metadataNumber(item.metadata, field.key)
    if (!validNumber(number)) continue
    // Nomor yang sudah dilepas (batal/gagal/kedaluwarsa) tidak boleh otomatis
    // direservasi ulang hanya karena item keranjang masih tersimpan.
    if (item.metadata?.jerseyReleased) continue
    if (isOpenReservationExpired(item, now) || isInactiveOrder(item)) continue

    const paid = item.payment?.status === 'success'
    const playerName = (Array.isArray(item.metadata?.custom) ? item.metadata.custom : [])
      .find((entry) => /nama/i.test(`${entry.key} ${entry.label}`))?.value || item.student?.fullName || null
    const size = (Array.isArray(item.metadata?.custom) ? item.metadata.custom : [])
      .find((entry) => /ukuran|size/i.test(`${entry.key} ${entry.label}`))?.value || null

    const where = { productId_ageGroup_number: { productId: product.id, ageGroup, number } }
    const existing = await client.jerseyNumber.findUnique({ where })
    if (!existing) {
      await client.jerseyNumber.create({
        data: {
          productId: product.id,
          ageGroup,
          number,
          status: paid ? 'used' : 'reserved',
          studentId: item.studentId,
          cartItemId: item.id,
          playerName,
          size,
          reservedAt: paid ? null : (item.createdAt || new Date()),
          usedAt: paid ? (item.payment?.paidAt || new Date()) : null,
        },
      })
      continue
    }

    if (existing.status === 'blocked') {
      conflicts.push({ ageGroup, number, reason: 'Nomor diblokir tetapi sudah dipakai pesanan lama', cartItemId: item.id, studentName: item.student?.fullName || null })
      continue
    }
    if (existing.cartItemId && existing.cartItemId !== item.id) {
      conflicts.push({ ageGroup, number, reason: 'Nomor yang sama dipakai lebih dari satu pesanan aktif', cartItemId: item.id, studentName: item.student?.fullName || null })
      continue
    }
    if (paid && existing.status !== 'used') {
      await client.jerseyNumber.update({
        where: { id: existing.id },
        data: { status: 'used', cartItemId: item.id, studentId: item.studentId, playerName, size, usedAt: item.payment?.paidAt || new Date(), reservedAt: null },
      })
    } else if (!paid && existing.status === 'available') {
      await client.jerseyNumber.update({
        where: { id: existing.id },
        data: { status: 'reserved', cartItemId: item.id, studentId: item.studentId, playerName, size, reservedAt: item.createdAt || new Date() },
      })
    }
  }
  return { field, conflicts }
}

export async function listJerseyNumbers(client, product, ageGroup, { staff = false } = {}) {
  const normalized = normalizeJerseyAgeGroup(ageGroup)
  if (!normalized) return { error: 'Kategori usia tidak valid' }
  await releaseExpiredReservations(client, product.id)
  const { field, conflicts } = await syncLegacyJerseyNumbers(client, product)
  if (!field) return { error: 'Produk ini tidak memiliki nomor punggung jersey' }
  await releaseExpiredReservations(client, product.id)

  const rows = await client.jerseyNumber.findMany({
    where: { productId: product.id, ageGroup: normalized },
    include: { student: { select: { fullName: true } }, cartItem: { select: { id: true, status: true } } },
  })
  const byNumber = new Map(rows.map((row) => [row.number, row]))
  const numbers = []
  const summary = { available: 0, blocked: 0, reserved: 0, used: 0, total: JERSEY_NUMBER_MAX }
  for (let number = JERSEY_NUMBER_MIN; number <= JERSEY_NUMBER_MAX; number += 1) {
    const row = byNumber.get(number)
    const status = row?.status || 'available'
    summary[status] = (summary[status] || 0) + 1
    numbers.push({
      number,
      status,
      ...(staff ? {
        playerName: row?.playerName || row?.student?.fullName || null,
        studentName: row?.student?.fullName || null,
        note: row?.note || null,
        cartItemId: row?.cartItemId || null,
      } : {}),
    })
  }
  return {
    field: { key: field.key, label: field.label },
    ageGroup: normalized,
    ageGroups: JERSEY_AGE_GROUPS,
    numbers,
    summary,
    conflicts: staff ? conflicts : [],
  }
}

async function existingRow(client, productId, ageGroup, number) {
  return client.jerseyNumber.findUnique({ where: { productId_ageGroup_number: { productId, ageGroup, number } } })
}

// Dipanggil di dalam transaksi + advisory lock per produk/kategori.
export async function assertNumberAvailable(client, product, ageGroup, number) {
  if (!validNumber(number)) throw Object.assign(new Error(`Nomor punggung harus ${JERSEY_NUMBER_MIN}–${JERSEY_NUMBER_MAX}`), { status: 400 })
  await releaseExpiredReservations(client, product.id)
  await syncLegacyJerseyNumbers(client, product)
  await releaseExpiredReservations(client, product.id)
  const row = await existingRow(client, product.id, ageGroup, number)
  if (row && row.status !== 'available') {
    const message = row.status === 'blocked'
      ? `Nomor ${number} diblokir Admin`
      : row.status === 'used'
        ? `Nomor ${number} sudah terpakai`
        : `Nomor ${number} sedang dipesan orang lain`
    throw Object.assign(new Error(message), { status: 409 })
  }
}

// Pasang nomor ke item yang SUDAH dibuat. Tidak memanggil syncLegacy lagi,
// supaya item yang baru dibuat dalam transaksi yang sama tidak dianggap
// pesaing oleh dirinya sendiri.
export async function assignNumberToItem(client, { product, ageGroup, number, student, cartItemId, playerName, size }) {
  const row = await existingRow(client, product.id, ageGroup, number)
  const data = {
    status: 'reserved',
    studentId: student?.id || null,
    cartItemId,
    playerName: playerName || student?.fullName || null,
    size: size || null,
    reservedAt: new Date(),
  }
  if (row) return client.jerseyNumber.update({ where: { id: row.id }, data })
  return client.jerseyNumber.create({ data: { productId: product.id, ageGroup, number, ...data } })
}

// Validasi ulang tepat sebelum Payment dibuat: nomor harus masih dipegang item
// ini (atau masih tersedia), lalu reservasi diperbarui.
export async function revalidateCheckoutNumbers(client, product, ageGroup, items) {
  const field = jerseyNumberField(product)
  for (const item of items) {
    const number = Number(item.metadata?.jerseyNumber) || metadataNumber(item.metadata, field?.key)
    if (!validNumber(number)) continue
    if (item.metadata?.jerseyReleased) {
      await client.cartItem.update({ where: { id: item.id }, data: { metadata: { ...item.metadata, jerseyReleased: false } } })
    }
    await releaseExpiredReservations(client, product.id)
    const row = await existingRow(client, product.id, ageGroup, number)
    if (!row) {
      await client.jerseyNumber.create({
        data: { productId: product.id, ageGroup, number, status: 'reserved', cartItemId: item.id, studentId: item.studentId, playerName: item.metadata?.playerName || null, size: item.metadata?.size || null, reservedAt: new Date() },
      })
      continue
    }
    if (row.status === 'blocked') throw Object.assign(new Error(`Nomor ${number} diblokir Admin. Hapus item jersey lalu pilih nomor lain.`), { status: 409 })
    if (row.status === 'used' && row.cartItemId !== item.id) throw Object.assign(new Error(`Nomor ${number} sudah terpakai. Pilih nomor lain.`), { status: 409 })
    if (row.status === 'reserved' && row.cartItemId && row.cartItemId !== item.id) throw Object.assign(new Error(`Nomor ${number} baru saja dipesan orang lain. Pilih nomor lain.`), { status: 409 })
    await client.jerseyNumber.update({
      where: { id: row.id },
      data: { status: row.status === 'used' ? 'used' : 'reserved', cartItemId: item.id, studentId: item.studentId, playerName: item.metadata?.playerName || row.playerName, size: item.metadata?.size || row.size, reservedAt: row.status === 'used' ? row.reservedAt : new Date() },
    })
  }
}

export async function releaseNumbersForItems(client, itemIds) {
  if (!Array.isArray(itemIds) || itemIds.length === 0) return
  await client.jerseyNumber.updateMany({
    where: { cartItemId: { in: itemIds }, status: 'reserved' },
    data: { status: 'available', studentId: null, cartItemId: null, playerName: null, size: null, reservedAt: null },
  })
  // Tandai item supaya sinkronisasi data lama tidak mengunci nomornya lagi.
  const items = await client.cartItem.findMany({ where: { id: { in: itemIds } }, select: { id: true, metadata: true } })
  for (const item of items) {
    const hasJersey = item.metadata?.jerseyNumber
      || (Array.isArray(item.metadata?.custom) && item.metadata.custom.some((entry) => /nomor|jersey/i.test(`${entry.key} ${entry.label}`)))
    if (!hasJersey || item.metadata?.jerseyReleased) continue
    await client.cartItem.update({ where: { id: item.id }, data: { metadata: { ...item.metadata, jerseyReleased: true } } })
  }
}

export async function markNumbersUsed(client, items, student) {
  for (const item of items || []) {
    if (item.type !== 'merchandise' || !item.productId) continue
    const product = await client.product.findUnique({ where: { id: item.productId } })
    if (!product) continue
    const field = jerseyNumberField(product)
    if (!field) continue
    const number = Number(item.metadata?.jerseyNumber) || metadataNumber(item.metadata, field.key)
    if (!validNumber(number)) continue
    const ageGroup = normalizeJerseyAgeGroup(item.metadata?.jerseyAgeGroup)
      || jerseyAgeGroupForStudent(item.student || student)
    const playerName = item.metadata?.playerName
      || (Array.isArray(item.metadata?.custom) ? item.metadata.custom : []).find((entry) => /nama/i.test(`${entry.key} ${entry.label}`))?.value
      || student?.fullName
    const size = item.metadata?.size
      || (Array.isArray(item.metadata?.custom) ? item.metadata.custom : []).find((entry) => /ukuran|size/i.test(`${entry.key} ${entry.label}`))?.value
    await client.jerseyNumber.upsert({
      where: { productId_ageGroup_number: { productId: product.id, ageGroup, number } },
      create: { productId: product.id, ageGroup, number, status: 'used', studentId: item.studentId || student?.id, cartItemId: item.id, playerName: playerName || null, size: size || null, usedAt: new Date() },
      update: { status: 'used', studentId: item.studentId || student?.id, cartItemId: item.id, playerName: playerName || null, size: size || null, usedAt: new Date(), reservedAt: null },
    })
  }
}



