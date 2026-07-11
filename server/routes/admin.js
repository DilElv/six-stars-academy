import { Router } from 'express'
import pool from '../db.js'
import bcrypt from 'bcryptjs'
import { authenticate, authorize } from '../middleware/auth.js'

const router = Router()

router.get('/profiles', authenticate, authorize('admin'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.id, p.email, p.name, p.role, p.avatar, p.created_at,
              c.title as coach_title,
              COALESCE(
                (SELECT json_agg(json_build_object('id', s.id, 'name', s.name, 'phone', s.parent_phone, 'dob', s.date_of_birth, 'age_group_id', s.age_group_id))
                 FROM students s WHERE s.parent_id = p.id), '[]'
              ) as children
       FROM profiles p
       LEFT JOIN coaches c ON c.profile_id = p.id
       ORDER BY p.created_at DESC`
    )
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/profiles', authenticate, authorize('admin'), async (req, res) => {
  const { email, password, name, role, childName, childPhone, childDob, childAddress } = req.body
  try {
    const hashed = await bcrypt.hash(password, 10)
    const result = await pool.query(
      `INSERT INTO profiles (email, password, name, role, avatar) VALUES ($1,$2,$3,$4,$5) RETURNING id, email, name, role, avatar`,
      [email, hashed, name, role, `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(name)}`]
    )
    const profile = result.rows[0]
    if (profile.role === 'coach') {
      await pool.query('INSERT INTO coaches (profile_id, title) VALUES ($1, $2)', [profile.id, req.body.title || 'Coach'])
    }
    if (profile.role === 'parent') {
      const studentName = childName || ('Ananda ' + name.split(' ').slice(-1)[0])
      let defaultAgeGroupId = null
      if (childDob) {
        const birth = new Date(childDob)
        const today = new Date()
        let age = today.getFullYear() - birth.getFullYear()
        const m = today.getMonth() - birth.getMonth()
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
        const agResult = await pool.query('SELECT id FROM age_groups WHERE $1 >= min_age AND $1 <= max_age LIMIT 1', [age])
        if (agResult.rows.length > 0) defaultAgeGroupId = agResult.rows[0].id
      }
      if (!defaultAgeGroupId) {
        const fallback = await pool.query('SELECT id FROM age_groups ORDER BY min_age LIMIT 1')
        defaultAgeGroupId = fallback.rows[0]?.id || null
      }
      await pool.query(
        `INSERT INTO students (name, date_of_birth, address, parent_id, parent_name, parent_phone, avatar, joined_date, age_group_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [studentName, childDob || null, childAddress || '', profile.id, name, childPhone || '', profile.avatar, new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }), defaultAgeGroupId]
      )
    }
    res.status(201).json(profile)
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email sudah terdaftar' })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/profiles/:id', authenticate, authorize('admin'), async (req, res) => {
  const { name, role, password } = req.body
  try {
    let query = 'UPDATE profiles SET name=$1, role=$2'
    const params = [name, role]
    if (password) {
      const hashed = await bcrypt.hash(password, 10)
      query += ', password=$3'
      params.push(hashed)
      params.push(req.params.id)
    } else {
      params.push(req.params.id)
    }
    query += ' WHERE id=$' + params.length + ' RETURNING id, email, name, role, avatar'
    const result = await pool.query(query, params)
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' })
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/students', authenticate, authorize('admin'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, ag.label as age_group_label, pos.label as position_label, pos.singkatan as position_singkatan,
              pr.name as parent_account_name, pr.email as parent_email,
              m.passing, m.dribbling, m.stamina, m.shooting, m.tactics, m.coach_note
       FROM students s
       LEFT JOIN age_groups ag ON s.age_group_id = ag.id
       LEFT JOIN positions pos ON s.position_id = pos.id
       LEFT JOIN profiles pr ON s.parent_id = pr.id
       LEFT JOIN metrics m ON m.student_id = s.id
       ORDER BY s.name ASC`
    )
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/profiles/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM profiles WHERE id = $1', [req.params.id])
    res.json({ message: 'Deleted' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router

