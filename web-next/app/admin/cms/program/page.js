'use client'

import { useState } from 'react'
import { LayoutList, Loader2, ImagePlus } from 'lucide-react'
import * as api from '@/lib/api'
import ListSectionEditor from '@/components/cms/ListSectionEditor'
import Field from '@/components/cms/Field'

function PhotoField({ photo, onChange }) {
  const [uploading, setUploading] = useState(false)

  async function handleUpload(file) {
    setUploading(true)
    try {
      const url = await api.uploadFile(file)
      onChange(url)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1">Foto</label>
      <div className="flex items-center gap-3">
        <div className="w-16 h-16 rounded-xl overflow-hidden bg-navy-50 border border-gray-100 shrink-0 flex items-center justify-center">
          {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : uploading ? <Loader2 size={16} className="animate-spin text-navy-300" /> : <ImagePlus size={16} className="text-navy-300" />}
        </div>
        <label className="cursor-pointer text-xs font-semibold text-navy-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-100">
          {photo ? 'Ganti Foto' : 'Unggah Foto'}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files[0] && handleUpload(e.target.files[0])} />
        </label>
      </div>
    </div>
  )
}

export default function CmsProgramPage() {
  return (
    <ListSectionEditor
      sectionKey="programs"
      title="Program Latihan"
      desc="Kartu program yang tampil di halaman /program."
      icon={LayoutList}
      emptyItem={() => ({ title: '', desc: '', photo: '' })}
      normalize={(raw) => (Array.isArray(raw) ? raw : [])}
      serialize={(items) => items}
      renderFields={(item, index, update) => (
        <div className="space-y-3 flex-1">
          <Field label="Judul Program" value={item.title} onChange={(v) => update({ title: v })} placeholder="mis. Grassroots (U-8 - U-12)" />
          <Field label="Deskripsi" value={item.desc} onChange={(v) => update({ desc: v })} textarea placeholder="Deskripsi singkat program" />
          <PhotoField photo={item.photo} onChange={(v) => update({ photo: v })} />
        </div>
      )}
    />
  )
}
