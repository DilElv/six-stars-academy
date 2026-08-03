'use client'

import { useEffect, useState } from 'react'
import { Images, Save, Loader2, Plus, Trash2, ImagePlus } from 'lucide-react'
import * as api from '@/lib/api'

export default function CmsGaleriPage() {
  const [items, setItems] = useState(null)
  const [saving, setSaving] = useState(false)
  const [uploadingKey, setUploadingKey] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api.getCmsSection('gallery').then((raw) => {
      const arr = Array.isArray(raw) ? raw : []
      // Back-compat: legacy items only ever had a single `image`/`url` field.
      setItems(arr.map((g) => ({
        images: Array.isArray(g.images) ? g.images : [g.image || g.url].filter(Boolean),
        caption: g.caption || '',
      })))
    })
  }, [])

  function addPhotos(index, urls) {
    setItems((list) => {
      const next = [...list]
      next[index] = { ...next[index], images: [...next[index].images, ...urls] }
      return next
    })
  }

  function removePhoto(index, photoIndex) {
    setItems((list) => {
      const next = [...list]
      next[index] = { ...next[index], images: next[index].images.filter((_, i) => i !== photoIndex) }
      return next
    })
  }

  function updateCaption(index, caption) {
    setItems((list) => {
      const next = [...list]
      next[index] = { ...next[index], caption }
      return next
    })
  }

  function removeAlbum(index) {
    setItems((list) => list.filter((_, i) => i !== index))
  }

  async function handleUpload(index, files) {
    const key = `${index}`
    setUploadingKey(key)
    try {
      const urls = await Promise.all(Array.from(files).map((f) => api.uploadFile(f)))
      addPhotos(index, urls)
    } catch (err) {
      setError(err.message)
    } finally {
      setUploadingKey('')
    }
  }

  async function handleAddAlbum(files) {
    const index = items.length
    setItems((list) => [...list, { images: [], caption: '' }])
    await handleUpload(index, files)
  }

  async function handleSave() {
    setError('')
    setSaving(true)
    try {
      await api.updateCmsSection('gallery', items.filter((i) => i.images.length > 0).map((i) => ({ images: i.images, caption: i.caption || '' })))
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
            <p className="text-sm text-gray-400">{items.length} album · tampil di halaman /galeri</p>
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

      <p className="text-xs text-gray-400">Satu item bisa berisi beberapa foto (album) — pengunjung bisa geser antar foto saat dibuka.</p>

      {message && <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-sm text-emerald-700">{message}</div>}
      {error && <div className="bg-red-50 border border-red-200 rounded-2xl p-3 text-sm text-red-600">{error}</div>}

      <div className="glass-card rounded-3xl p-5 space-y-5">
        {items.map((it, i) => (
          <div key={i} className="border border-gray-100 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Album {i + 1} · {it.images.length} foto</span>
              <button onClick={() => removeAlbum(i)} className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded-lg">
                <Trash2 size={12} /> Hapus Album
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {it.images.map((src, pi) => (
                <div key={pi} className="group relative w-24 h-24 shrink-0 rounded-xl overflow-hidden bg-navy-50 border border-gray-100">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removePhoto(i, pi)}
                    className="absolute top-1 right-1 p-1 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
              <label className="w-24 h-24 shrink-0 cursor-pointer rounded-xl border-2 border-dashed border-gray-300 hover:border-gold-400 flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-gold-500 transition-colors duration-150">
                {uploadingKey === `${i}` ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
                <span className="text-[10px] font-semibold">Tambah</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => e.target.files.length > 0 && handleUpload(i, e.target.files)}
                />
              </label>
            </div>
            <input
              value={it.caption}
              onChange={(e) => updateCaption(i, e.target.value)}
              placeholder="Deskripsi album"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm"
            />
          </div>
        ))}

        <label className="cursor-pointer rounded-2xl border-2 border-dashed border-gray-300 hover:border-gold-400 flex flex-col items-center justify-center gap-1.5 text-gray-400 hover:text-gold-500 transition-colors duration-150 py-8">
          <Plus size={20} />
          <span className="text-xs font-semibold">Tambah Album Baru</span>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => e.target.files.length > 0 && handleAddAlbum(e.target.files)}
          />
        </label>
      </div>
    </div>
  )
}
