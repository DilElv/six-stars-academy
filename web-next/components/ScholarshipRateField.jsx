'use client'

import { RupiahInput } from '@/components/ui/rupiah-input'

// Tarif beasiswa adalah harga final per bulan (bukan persen diskon). String
// kosong = siswa reguler; "0" valid untuk beasiswa penuh.
export default function ScholarshipRateField({ monthlyRate, category, onRateChange, onCategoryChange }) {
  const enabled = monthlyRate !== '' && monthlyRate !== null && monthlyRate !== undefined
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onRateChange(e.target.checked ? '0' : '')}
          className="rounded"
        />
        Beasiswa tarif final bulanan
      </label>
      {enabled && (
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs font-semibold text-gray-500">
            Kategori beasiswa
            <input
              value={category || ''}
              onChange={(e) => onCategoryChange(e.target.value)}
              placeholder="Contoh: Prestasi"
              className="mt-1 w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm"
            />
          </label>
          <label className="text-xs font-semibold text-gray-500">
            Tarif per bulan (Rp)
            <RupiahInput
              value={monthlyRate}
              onChange={(value) => onRateChange(String(value))}
              className="mt-1 w-full"
            />
          </label>
        </div>
      )}
      {enabled && <p className="text-[11px] text-emerald-700">Harga final: tarif bulanan × durasi paket. Diskon paket reguler tidak diterapkan.</p>}
    </div>
  )
}
