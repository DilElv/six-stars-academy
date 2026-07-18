'use client'

import { useEffect, useRef, useState } from 'react'

function parseTarget(value) {
  const match = String(value).match(/[\d.]+/)
  if (!match) return null
  return Math.round(parseFloat(match[0].replace(/\./g, '')))
}

function CountUpValue({ value }) {
  const target = parseTarget(value)
  const suffix = target !== null ? String(value).replace(/^[\d.\s]+/, '') : ''
  const prefix = target === null ? String(value) : ''
  const [display, setDisplay] = useState(target === null ? '' : '0')
  const spanRef = useRef(null)
  const started = useRef(false)

  useEffect(() => {
    if (target === null) return
    const el = spanRef.current
    if (!el) return
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) {
      setDisplay(String(target))
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true
          const duration = 1200
          const startTime = performance.now()
          function tick(now) {
            const progress = Math.min((now - startTime) / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)
            setDisplay(String(Math.round(eased * target)))
            if (progress < 1) requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
          observer.disconnect()
        }
      },
      { threshold: 0.4 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [target])

  return (
    <span ref={spanRef} className="tabular-nums">
      {prefix}
      {display}
      {suffix}
    </span>
  )
}

export default function ScoreboardTicker({ stats }) {
  return (
    <div className="relative bg-navy-900 border-y border-gold-400/20 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-[0.06] [background-image:repeating-linear-gradient(180deg,#fff_0px,#fff_1px,transparent_1px,transparent_3px)]" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-7 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((s, i) => (
          <div key={s.label} className="text-center md:text-left md:border-l md:first:border-l-0 border-gold-400/10 md:pl-6 md:first:pl-0">
            <div
              className="font-extrabold text-2xl sm:text-3xl text-gold-400 animate-flicker tracking-tight"
              style={{ animationDelay: `${i * 300}ms`, textShadow: '0 0 18px rgba(212,168,67,0.45)' }}
            >
              <CountUpValue value={s.value} />
            </div>
            <div className="text-[11px] sm:text-xs uppercase tracking-[0.18em] text-gray-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
