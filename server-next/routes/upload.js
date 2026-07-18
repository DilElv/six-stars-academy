import { Router } from 'express'
import multer from 'multer'
import { uploadBuffer } from '../lib/cloudinary.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })

// Public (no auth): dipakai saat wizard registrasi sebelum akun dibuat, dan oleh Admin CMS.
router.post('/', upload.single('file'), async (req, res) => {
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
