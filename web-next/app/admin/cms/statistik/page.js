'use client'

import { Sparkles } from 'lucide-react'
import ListSectionEditor from '@/components/cms/ListSectionEditor'
import Field from '@/components/cms/Field'

export default function CmsStatistikPage() {
  return (
    <ListSectionEditor
      sectionKey="quickStats"
      title="Statistik Beranda"
      desc="Angka-angka yang tampil di bawah hero landing page (jumlah siswa, pelatih, dst)."
      icon={Sparkles}
      emptyItem={() => ({ label: '', value: '' })}
      normalize={(raw) => (Array.isArray(raw) ? raw : [])}
      serialize={(items) => items}
      renderFields={(item, index, update) => (
        <div className="grid sm:grid-cols-2 gap-3 flex-1">
          <Field label="Angka / Nilai" value={item.value} onChange={(v) => update({ value: v })} placeholder="mis. 500+" />
          <Field label="Label" value={item.label} onChange={(v) => update({ label: v })} placeholder="mis. Siswa Aktif" />
        </div>
      )}
    />
  )
}
