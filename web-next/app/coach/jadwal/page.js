'use client'

import { useEffect, useState } from 'react'
import * as api from '@/lib/api'
import JadwalCalendar from '@/components/JadwalCalendar'
import { AppSelect } from '@/components/ui/app-select'

export default function CoachJadwalPage() {
  const [me, setMe] = useState(null)
  const [branchId, setBranchId] = useState('')
  const [schedules, setSchedules] = useState([])
  const [sessions, setSessions] = useState([])
  const [events, setEvents] = useState([])
  const [fields, setFields] = useState([])

  function load(bId) {
    if (!bId) {
      setSchedules([]); setSessions([]); setEvents([]); setFields([])
      return
    }
    Promise.all([
      api.getSchedules(bId),
      api.getTrainingSessions(undefined, bId),
      api.getEvents(undefined, bId),
      api.getFields(bId),
    ]).then(([sched, sess, evts, flds]) => {
      setSchedules(sched)
      setSessions(sess)
      setEvents(evts)
      setFields(flds)
    })
  }

  useEffect(() => {
    api.getMe().then((user) => {
      setMe(user)
      const first = user.branches?.[0]?.branch?.id || ''
      setBranchId(first)
      load(first)
    })
  }, [])

  if (!me) return null

  const branchOptions = (me.branches || []).map((b) => ({ value: b.branch.id, label: `${b.branch.name} (${b.branch.code})` }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-bold text-navy-900 text-lg">Jadwal</h1>
        <AppSelect
          value={branchId}
          onChange={(v) => { setBranchId(v); load(v) }}
          placeholder="Pilih cabang..."
          options={branchOptions}
        />
      </div>
      {branchOptions.length === 0 ? (
        <div className="glass-card rounded-3xl p-10 text-center text-sm text-gray-400">
          Anda belum ditugaskan ke cabang manapun. Hubungi admin.
        </div>
      ) : !branchId ? (
        <div className="glass-card rounded-3xl p-10 text-center text-sm text-gray-400">
          Pilih cabang dulu untuk melihat kalender.
        </div>
      ) : (
        <JadwalCalendar schedules={schedules} sessions={sessions} events={events} fields={fields} canAddTopic branchId={branchId} onChanged={() => load(branchId)} />
      )}
    </div>
  )
}
