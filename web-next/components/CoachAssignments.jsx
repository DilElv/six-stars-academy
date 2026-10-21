'use client'

import { useEffect, useState } from 'react'
import { UserCheck, Loader2, Search, MapPin } from 'lucide-react'
import * as api from '@/lib/api'

export default function CoachAssignments() {
  const [coaches, setCoaches] = useState(null)
  const [branches, setBranches] = useState([])
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([api.getCoachAssignments(), api.getBranches()])
      .then(([c, b]) => { setCoaches(c); setBranches(b) })
      .catch((err) => setError(err.message))
  }, [])

  async function toggle(coach, branchId) {
    const next = coach.branchIds.includes(branchId)
      ? coach.branchIds.filter((id) => id !== branchId)
      : [...coach.branchIds, branchId]
    setSaving(coach.id)
    setError('')
    try {
      await api.updateCoachAssignment(coach.id, next)
      setCoaches((rows) => rows.map((row) => (row.id === coach.id ? { ...row, branchIds: next } : row)))
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving('')
    }
  }

  if (!coaches) return error ? <p className="text-sm text-red-500">{error}</p> : null
  const q = search.trim().toLowerCase()
  const rows = coaches.filter((c) => !q || c.name.toLowerCase().includes(q))

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="font-bold text-navy-900 text-lg flex items-center gap-2"><UserCheck size={18} /> Penugasan Coach</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Coach hanya bisa absen dan melihat anak di cabang yang ditugaskan di sini. Coach tanpa cabang tidak bisa absen sama sekali.
        </p>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}

      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama coach..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-300"
        />
      </div>

      <div className="space-y-3">
        {rows.length === 0 && <p className="text-sm text-gray-400 text-center py-8">Coach tidak ditemukan.</p>}
        {rows.map((coach) => (
          <div key={coach.id} className="glass-card rounded-3xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-navy-100 overflow-hidden flex items-center justify-center text-navy-700 font-bold text-sm shrink-0">
                {coach.photo ? <img src={coach.photo} alt="" className="w-full h-full object-cover" /> : coach.name.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-navy-900 text-sm truncate">{coach.name}</div>
                <div className="text-[11px] text-gray-400 truncate">{coach.email}</div>
              </div>
              {saving === coach.id && <Loader2 size={15} className="animate-spin text-gray-400" />}
              {coach.branchIds.length === 0 && (
                <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Belum ditugaskan</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {branches.map((b) => {
                const on = coach.branchIds.includes(b.id)
                return (
                  <button
                    key={b.id}
                    type="button"
                    disabled={saving === coach.id}
                    onClick={() => toggle(coach, b.id)}
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors disabled:opacity-50 ${
                      on ? 'bg-navy-900 text-white border-navy-900' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <MapPin size={11} /> {b.name}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
