'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, Calendar } from 'lucide-react'
import * as api from '@/lib/api'
import { AppSelect } from '@/components/ui/app-select'

function formatRupiah(n) {
  return 'Rp' + (n || 0).toLocaleString('id-ID')
}

export default function AdminEventPage() {
  const [events, setEvents] = useState([])
  const [branches, setBranches] = useState([])
  const [branchFilter, setBranchFilter] = useState('')
  const [loading, setLoading] = useState(true)

  async function load() {
    const [evts, brs] = await Promise.all([api.getEvents('', branchFilter), api.getBranches()])
    setEvents(evts)
    setBranches(brs)
    setLoading(false)
  }

  useEffect(() => { load() }, [branchFilter])

  function statusBadge(s) {
    const m = { open: 'bg-emerald-50 text-emerald-700 border-emerald-200', closed: 'bg-gray-50 text-gray-600 border-gray-200', completed: 'bg-blue-50 text-blue-700 border-blue-200' }
    return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${m[s] || ''}`}>{s}</span>
  }

  if (loading) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-bold text-navy-900 text-lg">Event</h1>
        <AppSelect
          value={branchFilter}
          onChange={setBranchFilter}
          className="w-44"
          allLabel="Semua Cabang"
          placeholder="Filter Cabang"
          options={branches.map((b) => ({ value: b.id, label: `${b.name} (${b.code})` }))}
        />
      </div>

      {events.length === 0 ? (
        <div className="glass-card rounded-3xl p-10 text-center text-sm text-gray-400">Belum ada event.</div>
      ) : (
        <div className="space-y-3">
          {events.map((e) => (
            <Link
              key={e.id}
              href={`/admin/event/${e.id}`}
              className="glass-card rounded-3xl p-5 hover:border-gold-300/50 transition-all duration-200 flex items-center justify-between gap-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-navy-900">{e.title}</span>
                  {statusBadge(e.status)}
                  <span className="text-xs text-gray-400">({e.branches?.length ? e.branches.map((b) => b.branch.code).join(', ') : 'Semua Cabang'})</span>
                </div>
                <div className="text-xs text-gray-400 flex flex-wrap gap-x-3 gap-y-1">
                  <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(e.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                  <span>{e.type}</span>
                  {e.ageGroup && e.ageGroup.split(',').map((ag) => <span key={ag} className="text-xs font-semibold bg-gold-50 text-navy-900 border border-gold-200 px-2 py-0.5 rounded-full">{ag.trim()}</span>)}
                  <span className="flex items-center gap-1"><Users size={12} /> {e._count?.participants || 0} peserta</span>
                  {e.fee > 0 && <span>· {formatRupiah(e.fee)}</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
