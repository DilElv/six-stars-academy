import { Router } from 'express'
import pool from '../db.js'
import { authenticate, authorize } from '../middleware/auth.js'

const router = Router()

router.get('/', authenticate, authorize('admin', 'parent'), async (req, res) => {
  try {
    let query = `SELECT p.*, s.name as student_name, pr.name as parent_name, pr.email as parent_email
                 FROM payments p
                 JOIN students s ON p.student_id = s.id
                 JOIN profiles pr ON s.parent_id = pr.id`
    const params = []

    if (req.user.role === 'parent') {
      query += ` WHERE s.parent_id = $1`
      params.push(req.user.id)
    }

    query += ` ORDER BY p.year DESC,
      CASE p.month
        WHEN 'Januari' THEN 1 WHEN 'Februari' THEN 2 WHEN 'Maret' THEN 3 WHEN 'April' THEN 4
        WHEN 'Mei' THEN 5 WHEN 'Juni' THEN 6 WHEN 'Juli' THEN 7 WHEN 'Agustus' THEN 8
        WHEN 'September' THEN 9 WHEN 'Oktober' THEN 10 WHEN 'November' THEN 11 WHEN 'Desember' THEN 12
      END DESC`

    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  const { status } = req.body
  try {
    const result = await pool.query(
      `UPDATE payments SET status=$1, paid_at=CASE WHEN $1='paid' THEN NOW() ELSE paid_at END WHERE id=$2 RETURNING *`,
      [status, req.params.id]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Payment not found' })
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/upload-proof', authenticate, authorize('parent'), async (req, res) => {
  const { payment_id, proof_url } = req.body
  try {
    const result = await pool.query(
      `UPDATE payments SET proof_url=$1 WHERE id=$2 AND student_id IN (SELECT id FROM students WHERE parent_id=$3) RETURNING *`,
      [proof_url, payment_id, req.user.id]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Payment not found' })
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
