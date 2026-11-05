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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function load(bId, coachId = me?.id, { silent = false } = {}) {
    if (!bId) {
      if (!silent) { setSchedules([]); setSessions([]); setEvents([]); setFields([]) }
      return
    }
    if (!silent) {
      setLoading(true)
      setError('')
    }
    Promise.all([
      api.getSchedules(bId),
      api.getTrainingSessions(undefined, bId),
      api.getEvents(undefined, bId),
      api.getFields(bId),
    ]).then(([sched, sess, evts, flds]) => {
      setSchedules(sched.filter((row) => row.assignedToMe === true && row.status === 'active'))
      setSessions(sess.filter((row) => row.coachId === coachId))
      setEvents(evts.filter((row) => row.assignedToMe === true))
      setFields(flds)
    })
      .catch((err) => {
        // Refresh latar belakang tidak boleh mengosongkan halaman atau
        // menutup form yang sedang diisi Coach.
        if (silent) return
        setError(err.message || 'Gagal memuat jadwal. Coba muat ulang halaman.')
        setSchedules([]); setSessions([]); setEvents([]); setFields([])
      })
      .finally(() => { if (!silent) setLoading(false) })
  }

  useEffect(() => {
    api.getMe().then((user) => {
      setMe(user)
      const first = user.branches?.[0]?.branch?.id || ''
      setBranchId(first)
    })
  }, [])

  useEffect(() => {
    if (!me?.id || !branchId) return
    let active = true
    const refresh = (silent) => {
      if (!active) return
      load(branchId, me.id, { silent })
    }
    refresh(false)
    const interval = setInterval(() => refresh(true), 60000)
    const onFocus = () => refresh(true)
    window.addEventListener('focus', onFocus)
    return () => { active = false; clearInterval(interval); window.removeEventListener('focus', onFocus) }
  }, [me?.id, branchId])

  if (!me) return <div className="glass-card rounded-3xl p-8 text-center text-sm text-gray-400">Memuat jadwal Coach...</div>

  const branchOptions = (me.branches || []).map((b) => ({ value: b.branch.id, label: `${b.branch.name} (${b.branch.code})` }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-bold text-navy-900 text-lg">Jadwal</h1>
        <AppSelect
          value={branchId}
          onChange={setBranchId}
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
      ) : error ? (
        <div className="glass-card rounded-3xl p-8 text-center text-sm text-red-500">{error}</div>
      ) : loading ? (
        <div className="glass-card rounded-3xl p-8 text-center text-sm text-gray-400">Memuat jadwal dan kalender...</div>
      ) : (
        <JadwalCalendar schedules={schedules} sessions={sessions} events={events} fields={fields} canAddTopic branchId={branchId} onChanged={() => load(branchId, me.id, { silent: true })} />
      )}
    </div>
  )
}
