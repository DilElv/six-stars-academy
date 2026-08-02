'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'

const EMPTY = '__empty__'

/**
 * Thin wrapper around the shadcn Select primitives with a simpler API
 * matching how this app's native <select> filters/forms were written:
 * value/onChange strings, options as [{ value, label }]. Pass `allLabel`
 * to render a "Semua ..." option that maps to an empty-string value
 * (Base UI disallows value="" on SelectItem, so we sentinel-map it here).
 */
export function AppSelect({ value, onChange, placeholder, options, className, allLabel, disabled }) {
  const items = {
    ...(allLabel !== undefined ? { [EMPTY]: allLabel } : {}),
    ...Object.fromEntries(options.map((opt) => [opt.value, opt.label])),
  }

  const isEmpty = value === '' || value === undefined || value === null

  return (
    <Select
      items={items}
      value={isEmpty ? (allLabel !== undefined ? EMPTY : null) : value}
      onValueChange={(v) => onChange(v === EMPTY ? '' : v)}
      disabled={disabled}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allLabel !== undefined && <SelectItem value={EMPTY}>{allLabel}</SelectItem>}
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
