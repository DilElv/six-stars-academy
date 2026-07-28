'use client'

import { PackageSearch } from 'lucide-react'
import ListSectionEditor from '@/components/cms/ListSectionEditor'
import Field from '@/components/cms/Field'

export default function CmsPaketInfoPage() {
  return (
    <ListSectionEditor
      sectionKey="packageInfo"
      title="Deskripsi Paket Latihan"
      desc="Penjelasan singkat per durasi paket, tampil di halaman pendaftaran saat memilih paket."
      icon={PackageSearch}
      emptyItem={() => ({ durationMonths: '', description: '' })}
      normalize={(raw) => (Array.isArray(raw) ? raw : [])}
      serialize={(items) => items}
      renderFields={(item, index, update) => (
        <div className="space-y-3 flex-1">
          <Field label="Durasi (bulan)" value={item.durationMonths} onChange={(v) => update({ durationMonths: v })} placeholder="mis. 1, 3, atau 6" />
          <Field label="Deskripsi" value={item.description} onChange={(v) => update({ description: v })} textarea placeholder="mis. Cocok untuk yang ingin mencoba terlebih dahulu..." />
        </div>
      )}
    />
  )
}
