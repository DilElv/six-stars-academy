import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import prisma from '../lib/prisma.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { generateReportPdf } from '../lib/generateReportPdf.js'
import { notifyUser } from '../lib/notify.js'
import { MONTHS } from '../lib/assessmentFields.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPORTS_DIR = path.join(__dirname, '..', 'uploads', 'rapor')
fs.mkdirSync(REPORTS_DIR, { recursive: true })

const router = Router()

router.post('/generate', authenticate, authorize('head_coach', 'admin'), async (req, res) => {
  const { studentId, month, year } = req.body
  if (!studentId || !month || !year) return res.status(400).json({ error: 'studentId, month, year wajib diisi' })
  try {
    const [student, assessment, settingsRow, headCoach] = await Promise.all([
      prisma.student.findUnique({ where: { id: studentId } }),
      prisma.assessment.findUnique({ where: { studentId_month_year: { studentId, month: Number(month), year: Number(year) } } }),
      prisma.cmsContent.findFirst({ where: { section: 'settings' } }),
      prisma.user.findFirst({ where: { role: 'head_coach' } }),
    ])
    if (!student) return res.status(404).json({ error: 'Siswa tidak ditemukan' })
    if (!assessment) return res.status(400).json({ error: 'Belum ada penilaian untuk bulan ini' })

    const monthStart = new Date(Number(year), Number(month) - 1, 1)
    const monthEnd = new Date(Number(year), Number(month), 1)
    const monthAttendances = await prisma.attendance.findMany({
      where: { studentId, date: { gte: monthStart, lt: monthEnd } },
      select: { status: true },
    })
    const attendanceSummary = {
      hadir: monthAttendances.filter((a) => a.status === 'hadir').length,
      izin: monthAttendances.filter((a) => a.status === 'izin').length,
      sakit: monthAttendances.filter((a) => a.status === 'sakit').length,
      alfa: monthAttendances.filter((a) => a.status === 'alfa').length,
      total: monthAttendances.length,
    }

    const settings = { ssbName: 'SixStars Academy Indonesia', ...(settingsRow?.content || {}) }
    const pdfBuffer = await generateReportPdf({ student, assessment, month: Number(month), year: Number(year), settings, headCoachName: headCoach?.name, attendanceSummary })
    const fileName = `${student.studentId}-${year}-${month}.pdf`
    fs.writeFileSync(path.join(REPORTS_DIR, fileName), pdfBuffer)
    const pdfUrl = `${req.protocol}://${req.get('host')}/rapor/${fileName}`

    const existing = await prisma.report.findFirst({ where: { studentId, month: Number(month), year: Number(year) } })
    const data = { assessmentId: assessment.id, pdfUrl, generatedAt: new Date(), sentToParent: true }
    const report = existing
      ? await prisma.report.update({ where: { id: existing.id }, data })
      : await prisma.report.create({ data: { studentId, month: Number(month), year: Number(year), ...data } })

    await notifyUser(student.userId, {
      type: 'report_ready',
      title: 'Rapor Baru Tersedia',
      message: `Rapor ${MONTHS[Number(month)]} ${year} untuk ${student.fullName} sudah bisa dilihat.`,
      link: '/dashboard/rapor',
    })

    res.json(report)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/', authenticate, authorize('head_coach', 'admin'), async (req, res) => {
  const { studentId, month, year } = req.query
  if (!studentId || !month || !year) return res.status(400).json({ error: 'studentId, month, year wajib diisi' })
  try {
    const report = await prisma.report.findFirst({ where: { studentId, month: Number(month), year: Number(year) } })
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
