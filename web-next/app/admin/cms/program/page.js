'use client'

import { LayoutList } from 'lucide-react'
import ListSectionEditor from '@/components/cms/ListSectionEditor'
import Field from '@/components/cms/Field'

export default function CmsProgramPage() {
  return (
    <ListSectionEditor
      sectionKey="programs"
      title="Program Latihan"
      desc="Kartu program yang tampil di halaman /program."
      icon={LayoutList}
      emptyItem={() => ({ title: '', desc: '' })}
      normalize={(raw) => (Array.isArray(raw) ? raw : [])}
      serialize={(items) => items}
      renderFields={(item, index, update) => (
        <div className="space-y-3 flex-1">
          <Field label="Judul Program" value={item.title} onChange={(v) => update({ title: v })} placeholder="mis. Grassroots (U-8 - U-12)" />
          <Field label="Deskripsi" value={item.desc} onChange={(v) => update({ desc: v })} textarea placeholder="Deskripsi singkat program" />
        </div>
      )}
    />
  )
}
