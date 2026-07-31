'use client'

import { useEffect, useState } from 'react'
import { Users, Calendar, MapPin, Wallet, X, Loader2, Check } from 'lucide-react'
import * as api from '@/lib/api'
import { AppSelect } from '@/components/ui/app-select'

function formatRupiah(n) {
  return 'Rp' + (n || 0).toLocaleString('id-ID')
}

export default function AdminEventPage() {
  const [events, setEvents] = useState([])
  const [branches, setBranches] = useState([])
  const [branchFilter, setBranchFilter] = useState('')
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(null)

  async function load() {
    const [evts, brs] = await Promise.all([api.getEvents('', branchFilter), api.getBranches()])
    setEvents(evts)
    setBranches(brs)
  }

  useEffect(() => { load() }, [branchFilter])

  async function openDetail(id) {
    const evt = await api.getEvent(id)
    setSelected(evt)
  }

  async function handleConfirmPayment(studentId) {
    if (!selected) return
    setConfirming(studentId)
    try {
      await api.updateEventParticipant(selected.id, studentId, { paymentStatus: 'paid' })
      const evt = await api.getEvent(selected.id)
      setSelected(evt)
    } catch (err) {
      console.error(err)
    } finally {
      setConfirming(null)
    }
  }

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
            <div
              key={e.id}
              onClick={() => openDetail(e.id)}
              className="glass-card rounded-3xl p-5 cursor-pointer hover:border-gold-300/50 transition-all duration-200 flex items-center justify-between gap-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-navy-900">{e.title}</span>
                  {statusBadge(e.status)}
                  {e.branch && <span className="text-xs text-gray-400">({e.branch.name})</span>}
                </div>
                <div className="text-xs text-gray-400 flex flex-wrap gap-x-3 gap-y-1">
                  <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(e.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                  <span>{e.type}</span>
                  {e.ageGroup && e.ageGroup.split(',').map((ag) => <span key={ag} className="text-xs font-semibold bg-gold-50 text-navy-900 border border-gold-200 px-2 py-0.5 rounded-full">{ag.trim()}</span>)}
                  <span>· {e._count?.participants || 0} peserta</span>
                  {e.fee > 0 && <span>· {formatRupiah(e.fee)}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-3xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-navy-900">{selected.title}</h2>
              <button onClick={() => setSelected(null)} className="p-1 text-gray-400 hover:text-navy-700"><X size={18} /></button>
            </div>

            <div className="space-y-2 text-sm mb-4">
              <Info icon={Calendar} label="Tanggal" value={new Date(selected.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} />
              <Info icon={Users} label="Tipe" value={selected.type} />
              <div className="flex items-center gap-2 text-sm">
                <Users size={14} className="text-gray-400 shrink-0" />
                <span className="text-gray-500">Kelompok Umur:</span>
                {selected.ageGroup ? selected.ageGroup.split(',').map((ag) => (
                  <span key={ag} className="text-xs font-semibold bg-gold-50 text-navy-900 border border-gold-200 px-2 py-0.5 rounded-full">{ag.trim()}</span>
                )) : <span className="font-medium text-navy-900">Semua</span>}
              </div>
              {selected.location && <Info icon={MapPin} label="Lokasi" value={selected.location} />}
              {selected.fee > 0 && <Info icon={Wallet} label="Biaya" value={formatRupiah(selected.fee)} />}
            </div>

            <h3 className="font-semibold text-navy-900 text-sm mb-2 flex items-center gap-1.5"><Users size={15} /> Peserta ({selected.participants?.length || 0})</h3>
            {selected.participants?.length === 0 ? (
              <div className="text-sm text-gray-400 text-center py-4">Belum ada peserta.</div>
            ) : (
              <div className="space-y-2">
                {selected.participants.map((p) => (
                  <div key={p.id} className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-2.5">
                    <div>
                      <div className="text-sm font-semibold text-navy-900">{p.student.fullName}</div>
                      <div className="text-xs text-gray-400">{p.student.studentId} · {p.student.ageGroup} · {p.student.parentName}</div>
                    </div>
                    {p.paymentStatus === 'paid' ? (
                      <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1"><Check size={11} /> Lunas</span>
                    ) : (
                      <button
                        onClick={() => handleConfirmPayment(p.student.id)}
                        disabled={confirming === p.student.id}
                        className="flex items-center gap-1 bg-gold-400 hover:bg-gold-500 text-navy-900 text-xs font-semibold px-3 py-1.5 rounded-xl disabled:opacity-50"
                      >
                        {confirming === p.student.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Konfirmasi Bayar
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Info({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {Icon && <Icon size={14} className="text-gray-400 shrink-0" />}
      <span className="text-gray-500">{label}:</span>
      <span className="font-medium text-navy-900">{value || '-'}</span>
    </div>
  )
}
