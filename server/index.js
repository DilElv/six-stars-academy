import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '..', '.env') })

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// Static uploads
const __dirname = dirname(fileURLToPath(import.meta.url))
app.use('/uploads', express.static(join(__dirname, 'uploads')))

// Routes
import authRoutes from './routes/auth.js'
import studentRoutes from './routes/students.js'
import coachRoutes from './routes/coaches.js'
import parentRoutes from './routes/parents.js'
import metricRoutes from './routes/metrics.js'
import attendanceRoutes from './routes/attendance.js'
import paymentRoutes from './routes/payments.js'
import scheduleRoutes from './routes/schedules.js'
import positionRoutes from './routes/positions.js'
import ageGroupRoutes from './routes/ageGroups.js'
import contentRoutes from './routes/content.js'
import uploadRoutes from './routes/upload.js'
import adminRoutes from './routes/admin.js'

app.use('/api/auth', authRoutes)
app.use('/api/students', studentRoutes)
app.use('/api/coaches', coachRoutes)
app.use('/api/parents', parentRoutes)
app.use('/api/metrics', metricRoutes)
app.use('/api/attendance', attendanceRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/schedules', scheduleRoutes)
app.use('/api/positions', positionRoutes)
app.use('/api/age-groups', ageGroupRoutes)
app.use('/api/content', contentRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/admin', adminRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Error handler
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: err.message || 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
