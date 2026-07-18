import { Router } from 'express'
import prisma from '../lib/prisma.js'
import { authenticate, authorize } from '../middleware/auth.js'

const router = Router()

const TEKNIK_FIELDS = ['passing', 'control', 'runningWithBall', 'dribbling', 'shooting', 'longPassing', 'oneVsOneAttacking', 'oneVsOneDefending']
const ATTACKING_FIELDS = ['attackingPrinciples', 'possession', 'transitionAttacking', 'combinationPlay', 'switchingPlay', 'playingOutFromBack', 'finishingFinalThird']
const DEFENDING_FIELDS = ['defendingPrinciples', 'zonalDefending', 'retreatRecovery', 'compactness', 'transitionDefending']
const FISIK_FIELDS = ['maximalStrength', 'aerobicCapacity', 'reaction', 'acceleration', 'maximalSpeed', 'speedEndurance', 'awareness', 'power']
const MENTAL_FIELDS = ['selfConfidence', 'decision', 'leadership', 'enthusiasm', 'communication', 'discipline']

function avg(data, fields) {
  const values = fields.map((f) => data[f]).filter((v) => typeof v === 'number')
  if (values.length === 0) return null
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
}

router.get('/', authenticate, authorize('head_coach', 'admin'), async (req, res) => {
  const { studentId, month, year } = req.query
  if (!studentId || !month || !year) return res.status(400).json({ error: 'studentId, month, year wajib diisi' })
  try {
    const assessment = await prisma.assessment.findUnique({
      where: { studentId_month_year: { studentId, month: Number(month), year: Number(year) } },
    })
    res.json(assessment)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', authenticate, authorize('head_coach', 'admin'), async (req, res) => {
  const { studentId, month, year, coachComment, ...scores } = req.body
  if (!studentId || !month || !year) return res.status(400).json({ error: 'studentId, month, year wajib diisi' })
  try {
    const teknikAvg = avg(scores, TEKNIK_FIELDS)
    const attackingAvg = avg(scores, ATTACKING_FIELDS)
    const defendingAvg = avg(scores, DEFENDING_FIELDS)
    const taktikParts = [attackingAvg, defendingAvg].filter((v) => v !== null)
    const taktikAvg = taktikParts.length ? Math.round((taktikParts.reduce((a, b) => a + b, 0) / taktikParts.length) * 10) / 10 : null
    const fisikAvg = avg(scores, FISIK_FIELDS)
    const mentalAvg = avg(scores, MENTAL_FIELDS)
    const overallParts = [teknikAvg, taktikAvg, fisikAvg, mentalAvg].filter((v) => v !== null)
    const overallAvg = overallParts.length ? Math.round((overallParts.reduce((a, b) => a + b, 0) / overallParts.length) * 10) / 10 : null

    const data = {
      ...scores,
      coachComment,
      coachId: req.user.id,
      assessmentDate: new Date(),
      teknikAvg, attackingAvg, defendingAvg, taktikAvg, fisikAvg, mentalAvg, overallAvg,
    }

    const assessment = await prisma.assessment.upsert({
      where: { studentId_month_year: { studentId, month: Number(month), year: Number(year) } },
      update: data,
      create: { studentId, month: Number(month), year: Number(year), ...data },
    })
    res.json(assessment)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
