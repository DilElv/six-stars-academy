'use client'

import { useEffect, useState } from 'react'
import { Images, Save, Loader2, Plus, Trash2, ImagePlus } from 'lucide-react'
import * as api from '@/lib/api'

export default function CmsGaleriPage() {
  const [items, setItems] = useState(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(-1)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api.getCmsSection('gallery').then((raw) => {
      const arr = Array.isArray(raw) ? raw : []
      setItems(arr.map((g) => ({ image: g.image || g.url || '' })))
    })
  }, [])

  function update(index, image) {
    setItems((list) => {
      const next = [...list]
      next[index] = { image }
      return next
    })
  }

  function remove(index) {
    setItems((list) => list.filter((_, i) => i !== index))
  }

  async function handleUpload(index, file) {
    setUploading(index)
    try {
      const url = await api.uploadFile(file)
      update(index, url)
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(-1)
    }
  }

  async function handleAddNew(file) {
    const index = items.length
    setItems((list) => [...list, { image: '' }])
    await handleUpload(index, file)
  }

  async function handleSave() {
    setError('')
    setSaving(true)
    try {
      await api.updateCmsSection('gallery', items.filter((i) => i.image).map((i) => ({ image: i.image })))
      setMessage('Galeri berhasil disimpan')
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
            <Images size={18} className="text-gold-300" />
          </div>
          <div>
            <h1 className="font-bold text-navy-900 text-lg">Galeri Foto</h1>
            <p className="text-sm text-gray-400">{items.length} foto · tampil di halaman /galeri</p>
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {items.map((it, i) => (
            <div key={i} className="group relative aspect-square rounded-2xl overflow-hidden bg-navy-50 border border-gray-100">
              {it.image ? (
                <img src={it.image} alt="" className="w-full h-full object-cover" />
              ) : uploading === i ? (
                <div className="w-full h-full flex items-center justify-center">
                  <Loader2 size={20} className="animate-spin text-navy-300" />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImagePlus size={20} className="text-navy-300" />
                </div>
              )}
              <button
                onClick={() => remove(i)}
                className="absolute top-1.5 right-1.5 p-1.5 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-150"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}

          <label className="cursor-pointer aspect-square rounded-2xl border-2 border-dashed border-gray-300 hover:border-gold-400 flex flex-col items-center justify-center gap-1.5 text-gray-400 hover:text-gold-500 transition-colors duration-150">
            <Plus size={20} />
            <span className="text-xs font-semibold">Tambah Foto</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files[0] && handleAddNew(e.target.files[0])}
            />
          </label>
        </div>
      </div>
    </div>
  )
}
