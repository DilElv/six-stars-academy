'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import * as api from '@/lib/api'

// Form isian custom untuk satu produk merchandise (nama punggung, ukuran, nomor
// punggung, catatan, dll) sesuai `product.customFields`. Field angka bernomor-unik
// menampilkan nomor yang sudah dipakai sebagai tombol nonaktif, jadi pembeli
// langsung tahu nomor mana yang masih kosong.
export function missingRequired(product, values) {
  return (product?.customFields || []).find((f) => {
    const text = String(values?.[f.key] ?? '').trim()
    if (!text) return f.required
    if (f.type === 'number') {
      const n = Number(text)
      return !Number.isInteger(n) || n < 0 || n > 999 || (f.blockedNumbers || []).includes(n)
    }
    return false
  })
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
  const sorted = useMemo(() => [...taken].sort((a, b) => a - b), [taken])

  if (loading) return <div className="text-xs text-gray-400 flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Memuat nomor...</div>

  const text = String(value ?? '')
  const n = Number(text)
  const valid = text !== '' && Number.isInteger(n) && n >= 0 && n <= 999
  const isTaken = valid && taken.has(n)

  return (
    <div className="space-y-1.5">
      <input
        type="number"
        inputMode="numeric"
        min="0"
        max="999"
        value={text}
        onChange={(e) => onPick(e.target.value)}
        placeholder="Ketik nomor punggung"
        className={`w-full rounded-2xl border px-3 py-2.5 text-sm tabular-nums bg-gray-50 ${isTaken ? 'border-red-300' : valid ? 'border-emerald-300' : 'border-gray-200'}`}
      />
      {text !== '' && !valid && <p className="text-[11px] text-red-500">Masukkan angka bulat 0–999.</p>}
      {isTaken && <p className="text-[11px] text-red-500 font-semibold">Nomor {n} sudah dipakai. Pilih nomor lain.</p>}
      {valid && !isTaken && <p className="text-[11px] text-emerald-600 font-semibold">Nomor {n} tersedia.</p>}
      {sorted.length > 0 && (
        <div>
          <div className="text-[11px] text-gray-400 mb-1">Nomor yang sudah dipakai:</div>
          <div className="flex flex-wrap gap-1">
            {sorted.map((t) => <span key={t} className="rounded-md bg-gray-100 text-gray-500 text-[11px] font-semibold tabular-nums px-1.5 py-0.5 line-through">{t}</span>)}
          </div>
        </div>
      )}
    </div>
  )
}
