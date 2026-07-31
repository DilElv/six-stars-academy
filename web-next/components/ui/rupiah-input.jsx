'use client'

import { useEffect, useState } from 'react'

function formatDigits(digits) {
  if (!digits) return ''
  return Number(digits).toLocaleString('id-ID')
}

/**
 * Rupiah amount input with live thousand-separator formatting. Displays
 * "1.500.000" as the user types while onChange always emits the plain
 * number, so callers keep storing/sending a raw integer.
 */
export function RupiahInput({ value, onChange, className = '', placeholder, required }) {
  const [display, setDisplay] = useState(formatDigits(value))

  useEffect(() => {
    setDisplay(formatDigits(value))
  }, [value])

  function handleChange(e) {
    const digits = e.target.value.replace(/\D/g, '')
    setDisplay(formatDigits(digits))
    onChange(digits ? Number(digits) : 0)
  }

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">Rp</span>
      <input
        type="text"
        inputMode="numeric"
        required={required}
        placeholder={placeholder}
        value={display}
        onChange={handleChange}
        className={`pl-8 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm ${className}`}
      />
    </div>
  )
}
