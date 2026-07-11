import { Router } from 'express'
import pool from '../db.js'
import { authenticate, authorize } from '../middleware/auth.js'

const router = Router()

router.get('/', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM age_groups ORDER BY min_age ASC')
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', authenticate, authorize('coach', 'admin'), async (req, res) => {
  const { label, min_age, max_age } = req.body
  try {
    const overlap = await pool.query(
      `SELECT id FROM age_groups WHERE id IS NOT NULL AND NOT ($1 < min_age OR $2 > max_age)`,
      [min_age, max_age]
    )
    if (overlap.rows.length > 0) {
      return res.status(400).json({ error: 'Rentang usia bentrok dengan grup yang sudah ada' })
    }
    const result = await pool.query(
      `INSERT INTO age_groups (label, min_age, max_age) VALUES ($1, $2, $3) RETURNING *`,
      [label, min_age, max_age]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:id', authenticate, authorize('coach', 'admin'), async (req, res) => {
  const { label, min_age, max_age } = req.body
  try {
    if (min_age >= max_age) return res.status(400).json({ error: 'Usia max harus lebih besar dari min' })
    const result = await pool.query(
      `UPDATE age_groups SET label=$1, min_age=$2, max_age=$3 WHERE id=$4 RETURNING *`,
      [label, min_age, max_age, req.params.id]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Age group not found' })
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:id', authenticate, authorize('coach', 'admin'), async (req, res) => {
  try {
    const inUse = await pool.query('SELECT COUNT(*) FROM students WHERE age_group_id = $1', [req.params.id])
    if (parseInt(inUse.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Masih ada murid di grup ini' })
    }
    await pool.query('DELETE FROM age_groups WHERE id = $1', [req.params.id])
    res.json({ message: 'Deleted' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
