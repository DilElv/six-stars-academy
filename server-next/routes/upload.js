import { Router } from 'express'
import multer from 'multer'
import { uploadBuffer } from '../lib/cloudinary.js'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB — foto langsung dari kamera HP bisa beberapa MB
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter: (_req, file, cb) => cb(null, ALLOWED_IMAGE_TYPES.has(file.mimetype)),
})

const router = Router()

// MIME dari browser dapat dipalsukan. Validasi signature ringan ini memastikan
// buffer benar-benar file gambar sebelum diteruskan ke storage.
function hasValidImageSignature(buffer, mimeType) {
  if (!buffer || buffer.length < 12) return false
  const jpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  const png = buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  const webp = buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  // HEIC/HEIF memakai ISO Base Media File Format: size + "ftyp" + brand.
  const heif = buffer.subarray(4, 8).toString('ascii') === 'ftyp'
    && /^(heic|heix|hevc|hevx|mif1|msf1)$/i.test(buffer.subarray(8, 12).toString('ascii'))
  return (mimeType === 'image/jpeg' && jpeg)
    || (mimeType === 'image/png' && png)
    || (mimeType === 'image/webp' && webp)
    || ((mimeType === 'image/heic' || mimeType === 'image/heif') && heif)
}

// Public (no auth): dipakai saat wizard registrasi sebelum akun dibuat, dan oleh Admin CMS.
router.post('/', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: `Ukuran file maksimal ${MAX_FILE_SIZE / (1024 * 1024)}MB` })
      }
      return res.status(400).json({ error: err.message })
    }
    if (err) return res.status(400).json({ error: err.message || 'Upload gagal' })
    next()
  })
}, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
  try {
    if (!ALLOWED_IMAGE_TYPES.has(req.file.mimetype) || !hasValidImageSignature(req.file.buffer, req.file.mimetype)) {
      return res.status(400).json({ error: 'File gambar tidak valid atau formatnya tidak didukung' })
    }
    const result = await uploadBuffer(req.file.buffer)
    res.json({ url: result.secure_url })
  } catch (err) {
    console.error('Cloudinary upload failed:', { name: err?.name, message: err?.message, httpCode: err?.http_code })
    const timedOut = err?.http_code === 499 || /timeout/i.test(err?.message || '')
    res.status(timedOut ? 504 : 502).json({ error: timedOut ? 'Upload foto timeout. Silakan coba kirim kembali.' : 'Upload foto gagal. Silakan coba kembali.' })
  }
})

export default router
