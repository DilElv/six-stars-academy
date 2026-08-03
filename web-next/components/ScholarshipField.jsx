'use client'

import { useState } from 'react'

const PERCENTS = [25, 50, 75, 100]

/**
 * One "Beasiswa" toggle: a checkbox that reveals a 25/50/75/100% picker,
 * plus a "Custom" option for percentages that don't fit the template.
 * `percent` is 0 when off. Used twice (registration fee, SPP/paket) inside
 * the same Beasiswa section — admin-only, see AddStudentModal/EditModal.
 */
export default function ScholarshipField({ label, percent, onChange }) {
  const enabled = percent > 0
  const isCustom = enabled && !PERCENTS.includes(percent)
  const [showCustom, setShowCustom] = useState(isCustom)

  return (
    <div>
      <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-1.5 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => { setShowCustom(false); onChange(e.target.checked ? 25 : 0) }}
          className="rounded"
        />
        {label}
      </label>
      {enabled && (
        <div className="space-y-2">
          <div className="flex gap-2">
            {PERCENTS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => { setShowCustom(false); onChange(p) }}
                className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all ${!showCustom && percent === p ? 'bg-navy-900 text-white border-navy-900' : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300'}`}
              >
                {p}%
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowCustom(true)}
              className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all ${showCustom ? 'bg-navy-900 text-white border-navy-900' : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300'}`}
            >
              Custom
            </button>
          </div>
          {showCustom && (
            <div className="relative">
              <input
                type="number"
                min={1}
                max={100}
                value={percent}
                onChange={(e) => onChange(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                placeholder="mis. 30"
                className="w-full px-3 py-2 pr-8 bg-gray-50 border border-gray-200 rounded-xl text-sm"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">%</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
