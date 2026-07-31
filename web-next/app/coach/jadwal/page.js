'use client'

import { useEffect, useState } from 'react'
import * as api from '@/lib/api'
import JadwalCalendar from '@/components/JadwalCalendar'

export default function CoachJadwalPage() {
  const [me, setMe] = useState(null)
  const [schedules, setSchedules] = useState([])
  const [sessions, setSessions] = useState([])
  const [fields, setFields] = useState([])

  function load(user) {
    Promise.all([
      api.getSchedules(undefined, user.branchId),
      api.getTrainingSessions(),
      user.branchId ? api.getFields(user.branchId) : Promise.resolve([]),
    ]).then(([sched, sess, flds]) => {
      setSchedules(sched)
      setSessions(sess)
      setFields(flds)
    })
  }

  useEffect(() => {
    api.getMe().then((user) => { setMe(user); load(user) })
  }, [])

  if (!me) return null

  return (
    <div className="space-y-6">
      <h1 className="font-bold text-navy-900 text-lg">Jadwal</h1>
      <JadwalCalendar schedules={schedules} sessions={sessions} fields={fields} canAddTopic onChanged={() => load(me)} />
    </div>
  )
}
