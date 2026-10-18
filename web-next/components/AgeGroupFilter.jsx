'use client'

import { AGE_GROUPS } from '@/lib/ageGroups'
import { AppSelect } from '@/components/ui/app-select'

export default function AgeGroupFilter({ value, onChange, allowAll = false, allLabel = 'Semua Umur', className = '' }) {
  const options = allowAll ? ['', ...AGE_GROUPS] : AGE_GROUPS

  return (
    <>
      <div className={`sm:hidden w-full min-w-0 max-w-full overflow-x-auto overscroll-x-contain touch-pan-x scrollbar-none ${className}`}>
        <div className="grid w-max min-w-full grid-flow-col grid-rows-2 auto-cols-max gap-2 px-1 pb-1">
          {options.map((age) => {
            const active = value === age
            return (
              <button
                key={age || 'all'}
                type="button"
                onClick={() => onChange(age)}
                className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition-colors ${
                  active
                    ? 'border-navy-900 bg-navy-900 text-white'
                    : 'border-gray-200 bg-white text-navy-700'
                }`}
              >
                {age || allLabel}
              </button>
            )
          })}
        </div>
      </div>
      <div className={`hidden sm:block ${className}`}>
        <AppSelect
          value={value}
          onChange={onChange}
          allLabel={allowAll ? allLabel : undefined}
          options={AGE_GROUPS.map((age) => ({ value: age, label: age }))}
        />
      </div>
    </>
  )
}
