import { Router } from 'express'
import pool from '../db.js'
import { authenticate, authorize } from '../middleware/auth.js'

const router = Router()

router.get('/report', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { session_id, date } = req.query
    let query = `
      SELECT
        ss.id as session_id, ss.date, ss.start_time, ss.end_time, ss.venue,
        ss.coach_check_in, ss.coach_check_in_at,
        sch.day as schedule_day, sch.time as schedule_time, sch.focus,
        ag.label as age_group,
        cp.name as coach_name,
        json_agg(
          json_build_object(
            'attendance_id', a.id,
            'student_id', st.id,
            'student_name', st.name,
            'student_avatar', st.avatar,
            'parent_name', st.parent_name,
            'parent_phone', st.parent_phone,
            'status', a.status,
            'scanned_at', a.scanned_at
          ) ORDER BY st.name
        ) FILTER (WHERE st.id IS NOT NULL) as attendance,
        COUNT(a.id) FILTER (WHERE a.status = 'hadir') as hadir_count,
        COUNT(a.id) FILTER (WHERE a.status = 'izin') as izin_count,
        COUNT(a.id) FILTER (WHERE a.status = 'alfa') as alfa_count
      FROM sessions ss
      JOIN schedules sch ON ss.schedule_id = sch.id
      LEFT JOIN age_groups ag ON sch.age_group_id = ag.id
      LEFT JOIN coaches co ON sch.coach_id = co.id
      LEFT JOIN profiles cp ON co.profile_id = cp.id
      LEFT JOIN attendance a ON a.session_id = ss.id
      LEFT JOIN students st ON a.student_id = st.id
    `
    const params = []
    const conditions = []
    if (session_id) {
      params.push(session_id)
      conditions.push(`ss.id = $${params.length}`)
    }
    if (date) {
      params.push(date)
      conditions.push(`ss.date = $${params.length}`)
    }
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
    }
    query += ' GROUP BY ss.id, ss.date, ss.start_time, ss.end_time, ss.venue, ss.coach_check_in, ss.coach_check_in_at, sch.day, sch.time, sch.focus, ag.label, cp.name ORDER BY ss.date DESC, ss.start_time DESC'
    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/sessions', authenticate, async (req, res) => {
  try {
    let query = `
      SELECT s.*, sch.day, sch.time as schedule_time, sch.venue as schedule_venue, sch.focus,
             p.name as coach_name
      FROM sessions s
      JOIN schedules sch ON s.schedule_id = sch.id
      LEFT JOIN coaches c ON sch.coach_id = c.id
      LEFT JOIN profiles p ON c.profile_id = p.id
      ORDER BY s.date DESC, s.start_time DESC
    `
    const result = await pool.query(query)
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/sessions', authenticate, authorize('coach', 'admin'), async (req, res) => {
  const { schedule_id, date, start_time, end_time, venue } = req.body
  try {
    const result = await pool.query(
      `INSERT INTO sessions (schedule_id, date, start_time, end_time, venue) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [schedule_id, date, start_time, end_time, venue]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/checkin', authenticate, authorize('coach'), async (req, res) => {
  const { session_id } = req.body
  try {
    const result = await pool.query(
      `UPDATE sessions SET coach_check_in=TRUE, coach_check_in_at=NOW() WHERE id=$1 RETURNING *`,
      [session_id]
    )
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.get('/session/:sessionId', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, s.name as student_name, s.avatar as student_avatar
       FROM attendance a
       JOIN students s ON a.student_id = s.id
       WHERE a.session_id = $1`,
      [req.params.sessionId]
    )
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', authenticate, authorize('coach', 'admin'), async (req, res) => {
  const { student_id, session_id, status } = req.body
  try {
    const result = await pool.query(
      `INSERT INTO attendance (student_id, session_id, status)
       VALUES ($1,$2,$3)
       ON CONFLICT (student_id, session_id)
       DO UPDATE SET status = $3, scanned_at = NOW()
       RETURNING *`,
      [student_id, session_id, status]
    )
    res.json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/report', authenticate, authorize('coach', 'admin'), async (req, res) => {
  const { session_id, attendance_map, coach_check_in } = req.body
  try {
    if (session_id && attendance_map) {
      for (const [studentId, status] of Object.entries(attendance_map)) {
        if (status) {
          await pool.query(
            `INSERT INTO attendance (student_id, session_id, status)
             VALUES ($1,$2,$3)
             ON CONFLICT (student_id, session_id)
             DO UPDATE SET status = $3, scanned_at = NOW()`,
            [studentId, session_id, status]
          )
        }
      }
    }
    res.json({ message: 'Report submitted' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
