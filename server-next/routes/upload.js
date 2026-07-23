import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PHOTO_DIR = path.join(__dirname, '..', 'uploads', 'photos')

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, PHOTO_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg'
    const name = crypto.randomBytes(16).toString('hex') + ext
    cb(null, name)
  },
})

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } })

const router = Router()

router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
  const baseUrl = `${req.protocol}://${req.get('host')}`
  const url = `${baseUrl}/api/uploads/photos/${req.file.filename}`
  res.json({ url })
})

export default router
