import { Router } from 'express'
import multer from 'multer'
import { uploadBuffer } from '../lib/cloudinary.js'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB — foto langsung dari kamera HP bisa beberapa MB
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_FILE_SIZE } })

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
    const result = await uploadBuffer(req.file.buffer)
    res.json({ url: result.secure_url })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Upload failed' })
  }
})

export default router
