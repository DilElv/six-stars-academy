'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Users, ClipboardList, BookOpen, ChevronRight, ChevronDown, Loader2,
  UserCheck, CalendarClock, Trophy, MapPin,
} from 'lucide-react'
import * as api from '@/lib/api'
import { AGE_GROUPS } from '@/lib/ageGroups'
import AgeGroupBarChart from '@/components/charts/AgeGroupBarChart'
import AttendanceTrendChart from '@/components/charts/AttendanceTrendChart'

function StatusChip({ label, value, color }) {
  return (
    <div className="flex-1 min-w-[84px] glass-card rounded-2xl p-3 text-center">
      <div className="text-lg font-bold tabular-nums" style={{ color }}>{value}</div>
      <div className="text-[11px] text-gray-400 mt-0.5">{label}</div>
    </div>
  )
}

export default function CoachDasborPage() {
  const [summary, setSummary] = useState(null)
  const [loadingSummary, setLoadingSummary] = useState(true)

  const [expanded, setExpanded] = useState(false)
  const [loadingCounts, setLoadingCounts] = useState(false)
  const [counts, setCounts] = useState(null)

  const [sessions, setSessions] = useState(null)
  const [events, setEvents] = useState(null)

  useEffect(() => {
    api.getAttendanceSummary()
      .then(setSummary)
      .finally(() => setLoadingSummary(false))
    api.getTrainingSessions().then((rows) => setSessions(rows.slice(0, 3)))
    api.getEvents(undefined, undefined, 'open').then((rows) => setEvents(rows.slice(0, 3)))
  }, [])

  function handleExpand() {
    if (expanded) {
      setExpanded(false)
      return
    }
    setExpanded(true)
    if (counts) return
    setLoadingCounts(true)
    Promise.all(AGE_GROUPS.map((ag) => api.getStudents(ag)))
      .then((results) => {
        const map = {}
        AGE_GROUPS.forEach((ag, i) => { map[ag] = results[i].length })
        setCounts(map)
      })
      .finally(() => setLoadingCounts(false))
  }

  const chartData = counts ? AGE_GROUPS.map((ag) => ({ ageGroup: ag, count: counts[ag] ?? 0 })) : []

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy-900 to-navy-800 p-6">
        <div aria-hidden="true" className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-gold-400/15 blur-[70px]" />
        <div className="relative">
          <h1 className="font-bold text-white text-lg">Dasbor Coach</h1>
          <p className="text-sm text-gray-400 mt-1">Pilih kelompok umur untuk mengisi absensi atau topik latihan.</p>
          <div className="flex items-center gap-2 mt-4">
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-400/15 text-emerald-300 border border-emerald-400/25">
              {loadingSummary ? '...' : summary?.today?.hadir ?? 0} siswa hadir hari ini
            </span>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-3xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-500">Tren Absensi 7 Hari Terakhir</h2>
        </div>
        {loadingSummary ? (
          <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm gap-2">
            <Loader2 size={16} className="animate-spin" /> Memuat data...
          </div>
        ) : (
          <>
            <AttendanceTrendChart data={summary?.trend ?? []} />
            <div className="flex flex-wrap gap-2 mt-4">
              <StatusChip label="Hadir" value={summary?.today?.hadir ?? 0} color="#10b981" />
              <StatusChip label="Izin" value={summary?.today?.izin ?? 0} color="#d4a843" />
              <StatusChip label="Sakit" value={summary?.today?.sakit ?? 0} color="#3b82f6" />
              <StatusChip label="Alfa" value={summary?.today?.alfa ?? 0} color="#ef4444" />
              <StatusChip label="Belum" value={summary?.today?.belum ?? 0} color="#9ca3af" />
            </div>
          </>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Link
          href="/coach/absensi"
          className="group flex items-center gap-4 glass-card rounded-3xl p-5 hover:border-gold-300 hover:shadow-md transition-all duration-200"
        >
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-navy-600 to-navy-800 shadow-md shadow-navy-900/25 flex items-center justify-center transition-shadow duration-200 shrink-0">
            <ClipboardList size={19} className="text-gold-300" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-navy-900">Absensi</div>
            <div className="text-xs text-gray-400">Catat kehadiran siswa hari ini</div>
          </div>
          <ChevronRight size={16} className="text-gray-300 group-hover:text-gold-500 group-hover:translate-x-1 transition-all duration-200" />
        </Link>
        <Link
          href="/coach/jadwal"
          className="group flex items-center gap-4 glass-card rounded-3xl p-5 hover:border-gold-300 hover:shadow-md transition-all duration-200"
        >
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-navy-600 to-navy-800 shadow-md shadow-navy-900/25 flex items-center justify-center transition-shadow duration-200 shrink-0">
            <CalendarClock size={19} className="text-gold-300" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-navy-900">Jadwal</div>
            <div className="text-xs text-gray-400">Kalender latihan & topik hari ini</div>
          </div>
          <ChevronRight size={16} className="text-gray-300 group-hover:text-gold-500 group-hover:translate-x-1 transition-all duration-200" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="glass-card rounded-3xl p-3.5 sm:p-5 flex items-center gap-3 sm:gap-4">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-navy-600 to-navy-800 shadow-md shadow-navy-900/25 flex items-center justify-center shrink-0">
            <Users size={16} className="text-gold-300" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] sm:text-xs text-gray-400 mb-0.5">Total Siswa Cabang</div>
            <div className="text-lg sm:text-xl font-bold text-navy-900 tabular-nums">{loadingSummary ? '...' : summary?.totalStudents ?? 0}</div>
          </div>
        </div>
        <div className="glass-card rounded-3xl p-3.5 sm:p-5 flex items-center gap-3 sm:gap-4">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-md shadow-emerald-500/25 flex items-center justify-center shrink-0">
            <UserCheck size={16} className="text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] sm:text-xs text-gray-400 mb-0.5">Belum Absen Hari Ini</div>
            <div className="text-lg sm:text-xl font-bold text-navy-900 tabular-nums">{loadingSummary ? '...' : summary?.today?.belum ?? 0}</div>
          </div>
        </div>
      </div>

      {!expanded && (
        <button
          onClick={handleExpand}
          className="group w-full flex items-center gap-4 glass-card rounded-3xl p-5 hover:border-gold-300 hover:shadow-md transition-all duration-200 text-left"
        >
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-navy-600 to-navy-800 shadow-md shadow-navy-900/25 flex items-center justify-center transition-shadow duration-200 shrink-0">
            <Users size={19} className="text-gold-300" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-navy-900">Distribusi Siswa per Kelompok Umur</div>
            <div className="text-xs text-gray-400">Lihat jumlah siswa per kelompok umur</div>
          </div>
          {loadingCounts ? (
            <Loader2 size={16} className="animate-spin text-gray-300" />
          ) : (
            <ChevronDown size={16} className="text-gray-300 group-hover:text-gold-500 transition-all duration-200" />
          )}
        </button>
      )}

      {expanded && (
        <div className="glass-card rounded-3xl p-6">
          <button
            onClick={handleExpand}
            className="w-full flex items-center justify-between gap-3 mb-4 group"
          >
            <h2 className="text-sm font-semibold text-gray-500">Distribusi Siswa per Kelompok Umur</h2>
            <ChevronDown size={16} className="text-gray-300 group-hover:text-gold-500 rotate-180 transition-all duration-200" />
          </button>

          {loadingCounts ? (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm gap-2">
              <Loader2 size={16} className="animate-spin" /> Memuat data kelompok umur...
            </div>
          ) : (
            <>
              <AgeGroupBarChart data={chartData} />
              <div className="flex flex-wrap gap-2 mt-4">
                {AGE_GROUPS.map((ag) => (
                  <Link
                    key={ag}
                    href={`/coach/absensi?ageGroup=${ag}`}
                    className="text-xs font-semibold px-3 py-1.5 rounded-full bg-gray-50 hover:bg-gold-50 text-navy-600 hover:text-gold-700 border border-gray-100 hover:border-gold-200 transition-colors duration-150"
                  >
                    {ag} &middot; {counts?.[ag] ?? 0}
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="glass-card rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-500">Topik Latihan Terbaru</h2>
            <Link href="/coach/jadwal" className="text-xs font-semibold text-gold-600 hover:text-gold-700">Lihat semua</Link>
          </div>
          {sessions === null ? (
            <div className="flex items-center justify-center py-8 text-gray-400 text-sm gap-2">
              <Loader2 size={16} className="animate-spin" /> Memuat...
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">Belum ada topik latihan dibuat.</div>
          ) : (
            <div className="space-y-3">
              {sessions.map((s) => (
                <div key={s.id} className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-navy-50 flex items-center justify-center shrink-0">
                    <BookOpen size={15} className="text-navy-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-navy-900 text-sm truncate">{s.topicTitle}</div>
                    <div className="text-xs text-gray-400">
                      {s.ageGroup} &middot; {new Date(s.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-card rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-500">Event Mendatang</h2>
            <Link href="/coach/event" className="text-xs font-semibold text-gold-600 hover:text-gold-700">Lihat semua</Link>
          </div>
          {events === null ? (
            <div className="flex items-center justify-center py-8 text-gray-400 text-sm gap-2">
              <Loader2 size={16} className="animate-spin" /> Memuat...
            </div>
          ) : events.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">Belum ada event yang dibuka.</div>
          ) : (
            <div className="space-y-3">
              {events.map((e) => (
                <div key={e.id} className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gold-50 flex items-center justify-center shrink-0">
                    <Trophy size={15} className="text-gold-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-navy-900 text-sm truncate">{e.title}</div>
                    <div className="text-xs text-gray-400 flex items-center gap-1 flex-wrap">
                      <CalendarClock size={11} />
                      {new Date(e.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {e.location && (
                        <>
                          <span>&middot;</span>
                          <MapPin size={11} /> {e.location}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
