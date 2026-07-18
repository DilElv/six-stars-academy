'use client'

import { useEffect, useState } from 'react'
import { UserCheck, Loader2, CheckCircle2 } from 'lucide-react'
import * as api from '@/lib/api'

export default function StaffCheckinCard() {
  const [record, setRecord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)

  function load() {
    api.getMyStaffAttendance().then(setRecord).finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function handleCheckin() {
    setChecking(true)
    try {
      const r = await api.checkinStaff()
      setRecord(r)
    } finally {
      setChecking(false)
    }
  }

  if (loading) return null

  if (record) {
    return (
      <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-3xl px-5 py-4">
        <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
        <div className="text-sm text-emerald-800">
          Anda sudah check-in hari ini pukul{' '}
          <b>{new Date(record.checkInTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</b>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-3 bg-white border border-gray-100 shadow-sm rounded-3xl px-5 py-4">
      <div className="flex items-center gap-3">
        <UserCheck size={20} className="text-navy-700 shrink-0" />
        <div className="text-sm text-navy-800">Anda belum absen hari ini.</div>
      </div>
      <button
        onClick={handleCheckin}
        disabled={checking}
        className="flex items-center gap-1.5 bg-gold-400 hover:bg-gold-500 text-navy-900 text-sm font-semibold px-4 py-2 rounded-2xl disabled:opacity-50 shrink-0"
      >
        {checking ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />}
        Saya Hadir Hari Ini
      </button>
    </div>
  )
}
