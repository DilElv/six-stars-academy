import { Router } from 'express'
import pool from '../db.js'
import { authenticate, authorize } from '../middleware/auth.js'

const router = Router()

router.get('/student/:studentId', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM metrics WHERE student_id = $1 ORDER BY updated_at DESC LIMIT 1`,
      [req.params.studentId]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'No metrics found' })
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/student/:studentId', authenticate, authorize('coach', 'admin'), async (req, res) => {
  const { passing, dribbling, stamina, shooting, tactics, coach_note } = req.body
  try {
    const existing = await pool.query(
      `SELECT id FROM metrics WHERE student_id = $1 ORDER BY updated_at DESC LIMIT 1`,
      [req.params.studentId]
    )
    if (existing.rows.length > 0) {
      await pool.query(
        `UPDATE metrics SET passing=$1, dribbling=$2, stamina=$3, shooting=$4, tactics=$5, coach_note=$6, updated_at=NOW()
         WHERE id=$7`,
        [passing, dribbling, stamina, shooting, tactics, coach_note, existing.rows[0].id]
      )
    } else {
      await pool.query(
        `INSERT INTO metrics (student_id, passing, dribbling, stamina, shooting, tactics, coach_note) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [req.params.studentId, passing, dribbling, stamina, shooting, tactics, coach_note]
      )
    }
    const result = await pool.query(
      `SELECT * FROM metrics WHERE student_id = $1 ORDER BY updated_at DESC LIMIT 1`,
      [req.params.studentId]
    )
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
