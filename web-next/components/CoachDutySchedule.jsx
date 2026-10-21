'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CalendarClock, MapPin, Clock, ChevronRight } from 'lucide-react'
import * as api from '@/lib/api'

function dayKey(date) {
  return new Date(date).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
}

/** Jadwal latihan 7 hari ke depan tempat coach bertugas, lengkap dengan catatan head coach. */
export default function CoachDutySchedule() {
  const [rows, setRows] = useState(null)

  useEffect(() => {
    api.getSchedules()
      .then((list) => {
        const today = dayKey(new Date())
        const limit = dayKey(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
        setRows(list.filter((s) => s.status === 'active' && s.assignedToMe && dayKey(s.date) >= today && dayKey(s.date) <= limit))
      })
      .catch(() => setRows([]))
  }, [])

  if (!rows || rows.length === 0) return null

  return (
    <div className="glass-card rounded-3xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-500 flex items-center gap-2"><CalendarClock size={15} className="text-gold-500" /> Jadwal Melatih Anda</h2>
        <Link href="/coach/jadwal" className="text-xs font-semibold text-navy-700 flex items-center gap-0.5">Semua jadwal <ChevronRight size={12} /></Link>
      </div>
      <div className="space-y-2.5">
        {rows.map((s) => (
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
      </div>
    </div>
  )
}
