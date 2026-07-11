import { Router } from 'express'
import pool from '../db.js'
import { authenticate, authorize } from '../middleware/auth.js'

const router = Router()

router.get('/', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT sch.*, ag.label as age_group_label, p.name as coach_name
       FROM schedules sch
       LEFT JOIN age_groups ag ON sch.age_group_id = ag.id
       LEFT JOIN coaches c ON sch.coach_id = c.id
       LEFT JOIN profiles p ON c.profile_id = p.id
       ORDER BY
         CASE sch.day
           WHEN 'Senin' THEN 1 WHEN 'Selasa' THEN 2 WHEN 'Rabu' THEN 3 WHEN 'Kamis' THEN 4
           WHEN 'Jumat' THEN 5 WHEN 'Sabtu' THEN 6 WHEN 'Minggu' THEN 7
         END, sch.time`
    )
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', authenticate, authorize('admin'), async (req, res) => {
  const { day, time, venue, focus, coach_id, age_group_id } = req.body
  try {
    const result = await pool.query(
      `INSERT INTO schedules (day, time, venue, focus, coach_id, age_group_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [day, time, venue, focus, coach_id, age_group_id]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  const { day, time, venue, focus, coach_id, age_group_id } = req.body
  try {
    const result = await pool.query(
      `UPDATE schedules SET day=$1, time=$2, venue=$3, focus=$4, coach_id=$5, age_group_id=$6 WHERE id=$7 RETURNING *`,
      [day, time, venue, focus, coach_id, age_group_id, req.params.id]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Schedule not found' })
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM schedules WHERE id = $1', [req.params.id])
    res.json({ message: 'Deleted' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
