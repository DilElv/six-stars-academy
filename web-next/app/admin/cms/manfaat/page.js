'use client'

import { useEffect, useState } from 'react'
import { Award, Save, Loader2, Plus, Trash2 } from 'lucide-react'
import * as api from '@/lib/api'

export default function CmsManfaatPage() {
  const [items, setItems] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api.getCmsSection('benefits').then((raw) => {
      const arr = Array.isArray(raw) ? raw : []
      setItems(arr.map((b) => (typeof b === 'string' ? b : b.text || '')))
    })
  }, [])

  function update(index, value) {
    setItems((list) => {
      const next = [...list]
      next[index] = value
      return next
    })
  }

  function remove(index) {
    setItems((list) => list.filter((_, i) => i !== index))
  }

  function add() {
    setItems((list) => [...list, ''])
  }

  async function handleSave() {
    setError('')
    setSaving(true)
    try {
      await api.updateCmsSection('benefits', items.filter((text) => text.trim()))
      setMessage('Daftar manfaat berhasil disimpan')
      setTimeout(() => setMessage(''), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!items) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-navy-600 to-navy-800 shadow-md shadow-navy-900/25 flex items-center justify-center shrink-0">
            <Award size={18} className="text-gold-300" />
          </div>
          <div>
            <h1 className="font-bold text-navy-900 text-lg">Manfaat Bergabung</h1>
            <p className="text-sm text-gray-400">{items.length} manfaat · tampil di halaman pendaftaran</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold px-4 py-2.5 rounded-xl disabled:opacity-50 shrink-0"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          Simpan Perubahan
        </button>
      </div>

      {message && <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-sm text-emerald-700">{message}</div>}
      {error && <div className="bg-red-50 border border-red-200 rounded-2xl p-3 text-sm text-red-600">{error}</div>}

      <div className="glass-card rounded-3xl p-5">
        <div className="space-y-2">
          {items.map((text, i) => (
            <div key={i} className="flex items-center gap-2 bg-white/60 border border-gray-100 rounded-2xl p-2 pl-3.5">
              <input
                value={text}
                onChange={(e) => update(i, e.target.value)}
                placeholder="mis. Raport perkembangan siswa"
                className="flex-1 min-w-0 bg-transparent text-sm font-medium text-navy-900 focus:outline-none"
              />
              <button onClick={() => remove(i)} className="shrink-0 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={add}
          className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-navy-700 hover:text-navy-900 border border-dashed border-gray-300 hover:border-gold-300 rounded-2xl px-4 py-2.5 w-full justify-center transition-colors duration-150"
        >
          <Plus size={15} /> Tambah Manfaat
        </button>

        {items.length === 0 && (
          <div className="text-center text-sm text-gray-400 py-8 border border-dashed border-gray-200 rounded-2xl mt-3">Belum ada manfaat. Klik "Tambah Manfaat" untuk mulai.</div>
        )}
      </div>
    </div>
  )
}
