'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { CalendarIcon, X } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from './popover'
import { Calendar } from './calendar'
import { cn } from '@/lib/utils'

// `disabledDates`: 'yyyy-MM-dd' strings that can't be picked (e.g. a branch
// already has a jadwal that day) — shown crossed-out and blocked, not just
// visually flagged, so double-booking isn't possible from the picker itself.
export function DatePicker({ value, onChange, placeholder = 'Pilih tanggal', className, max, min, disabledDates = [] }) {
  const [open, setOpen] = useState(false)
  const dateValue = value ? new Date(`${value}T00:00:00`) : undefined
  const maxDate = max ? new Date(`${max}T23:59:59`) : new Date()
  const minDate = min ? new Date(`${min}T00:00:00`) : new Date(maxDate.getFullYear() - 25, 0, 1)
  const disabledSet = new Set(disabledDates)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          'flex items-center gap-2 px-3.5 py-2.5 bg-white border border-gray-200 rounded-2xl text-sm font-medium text-navy-800 whitespace-nowrap hover:border-gray-300 focus-visible:border-gold-400 focus-visible:ring-3 focus-visible:ring-gold-400/25 outline-none transition-colors',
          className
        )}
      >
        <CalendarIcon size={15} className="text-gray-400 shrink-0" />
        {dateValue ? format(dateValue, 'd MMM yyyy', { locale: localeId }) : <span className="text-gray-400">{placeholder}</span>}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2">
        <Calendar
          mode="single"
          locale={localeId}
          captionLayout="dropdown"
          startMonth={minDate}
          endMonth={maxDate}
          selected={dateValue}
          defaultMonth={dateValue || maxDate}
          onSelect={(d) => {
            if (!d) return
            onChange(format(d, 'yyyy-MM-dd'))
            setOpen(false)
          }}
          disabled={(d) => (max && d > new Date(`${max}T23:59:59`)) || (min && d < new Date(`${min}T00:00:00`)) || disabledSet.has(format(d, 'yyyy-MM-dd'))}
          modifiers={{ taken: (d) => disabledSet.has(format(d, 'yyyy-MM-dd')) }}
          modifiersClassNames={{ taken: 'line-through text-red-300' }}
        />
        {disabledDates.length > 0 && (
          <p className="text-[11px] text-gray-400 px-2 pb-1">Tanggal dicoret = sudah ada jadwal di cabang ini.</p>
        )}
      </PopoverContent>
    </Popover>
  )
}

// Pick several dates in one go (e.g. multiple jadwal latihan dates at once).
// `value` is an array of 'yyyy-MM-dd' strings; the popover stays open across
// selections so admin can keep clicking dates, closing only on outside click.
export function MultiDatePicker({ value = [], onChange, placeholder = 'Pilih tanggal', className, max, min, disabledDates = [] }) {
  const [open, setOpen] = useState(false)
  const dateValues = value.map((v) => new Date(`${v}T00:00:00`))
  const maxDate = max ? new Date(`${max}T23:59:59`) : new Date(new Date().getFullYear() + 2, 11, 31)
  const minDate = min ? new Date(`${min}T00:00:00`) : new Date()
  const disabledSet = new Set(disabledDates)

  function toggleDate(d) {
    const key = format(d, 'yyyy-MM-dd')
    if (disabledSet.has(key)) return
    if (value.includes(key)) onChange(value.filter((v) => v !== key))
    else onChange([...value, key].sort())
  }

  return (
    <div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className={cn(
            'flex items-center gap-2 px-3.5 py-2.5 bg-white border border-gray-200 rounded-2xl text-sm font-medium text-navy-800 whitespace-nowrap hover:border-gray-300 focus-visible:border-gold-400 focus-visible:ring-3 focus-visible:ring-gold-400/25 outline-none transition-colors',
            className
          )}
        >
          <CalendarIcon size={15} className="text-gray-400 shrink-0" />
          {value.length > 0 ? `${value.length} tanggal dipilih` : <span className="text-gray-400">{placeholder}</span>}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2">
          <Calendar
            mode="multiple"
            locale={localeId}
            captionLayout="dropdown"
            startMonth={minDate}
            endMonth={maxDate}
            selected={dateValues}
            defaultMonth={dateValues[dateValues.length - 1] || minDate}
            onDayClick={toggleDate}
            disabled={(d) => (max && d > new Date(`${max}T23:59:59`)) || (min && d < new Date(`${min}T00:00:00`)) || disabledSet.has(format(d, 'yyyy-MM-dd'))}
            modifiers={{ taken: (d) => disabledSet.has(format(d, 'yyyy-MM-dd')) }}
            modifiersClassNames={{ taken: 'line-through text-red-300' }}
          />
          {disabledDates.length > 0 && (
            <p className="text-[11px] text-gray-400 px-2 pb-1">Tanggal dicoret = sudah ada jadwal di cabang ini.</p>
          )}
        </PopoverContent>
      </Popover>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {value.map((v) => (
            <span key={v} className="flex items-center gap-1 bg-gold-50 text-navy-800 text-xs font-medium px-2.5 py-1 rounded-full">
              {format(new Date(`${v}T00:00:00`), 'd MMM yyyy', { locale: localeId })}
              <button type="button" onClick={() => onChange(value.filter((x) => x !== v))} className="text-gray-400 hover:text-red-600">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
