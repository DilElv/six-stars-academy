// Gambar TIDAK boleh dikirim sebagai data URL/inline base64 ke API, karena akan
// ikut tersimpan di PostgreSQL dan membebani database. Semua gambar harus
// diunggah lebih dulu lewat POST /api/upload (Cloudinary), lalu dikirim sebagai
// URL https. Middleware ini menolak permintaan yang masih membawa data URL.
const DATA_URL_RE = /^data:image\//i

function findInlineImage(value, depth = 0) {
  if (depth > 4 || value === null || value === undefined) return null
  if (typeof value === 'string') return DATA_URL_RE.test(value.trim()) ? true : null
  if (Array.isArray(value)) {
    for (const item of value) if (findInlineImage(item, depth + 1)) return true
    return null
  }
  if (typeof value === 'object') {
    for (const item of Object.values(value)) if (findInlineImage(item, depth + 1)) return true
    return null
  }
  return null
}

export function rejectInlineImages(req, res, next) {
  if (!req.body || typeof req.body !== 'object') return next()
  if (findInlineImage(req.body)) {
    return res.status(400).json({
      error: 'Foto harus diunggah ke penyimpanan gambar (Cloudinary) terlebih dahulu, bukan dikirim sebagai data langsung.',
    })
  }
  return next()
}

export default rejectInlineImages
