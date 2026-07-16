import { Router } from 'express'
import pool from '../db.js'
import { authenticate, authorize } from '../middleware/auth.js'

const router = Router()

router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, p.email, p.name, p.avatar, p.role
       FROM coaches c JOIN profiles p ON c.profile_id = p.id
       ORDER BY p.name ASC`
    )
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/profile', authenticate, authorize('coach'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, p.email, p.name, p.avatar
       FROM coaches c JOIN profiles p ON c.profile_id = p.id
       WHERE c.profile_id = $1`,
      [req.user.id]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Coach not found' })
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/profile', authenticate, authorize('coach'), async (req, res) => {
  const { title, phone, avatar } = req.body
  try {
    await pool.query(
      `UPDATE coaches SET title=$1, phone=$2 WHERE profile_id=$3`,
      [title, phone, req.user.id]
    )
    if (avatar) {
      await pool.query(
        `UPDATE profiles SET avatar=$1 WHERE id=$2`,
        [avatar, req.user.id]
      )
    }
    const result = await pool.query(
      `SELECT c.*, p.email, p.name, p.avatar
       FROM coaches c JOIN profiles p ON c.profile_id = p.id
       WHERE c.profile_id = $1`,
      [req.user.id]
    )
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
