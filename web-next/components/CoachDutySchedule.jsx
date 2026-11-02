'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CalendarClock, MapPin, Clock, ChevronRight } from 'lucide-react'
import * as api from '@/lib/api'

function dayKey(date) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(date)).map((part) => [part.type, part.value]))
  return `${parts.year}-${parts.month}-${parts.day}`
}

/** Jadwal latihan 7 hari ke depan tempat coach bertugas, lengkap dengan catatan head coach. */
export default function CoachDutySchedule() {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const load = () => api.getSchedules()
      .then((list) => {
        if (!active) return
        setError('')
        setRows(list.filter((s) => s.assignedToMe === true).sort((a, b) => new Date(a.date) - new Date(b.date)))
      })
      .catch((err) => { if (!active) return; setError(err.message || 'Gagal memuat jadwal'); setRows([]) })
    load()
    const interval = setInterval(load, 60000)
    window.addEventListener('focus', load)
    return () => { active = false; clearInterval(interval); window.removeEventListener('focus', load) }
  }, [])

  if (!rows) return <div className="glass-card rounded-3xl p-5 text-sm text-gray-400">Memuat jadwal tugas Anda...</div>

  const monthParts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit' }).formatToParts(new Date()).map((part) => [part.type, part.value]))
  const month = `${monthParts.year}-${monthParts.month}`
  const monthRows = rows.filter((s) => s.status === 'active' && dayKey(s.date).slice(0, 7) === month)
  const monthDays = new Set(monthRows.map((s) => dayKey(s.date))).size
  const today = dayKey(new Date())
  const limit = dayKey(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
  const upcomingRows = rows.filter((s) => s.status === 'active' && dayKey(s.date) >= today && dayKey(s.date) <= limit)

  return (
    <div className="glass-card rounded-3xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-500 flex items-center gap-2"><CalendarClock size={15} className="text-gold-500" /> Jadwal Melatih Anda</h2>
        <Link href="/coach/jadwal" className="text-xs font-semibold text-navy-700 flex items-center gap-0.5">Semua jadwal <ChevronRight size={12} /></Link>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="rounded-xl bg-gray-50 px-3 py-2"><div className="text-lg font-bold text-navy-900 tabular-nums">{monthDays}</div><div className="text-[11px] text-gray-400">Hari melatih bulan ini</div></div>
        <div className="rounded-xl bg-gray-50 px-3 py-2"><div className="text-lg font-bold text-navy-900 tabular-nums">{monthRows.length}</div><div className="text-[11px] text-gray-400">Sesi ditugaskan bulan ini</div></div>
      </div>
      {error ? <div className="py-5 text-center text-sm text-red-500">{error}</div> : upcomingRows.length === 0 ? (
        <div className="py-5 text-center text-sm text-gray-400">Belum ada jadwal latihan yang ditugaskan kepada Anda dalam 7 hari ke depan. Lihat Semua Jadwal untuk jadwal berikutnya.</div>
      ) : <div className="space-y-2.5">
        {upcomingRows.map((s) => (
          <div key={s.id} className="rounded-2xl border border-gray-100 p-3.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="font-semibold text-navy-900 text-sm">
                {new Date(s.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Jakarta' })}
              </div>
              {dayKey(s.date) === dayKey(new Date()) && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Hari ini</span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-x-4 gap-y-1 flex-wrap text-xs text-gray-500">
              <span className="flex items-center gap-1.5"><Clock size={12} className="text-gold-600" /> {s.startTime} - {s.endTime} WIB</span>
              <span className="flex items-center gap-1.5"><MapPin size={12} className="text-gold-600" /> {s.location}</span>
              {s.attendanceSession && (
                <span>Absen {s.attendanceSession.checkInOpen}–{s.attendanceSession.checkInClose}</span>
              )}
            </div>
            {s.coachNote && (
              <div className="mt-2 rounded-xl bg-amber-50 border border-amber-100 text-amber-800 text-xs px-3 py-2 whitespace-pre-line">
                <b>Catatan head coach:</b> {s.coachNote}
              </div>
            )}
          </div>
        ))}
      </div>}
    </div>
  )
}
