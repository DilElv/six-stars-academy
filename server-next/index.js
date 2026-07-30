import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
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
import branchesRoutes from './routes/branches.js'
import fieldsRoutes from './routes/fields.js'
import eventsRoutes from './routes/events.js'
import staffAttendanceRoutes from './routes/staffAttendance.js'
import passwordResetRoutes from './routes/passwordReset.js'
import branchPackagesRoutes from './routes/branchPackages.js'
import promoCodesRoutes from './routes/promoCodes.js'
import ledgerRoutes from './routes/ledger.js'

const app = express()

app.use(cors())
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf } }))
app.use('/rapor', express.static(path.join(__dirname, 'uploads', 'rapor')))
app.use('/api/uploads/photos', express.static(path.join(__dirname, 'uploads', 'photos')))

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
app.use('/api/branches', branchesRoutes)
app.use('/api/fields', fieldsRoutes)
app.use('/api/events', eventsRoutes)
app.use('/api/staff-attendance', staffAttendanceRoutes)
app.use('/api/password-reset', passwordResetRoutes)
app.use('/api/branch-packages', branchPackagesRoutes)
app.use('/api/promo-codes', promoCodesRoutes)
app.use('/api/ledger', ledgerRoutes)

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Server error' })
})

const PORT = process.env.PORT || 3002
const HOST = process.env.HOST || '0.0.0.0'
app.listen(PORT, HOST, () => console.log(`Server-next running on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`))
