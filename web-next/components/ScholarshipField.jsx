'use client'

const PERCENTS = [25, 50, 75, 100]

/**
 * One "Beasiswa" toggle: a checkbox that reveals a 25/50/75/100% picker.
 * `percent` is 0 when off. Used twice (registration fee, SPP/paket) inside
 * the same Beasiswa section — admin-only, see AddStudentModal/EditModal.
 */
export default function ScholarshipField({ label, percent, onChange }) {
  const enabled = percent > 0

  return (
    <div>
      <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-1.5 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onChange(e.target.checked ? 25 : 0)}
          className="rounded"
        />
        {label}
      </label>
      {enabled && (
        <div className="flex gap-2">
          {PERCENTS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all ${percent === p ? 'bg-navy-900 text-white border-navy-900' : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300'}`}
            >
              {p}%
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
