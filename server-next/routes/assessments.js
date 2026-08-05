import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { getCategoriesForPosition } from '../lib/assessmentFields.js'

const router = Router()

function avg(data, fields) {
  const values = fields.map((f) => data[f]).filter((v) => typeof v === 'number')
  if (values.length === 0) return null
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
}

// A period is single-month when endMonth/endYear are omitted.
function parsePeriod(query) {
  const month = Number(query.month)
  const year = Number(query.year)
  const endMonth = query.endMonth ? Number(query.endMonth) : month
  const endYear = query.endYear ? Number(query.endYear) : year
  return { month, year, endMonth, endYear }
}

router.get('/', authenticate, authorize('head_coach', 'admin'), async (req, res) => {
  const { studentId } = req.query
  if (!studentId || !req.query.month || !req.query.year) return res.status(400).json({ error: 'studentId, month, year wajib diisi' })
  try {
    const { month, year, endMonth, endYear } = parsePeriod(req.query)
    const assessment = await prisma.assessment.findUnique({
      where: { studentId_month_year_endMonth_endYear: { studentId, month, year, endMonth, endYear } },
    })
    res.json(assessment)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Parent-facing, read-only. Returns the assessment directly (not gated
// behind a generated Report/PDF) so the student's Rapor page reflects
// whatever the head-coach has saved immediately, not only after a PDF has
// been generated. Defaults to the most recently-scored period. Includes the
// student's position so the frontend knows whether to render field-player
// or GK categories.
router.get('/me', authenticate, authorize('parent'), async (req, res) => {
  try {
    const student = await prisma.student.findFirst({ where: { userId: req.user.id } })
    if (!student) return res.json(null)

    const assessment = req.query.month && req.query.year
      ? await (async () => {
          const { month, year, endMonth, endYear } = parsePeriod(req.query)
          return prisma.assessment.findUnique({ where: { studentId_month_year_endMonth_endYear: { studentId: student.id, month, year, endMonth, endYear } } })
        })()
      : await prisma.assessment.findFirst({ where: { studentId: student.id }, orderBy: [{ year: 'desc' }, { month: 'desc' }] })
    res.json(assessment ? { ...assessment, position: student.position } : null)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', authenticate, authorize('head_coach', 'admin'), async (req, res) => {
  const { studentId, coachComment, activeCategories, ...scores } = req.body
  const { month, year, endMonth, endYear } = parsePeriod(req.body)
  if (!studentId || !month || !year) return res.status(400).json({ error: 'studentId, month, year wajib diisi' })
  try {
    const student = await prisma.student.findUnique({ where: { id: studentId } })
    if (!student) return res.status(404).json({ error: 'Siswa tidak ditemukan' })

    const categories = getCategoriesForPosition(student.position)
    const validKeys = new Set(categories.map((c) => c.key))
    // Unrecognized keys (e.g. leftover from a position change) are dropped
    // rather than trusted, so a stale client payload can't mark a category
    // active that no longer applies to this student.
    const active = Array.isArray(activeCategories) ? activeCategories.filter((k) => validKeys.has(k)) : categories.map((c) => c.key)

    // A skipped (inactive) category's avg is left null so it neither shows
    // a stale score nor drags overallAvg down with an absent value — same
    // treatment `avg()` already gives a category nobody scored yet.
    const avgByKey = {}
    for (const cat of categories) {
      avgByKey[cat.avgKey] = active.includes(cat.key) ? avg(scores, cat.fields.map(([k]) => k)) : null
    }
    const taktikParts = [avgByKey.attackingAvg, avgByKey.defendingAvg].filter((v) => v !== null && v !== undefined)
    const taktikAvg = taktikParts.length ? Math.round((taktikParts.reduce((a, b) => a + b, 0) / taktikParts.length) * 10) / 10 : null

    const overallParts = [avgByKey.teknikAvg, taktikAvg, avgByKey.fisikAvg, avgByKey.mentalAvg].filter((v) => v !== null && v !== undefined)
    const overallAvg = overallParts.length ? Math.round((overallParts.reduce((a, b) => a + b, 0) / overallParts.length) * 10) / 10 : null

    const data = {
      ...scores,
      coachComment,
      activeCategories: active,
      coachId: req.user.id,
      assessmentDate: new Date(),
      ...avgByKey,
      taktikAvg,
      overallAvg,
    }

    const assessment = await prisma.assessment.upsert({
      where: { studentId_month_year_endMonth_endYear: { studentId, month, year, endMonth, endYear } },
      update: data,
      create: { studentId, month, year, endMonth, endYear, ...data },
    })
    res.json(assessment)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
