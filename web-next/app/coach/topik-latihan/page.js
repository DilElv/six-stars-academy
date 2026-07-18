'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import * as api from '@/lib/api'
import { AGE_GROUPS } from '@/lib/ageGroups'

const emptyForm = { ageGroup: AGE_GROUPS[0], date: new Date().toISOString().slice(0, 10), topicTitle: '', topicDescription: '', objective: '', duration: '', equipment: '' }

export default function TopikLatihanPage() {
  const [ageGroup, setAgeGroup] = useState(AGE_GROUPS[0])
  const [sessions, setSessions] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function load(ag) {
    api.getTrainingSessions(ag).then(setSessions)
  }

  useEffect(() => { load(ageGroup) }, [ageGroup])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.createTrainingSession({ ...form, ageGroup })
      setForm({ ...emptyForm, ageGroup })
      setShowForm(false)
      load(ageGroup)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Hapus topik latihan ini?')) return
    await api.deleteTrainingSession(id)
    load(ageGroup)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-bold text-navy-900 text-lg">Topik Latihan</h1>
        <div className="flex items-center gap-2">
          <select
            value={ageGroup}
            onChange={(e) => setAgeGroup(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-200 rounded-2xl text-sm font-medium"
          >
            {AGE_GROUPS.map((ag) => <option key={ag} value={ag}>{ag}</option>)}
          </select>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5 bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold px-4 py-2 rounded-2xl"
          >
            <Plus size={16} /> Topik Baru
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-3">
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Judul Topik" value={form.topicTitle} onChange={(v) => setForm((f) => ({ ...f, topicTitle: v }))} required />
            <Field type="date" label="Tanggal" value={form.date} onChange={(v) => setForm((f) => ({ ...f, date: v }))} required />
          </div>
          <Field label="Deskripsi" value={form.topicDescription} onChange={(v) => setForm((f) => ({ ...f, topicDescription: v }))} textarea />
          <Field label="Tujuan Latihan" value={form.objective} onChange={(v) => setForm((f) => ({ ...f, objective: v }))} />
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Durasi" value={form.duration} onChange={(v) => setForm((f) => ({ ...f, duration: v }))} placeholder="mis. 90 menit" />
            <Field label="Peralatan" value={form.equipment} onChange={(v) => setForm((f) => ({ ...f, equipment: v }))} placeholder="mis. Cone, bola" />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-gold-400 hover:bg-gold-500 text-navy-900 font-semibold text-sm px-4 py-2.5 rounded-2xl disabled:opacity-50"
          >
            {saving && <Loader2 size={14} className="animate-spin" />} Simpan Topik
          </button>
        </form>
      )}

      {sessions.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-10 text-center text-sm text-gray-400">
          Belum ada topik latihan untuk kelompok umur ini.
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <div key={s.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 flex items-start justify-between gap-4">
              <div>
                <div className="text-xs text-gray-400 mb-1">{new Date(s.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                <div className="font-bold text-navy-900 mb-1">{s.topicTitle}</div>
                {s.topicDescription && <p className="text-sm text-gray-500 mb-1">{s.topicDescription}</p>}
                <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                  {s.objective && <span>Tujuan: {s.objective}</span>}
                  {s.duration && <span>Durasi: {s.duration}</span>}
                  {s.equipment && <span>Peralatan: {s.equipment}</span>}
                </div>
              </div>
              <button onClick={() => handleDelete(s.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg shrink-0">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', required, textarea, placeholder }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm"
        />
      ) : (
        <input
          type={type}
          required={required}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm"
        />
      )}
    </div>
  )
}
