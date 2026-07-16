import { Router } from 'express'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { authenticate } from '../middleware/auth.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const storage = multer.diskStorage({
  destination: join(__dirname, '..', 'uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `${uuidv4()}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|pdf)$/i
    if (allowed.test(path.extname(file.originalname))) return cb(null, true)
    cb(new Error('Hanya file JPG, PNG, GIF, PDF'))
  },
})

const router = Router()

router.post('/', authenticate, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
  const baseUrl = `${req.protocol}://${req.get('host')}`
  res.json({
    url: `${baseUrl}/uploads/${req.file.filename}`,
    filename: req.file.filename,
  })
})

export default router
