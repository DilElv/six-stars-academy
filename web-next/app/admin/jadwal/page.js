'use client'

import { useEffect, useState } from 'react'
import { Plus, Edit3, Trash2, Loader2 } from 'lucide-react'
import * as api from '@/lib/api'
import { AGE_GROUPS } from '@/lib/ageGroups'

const emptyForm = { ageGroup: AGE_GROUPS[0], day: '', startTime: '', endTime: '', location: '', coachId: '' }

export default function AdminJadwalPage() {
  const [schedules, setSchedules] = useState([])
  const [coaches, setCoaches] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editSchedule, setEditSchedule] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function load() {
    setLoading(true)
    Promise.all([api.getSchedules(), api.getUsers('coach'), api.getUsers('head_coach')])
      .then(([sched, coach, headCoach]) => {
        setSchedules(sched)
        setCoaches([...headCoach, ...coach])
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  function openAdd() {
    setForm(emptyForm)
    setEditSchedule(null)
    setShowForm(true)
  }

  function openEdit(s) {
    setForm({ ageGroup: s.ageGroup, day: s.day, startTime: s.startTime, endTime: s.endTime, location: s.location, coachId: s.coachId || '' })
    setEditSchedule(s)
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (editSchedule) await api.updateSchedule(editSchedule.id, form)
      else await api.createSchedule(form)
      setShowForm(false)
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Hapus jadwal ini?')) return
    await api.deleteSchedule(id)
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-navy-900 text-lg">Jadwal Latihan</h1>
        <button onClick={openAdd} className="flex items-center gap-1.5 bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold px-4 py-2 rounded-xl">
          <Plus size={16} /> Tambah Jadwal
        </button>
      </div>

      {loading ? null : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Kelompok</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500">Hari</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500">Waktu</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500">Lokasi</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500">Coach</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {schedules.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-navy-900">{s.ageGroup}</td>
                  <td className="px-3 py-3 text-gray-500">{s.day}</td>
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
          {schedules.length === 0 && <div className="p-10 text-center text-sm text-gray-400">Belum ada jadwal.</div>}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-bold text-navy-900">{editSchedule ? 'Edit Jadwal' : 'Tambah Jadwal'}</h3>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-3">
              {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Kelompok Umur</label>
                <select value={form.ageGroup} onChange={(e) => setForm((f) => ({ ...f, ageGroup: e.target.value }))} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm">
                  {AGE_GROUPS.map((ag) => <option key={ag} value={ag}>{ag}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Hari</label>
                <input required placeholder="mis. Senin & Rabu" value={form.day} onChange={(e) => setForm((f) => ({ ...f, day: e.target.value }))} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Jam Mulai</label>
                  <input required placeholder="16.00" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Jam Selesai</label>
                  <input required placeholder="18.00" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Lokasi</label>
                <input required value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Coach</label>
                <select value={form.coachId} onChange={(e) => setForm((f) => ({ ...f, coachId: e.target.value }))} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm">
                  <option value="">- Belum ditentukan -</option>
                  {coaches.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.role === 'head_coach' ? 'Head Coach' : 'Coach'})</option>)}
                </select>
              </div>
              <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 bg-navy-900 hover:bg-navy-800 text-white font-semibold py-2.5 rounded-xl disabled:opacity-50">
                {saving && <Loader2 size={14} className="animate-spin" />} Simpan
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
