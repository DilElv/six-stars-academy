'use client'

import { useEffect, useRef, useState } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import ModalPortal from '@/components/ui/modal-portal'

// Full-screen album viewer — one photo at a time, prev/next + swipe, opened
// from a gallery grid tile. `images` is the album's photo array, `startAt`
// the index the album was clicked at.
export default function Lightbox({ images, startAt = 0, caption, onClose }) {
  const [index, setIndex] = useState(startAt)
  const touchStartX = useRef(null)

  const prev = () => setIndex((i) => (i - 1 + images.length) % images.length)
  const next = () => setIndex((i) => (i + 1) % images.length)

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [images.length])

  function onTouchStart(e) {
    touchStartX.current = e.touches[0].clientX
  }
  function onTouchEnd(e) {
    if (touchStartX.current == null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (dx > 50) prev()
    else if (dx < -50) next()
    touchStartX.current = null
  }

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[300] bg-black/95 flex flex-col" onClick={onClose}>
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white z-10">
          <X size={22} />
        </button>

        {images.length > 1 && (
          <span className="absolute top-4 left-4 text-white/70 text-sm font-medium z-10">
            {index + 1} / {images.length}
          </span>
        )}

        <div
          className="flex-1 flex items-center justify-center relative px-4 sm:px-16"
          onClick={(e) => e.stopPropagation()}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {images.length > 1 && (
            <button onClick={prev} className="hidden sm:flex absolute left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white">
              <ChevronLeft size={24} />
            </button>
          )}
          <img src={images[index]} alt={caption || ''} className="max-w-full max-h-[80vh] object-contain rounded-lg" />
          {images.length > 1 && (
            <button onClick={next} className="hidden sm:flex absolute right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white">
              <ChevronRight size={24} />
            </button>
          )}
        </div>

        {caption && (
          <p className="text-center text-white/80 text-sm px-4 pb-6" onClick={(e) => e.stopPropagation()}>{caption}</p>
        )}

        {images.length > 1 && (
          <div className="flex sm:hidden items-center justify-center gap-4 pb-4" onClick={(e) => e.stopPropagation()}>
            <button onClick={prev} className="p-2 rounded-full bg-white/10 text-white"><ChevronLeft size={20} /></button>
            <button onClick={next} className="p-2 rounded-full bg-white/10 text-white"><ChevronRight size={20} /></button>
          </div>
        )}
      </div>
    </ModalPortal>
  )
}
