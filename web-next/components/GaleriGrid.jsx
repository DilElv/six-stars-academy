'use client'

import { useState } from 'react'
import { ZoomIn } from 'lucide-react'
import Reveal from '@/components/Reveal'
import Lightbox from '@/components/Lightbox'

export default function GaleriGrid({ items }) {
  const [openIndex, setOpenIndex] = useState(null)

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
        {items.map((item, i) => (
          <Reveal key={i} className={i % 2 === 1 ? 'sm:translate-y-8' : ''}>
            <button
              type="button"
              onClick={() => setOpenIndex(i)}
              className="group relative aspect-square w-full rounded-3xl overflow-hidden shadow-md ring-1 ring-white/10 hover:ring-gold-400/30 transition-all duration-300"
            >
              <div
                className="absolute inset-0 bg-cover bg-center bg-navy-800 transition-transform duration-500 group-hover:scale-110"
                style={{ backgroundImage: `url(${item.images[0]})` }}
              />
              <div className="absolute inset-0 bg-navy-950/0 group-hover:bg-navy-950/60 transition-colors duration-300 flex flex-col items-center justify-center gap-2 p-4 text-center">
                <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                {item.caption && (
                  <p className="text-white text-xs sm:text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    {item.caption}
                  </p>
                )}
              </div>
              {item.images.length > 1 && (
                <span className="absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/60 text-white">
                  {item.images.length} foto
                </span>
              )}
            </button>
          </Reveal>
        ))}
      </div>

      {openIndex !== null && (
        <Lightbox
          images={items[openIndex].images}
          caption={items[openIndex].caption}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </>
  )
}
