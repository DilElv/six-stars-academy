'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, ClipboardCheck, ClipboardList, Star, ChevronRight } from 'lucide-react'
import * as api from '@/lib/api'
import { AGE_GROUPS } from '@/lib/ageGroups'

const today = new Date().toISOString().slice(0, 10)

export default function HeadCoachDasborPage() {
  const [totalStudents, setTotalStudents] = useState(null)
  const [hadirToday, setHadirToday] = useState(null)
  const [byGroup, setByGroup] = useState(null)

  useEffect(() => {
    Promise.all(AGE_GROUPS.map((ag) => api.getStudents(ag))).then((results) => {
      const map = {}
      AGE_GROUPS.forEach((ag, i) => { map[ag] = results[i].length })
      setByGroup(map)
      setTotalStudents(results.reduce((sum, r) => sum + r.length, 0))
    })
    Promise.all(AGE_GROUPS.map((ag) => api.getAttendance(today, ag))).then((results) => {
      setHadirToday(results.flat().filter((a) => a.status === 'hadir').length)
    })
  }, [])

  const maxCount = byGroup ? Math.max(1, ...Object.values(byGroup)) : 1

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-navy-900 to-navy-800 p-6">
        <div aria-hidden="true" className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-gold-400/15 blur-[70px]" />
        <div className="relative">
          <h1 className="font-bold text-white text-lg">Dasbor Head Coach</h1>
          <p className="text-sm text-gray-400 mt-1">Ringkasan seluruh kelompok umur hari ini.</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center">
            <Users size={18} className="text-navy-700" />
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-0.5">Total Siswa</div>
            <div className="text-xl font-bold text-navy-900 tabular-nums">{totalStudents ?? '...'}</div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
            <ClipboardCheck size={18} className="text-emerald-600" />
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-0.5">Hadir Hari Ini (semua kelompok)</div>
            <div className="text-xl font-bold text-navy-900 tabular-nums">{hadirToday ?? '...'}</div>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        {[
          { href: '/head-coach/absensi', label: 'Absensi', desc: 'Lihat & koreksi kehadiran', icon: ClipboardList },
          { href: '/head-coach/data-anak', label: 'Data Anak', desc: 'Kelola profil siswa', icon: Users },
          { href: '/head-coach/penilaian', label: 'Penilaian', desc: 'Input skor & rapor', icon: Star },
        ].map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="group flex items-center gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-gold-300 hover:shadow-md transition-all duration-200"
          >
            <div className="w-11 h-11 rounded-xl bg-navy-50 group-hover:bg-navy-900 flex items-center justify-center transition-colors duration-200 shrink-0">
              <a.icon size={18} className="text-navy-700 group-hover:text-gold-400 transition-colors duration-200" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-navy-900">{a.label}</div>
              <div className="text-xs text-gray-400">{a.desc}</div>
            </div>
            <ChevronRight size={16} className="text-gray-300 group-hover:text-gold-500 group-hover:translate-x-1 transition-all duration-200 shrink-0" />
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-500 mb-4">Distribusi Siswa per Kelompok Umur</h2>
        <div className="space-y-3">
          {AGE_GROUPS.map((ag) => {
            const count = byGroup?.[ag] ?? 0
            const pct = byGroup ? Math.round((count / maxCount) * 100) : 0
            return (
              <div key={ag} className="flex items-center gap-3">
                <span className="w-12 shrink-0 text-xs font-bold text-navy-700">{ag}</span>
                <div className="flex-1 h-2.5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-navy-700 to-gold-400 transition-all duration-700 ease-out"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-6 shrink-0 text-xs text-gray-400 text-right tabular-nums">{count}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
