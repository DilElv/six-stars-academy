import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.js'
import cmsRoutes from './routes/cms.js'
import packagesRoutes from './routes/packages.js'
import uploadRoutes from './routes/upload.js'
import studentsRoutes from './routes/students.js'
import schedulesRoutes from './routes/schedules.js'
import paymentsRoutes from './routes/payments.js'
import reportsRoutes from './routes/reports.js'
import attendanceRoutes from './routes/attendance.js'
import trainingSessionsRoutes from './routes/trainingSessions.js'
import assessmentsRoutes from './routes/assessments.js'
import adminRoutes from './routes/admin.js'
import settingsRoutes from './routes/settings.js'
import notificationsRoutes from './routes/notifications.js'

const app = express()

app.use(cors())
app.use(express.json())
app.use('/rapor', express.static(new URL('./uploads/rapor', import.meta.url).pathname))

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))
app.use('/api/auth', authRoutes)
app.use('/api/cms', cmsRoutes)
app.use('/api/packages', packagesRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/students', studentsRoutes)
app.use('/api/schedules', schedulesRoutes)
app.use('/api/payments', paymentsRoutes)
app.use('/api/reports', reportsRoutes)
app.use('/api/attendance', attendanceRoutes)
app.use('/api/training-sessions', trainingSessionsRoutes)
app.use('/api/assessments', assessmentsRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/notifications', notificationsRoutes)

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Server error' })
})

const PORT = process.env.PORT || 3002
app.listen(PORT, () => console.log(`Server-next running on http://localhost:${PORT}`))
