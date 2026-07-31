'use client'

import { useState } from 'react'
import { AppSelect } from '@/components/ui/app-select'

export const MONTH_LABELS = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

export function formatRupiah(n) {
  return 'Rp' + (n || 0).toLocaleString('id-ID')
}

export function useMonthFilter() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  return { month, setMonth, year, setYear }
}

export function MonthFilter({ month, setMonth, year, setYear }) {
  const thisYear = new Date().getFullYear()
  return (
    <div className="flex items-center gap-2">
      <AppSelect value={month} onChange={(v) => setMonth(Number(v))} className="w-40" options={MONTH_LABELS.slice(1).map((m, i) => ({ value: i + 1, label: m }))} />
      <AppSelect value={year} onChange={(v) => setYear(Number(v))} className="w-28" options={[thisYear - 1, thisYear, thisYear + 1].map((y) => ({ value: y, label: String(y) }))} />
    </div>
  )
}
