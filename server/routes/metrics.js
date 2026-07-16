import { Router } from 'express'
import pool from '../db.js'
import { authenticate, authorize } from '../middleware/auth.js'

const router = Router()

// GET /api/metrics/student/:id — latest session or by period+type query
router.get('/student/:id', authenticate, async (req, res) => {
  try {
    const { period, type } = req.query
    let sql, params
    if (period && type) {
      sql = `SELECT * FROM metrics WHERE student_id = $1 AND period = $2 AND report_type = $3 LIMIT 1`
      params = [req.params.id, period, type]
    } else {
      sql = `SELECT * FROM metrics WHERE student_id = $1 ORDER BY created_at DESC LIMIT 1`
      params = [req.params.id]
    }
    const result = await pool.query(sql, params)
    if (result.rows.length === 0) return res.status(404).json({ error: 'No metrics found' })
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/metrics/student/:id/history — all metric rows for a student
router.get('/student/:id/history', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM metrics WHERE student_id = $1 ORDER BY created_at DESC`,
      [req.params.id]
    )
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// PUT /api/metrics/student/:id — upsert by (student_id, period, report_type)
router.put('/student/:id', authenticate, authorize('coach', 'admin'), async (req, res) => {
  const { passing, dribbling, stamina, shooting, tactics, coach_note, period, report_type, is_published, metrics_data } = req.body
  const p = period || new Date().toISOString().slice(0, 10)
  const rt = report_type || 'session'
  try {
    const existing = await pool.query(
      `SELECT id, is_published, metrics_data FROM metrics WHERE student_id = $1 AND period = $2 AND report_type = $3 LIMIT 1`,
      [req.params.id, p, rt]
    )
    const pub = existing.rows.length > 0 ? existing.rows[0].is_published : false
    const mergedMetricsData = metrics_data
      ? metrics_data
      : (existing.rows.length > 0 ? existing.rows[0].metrics_data : {})
    await pool.query(
      `INSERT INTO metrics (student_id, period, report_type, passing, dribbling, stamina, shooting, tactics, coach_note, is_published, metrics_data)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)
       ON CONFLICT (student_id, period, report_type)
       DO UPDATE SET passing=$4, dribbling=$5, stamina=$6, shooting=$7, tactics=$8, coach_note=$9,
         is_published=COALESCE($10, metrics.is_published), metrics_data=COALESCE($11::jsonb, metrics.metrics_data), updated_at=NOW()`,
      [req.params.id, p, rt, passing, dribbling, stamina, shooting, tactics, coach_note, is_published ?? pub, JSON.stringify(mergedMetricsData)]
    )
    const result = await pool.query(
      `SELECT * FROM metrics WHERE student_id = $1 AND period = $2 AND report_type = $3 LIMIT 1`,
      [req.params.id, p, rt]
    )
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/metrics/report/average — compute average for a period
router.get('/report/average', authenticate, async (req, res) => {
  try {
    const { period, type, days, ageGroupId } = req.query
    let sql, params
    if (period && type === 'monthly') {
      const prefix = period + '-%'
      sql = `
        SELECT student_id,
          ROUND(AVG(passing))::int AS passing,
          ROUND(AVG(dribbling))::int AS dribbling,
          ROUND(AVG(stamina))::int AS stamina,
          ROUND(AVG(shooting))::int AS shooting,
          ROUND(AVG(tactics))::int AS tactics,
          COUNT(*) AS session_count
        FROM metrics
        WHERE report_type = 'session' AND period LIKE $1
        ${ageGroupId ? 'AND student_id IN (SELECT id FROM students WHERE age_group_id = $2)' : ''}
        GROUP BY student_id
      `
      params = ageGroupId ? [prefix, ageGroupId] : [prefix]
    } else if (days) {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - Number(days))
      const cutoffStr = cutoff.toISOString().slice(0, 10)
      sql = `
        SELECT student_id,
          ROUND(AVG(passing))::int AS passing,
          ROUND(AVG(dribbling))::int AS dribbling,
          ROUND(AVG(stamina))::int AS stamina,
          ROUND(AVG(shooting))::int AS shooting,
          ROUND(AVG(tactics))::int AS tactics,
          COUNT(*) AS session_count
        FROM metrics
        WHERE report_type = 'session' AND period >= $1
        ${ageGroupId ? 'AND student_id IN (SELECT id FROM students WHERE age_group_id = $2)' : ''}
        GROUP BY student_id
      `
      params = ageGroupId ? [cutoffStr, ageGroupId] : [cutoffStr]
    } else {
      return res.status(400).json({ error: 'Provide ?period+type=monthly or ?days=N' })
    }
    const result = await pool.query(sql, params)
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/metrics/report/monthly?period=2026-07 — get saved monthly report rows (draft or published)
router.get('/report/monthly', authenticate, async (req, res) => {
  try {
    const { period } = req.query
    if (!period || !/^\d{4}-\d{2}$/.test(period)) {
      return res.status(400).json({ error: 'Period must be YYYY-MM' })
    }
    const result = await pool.query(
      `SELECT m.*, s.name AS student_name, s.avatar, ag.label AS age_group, pos.singkatan AS position_singkatan
       FROM metrics m
       JOIN students s ON s.id = m.student_id
       LEFT JOIN age_groups ag ON ag.id = s.age_group_id
       LEFT JOIN positions pos ON pos.id = s.position_id
       WHERE m.period = $1 AND m.report_type = 'monthly'
       ORDER BY s.name`,
      [period]
    )
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/metrics/report/generate-monthly
router.post('/report/generate-monthly', authenticate, authorize('coach', 'admin'), async (req, res) => {
  const { period } = req.body
  if (!period || !/^\d{4}-\d{2}$/.test(period)) {
    return res.status(400).json({ error: 'Period must be YYYY-MM' })
  }
  try {
    const prefix = period + '-%'
    const rows = await pool.query(
      `SELECT student_id,
         ROUND(AVG(passing))::int AS passing,
         ROUND(AVG(dribbling))::int AS dribbling,
         ROUND(AVG(stamina))::int AS stamina,
         ROUND(AVG(shooting))::int AS shooting,
         ROUND(AVG(tactics))::int AS tactics,
         COUNT(*) AS session_count
       FROM metrics
       WHERE report_type = 'session' AND period LIKE $1
       GROUP BY student_id`,
      [prefix]
    )

    const inserted = []
    for (const row of rows.rows) {
      const posResult = await pool.query(
        `SELECT p.singkatan FROM students s JOIN positions p ON s.position_id = p.id WHERE s.id = $1`,
        [row.student_id]
      )
      const posSingkatan = posResult.rows[0]?.singkatan || ''
      let defaultMetricsData = {}
      if (posSingkatan === 'GK') {
        defaultMetricsData = {
          catching: 50, kicking: 50, throwing: 50, volleying: 50, drop_kick: 50, goal_kick: 50, footwork: 50, gk_1v1: 50,
          gk_att_position: 50, attacking_principles: 50, possession: 50, transition_plus: 50, switching_play: 50,
          gk_def_position: 50, deal_with_crossing: 50, deal_with_corner_kick: 50, deal_with_free_kick: 50, deal_with_long_pass: 50, gk_def_1v1: 50,
          maximal_strength: 50, aerobic_capacity: 50, reaction: 50, acceleration: 50, maximal_speed: 50, speed_endurance: 50, awareness: 50, power: 50,
          self_confidence: 50, decision: 50, leadership: 50, enthusiasm: 50, communication: 50, discipline: 50,
        }
      } else {
        defaultMetricsData = {
          passing: row.passing, control: 50, running_with_ball: 50, dribbling: row.dribbling, shooting: row.shooting, long_passing: 50, of_1v1_att: 50, of_1v1_def: 50,
          of_attacking_principles: 50, of_possession: 50, of_transition_plus: 50, combination_play: 50, of_switching_play: 50, playing_out_back: 50, finishing_final_third: 50,
          of_defending_principles: 50, zonal_defending: 50, pressing: 50, retreat_recovery: 50, compactness: 50, of_transition_minus: 50,
          of_maximal_strength: 50, of_aerobic_capacity: 50, of_reaction: 50, of_acceleration: 50, of_maximal_speed: 50, of_speed_endurance: 50, of_awareness: 50, of_power: 50,
          of_self_confidence: 50, of_decision: 50, of_leadership: 50, of_enthusiasm: 50, of_communication: 50, of_discipline: 50,
        }
      }
      const result = await pool.query(
        `INSERT INTO metrics (student_id, period, report_type, passing, dribbling, stamina, shooting, tactics, is_published, metrics_data)
         VALUES ($1,$2,'monthly',$3,$4,$5,$6,$7,FALSE,$8::jsonb)
         ON CONFLICT (student_id, period, report_type)
         DO UPDATE SET passing=$3, dribbling=$4, stamina=$5, shooting=$6, tactics=$7, is_published=FALSE, metrics_data=$8::jsonb, updated_at=NOW()
         RETURNING *`,
        [row.student_id, period, row.passing, row.dribbling, row.stamina, row.shooting, row.tactics, JSON.stringify(defaultMetricsData)]
      )
      inserted.push(result.rows[0])
    }

    res.json({ period, report_type: 'monthly', count: inserted.length, rows: inserted })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/metrics/report/publish — publish monthly report for a period
router.post('/report/publish', authenticate, authorize('coach', 'admin'), async (req, res) => {
  const { period } = req.body
  if (!period || !/^\d{4}-\d{2}$/.test(period)) {
    return res.status(400).json({ error: 'Period must be YYYY-MM' })
  }
  try {
    const result = await pool.query(
      `UPDATE metrics SET is_published = TRUE, updated_at = NOW()
       WHERE period = $1 AND report_type = 'monthly'
       RETURNING *`,
      [period]
    )
    res.json({ period, report_type: 'monthly', count: result.rowCount, rows: result.rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/metrics/available-periods — list unique periods for dropdown filters
router.get('/available-periods', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT period, report_type FROM metrics ORDER BY period DESC`
    )
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
