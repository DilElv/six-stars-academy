'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import * as api from '@/lib/api'
import { JERSEY_STATUS, toJerseyAgeGroup } from '@/lib/jerseyNumbers'

// Pemilih nomor punggung 1–100 untuk Parent. Kategori usia selalu diambil dari
// data anak di server (student), bukan diketik bebas, sehingga nomor yang
// ditampilkan sesuai kategori pemain.
export default function JerseyNumberPicker({ product, student, value, onChange }) {
  const ageGroup = toJerseyAgeGroup(student?.ageGroup)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    if (!product?.id || !ageGroup) return
    setLoading(true)
    api.getJerseyNumbers(product.id, ageGroup)
      .then((res) => { setData(res); setError('') })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [product?.id, ageGroup])

  useEffect(() => {
    setData(null)
    load()
    const timer = setInterval(load, 20000)
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    return () => { clearInterval(timer); window.removeEventListener('focus', onFocus) }
  }, [load])

  useEffect(() => {
    if (!data || value === '' || value === undefined || value === null) return
    const row = data.numbers?.find((entry) => entry.number === Number(value))
    if (row && row.status !== 'available') onChange('')
  }, [data, value, onChange])

  if (!ageGroup) {
    return <p className="text-xs text-red-500">Kategori usia pemain belum tersedia. Hubungi Admin.</p>
  }

  if (!data && loading) {
    return <div className="text-xs text-gray-400 flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Memuat nomor {ageGroup}...</div>
  }

  if (error) {
    return (
      <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
        <span>{error}</span>
        <button type="button" onClick={load} className="font-semibold shrink-0">Coba lagi</button>
      </div>
    )
  }

  const numbers = data?.numbers || []
  const selected = Number(value)

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-gray-500">
          Kategori usia <b className="text-navy-900">{ageGroup}</b> · pilih nomor yang masih tersedia.
        </p>
        <button type="button" onClick={load} className="p-1.5 rounded-lg text-gray-400 hover:text-navy-700 hover:bg-gray-100" title="Muat ulang nomor">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
        {numbers.map((row) => {
          const status = JERSEY_STATUS[row.status] || JERSEY_STATUS.available
          const active = selected === row.number
          return (
            <button
              key={row.number}
              type="button"
              disabled={row.status !== 'available'}
              onClick={() => onChange(active ? '' : row.number)}
              title={`${row.number} · ${status.label}`}
              className={`h-9 rounded-lg border text-xs font-bold tabular-nums transition-colors ${status.cell} ${active ? 'ring-2 ring-offset-1 ring-gold-500' : ''} disabled:cursor-not-allowed`}
            >
              {row.number}
            </button>
          )
        })}
      </div>

      {Number.isInteger(selected) && selected > 0 && (
        <p className="text-[11px] font-semibold text-emerald-600">Nomor {selected} dipilih.</p>
      )}

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-gray-500">
        {Object.entries(JERSEY_STATUS).map(([key, status]) => (
          <span key={key} className="inline-flex items-center gap-1">
            <span className={`inline-block w-2.5 h-2.5 rounded-sm border ${status.cell}`} />
            {status.label} ({data?.summary?.[key] ?? 0})
          </span>
        ))}
      </div>

      {data?.conflicts?.length > 0 && (
        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-2.5 py-2">
          Ada {data.conflicts.length} bentrok nomor dari data lama. Admin perlu menyelesaikannya sebelum nomor dipakai lagi.
        </p>
      )}
    </div>
  )
}
