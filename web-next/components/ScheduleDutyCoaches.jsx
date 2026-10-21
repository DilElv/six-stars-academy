'use client'

import { useEffect, useState } from 'react'
import * as api from '@/lib/api'
import { MultiSelectCheckbox } from '@/components/ui/multi-select-checkbox'

/** Pilih coach bertugas untuk satu cabang. Kosong = semua coach di cabang itu boleh absen. */
export default function ScheduleDutyCoaches({ branchId, values, onChange, label = 'Coach Bertugas' }) {
  const [coaches, setCoaches] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!branchId) { setCoaches([]); return }
    setLoading(true)
    api.getCoachAttendanceCoaches(branchId)
      .then(setCoaches)
      .catch(() => setCoaches([]))
      .finally(() => setLoading(false))
  }, [branchId])

  const options = coaches.map((c) => ({ value: c.id, label: c.role === 'head_coach' ? `${c.name} (head coach)` : c.name }))

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
      {!branchId ? (
        <p className="text-[11px] text-amber-600">Pilih cabang dulu.</p>
      ) : loading ? (
        <p className="text-[11px] text-gray-400">Memuat coach...</p>
      ) : options.length === 0 ? (
        <p className="text-[11px] text-amber-600">Belum ada coach yang ditugaskan di cabang ini. Atur di menu Penugasan Coach.</p>
      ) : (
        <MultiSelectCheckbox options={options} values={values} onChange={onChange} />
      )}
      <p className="text-[11px] text-gray-400 mt-1">Hanya coach terpilih yang bisa absen di jadwal ini. Kosongkan = semua coach cabang.</p>
    </div>
  )
}
