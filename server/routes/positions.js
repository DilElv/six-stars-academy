import { Router } from 'express'
import pool from '../db.js'
import { authenticate, authorize } from '../middleware/auth.js'

const router = Router()

router.get('/', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM positions ORDER BY label ASC')
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', authenticate, authorize('coach', 'admin'), async (req, res) => {
  const { label, singkatan } = req.body
  try {
    const result = await pool.query(
      `INSERT INTO positions (label, singkatan) VALUES ($1, $2) RETURNING *`,
      [label, singkatan.toUpperCase()]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Singkatan sudah ada' })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:id', authenticate, authorize('coach', 'admin'), async (req, res) => {
  const { label, singkatan } = req.body
  try {
    const result = await pool.query(
      `UPDATE positions SET label=$1, singkatan=$2 WHERE id=$3 RETURNING *`,
      [label, singkatan.toUpperCase(), req.params.id]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Position not found' })
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:id', authenticate, authorize('coach', 'admin'), async (req, res) => {
  try {
    const inUse = await pool.query('SELECT COUNT(*) FROM students WHERE position_id = $1', [req.params.id])
    if (parseInt(inUse.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Masih ada murid dengan posisi ini' })
    }
    await pool.query('DELETE FROM positions WHERE id = $1', [req.params.id])
    res.json({ message: 'Deleted' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
