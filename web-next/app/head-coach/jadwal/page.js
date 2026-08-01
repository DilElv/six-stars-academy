'use client'

import { useEffect, useState } from 'react'
import { Plus, Edit3, Trash2, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import * as api from '@/lib/api'
import { AppSelect } from '@/components/ui/app-select'
import { DatePicker, MultiDatePicker } from '@/components/ui/date-picker'
import JadwalCalendar from '@/components/JadwalCalendar'
import ModalPortal from '@/components/ui/modal-portal'

const emptyForm = { dates: [], startTime: '', endTime: '', location: '', coachId: '', branchId: '' }

export default function HeadCoachJadwalPage() {
  const [tab, setTab] = useState('kalender')
  const [me, setMe] = useState(null)

  const [schedules, setSchedules] = useState([])
  const [sessions, setSessions] = useState([])
  const [events, setEvents] = useState([])
  const [fields, setFields] = useState([])
  const [coaches, setCoaches] = useState([])
  const [branches, setBranches] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editSchedule, setEditSchedule] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function load(user) {
    Promise.all([
      api.getSchedules(user.branchId),
      api.getTrainingSessions(undefined, user.branchId),
      api.getEvents(undefined, user.branchId),
      user.branchId ? api.getFields(user.branchId) : Promise.resolve([]),
      api.getUsers('head_coach'),
      api.getBranches(),
    ]).then(([sched, sess, evts, flds, headCoach, br]) => {
      setSchedules(sched)
      setSessions(sess)
      setEvents(evts)
      setFields(flds)
      setCoaches(headCoach)
      setBranches(br)
    })
  }

  useEffect(() => {
    api.getMe().then((user) => { setMe(user); load(user) })
  }, [])

  function openAdd() {
    setForm({ ...emptyForm, branchId: me?.branchId || '' })
    setEditSchedule(null)
    setShowForm(true)
    setError('')
  }

  function openEdit(s) {
    setForm({
      dates: [format(new Date(s.date), 'yyyy-MM-dd')],
      startTime: s.startTime,
      endTime: s.endTime,
      location: s.location,
      coachId: s.coachId || '',
      branchId: s.branchId || '',
    })
    setEditSchedule(s)
    setShowForm(true)
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (editSchedule) {
        await api.updateSchedule(editSchedule.id, { ...form, date: form.dates[0] })
      } else {
        await api.createSchedule(form)
      }
      setShowForm(false)
      load(me)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Hapus jadwal ini?')) return
    await api.deleteSchedule(id)
    load(me)
  }

  if (!me) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-bold text-navy-900 text-lg">Jadwal</h1>
        <div className="flex items-center gap-1 bg-gray-100 rounded-2xl p-1 w-fit">
          <button onClick={() => setTab('kalender')} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === 'kalender' ? 'bg-white shadow-sm text-navy-900' : 'text-gray-500 hover:text-navy-700'}`}>Kalender</button>
          <button onClick={() => setTab('buat-jadwal')} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === 'buat-jadwal' ? 'bg-white shadow-sm text-navy-900' : 'text-gray-500 hover:text-navy-700'}`}>Buat Jadwal</button>
        </div>
      </div>

      {tab === 'kalender' ? (
        <JadwalCalendar schedules={schedules} sessions={sessions} events={events} fields={fields} canAddTopic onChanged={() => load(me)} />
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={openAdd} className="flex items-center gap-1.5 bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold px-4 py-2 rounded-2xl">
              <Plus size={16} /> Tambah Jadwal
            </button>
          </div>
          <div className="glass-card rounded-3xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Tanggal</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500">Waktu</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500">Lokasi</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500">Head Coach</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {schedules.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500">{format(new Date(s.date), 'd MMM yyyy', { locale: localeId })}</td>
                      <td className="px-3 py-3 text-gray-500">{s.startTime} - {s.endTime}</td>
                      <td className="px-3 py-3 text-gray-500">{s.location}</td>
                      <td className="px-3 py-3 text-gray-500">{s.coach?.name || '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(s)} className="p-1.5 text-gray-400 hover:text-navy-600 hover:bg-gray-100 rounded-lg"><Edit3 size={14} /></button>
                          <button onClick={() => handleDelete(s.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {schedules.length === 0 && <div className="p-10 text-center text-sm text-gray-400">Belum ada jadwal untuk cabang Anda.</div>}
          </div>
        </div>
      )}

      {showForm && (
        <ModalPortal>
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full max-h-[85vh] overflow-y-auto modal-scroll" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-bold text-navy-900">{editSchedule ? 'Edit Jadwal' : 'Tambah Jadwal'}</h3>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-3">
              {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Tanggal{!editSchedule && ' (bisa pilih lebih dari satu)'}</label>
                {editSchedule ? (
                  <DatePicker
                    value={form.dates[0] || ''}
                    onChange={(v) => setForm((f) => ({ ...f, dates: [v] }))}
                    className="w-full"
                  />
                ) : (
                  <MultiDatePicker
                    value={form.dates}
                    onChange={(vals) => setForm((f) => ({ ...f, dates: vals }))}
                    className="w-full"
                  />
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Jam Mulai</label>
                  <input required placeholder="16.00" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Jam Selesai</label>
                  <input required placeholder="18.00" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Lokasi</label>
                <input required value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Head Coach</label>
                <AppSelect
                  value={form.coachId}
                  onChange={(v) => setForm((f) => ({ ...f, coachId: v }))}
                  className="w-full"
                  allLabel="- Belum ditentukan -"
                  placeholder="- Belum ditentukan -"
                  options={coaches.map((c) => ({ value: c.id, label: c.name }))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Cabang</label>
                <AppSelect
                  value={form.branchId}
                  onChange={(v) => setForm((f) => ({ ...f, branchId: v }))}
                  className="w-full"
                  allLabel="- Pilih Cabang -"
                  placeholder="- Pilih Cabang -"
                  options={branches.map((b) => ({ value: b.id, label: `${b.name} (${b.code})` }))}
                />
                <p className="text-[11px] text-gray-400 mt-1">Wajib diisi — jadwal tanpa cabang tidak akan muncul di halaman coach.</p>
              </div>
              <button type="submit" disabled={saving || form.dates.length === 0 || !form.branchId} className="w-full flex items-center justify-center gap-2 bg-navy-900 hover:bg-navy-800 text-white font-semibold py-2.5 rounded-2xl disabled:opacity-50">
                {saving && <Loader2 size={14} className="animate-spin" />} Simpan
              </button>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  )
}
