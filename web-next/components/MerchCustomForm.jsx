'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import * as api from '@/lib/api'

// Form isian custom untuk satu produk merchandise (nama punggung, ukuran, nomor
// punggung, catatan, dll) sesuai `product.customFields`. Field angka bernomor-unik
// menampilkan nomor yang sudah dipakai sebagai tombol nonaktif, jadi pembeli
// langsung tahu nomor mana yang masih kosong.
export function missingRequired(product, values) {
  return (product?.customFields || []).find((f) => f.required && !String(values?.[f.key] ?? '').trim())
}

export default function MerchCustomForm({ product, values, onChange }) {
  const fields = product?.customFields || []
  const [numbers, setNumbers] = useState(null)
  const hasNumber = fields.some((f) => f.type === 'number' && f.unique)

  useEffect(() => {
    setNumbers(null)
    if (!product?.id || !hasNumber) return
    let alive = true
    api.getProductNumbers(product.id).then((res) => { if (alive) setNumbers(res.fields) }).catch(() => { if (alive) setNumbers([]) })
    return () => { alive = false }
  }, [product?.id, hasNumber])

  const set = (key, value) => onChange({ ...values, [key]: value })

  if (fields.length === 0) return null

  return (
    <div className="space-y-3">
      {fields.map((field) => (
        <div key={field.key}>
          <label className="mb-1 block text-xs font-semibold text-gray-500">
            {field.label}{field.required ? <span className="text-red-500"> *</span> : <span className="text-gray-300"> (opsional)</span>}
          </label>
          {field.type === 'text' && (
            <input
              value={values[field.key] || ''}
              maxLength={field.maxLength || 20}
              onChange={(e) => set(field.key, e.target.value)}
              placeholder={`mis. ${field.label}`}
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm"
            />
          )}
          {field.type === 'select' && (
            <div className="flex flex-wrap gap-2">
              {field.choices.map((choice) => {
                const active = values[field.key] === choice
                return (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => set(field.key, active && !field.required ? '' : choice)}
                    className={`min-w-[44px] rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${active ? 'border-navy-900 bg-navy-900 text-white' : 'border-gray-200 bg-white text-navy-700 hover:border-gold-300'}`}
                  >
                    {choice}
                  </button>
                )
              })}
            </div>
          )}
          {field.type === 'number' && (
            <NumberPicker
              field={field}
              info={numbers?.find((n) => n.key === field.key)}
              loading={field.unique && numbers === null}
              value={values[field.key]}
              onPick={(n) => set(field.key, n)}
            />
          )}
        </div>
      ))}
    </div>
  )
}

function NumberPicker({ field, info, loading, value, onPick }) {
  const taken = useMemo(() => new Set(info?.taken || field.blockedNumbers || []), [info, field])
  const all = useMemo(() => Array.from({ length: Math.max(0, field.max - field.min + 1) }, (_, i) => field.min + i), [field])
  const free = all.filter((n) => !taken.has(n)).length

  if (loading) return <div className="text-xs text-gray-400 flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Memuat nomor...</div>

  return (
    <div>
      <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1.5">
        <span>{value ? `Dipilih: ${value}` : 'Pilih nomor yang masih kosong'}</span>
        <span>{free} nomor tersedia</span>
      </div>
      <div className="grid grid-cols-8 sm:grid-cols-10 gap-1.5 max-h-44 overflow-y-auto pr-1">
        {all.map((n) => {
          const isTaken = taken.has(n)
          const active = Number(value) === n
          return (
            <button
              key={n}
              type="button"
              disabled={isTaken}
              onClick={() => onPick(active && !field.required ? '' : n)}
              title={isTaken ? 'Sudah dipakai' : `Nomor ${n}`}
              className={`rounded-lg py-1.5 text-xs font-semibold tabular-nums transition-colors ${
                isTaken
                  ? 'bg-gray-100 text-gray-300 line-through cursor-not-allowed'
                  : active
                  ? 'bg-navy-900 text-white'
                  : 'bg-white border border-gray-200 text-navy-700 hover:border-gold-400'
              }`}
            >
              {n}
            </button>
          )
        })}
      </div>
      <div className="flex items-center gap-3 text-[10px] text-gray-400 mt-1.5">
        <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-white border border-gray-200" /> Kosong</span>
        <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-gray-100" /> Terpakai</span>
        <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-navy-900" /> Pilihanmu</span>
      </div>
    </div>
  )
}
