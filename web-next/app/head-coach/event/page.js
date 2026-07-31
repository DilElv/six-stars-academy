'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Trash2, Loader2, Users, Calendar } from 'lucide-react'
import * as api from '@/lib/api'
import { AGE_GROUPS } from '@/lib/ageGroups'
import { AppSelect } from '@/components/ui/app-select'
import { DatePicker } from '@/components/ui/date-picker'
import { RupiahInput } from '@/components/ui/rupiah-input'
import { MultiSelectCheckbox } from '@/components/ui/multi-select-checkbox'
import ModalPortal from '@/components/ui/modal-portal'

const emptyForm = {
  title: '', description: '', type: 'tournament', ageGroups: [],
  date: '', registrationDeadline: '', location: '', fee: 0, branchIds: [], allBranches: true,
}

const TYPE_OPTIONS = [
  { value: 'tournament', label: 'Tournament' },
  { value: 'sparing', label: 'Sparing' },
  { value: 'exhibition', label: 'Exhibition' },
  { value: 'festival', label: 'Festival' },
  { value: 'other', label: 'Lainnya' },
]

function formatRupiah(n) {
  return 'Rp' + (n || 0).toLocaleString('id-ID')
}

export default function HeadCoachEventPage() {
  const [events, setEvents] = useState([])
  const [branches, setBranches] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const [evts, brs] = await Promise.all([api.getEvents('', '', ''), api.getBranches()])
    setEvents(evts)
    setBranches(brs)
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setForm(emptyForm)
    setError('')
    setShowForm(true)
  }

  async function handleCreate(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.createEvent({ ...form, ageGroup: form.ageGroups.join(',') })
      setShowForm(false)
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Hapus event ini?')) return
    await api.deleteEvent(id)
    load()
  }

  function eventStatusBadge(status) {
    const m = { open: 'bg-emerald-50 text-emerald-700 border-emerald-200', closed: 'bg-gray-50 text-gray-600 border-gray-200', completed: 'bg-blue-50 text-blue-700 border-blue-200' }
    return <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${m[status] || m.open}`}>{status}</span>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-bold text-navy-900 text-lg">Event</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold px-4 py-2 rounded-2xl"
        >
          <Plus size={16} /> Buat Event
        </button>
      </div>

      {events.length === 0 ? (
        <div className="glass-card rounded-3xl p-10 text-center text-sm text-gray-400">Belum ada event.</div>
      ) : (
        <div className="space-y-3">
          {events.map((e) => (
            <Link
              key={e.id}
              href={`/head-coach/event/${e.id}`}
              className="glass-card rounded-3xl p-5 flex items-start justify-between gap-4 hover:border-gold-300/50 transition-all duration-200"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-bold text-navy-900">{e.title}</span>
                  {eventStatusBadge(e.status)}
                </div>
                <div className="text-xs text-gray-400 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(e.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  <span>{e.type}</span>
                  {e.ageGroup && e.ageGroup.split(',').map((ag) => <span key={ag} className="text-xs font-semibold bg-gold-50 text-navy-900 border border-gold-200 px-2 py-0.5 rounded-full">{ag.trim()}</span>)}
                  <span>{e.branches?.length ? e.branches.map((b) => b.branch.code).join(', ') : 'Semua Cabang'}</span>
                  <span className="flex items-center gap-1"><Users size={12} /> {e._count?.participants || 0} peserta</span>
                  {e.fee > 0 && <span>· {formatRupiah(e.fee)}</span>}
                </div>
              </div>
              <button
                onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); handleDelete(e.id) }}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg shrink-0"
              >
                <Trash2 size={14} />
              </button>
            </Link>
          ))}
        </div>
      )}

      {showForm && (
        <ModalPortal>
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto modal-scroll" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-bold text-navy-900">Buat Event</h3>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-3">
              {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Judul Event" value={form.title} onChange={(v) => setForm((f) => ({ ...f, title: v }))} required />
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Tipe</label>
                  <AppSelect value={form.type} onChange={(v) => setForm((f) => ({ ...f, type: v }))} className="w-full" options={TYPE_OPTIONS} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-gray-500">Kelompok Umur</label>
                  <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.ageGroups.length === 0}
                      onChange={(e) => setForm((f) => ({ ...f, ageGroups: e.target.checked ? [] : [...AGE_GROUPS] }))}
                    />
                    Semua Umur
                  </label>
                </div>
                {form.ageGroups.length === 0 ? (
                  <p className="text-[11px] text-gray-400">Berlaku untuk semua kelompok umur.</p>
                ) : (
                  <MultiSelectCheckbox
                    options={AGE_GROUPS.map((ag) => ({ value: ag, label: ag }))}
                    values={form.ageGroups}
                    onChange={(vals) => setForm((f) => ({ ...f, ageGroups: vals }))}
                  />
                )}
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-gray-500">Cabang</label>
                  <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.allBranches}
                      onChange={(e) => setForm((f) => ({ ...f, allBranches: e.target.checked, branchIds: e.target.checked ? [] : f.branchIds }))}
                    />
                    Semua Cabang
                  </label>
                </div>
                {form.allBranches ? (
                  <p className="text-[11px] text-gray-400">Berlaku untuk semua cabang.</p>
                ) : (
                  <MultiSelectCheckbox
                    options={branches.map((b) => ({ value: b.id, label: `${b.name} (${b.code})` }))}
                    values={form.branchIds}
                    onChange={(vals) => setForm((f) => ({ ...f, branchIds: vals }))}
                  />
                )}
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Tanggal</label>
                  <DatePicker value={form.date} onChange={(v) => setForm((f) => ({ ...f, date: v }))} className="w-full" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Deadline Pendaftaran</label>
                  <DatePicker value={form.registrationDeadline} onChange={(v) => setForm((f) => ({ ...f, registrationDeadline: v }))} className="w-full" />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Lokasi" value={form.location} onChange={(v) => setForm((f) => ({ ...f, location: v }))} />
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Biaya Pendaftaran (Rp)</label>
                  <RupiahInput value={form.fee} onChange={(n) => setForm((f) => ({ ...f, fee: n }))} className="w-full" />
                </div>
              </div>
              <Field label="Deskripsi" value={form.description} onChange={(v) => setForm((f) => ({ ...f, description: v }))} textarea />
              <button
                type="submit"
                disabled={saving || (!form.allBranches && form.branchIds.length === 0)}
                className="w-full flex items-center justify-center gap-2 bg-navy-900 hover:bg-navy-800 text-white font-semibold py-2.5 rounded-2xl disabled:opacity-50"
              >
                {saving && <Loader2 size={14} className="animate-spin" />} Simpan Event
              </button>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', required, textarea }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm" />
      ) : (
        <input type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm" />
      )}
    </div>
  )
}
