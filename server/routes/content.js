import { Router } from 'express'
import pool from '../db.js'
import { authenticate, authorize } from '../middleware/auth.js'

const router = Router()

router.get('/public/:section', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT section, data FROM site_content WHERE section = $1',
      [req.params.section]
    )
    if (result.rows.length === 0) return res.json({ section: req.params.section, data: {} })
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/public', async (req, res) => {
  try {
    const result = await pool.query('SELECT section, data FROM site_content')
    const data = {}
    result.rows.forEach((r) => { data[r.section] = r.data })
    res.json(data)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:section', authenticate, authorize('admin'), async (req, res) => {
  const { data } = req.body
  try {
    const result = await pool.query(
      `INSERT INTO site_content (section, data) VALUES ($1, $2)
       ON CONFLICT (section) DO UPDATE SET data = $2, updated_at = NOW()
       RETURNING *`,
      [req.params.section, JSON.stringify(data)]
    )
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
