import { Router } from 'express'
import pool from '../db.js'
import { authenticate, authorize } from '../middleware/auth.js'

const router = Router()

router.get('/child', authenticate, authorize('parent'), async (req, res) => {
  try {
    const studentResult = await pool.query(
      `SELECT s.*, ag.label as age_group_label, p.singkatan as position_singkatan, p.label as position_label
       FROM students s
       LEFT JOIN age_groups ag ON s.age_group_id = ag.id
       LEFT JOIN positions p ON s.position_id = p.id
       WHERE s.parent_id = $1
       ORDER BY s.created_at DESC LIMIT 1`,
      [req.user.id]
    )
    if (studentResult.rows.length === 0) return res.json(null)

    const student = studentResult.rows[0]

    const metricsResult = await pool.query(
      `SELECT * FROM metrics WHERE student_id = $1 ORDER BY updated_at DESC LIMIT 1`,
      [student.id]
    )

    const attendanceResult = await pool.query(
      `SELECT COUNT(*) FILTER (WHERE status = 'hadir') as attended,
              COUNT(*) as total
       FROM attendance a
       JOIN sessions s ON a.session_id = s.id
       WHERE a.student_id = $1
       AND s.date >= date_trunc('month', CURRENT_DATE)`,
      [student.id]
    )

    const currentMonth = new Date().toLocaleDateString('id-ID', { month: 'long' })
    const currentYear = new Date().getFullYear()
    const sppResult = await pool.query(
      `SELECT * FROM payments WHERE student_id = $1 AND month = $2 AND year = $3 LIMIT 1`,
      [student.id, currentMonth, currentYear]
    )

    const paymentHistory = await pool.query(
      `SELECT * FROM payments WHERE student_id = $1 ORDER BY year DESC,
       CASE month
         WHEN 'Januari' THEN 1 WHEN 'Februari' THEN 2 WHEN 'Maret' THEN 3 WHEN 'April' THEN 4
         WHEN 'Mei' THEN 5 WHEN 'Juni' THEN 6 WHEN 'Juli' THEN 7 WHEN 'Agustus' THEN 8
         WHEN 'September' THEN 9 WHEN 'Oktober' THEN 10 WHEN 'November' THEN 11 WHEN 'Desember' THEN 12
       END DESC`,
      [student.id]
    )

    const schedulesResult = await pool.query(
      `SELECT sch.*, p.name as coach_name
       FROM schedules sch
       LEFT JOIN coaches c ON sch.coach_id = c.id
       LEFT JOIN profiles p ON c.profile_id = p.id
       WHERE sch.age_group_id = $1
       ORDER BY
         CASE sch.day
           WHEN 'Senin' THEN 1 WHEN 'Selasa' THEN 2 WHEN 'Rabu' THEN 3 WHEN 'Kamis' THEN 4
           WHEN 'Jumat' THEN 5 WHEN 'Sabtu' THEN 6 WHEN 'Minggu' THEN 7
         END`,
      [student.age_group_id]
    )

    const att = attendanceResult.rows[0]
    const totalSessions = parseInt(att.total) || 12
    const attended = parseInt(att.attended) || 0

    res.json({
      student,
      metrics: metricsResult.rows[0] || null,
      attendance: {
        sessionsAttended: attended,
        totalSessions: Math.max(totalSessions, attended),
        percentage: totalSessions > 0 ? Math.round((attended / Math.max(totalSessions, attended)) * 100) : 0,
      },
      spp: sppResult.rows[0] || { status: 'unpaid', amount: 350000, sessionsUsed: 0, sessionsPaid: 8 },
      paymentHistory: paymentHistory.rows,
      schedules: schedulesResult.rows,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

export default router
