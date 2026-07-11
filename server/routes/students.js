import { Router } from 'express'
import pool from '../db.js'
import { authenticate, authorize } from '../middleware/auth.js'

const router = Router()

router.get('/', authenticate, async (req, res) => {
  try {
    let query = `
      SELECT s.*, ag.label as age_group_label, p.singkatan as position_singkatan, p.label as position_label
      FROM students s
      LEFT JOIN age_groups ag ON s.age_group_id = ag.id
      LEFT JOIN positions p ON s.position_id = p.id
    `
    const params = []

    if (req.user.role === 'parent') {
      query += ' WHERE s.parent_id = $1'
      params.push(req.user.id)
    }

    query += ' ORDER BY s.name ASC'
    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/lookup/:code', authenticate, authorize('coach', 'admin'), async (req, res) => {
  try {
    const code = req.params.code.trim()
    let result = await pool.query(
      `SELECT s.*, ag.label as age_group_label, p.singkatan as position_singkatan, p.label as position_label
       FROM students s
       LEFT JOIN age_groups ag ON s.age_group_id = ag.id
       LEFT JOIN positions p ON s.position_id = p.id
       WHERE s.id::text = $1 OR LOWER(s.name) = LOWER($2)`,
      [code, code]
    )
    if (result.rows.length === 0) {
      result = await pool.query(
        `SELECT s.*, ag.label as age_group_label, p.singkatan as position_singkatan, p.label as position_label
         FROM students s
         LEFT JOIN age_groups ag ON s.age_group_id = ag.id
         LEFT JOIN positions p ON s.position_id = p.id
         WHERE s.id::text LIKE $1 OR s.name ILIKE $2`,
        [code + '%', '%' + code + '%']
      )
    }
    if (result.rows.length === 0) return res.status(404).json({ error: 'Siswa tidak ditemukan' })
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, ag.label as age_group_label, p.singkatan as position_singkatan, p.label as position_label
       FROM students s
       LEFT JOIN age_groups ag ON s.age_group_id = ag.id
       LEFT JOIN positions p ON s.position_id = p.id
       WHERE s.id = $1`,
      [req.params.id]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Student not found' })
    if (req.user.role === 'parent' && result.rows[0].parent_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', authenticate, authorize('coach', 'admin'), async (req, res) => {
  const { name, date_of_birth, birth_place, address, parent_name, parent_phone, age_group_id, position_id, avatar } = req.body
  try {
    const result = await pool.query(
      `INSERT INTO students (name, date_of_birth, birth_place, address, parent_name, parent_phone, age_group_id, position_id, avatar, joined_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        name, date_of_birth, birth_place, address, parent_name, parent_phone,
        age_group_id, position_id,
        avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
        new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
      ]
    )
    const student = result.rows[0]

    await pool.query(
      `INSERT INTO metrics (student_id) VALUES ($1)`,
      [student.id]
    )

    const currentYear = new Date().getFullYear()
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
    for (let i = 0; i < 6; i++) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      await pool.query(
        `INSERT INTO payments (student_id, month, year, amount, status) VALUES ($1,$2,$3,$4,'unpaid')
         ON CONFLICT DO NOTHING`,
        [student.id, months[d.getMonth()], d.getFullYear(), 350000]
      )
    }

    res.status(201).json(student)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:id', authenticate, authorize('coach', 'admin'), async (req, res) => {
  const { name, date_of_birth, birth_place, address, parent_name, parent_phone, age_group_id, position_id } = req.body
  try {
    const result = await pool.query(
      `UPDATE students SET name=$1, date_of_birth=$2, birth_place=$3, address=$4, parent_name=$5, parent_phone=$6, age_group_id=$7, position_id=$8, updated_at=NOW()
       WHERE id=$9 RETURNING *`,
      [name, date_of_birth, birth_place, address, parent_name, parent_phone, age_group_id, position_id, req.params.id]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Student not found' })
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:id', authenticate, authorize('coach', 'admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM students WHERE id = $1', [req.params.id])
    res.json({ message: 'Deleted' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
