'use client'

import { CalendarClock } from 'lucide-react'
import ListSectionEditor from '@/components/cms/ListSectionEditor'
import Field from '@/components/cms/Field'

export default function CmsJadwalPage() {
  return (
    <ListSectionEditor
      sectionKey="schedulePreview"
      title="Jadwal Latihan"
      desc="Cuplikan jadwal mingguan yang tampil di halaman /jadwal."
      icon={CalendarClock}
      emptyItem={() => ({ ageGroup: '', day: '', time: '' })}
      normalize={(raw) => (Array.isArray(raw) ? raw : [])}
      serialize={(items) => items}
      renderFields={(item, index, update) => (
        <div className="grid sm:grid-cols-3 gap-3 flex-1">
          <Field label="Kelompok Umur" value={item.ageGroup} onChange={(v) => update({ ageGroup: v })} placeholder="mis. U-6 - U-14" />
          <Field label="Hari" value={item.day} onChange={(v) => update({ day: v })} placeholder="mis. Senin & Rabu" />
          <Field label="Jam" value={item.time} onChange={(v) => update({ time: v })} placeholder="mis. 16.00 - 18.00 WIB" />
        </div>
      )}
    />
  )
}
