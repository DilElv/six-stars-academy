'use client'

import { useEffect, useState } from 'react'
import { Save, Loader2, Upload } from 'lucide-react'
import * as api from '@/lib/api'
import { AppSelect } from '@/components/ui/app-select'

export default function HeadCoachProfilPage() {
  const [form, setForm] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const [branches, setBranches] = useState([])

  useEffect(() => {
    api.getMe().then((profile) => setForm({ name: profile.name, phone: profile.phone || '', photo: profile.photo || '', bio: profile.bio || '', branchId: profile.branchId || '' }))
    api.getBranches().then(setBranches)
  }, [])

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await api.uploadFile(file)
      setForm((f) => ({ ...f, photo: url }))
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.updateMe(form)
      setMessage('Profil berhasil disimpan')
    } catch (err) {
      setMessage(err.message)
    } finally {
      setSaving(false)
      setTimeout(() => setMessage(''), 3000)
    }
  }

  if (!form) return null

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="font-bold text-navy-900 text-lg">Profil</h1>

      {message && <div className="text-sm bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-2xl px-3 py-2">{message}</div>}

      <form onSubmit={handleSubmit} className="glass-card rounded-3xl p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center shrink-0">
            {form.photo ? <img src={form.photo} alt="" className="w-full h-full object-cover" /> : <Upload size={18} className="text-gray-300" />}
          </div>
          <label className="text-xs font-semibold text-navy-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-100">
            {uploading ? 'Mengunggah...' : 'Ganti Foto'}
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} disabled={uploading} />
          </label>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Nama</label>
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">No. Telepon</label>
          <input
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Cabang</label>
          <AppSelect
            value={form.branchId}
            onChange={(v) => setForm((f) => ({ ...f, branchId: v }))}
            className="w-full"
            allLabel="- Belum ditentukan -"
            placeholder="- Belum ditentukan -"
            options={branches.map((b) => ({ value: b.id, label: `${b.name} (${b.code})` }))}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Bio</label>
          <textarea
            value={form.bio}
            onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
            rows={3}
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 bg-navy-900 hover:bg-navy-800 text-white font-semibold text-sm px-4 py-2.5 rounded-2xl disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Simpan
        </button>
      </form>
    </div>
  )
}
