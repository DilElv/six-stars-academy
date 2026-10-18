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
    if (!ALLOWED_IMAGE_TYPES.has(req.file.mimetype)) return res.status(400).json({ error: 'File harus berupa gambar' })
    const result = await uploadBuffer(req.file.buffer)
    res.json({ url: result.secure_url })
  } catch (err) {
    console.error('Cloudinary upload failed:', { name: err?.name, message: err?.message, httpCode: err?.http_code })
    const timedOut = err?.http_code === 499 || /timeout/i.test(err?.message || '')
    res.status(timedOut ? 504 : 502).json({ error: timedOut ? 'Upload foto timeout. Silakan coba kirim kembali.' : 'Upload foto gagal. Silakan coba kembali.' })
  }
})

export default router
