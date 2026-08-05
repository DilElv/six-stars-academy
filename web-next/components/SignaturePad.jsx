'use client'

import { useEffect, useRef, useState } from 'react'
import { Eraser } from 'lucide-react'

// Plain <canvas> + Pointer Events signature pad — no external drawing
// library needed. Exposes the drawn strokes as a PNG data URL via onChange
// so the caller can turn it into a File and reuse the existing upload flow.
export default function SignaturePad({ initialImage, onChange }) {
  const canvasRef = useRef(null)
  const drawingRef = useRef(false)
  const hasStrokesRef = useRef(false)
  const [isEmpty, setIsEmpty] = useState(true)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    // Render at devicePixelRatio so strokes stay crisp, while CSS keeps the
    // element at a fixed on-screen size.
    const ratio = window.devicePixelRatio || 1
    const cssWidth = canvas.clientWidth
    const cssHeight = canvas.clientHeight
    canvas.width = cssWidth * ratio
    canvas.height = cssHeight * ratio
    ctx.scale(ratio, ratio)
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#0a1628'

    if (initialImage) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => { ctx.drawImage(img, 0, 0, cssWidth, cssHeight); hasStrokesRef.current = true; setIsEmpty(false) }
      img.src = initialImage
    }
  }, [])

  function getPos(e) {
    const rect = canvasRef.current.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function handlePointerDown(e) {
    const ctx = canvasRef.current.getContext('2d')
    const { x, y } = getPos(e)
    drawingRef.current = true
    ctx.beginPath()
    ctx.moveTo(x, y)
    canvasRef.current.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e) {
    if (!drawingRef.current) return
    const ctx = canvasRef.current.getContext('2d')
    const { x, y } = getPos(e)
    ctx.lineTo(x, y)
    ctx.stroke()
    hasStrokesRef.current = true
    setIsEmpty(false)
  }

  function handlePointerUp() {
    if (!drawingRef.current) return
    drawingRef.current = false
    if (hasStrokesRef.current) onChange?.(canvasRef.current.toDataURL('image/png'))
  }

  function handleClear() {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    hasStrokesRef.current = false
    setIsEmpty(true)
    onChange?.(null)
  }

  return (
    <div>
      <div className="relative border border-gray-200 rounded-2xl bg-white overflow-hidden touch-none" style={{ height: 160 }}>
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-xs text-gray-300">
            Gambar tanda tangan di sini
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={handleClear}
        className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700"
      >
        <Eraser size={13} /> Hapus &amp; Ulangi
      </button>
    </div>
  )
}
