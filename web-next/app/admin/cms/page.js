'use client'

import { useEffect, useState } from 'react'
import { Save, Loader2 } from 'lucide-react'
import * as api from '@/lib/api'

const SECTIONS = [
  { key: 'quickStats', label: 'Statistik Beranda' },
  { key: 'programs', label: 'Program Latihan' },
  { key: 'schedulePreview', label: 'Jadwal (Preview Publik)' },
  { key: 'gallery', label: 'Galeri' },
  { key: 'sponsors', label: 'Sponsor' },
]

export default function AdminCmsPage() {
  const [content, setContent] = useState({})
  const [drafts, setDrafts] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState('')
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState({})

  useEffect(() => {
    api.getCmsContent().then((data) => {
      setContent(data)
      const d = {}
      for (const s of SECTIONS) d[s.key] = JSON.stringify(data[s.key] ?? [], null, 2)
      setDrafts(d)
      setLoading(false)
    })
  }, [])

  function flash(msg) {
    setMessage(msg)
    setTimeout(() => setMessage(''), 3000)
  }

  async function handleSave(key) {
    setErrors((e) => ({ ...e, [key]: '' }))
    let parsed
    try {
      parsed = JSON.parse(drafts[key])
    } catch {
      setErrors((e) => ({ ...e, [key]: 'JSON tidak valid' }))
      return
    }
    setSaving(key)
    try {
      await api.updateCmsSection(key, parsed)
      flash(`Konten "${key}" berhasil disimpan`)
    } catch (err) {
      setErrors((e) => ({ ...e, [key]: err.message }))
    } finally {
      setSaving('')
    }
  }

  if (loading) return null

  return (
    <div className="space-y-6">
      <h1 className="font-bold text-navy-900 text-lg">CMS Landing Page</h1>

      {message && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-700">{message}</div>
      )}

      {SECTIONS.map((s) => (
        <div key={s.key} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-navy-900 text-sm">{s.label}</h2>
            <button
              onClick={() => handleSave(s.key)}
              disabled={saving === s.key}
              className="flex items-center gap-1.5 bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold px-3 py-2 rounded-lg disabled:opacity-50"
            >
              {saving === s.key ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Simpan
            </button>
          </div>
          <textarea
            value={drafts[s.key] ?? ''}
            onChange={(e) => setDrafts((d) => ({ ...d, [s.key]: e.target.value }))}
            rows={8}
            className="w-full font-mono text-xs bg-gray-50 border border-gray-200 rounded-xl p-3 focus:outline-none focus:border-gold-400"
          />
          {errors[s.key] && <p className="text-xs text-red-500 mt-1">{errors[s.key]}</p>}
        </div>
      ))}
    </div>
  )
}
