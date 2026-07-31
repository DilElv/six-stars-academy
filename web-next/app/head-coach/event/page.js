'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Loader2, Users, X, MapPin, Calendar, Clock, Wallet, Check, ChevronDown } from 'lucide-react'
import * as api from '@/lib/api'
import { AGE_GROUPS } from '@/lib/ageGroups'
import { AppSelect } from '@/components/ui/app-select'
import { DatePicker } from '@/components/ui/date-picker'

const emptyForm = {
  title: '', description: '', type: 'tournament', ageGroup: '',
  date: '', registrationDeadline: '', location: '', fee: 0,
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
  const [ageGroup, setAgeGroup] = useState('')
  const [selected, setSelected] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [showAddStudent, setShowAddStudent] = useState(false)
  const [students, setStudents] = useState([])
  const [studentFilter, setStudentFilter] = useState('')
  const [addingStudent, setAddingStudent] = useState(false)

  async function load() {
    const [evts, brs] = await Promise.all([api.getEvents('', '', ''), api.getBranches()])
    setEvents(evts)
    setBranches(brs)
  }

  useEffect(() => { load() }, [])

  async function handleCreate(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.createEvent({ ...form })
      setForm(emptyForm)
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
    if (selected?.id === id) setSelected(null)
    load()
  }

  async function openDetail(id) {
    const evt = await api.getEvent(id)
    setSelected(evt)
  }

  async function handleAddStudent(studentId) {
    if (!selected) return
    setAddingStudent(true)
    try {
      await api.addEventParticipant(selected.id, studentId)
      const evt = await api.getEvent(selected.id)
      setSelected(evt)
    } catch (err) {
      setError(err.message)
    } finally {
      setAddingStudent(false)
    }
  }

  async function handleRemoveParticipant(studentId) {
    if (!selected || !confirm('Hapus peserta ini?')) return
    try {
      await api.removeEventParticipant(selected.id, studentId)
      const evt = await api.getEvent(selected.id)
      setSelected(evt)
    } catch (err) {
      setError(err.message)
    }
  }

  async function openAddStudent() {
    setError('')
    try {
      const all = await api.getStudents(studentFilter || '')
      setStudents(all || [])
      setShowAddStudent(true)
    } catch (err) {
      setError('Gagal memuat daftar siswa: ' + err.message)
    }
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
          onClick={() => { setShowForm((v) => !v); setError('') }}
          className="flex items-center gap-1.5 bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold px-4 py-2 rounded-2xl"
        >
          <Plus size={16} /> {showForm ? 'Tutup' : 'Buat Event'}
        </button>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}

      {showForm && (
        <form onSubmit={handleCreate} className="glass-card rounded-3xl p-5 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Judul Event" value={form.title} onChange={(v) => setForm((f) => ({ ...f, title: v }))} required />
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Tipe</label>
              <AppSelect value={form.type} onChange={(v) => setForm((f) => ({ ...f, type: v }))} className="w-full" options={TYPE_OPTIONS} />
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Kelompok Umur</label>
              <MultiSelect
                value={form.ageGroup}
                onChange={(v) => setForm((f) => ({ ...f, ageGroup: v }))}
                placeholder="Pilih Umur"
                options={AGE_GROUPS.map((ag) => ({ value: ag, label: ag }))}
              />
            </div>
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
            <Field label="Biaya Pendaftaran (Rp)" value={form.fee} onChange={(v) => setForm((f) => ({ ...f, fee: Number(v) || 0 }))} type="number" />
          </div>
          <Field label="Deskripsi" value={form.description} onChange={(v) => setForm((f) => ({ ...f, description: v }))} textarea />
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-gold-400 hover:bg-gold-500 text-navy-900 font-semibold text-sm px-4 py-2.5 rounded-2xl disabled:opacity-50"
          >
            {saving && <Loader2 size={14} className="animate-spin" />} Simpan Event
          </button>
        </form>
      )}

      {events.length === 0 ? (
        <div className="glass-card rounded-3xl p-10 text-center text-sm text-gray-400">Belum ada event.</div>
      ) : (
        <div className="space-y-3">
          {events.map((e) => (
            <div
              key={e.id}
              onClick={() => openDetail(e.id)}
              className={`glass-card rounded-3xl p-5 cursor-pointer hover:border-gold-300/50 transition-all duration-200 ${selected?.id === e.id ? 'border-gold-400 ring-1 ring-gold-400/30' : ''}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-bold text-navy-900">{e.title}</span>
                    {eventStatusBadge(e.status)}
                  </div>
                  <div className="text-xs text-gray-400 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(e.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    <span>{e.type}</span>
                    {e.ageGroup && e.ageGroup.split(',').map((ag) => <span key={ag} className="text-xs font-semibold bg-gold-50 text-navy-900 border border-gold-200 px-2 py-0.5 rounded-full">{ag.trim()}</span>)}
                    {e.branch && <span>· {e.branch.name}</span>}
                    <span className="flex items-center gap-1"><Users size={12} /> {e._count?.participants || 0} peserta</span>
                    {e.fee > 0 && <span>· {formatRupiah(e.fee)}</span>}
                  </div>
                </div>
                <button
                  onClick={(ev) => { ev.stopPropagation(); handleDelete(e.id) }}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="glass-card rounded-3xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-navy-900">{selected.title}</h2>
            <button onClick={() => setSelected(null)} className="p-1 text-gray-400 hover:text-navy-700"><X size={16} /></button>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <InfoRow icon={Calendar} label="Tanggal" value={new Date(selected.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} />
            {selected.registrationDeadline && <InfoRow icon={Clock} label="Deadline" value={new Date(selected.registrationDeadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} />}
            {selected.location && <InfoRow icon={MapPin} label="Lokasi" value={selected.location} />}
            {selected.fee > 0 && <InfoRow icon={Wallet} label="Biaya" value={formatRupiah(selected.fee)} />}
            <div className="flex items-center gap-2 text-sm">
              <Users size={14} className="text-gray-400 shrink-0" />
              <span className="text-gray-500">Kelompok Umur:</span>
              {selected.ageGroup ? selected.ageGroup.split(',').map((ag) => (
                <span key={ag} className="text-xs font-semibold bg-gold-50 text-navy-900 border border-gold-200 px-2 py-0.5 rounded-full">{ag.trim()}</span>
              )) : <span className="font-medium text-navy-900">Semua Umur</span>}
            </div>
            <InfoRow icon={Users} label="Tipe" value={selected.type} />
          </div>

          {selected.description && <p className="text-sm text-gray-500">{selected.description}</p>}

          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <h3 className="font-semibold text-navy-900 text-sm flex items-center gap-1.5"><Users size={15} /> Peserta ({selected.participants?.length || 0})</h3>
            <button
              onClick={openAddStudent}
              className="flex items-center gap-1 bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold px-3 py-1.5 rounded-xl"
            >
              <Plus size={13} /> Tambah
            </button>
          </div>

          {selected.participants?.length === 0 ? (
            <div className="text-sm text-gray-400 text-center py-4">Belum ada peserta.</div>
          ) : (
            <div className="space-y-2">
              {selected.participants.map((p) => (
                <div key={p.id} className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-2.5">
                  <div>
                    <div className="text-sm font-semibold text-navy-900">{p.student.fullName}</div>
                    <div className="text-xs text-gray-400">{p.student.studentId} · {p.student.ageGroup} · {p.student.position}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.paymentStatus === 'paid' ? (
                      <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">Lunas</span>
                    ) : (
                      <span className="text-xs text-gray-400">Belum bayar</span>
                    )}
                    <button
                      onClick={() => handleRemoveParticipant(p.student.id)}
                      className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showAddStudent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" onClick={() => setShowAddStudent(false)}>
          <div className="bg-white rounded-3xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-navy-900">Tambah Peserta</h2>
              <button onClick={() => setShowAddStudent(false)} className="p-1 text-gray-400 hover:text-navy-700"><X size={18} /></button>
            </div>
            <div className="mb-3">
              <AppSelect
                value={studentFilter}
                onChange={(v) => { setStudentFilter(v); api.getStudents(v || '').then(setStudents) }}
                allLabel="Semua Umur"
                placeholder="Filter Kelompok Umur"
                options={AGE_GROUPS.map((ag) => ({ value: ag, label: ag }))}
              />
            </div>
            <div className="space-y-2">
              {students.filter((s) => !selected?.participants?.find((p) => p.student.id === s.id)).map((s) => (
                <div key={s.id} className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-2.5">
                  <div>
                    <div className="text-sm font-semibold text-navy-900">{s.fullName}</div>
                    <div className="text-xs text-gray-400">{s.studentId} · {s.ageGroup} · {s.position}</div>
                  </div>
                  <button
                    onClick={() => handleAddStudent(s.id)}
                    disabled={addingStudent}
                    className="flex items-center gap-1 bg-gold-400 hover:bg-gold-500 text-navy-900 text-xs font-semibold px-3 py-1.5 rounded-xl disabled:opacity-50"
                  >
                    {addingStudent ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Tambah
                  </button>
                </div>
              ))}
              {students.length === 0 && <div className="text-sm text-gray-400 text-center py-4">Tidak ada siswa.</div>}
            </div>
          </div>
        </div>
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

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {Icon && <Icon size={14} className="text-gray-400 shrink-0" />}
      <span className="text-gray-500">{label}:</span>
      <span className="font-medium text-navy-900">{value || '-'}</span>
    </div>
  )
}

function MultiSelect({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false)
  const selected = value ? value.split(',').filter(Boolean) : []

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm text-left flex items-center justify-between"
      >
        <span className={selected.length ? 'text-navy-900' : 'text-gray-400'}>
          {selected.length ? selected.join(', ') : placeholder || 'Pilih'}
        </span>
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-2xl shadow-lg p-2 space-y-1">
            {options.map((opt) => {
              const isSelected = selected.includes(opt.value)
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    const next = isSelected ? selected.filter((s) => s !== opt.value) : [...selected, opt.value]
                    onChange(next.join(','))
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${
                    isSelected ? 'bg-gold-50 text-navy-900 font-semibold' : 'hover:bg-gray-50 text-gray-600'
                  }`}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-gold-400 border-gold-400' : 'border-gray-300'
                  }`}>
                    {isSelected && <Check size={10} className="text-navy-900" />}
                  </div>
                  {opt.label}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
