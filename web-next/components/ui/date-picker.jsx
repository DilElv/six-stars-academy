'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from './popover'
import { Calendar } from './calendar'
import { cn } from '@/lib/utils'

export function DatePicker({ value, onChange, placeholder = 'Pilih tanggal', className, max, min }) {
  const [open, setOpen] = useState(false)
  const dateValue = value ? new Date(`${value}T00:00:00`) : undefined

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
          selected={dateValue}
          defaultMonth={dateValue}
          onSelect={(d) => {
            if (!d) return
            onChange(format(d, 'yyyy-MM-dd'))
            setOpen(false)
          }}
          disabled={(d) => (max && d > new Date(`${max}T23:59:59`)) || (min && d < new Date(`${min}T00:00:00`))}
        />
      </PopoverContent>
    </Popover>
  )
}
