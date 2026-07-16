import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import pool from '../db.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

const PACKAGE_PRICES = {
  '1bulan-1sesi': 550000,
  '1bulan-2sesi': 750000,
  '3bulan-1sesi': 1400000,
  '3bulan-2sesi': 2000000,
  '6bulan-1sesi': 2500000,
  '6bulan-2sesi': 3800000,
}
const REG_FEE = 750000
const MONTHS_IND = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

router.post('/register', async (req, res) => {
  const { email, password, name, role, childName, childPhone, childDob, childAddress, childMedicalHistory, packageType } = req.body
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password, dan nama wajib diisi' })
  }
  try {
    const existing = await pool.query('SELECT id FROM profiles WHERE email = $1', [email])
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email sudah terdaftar' })
    }
    const hashed = await bcrypt.hash(password, 10)
    const result = await pool.query(
      `INSERT INTO profiles (email, password, name, role, avatar) VALUES ($1,$2,$3,$4,$5) RETURNING id, email, name, role, avatar`,
      [email, hashed, name, role || 'parent', `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(name)}`]
    )
    const profile = result.rows[0]

    if (profile.role === 'coach') {
      await pool.query('INSERT INTO coaches (profile_id, title) VALUES ($1, $2)', [profile.id, 'Coach'])
    }

    if (profile.role === 'parent') {
      const studentName = childName || ('Ananda ' + name.split(' ').slice(-1)[0])
      const phone = childPhone || '-'
      const dob = childDob || null
      const addr = childAddress || ''
      const pkg = packageType && PACKAGE_PRICES[packageType] ? packageType : ''

      let defaultAgeGroupId = null
      if (dob) {
        const birth = new Date(dob)
        const today = new Date()
        let age = today.getFullYear() - birth.getFullYear()
        const m = today.getMonth() - birth.getMonth()
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
        const agResult = await pool.query(
          'SELECT id FROM age_groups WHERE $1 >= min_age AND $1 <= max_age LIMIT 1',
          [age]
        )
        if (agResult.rows.length > 0) defaultAgeGroupId = agResult.rows[0].id
      }
      if (!defaultAgeGroupId) {
        const fallback = await pool.query('SELECT id FROM age_groups ORDER BY min_age LIMIT 1')
        defaultAgeGroupId = fallback.rows[0]?.id || null
      }

      const studentResult = await pool.query(
        `INSERT INTO students (name, date_of_birth, address, parent_id, parent_name, parent_phone, avatar, joined_date, age_group_id, package_type, medical_history)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
        [
          studentName,
          dob,
          addr,
          profile.id,
          name,
          phone,
          profile.avatar,
          new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
          defaultAgeGroupId,
          pkg,
          childMedicalHistory || '',
        ]
      )
      const studentId = studentResult.rows[0].id

      await pool.query(
        `INSERT INTO metrics (student_id, period, report_type) VALUES ($1, to_char(CURRENT_DATE, 'YYYY-MM-DD'), 'session')`,
        [studentId]
      )

      if (pkg) {
        const now = new Date()
        const totalAmount = PACKAGE_PRICES[pkg] + REG_FEE
        await pool.query(
          `INSERT INTO payments (student_id, month, year, amount, status) VALUES ($1,$2,$3,$4,'unpaid')`,
          [studentId, MONTHS_IND[now.getMonth()], now.getFullYear(), totalAmount]
        )
      }
    }

    const token = jwt.sign({ id: profile.id, email: profile.email, role: profile.role }, process.env.JWT_SECRET, { expiresIn: '7d' })
    res.json({ token, profile })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/profile', authenticate, async (req, res) => {
  const { name, avatar } = req.body
  try {
    const result = await pool.query(
      `UPDATE profiles SET name=COALESCE($1, name), avatar=COALESCE($2, avatar) WHERE id=$3 RETURNING id, email, name, role, avatar`,
      [name || null, avatar || null, req.user.id]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' })
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email dan password wajib diisi' })
  try {
    const result = await pool.query('SELECT * FROM profiles WHERE email = $1', [email])
    if (result.rows.length === 0) return res.status(401).json({ error: 'Email atau password salah' })

    const profile = result.rows[0]
    const valid = await bcrypt.compare(password, profile.password)
    if (!valid) return res.status(401).json({ error: 'Email atau password salah' })

    const token = jwt.sign({ id: profile.id, email: profile.email, role: profile.role }, process.env.JWT_SECRET, { expiresIn: '7d' })
    delete profile.password
    res.json({ token, profile })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/me', async (req, res) => {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
  try {
    const token = header.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const result = await pool.query('SELECT id, email, name, role, avatar FROM profiles WHERE id = $1', [decoded.id])
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' })
    res.json(result.rows[0])
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
})

export default router
