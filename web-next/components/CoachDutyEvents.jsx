'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Trophy, MapPin, Clock, ChevronRight } from 'lucide-react'
import * as api from '@/lib/api'

function dayKey(date) {
  return new Date(date).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
}

/** Event mendatang tempat coach ditugaskan head coach. Absen event tetap hanya di hari-H (kartu absen di atas). */
export default function CoachDutyEvents() {
  const [rows, setRows] = useState(null)

  useEffect(() => {
    api.getEvents()
      .then((list) => {
        const today = dayKey(new Date())
        setRows(
          list
            .filter((e) => e.assignedToMe && e.status === 'open' && dayKey(e.date) >= today)
            .sort((a, b) => new Date(a.date) - new Date(b.date)),
        )
      })
      .catch(() => setRows([]))
  }, [])

  if (!rows || rows.length === 0) return null

  return (
    <div className="glass-card rounded-3xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-500 flex items-center gap-2"><Trophy size={15} className="text-gold-500" /> Event yang Anda Tugasi</h2>
        <Link href="/coach/event" className="text-xs font-semibold text-navy-700 flex items-center gap-0.5">Semua event <ChevronRight size={12} /></Link>
      </div>
      <div className="space-y-2.5">
        {rows.map((e) => {
          const isToday = dayKey(e.date) === dayKey(new Date())
          return (
            <div key={e.id} className="rounded-2xl border border-gray-100 p-3.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="font-semibold text-navy-900 text-sm">{e.title}</div>
                {isToday && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Hari ini — absen di atas</span>}
              </div>
              <div className="mt-1 flex items-center gap-x-4 gap-y-1 flex-wrap text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <Clock size={12} className="text-gold-600" />
                  {new Date(e.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Jakarta' })}
                  {e.startTime ? ` · ${e.startTime}${e.endTime ? `–${e.endTime}` : ''} WIB` : ''}
                </span>
                {e.location && <span className="flex items-center gap-1.5"><MapPin size={12} className="text-gold-600" /> {e.location}</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
