import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import prisma from '../lib/prisma.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { generateReportPdf } from '../lib/generateReportPdf.js'
import { notifyUser } from '../lib/notify.js'
import { formatPeriodLabel } from '../lib/assessmentFields.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPORTS_DIR = path.join(__dirname, '..', 'uploads', 'rapor')
fs.mkdirSync(REPORTS_DIR, { recursive: true })

const router = Router()

// A period is single-month when endMonth/endYear are omitted.
function parsePeriod(body) {
  const month = Number(body.month)
  const year = Number(body.year)
  const endMonth = body.endMonth ? Number(body.endMonth) : month
  const endYear = body.endYear ? Number(body.endYear) : year
  return { month, year, endMonth, endYear }
}

router.post('/generate', authenticate, authorize('head_coach', 'admin'), async (req, res) => {
  const { studentId } = req.body
  const { month, year, endMonth, endYear } = parsePeriod(req.body)
  if (!studentId || !month || !year) return res.status(400).json({ error: 'studentId, month, year wajib diisi' })
  try {
    const [student, assessment, settingsRow, headCoach] = await Promise.all([
      prisma.student.findUnique({ where: { id: studentId } }),
      prisma.assessment.findUnique({ where: { studentId_month_year_endMonth_endYear: { studentId, month, year, endMonth, endYear } } }),
      prisma.cmsContent.findFirst({ where: { section: 'settings' } }),
      prisma.user.findFirst({ where: { role: 'head_coach' } }),
    ])
    if (!student) return res.status(404).json({ error: 'Siswa tidak ditemukan' })
    if (!assessment) return res.status(400).json({ error: 'Belum ada penilaian untuk periode ini' })

    const periodStart = new Date(year, month - 1, 1)
    const periodEnd = new Date(endYear, endMonth, 1)
    const periodAttendances = await prisma.attendance.findMany({
      where: { studentId, date: { gte: periodStart, lt: periodEnd } },
      select: { status: true },
    })
    const attendanceSummary = {
      hadir: periodAttendances.filter((a) => a.status === 'hadir').length,
      izin: periodAttendances.filter((a) => a.status === 'izin').length,
      sakit: periodAttendances.filter((a) => a.status === 'sakit').length,
      alfa: periodAttendances.filter((a) => a.status === 'alfa').length,
      total: periodAttendances.length,
    }

    const settings = { ssbName: 'SixStars Academy Indonesia', ...(settingsRow?.content || {}) }
    const pdfBuffer = await generateReportPdf({
      student, assessment, month, year, endMonth, endYear, settings,
      headCoachName: headCoach?.name, headCoachSignature: headCoach?.signature, attendanceSummary,
    })
    const fileName = endMonth === month && endYear === year
      ? `${student.studentId}-${year}-${month}.pdf`
      : `${student.studentId}-${year}-${month}-to-${endYear}-${endMonth}.pdf`
    fs.writeFileSync(path.join(REPORTS_DIR, fileName), pdfBuffer)
    const pdfUrl = `${req.protocol}://${req.get('host')}/rapor/${fileName}`

    const existing = await prisma.report.findFirst({ where: { studentId, month, year, endMonth, endYear } })
    const data = { assessmentId: assessment.id, pdfUrl, generatedAt: new Date(), sentToParent: true }
    const report = existing
      ? await prisma.report.update({ where: { id: existing.id }, data })
      : await prisma.report.create({ data: { studentId, month, year, endMonth, endYear, ...data } })

    await notifyUser(student.userId, {
      type: 'report_ready',
      title: 'Rapor Baru Tersedia',
      message: `Rapor ${formatPeriodLabel(month, year, endMonth, endYear)} untuk ${student.fullName} sudah bisa dilihat.`,
      link: '/dashboard/rapor',
    })

    res.json(report)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/', authenticate, authorize('head_coach', 'admin'), async (req, res) => {
  const { studentId } = req.query
  if (!studentId || !req.query.month || !req.query.year) return res.status(400).json({ error: 'studentId, month, year wajib diisi' })
  try {
    const { month, year, endMonth, endYear } = parsePeriod(req.query)
    const report = await prisma.report.findFirst({ where: { studentId, month, year, endMonth, endYear } })
    res.json(report)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/me', authenticate, authorize('parent'), async (req, res) => {
  try {
    const student = await prisma.student.findFirst({ where: { userId: req.user.id } })
    if (!student) return res.json([])
    const reports = await prisma.report.findMany({
      where: { studentId: student.id },
      include: { assessment: true },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    })
    res.json(reports)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
