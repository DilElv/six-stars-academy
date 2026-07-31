'use client'

import { useEffect, useMemo, useState } from 'react'
import * as api from '@/lib/api'
import JadwalCalendar from '@/components/JadwalCalendar'
import { format } from 'date-fns'

const ATTENDANCE_DOT = { hadir: 'bg-emerald-500', izin: 'bg-amber-500', sakit: 'bg-blue-500', alfa: 'bg-red-500' }
const ATTENDANCE_LABEL = { hadir: 'Hadir', izin: 'Izin', sakit: 'Sakit', alfa: 'Alfa' }
const ATTENDANCE_BADGE = {
  hadir: 'bg-emerald-50 text-emerald-700',
  izin: 'bg-amber-50 text-amber-700',
  sakit: 'bg-blue-50 text-blue-700',
  alfa: 'bg-red-50 text-red-700',
}

function dateKey(d) {
  return format(d, 'yyyy-MM-dd')
}

export default function JadwalAnakPage() {
  const [student, setStudent] = useState(null)
  const [schedules, setSchedules] = useState([])
  const [sessions, setSessions] = useState([])
  const [events, setEvents] = useState([])
  const [attendance, setAttendance] = useState([])
  const [error, setError] = useState('')

  function load(s) {
    Promise.all([
      api.getSchedules(s.ageGroup, s.branchId),
      api.getTrainingSessions(s.ageGroup, s.branchId),
      api.getMyEvents(),
      api.getMyAttendance(),
    ]).then(([sched, sess, participants, att]) => {
      setSchedules(sched)
      setSessions(sess)
      setEvents(participants.map((p) => p.event))
      setAttendance(att)
    })
  }

  useEffect(() => {
    api.getMyChild()
      .then((s) => { setStudent(s); load(s) })
      .catch((err) => setError(err.message))
  }, [])

  const attendanceByDate = useMemo(() => {
    const map = {}
    for (const a of attendance) map[dateKey(new Date(a.date))] = a.status
    return map
  }, [attendance])

  if (error) return <p className="text-sm text-red-500">{error}</p>
  if (!student) return null

  return (
    <div className="space-y-6">
      <h1 className="font-bold text-navy-900 text-lg">Jadwal Latihan</h1>
      <p className="text-xs text-gray-400 -mt-4">Kelompok umur {student.ageGroup}</p>

      <JadwalCalendar
        schedules={schedules}
        sessions={sessions}
        events={events}
        canAddTopic={false}
        attendanceByDate={attendanceByDate}
        attendanceLegend={
          <div className="flex items-center gap-3 flex-wrap">
            {Object.entries(ATTENDANCE_LABEL).map(([status, label]) => (
              <div key={status} className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${ATTENDANCE_DOT[status]}`} />
                {label}
              </div>
            ))}
          </div>
        }
        renderDateBadge={(date, status) =>
          status ? (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ATTENDANCE_BADGE[status]}`}>
              {ATTENDANCE_LABEL[status]}
            </span>
          ) : null
        }
      />
    </div>
  )
}
