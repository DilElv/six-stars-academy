'use client'

import { useEffect, useState } from 'react'
import { CalendarClock } from 'lucide-react'
import ListSectionEditor from '@/components/cms/ListSectionEditor'
import Field from '@/components/cms/Field'
import { AppSelect } from '@/components/ui/app-select'
import * as api from '@/lib/api'

export default function CmsJadwalDaftarPage() {
  const [branches, setBranches] = useState([])

  useEffect(() => {
    api.getBranches().then(setBranches).catch(() => {})
  }, [])

  return (
    <ListSectionEditor
      sectionKey="registrationSchedule"
      title="Jadwal Latihan (Halaman Pendaftaran)"
      desc="Jadwal per cabang yang tampil saat calon siswa memilih paket di halaman pendaftaran."
      icon={CalendarClock}
      emptyItem={() => ({ branchCode: branches[0]?.code || '', day: '', time: '', location: '' })}
      normalize={(raw) => (Array.isArray(raw) ? raw : [])}
      serialize={(items) => items}
      renderFields={(item, index, update) => (
        <div className="grid sm:grid-cols-2 gap-3 flex-1">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Cabang</label>
            <AppSelect
              value={item.branchCode}
              onChange={(v) => update({ branchCode: v })}
              className="w-full"
              placeholder="Pilih Cabang"
              options={branches.map((b) => ({ value: b.code, label: `${b.name} (${b.code})` }))}
            />
          </div>
          <Field label="Hari" value={item.day} onChange={(v) => update({ day: v })} placeholder="mis. Rabu" />
          <Field label="Jam" value={item.time} onChange={(v) => update({ time: v })} placeholder="mis. 16:00 - 18:00" />
          <Field label="Lokasi" value={item.location} onChange={(v) => update({ location: v })} placeholder="mis. Centro Futsal Sintetis" />
        </div>
      )}
    />
  )
}
