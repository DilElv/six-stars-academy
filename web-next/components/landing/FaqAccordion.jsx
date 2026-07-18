'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import Reveal from '@/components/Reveal'

export default function FaqAccordion({ items }) {
  const [open, setOpen] = useState(0)

  return (
    <div className="space-y-3 max-w-3xl mx-auto">
      {items.map((item, i) => {
        const isOpen = open === i
        return (
          <Reveal key={item.q}>
            <div className="bg-white/[0.05] backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => setOpen((o) => (o === i ? null : i))}
                className="w-full flex items-center justify-between gap-4 text-left p-5"
              >
                <span className="font-semibold text-white text-sm sm:text-base">{item.q}</span>
                <ChevronDown size={18} className={`text-gold-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && <div className="px-5 pb-5 text-sm text-gray-400 leading-relaxed">{item.a}</div>}
            </div>
          </Reveal>
        )
      })}
    </div>
  )
}
