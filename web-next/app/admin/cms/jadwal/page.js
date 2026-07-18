'use client'

import { CalendarClock } from 'lucide-react'
import ListSectionEditor from '@/components/cms/ListSectionEditor'
import Field from '@/components/cms/Field'
import { AGE_GROUPS } from '@/lib/ageGroups'
import { AppSelect } from '@/components/ui/app-select'

export default function CmsJadwalPage() {
  return (
    <ListSectionEditor
      sectionKey="schedulePreview"
      title="Jadwal Latihan"
      desc="Cuplikan jadwal mingguan yang tampil di halaman /jadwal."
      icon={CalendarClock}
      emptyItem={() => ({ ageGroup: AGE_GROUPS[0], day: '', time: '' })}
      normalize={(raw) => (Array.isArray(raw) ? raw : [])}
      serialize={(items) => items}
      renderFields={(item, index, update) => (
        <div className="grid sm:grid-cols-3 gap-3 flex-1">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Kelompok Umur</label>
            <AppSelect value={item.ageGroup} onChange={(v) => update({ ageGroup: v })} className="w-full" options={AGE_GROUPS.map((ag) => ({ value: ag, label: ag }))} />
          </div>
          <Field label="Hari" value={item.day} onChange={(v) => update({ day: v })} placeholder="mis. Senin & Rabu" />
          <Field label="Jam" value={item.time} onChange={(v) => update({ time: v })} placeholder="mis. 16.00 - 18.00 WIB" />
        </div>
      )}
    />
  )
}
