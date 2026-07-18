'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, ClipboardList, BookOpen, ChevronRight } from 'lucide-react'
import * as api from '@/lib/api'
import { AGE_GROUPS } from '@/lib/ageGroups'

const today = new Date().toISOString().slice(0, 10)

export default function CoachDasborPage() {
  const [counts, setCounts] = useState(null)
  const [hadirToday, setHadirToday] = useState(null)

  useEffect(() => {
    Promise.all(AGE_GROUPS.map((ag) => api.getStudents(ag))).then((results) => {
      const map = {}
      AGE_GROUPS.forEach((ag, i) => { map[ag] = results[i].length })
      setCounts(map)
    })
    Promise.all(AGE_GROUPS.map((ag) => api.getAttendance(today, ag))).then((results) => {
      setHadirToday(results.flat().filter((a) => a.status === 'hadir').length)
    })
  }, [])

  const maxCount = counts ? Math.max(1, ...Object.values(counts)) : 1

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy-900 to-navy-800 p-6">
        <div aria-hidden="true" className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-gold-400/15 blur-[70px]" />
        <div className="relative">
          <h1 className="font-bold text-white text-lg">Dasbor Coach</h1>
          <p className="text-sm text-gray-400 mt-1">Pilih kelompok umur untuk mengisi absensi atau topik latihan.</p>
          <div className="flex items-center gap-2 mt-4">
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-400/15 text-emerald-300 border border-emerald-400/25">
              {hadirToday ?? '...'} siswa hadir hari ini
            </span>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Link
          href="/coach/absensi"
          className="group flex items-center gap-4 bg-white rounded-3xl border border-gray-100 shadow-sm p-5 hover:border-gold-300 hover:shadow-md transition-all duration-200"
        >
          <div className="w-11 h-11 rounded-2xl bg-navy-50 group-hover:bg-navy-900 flex items-center justify-center transition-colors duration-200 shrink-0">
            <ClipboardList size={19} className="text-navy-700 group-hover:text-gold-400 transition-colors duration-200" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-navy-900">Absensi</div>
            <div className="text-xs text-gray-400">Catat kehadiran siswa hari ini</div>
          </div>
          <ChevronRight size={16} className="text-gray-300 group-hover:text-gold-500 group-hover:translate-x-1 transition-all duration-200" />
        </Link>
        <Link
          href="/coach/topik-latihan"
          className="group flex items-center gap-4 bg-white rounded-3xl border border-gray-100 shadow-sm p-5 hover:border-gold-300 hover:shadow-md transition-all duration-200"
        >
          <div className="w-11 h-11 rounded-2xl bg-navy-50 group-hover:bg-navy-900 flex items-center justify-center transition-colors duration-200 shrink-0">
            <BookOpen size={19} className="text-navy-700 group-hover:text-gold-400 transition-colors duration-200" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-navy-900">Topik Latihan</div>
            <div className="text-xs text-gray-400">Susun materi sesi latihan</div>
          </div>
          <ChevronRight size={16} className="text-gray-300 group-hover:text-gold-500 group-hover:translate-x-1 transition-all duration-200" />
        </Link>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-500 mb-3">Kelompok Umur</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {AGE_GROUPS.map((ag) => {
            const count = counts?.[ag] ?? 0
            const pct = counts ? Math.round((count / maxCount) * 100) : 0
            return (
              <Link
                key={ag}
                href={`/coach/absensi?ageGroup=${ag}`}
                className="group relative overflow-hidden bg-white rounded-3xl border border-gray-100 shadow-sm p-5 hover:border-gold-300 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
              >
                <span
                  aria-hidden="true"
                  className="absolute -bottom-4 -right-2 font-extrabold text-7xl text-navy-900/[0.04] leading-none select-none group-hover:text-gold-400/10 transition-colors duration-300"
                >
                  {ag.replace('U-', '')}
                </span>
                <div className="relative">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-2xl bg-navy-50 flex items-center justify-center">
                      <Users size={16} className="text-navy-700" />
                    </div>
                    <div className="font-bold text-navy-900">{ag}</div>
                  </div>
                  <div className="text-sm text-gray-400 mb-2">{counts ? `${count} siswa` : '...'}</div>
                  <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-gold-400 to-gold-500 transition-all duration-700 ease-out"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
