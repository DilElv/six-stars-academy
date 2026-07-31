'use client'

export function MultiSelectCheckbox({ options, values, onChange, className = '' }) {
  function toggle(value) {
    onChange(values.includes(value) ? values.filter((v) => v !== value) : [...values, value])
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {options.map((opt) => {
        const checked = values.includes(opt.value)
        return (
          <label
            key={opt.value}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border cursor-pointer transition-colors ${
              checked ? 'bg-navy-900 border-navy-900 text-white' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <input type="checkbox" checked={checked} onChange={() => toggle(opt.value)} className="hidden" />
            {opt.label}
          </label>
        )
      })}
    </div>
  )
}
