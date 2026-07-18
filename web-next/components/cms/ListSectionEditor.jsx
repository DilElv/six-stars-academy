'use client'

import { useEffect, useState } from 'react'
import { Save, Loader2, Plus, Trash2, GripVertical } from 'lucide-react'
import * as api from '@/lib/api'

export default function ListSectionEditor({ sectionKey, title, desc, icon: Icon, emptyItem, normalize, serialize, renderFields }) {
  const [items, setItems] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api.getCmsSection(sectionKey).then((raw) => setItems(normalize(raw)))
  }, [sectionKey])

  function update(index, patch) {
    setItems((list) => {
      const next = [...list]
      next[index] = { ...next[index], ...patch }
      return next
    })
  }

  function add() {
    setItems((list) => [...list, emptyItem()])
  }

  function remove(index) {
    setItems((list) => list.filter((_, i) => i !== index))
  }

  function move(index, dir) {
    setItems((list) => {
      const target = index + dir
      if (target < 0 || target >= list.length) return list
      const next = [...list]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  async function handleSave() {
    setError('')
    setSaving(true)
    try {
      await api.updateCmsSection(sectionKey, serialize(items))
      setMessage('Perubahan berhasil disimpan')
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
            <Icon size={18} className="text-gold-300" />
          </div>
          <div>
            <h1 className="font-bold text-navy-900 text-lg">{title}</h1>
            <p className="text-sm text-gray-400">{desc}</p>
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
        <div className="space-y-3">
          {items.length === 0 && (
            <div className="text-center text-sm text-gray-400 py-8 border border-dashed border-gray-200 rounded-2xl">Belum ada item. Tambah item baru di bawah.</div>
          )}
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-3 bg-white/50 border border-gray-100 rounded-2xl p-3">
              <div className="flex flex-col items-center gap-1 pt-1 shrink-0 text-gray-300">
                <GripVertical size={14} />
                <button type="button" onClick={() => move(i, -1)} className="hover:text-navy-600 leading-none text-xs">▲</button>
                <button type="button" onClick={() => move(i, 1)} className="hover:text-navy-600 leading-none text-xs">▼</button>
              </div>
              {renderFields(item, i, (patch) => update(i, patch))}
              <button type="button" onClick={() => remove(i)} className="shrink-0 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={add}
          className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-navy-700 hover:text-navy-900 border border-dashed border-gray-300 hover:border-gold-300 rounded-2xl px-4 py-2.5 w-full justify-center transition-colors duration-150"
        >
          <Plus size={15} /> Tambah Item
        </button>
      </div>
    </div>
  )
}
