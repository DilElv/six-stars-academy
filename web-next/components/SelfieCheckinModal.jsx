'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Camera, Loader2, MapPin, RotateCcw, Check } from 'lucide-react'
import * as api from '@/lib/api'

async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=0`,
      { headers: { Accept: 'application/json' } }
    )
    if (!res.ok) return null
    const data = await res.json()
    return data?.display_name || null
  } catch {
    return null
  }
}

// Truncates text with an ellipsis so it never draws past the canvas edge —
// ctx.fillText does not wrap or clip, so long strings (e.g. a verbose
// reverse-geocoded address) would otherwise bleed off the image.
function truncateToWidth(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text
  let lo = 0, hi = text.length
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    const candidate = text.slice(0, mid) + '…'
    if (ctx.measureText(candidate).width <= maxWidth) lo = mid
    else hi = mid - 1
  }
  return text.slice(0, lo) + '…'
}

function drawWatermark(ctx, width, height, { timeText, locationText }) {
  const padding = 14
  const maxTextWidth = width - padding * 2
  const lines = [timeText, locationText].filter(Boolean)
  const fontSize = Math.max(10, Math.min(15, Math.round(width / 48)))
  const titleFontSize = Math.round(fontSize * 1.1)
  const lineHeight = fontSize * 1.5
  const boxHeight = lines.length * lineHeight + padding * 1.5 + titleFontSize * 1.6

  const gradient = ctx.createLinearGradient(0, height - boxHeight, 0, height)
  gradient.addColorStop(0, 'rgba(0,0,0,0)')
  gradient.addColorStop(1, 'rgba(0,0,0,0.72)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, height - boxHeight, width, boxHeight)

  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#d4a843'
  ctx.font = `700 ${titleFontSize}px sans-serif`
  ctx.fillText(truncateToWidth(ctx, 'SixStars Academy Indonesia', maxTextWidth), padding, height - boxHeight + padding + titleFontSize)

  ctx.fillStyle = '#ffffff'
  ctx.font = `600 ${fontSize}px sans-serif`
  lines.forEach((line, i) => {
    ctx.fillText(truncateToWidth(ctx, line, maxTextWidth), padding, height - boxHeight + padding + titleFontSize * 1.6 + lineHeight * (i + 1) - lineHeight * 0.3)
  })
}

export default function SelfieCheckinModal({ onSuccess, onClose }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  const [cameraReady, setCameraReady] = useState(false)
  const [error, setError] = useState('')
  const [coords, setCoords] = useState(null)
  const [locationText, setLocationText] = useState('Mencari lokasi...')
  const [capturedImage, setCapturedImage] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let stopped = false

    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 960 } }, audio: false })
      .then((stream) => {
        if (stopped) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
        }
        setCameraReady(true)
      })
      .catch(() => setError('Tidak bisa mengakses kamera. Pastikan izin kamera diaktifkan.'))

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords
          setCoords({ latitude, longitude })
          const name = await reverseGeocode(latitude, longitude)
          if (!stopped) setLocationText(name || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`)
        },
        () => {
          if (!stopped) setLocationText('Lokasi tidak tersedia')
        },
        { enableHighAccuracy: true, timeout: 10000 }
      )
    } else {
      setLocationText('Lokasi tidak didukung perangkat ini')
    }

    return () => {
      stopped = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  function handleCapture() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')

    ctx.save()
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    ctx.restore()

    const now = new Date()
    const timeText = now.toLocaleString('id-ID', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
    drawWatermark(ctx, canvas.width, canvas.height, { timeText, locationText })

    setCapturedImage(canvas.toDataURL('image/jpeg', 0.92))
  }

  function handleRetake() {
    setCapturedImage(null)
  }

  async function handleSubmit() {
    if (!capturedImage) return
    setSubmitting(true)
    setError('')
    try {
      const blob = await (await fetch(capturedImage)).blob()
      const file = new File([blob], 'selfie-checkin.jpg', { type: 'image/jpeg' })
      const url = await api.uploadFile(file)
      const record = await api.checkinStaff({
        photo: url,
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
        locationName: locationText,
      })
      onSuccess(record)
    } catch (err) {
      setError(err.message || 'Gagal mengirim absen, coba lagi.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/80" onClick={submitting ? undefined : onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full max-h-[85vh] overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Camera size={16} className="text-navy-700" />
            <h3 className="font-bold text-navy-900 text-sm">Absen Selfie di Lapangan</h3>
          </div>
          {!submitting && (
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          )}
        </div>

        {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">{error}</div>}

        <div className="relative rounded-2xl overflow-hidden bg-black aspect-[3/4]">
          <video
            ref={videoRef}
            className={`w-full h-full object-cover -scale-x-100 ${capturedImage ? 'hidden' : ''}`}
            playsInline
            muted
          />
          {capturedImage && (
            <img src={capturedImage} alt="Selfie preview" className="w-full h-full object-cover" />
          )}
          {!cameraReady && !capturedImage && !error && (
            <div className="absolute inset-0 flex items-center justify-center text-white/70 text-sm gap-2">
              <Loader2 size={16} className="animate-spin" /> Membuka kamera...
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="flex items-center gap-1.5 mt-3 text-xs text-gray-400">
          <MapPin size={12} className="shrink-0" />
          <span className="truncate">{locationText}</span>
        </div>

        <div className="mt-4">
          {!capturedImage ? (
            <button
              onClick={handleCapture}
              disabled={!cameraReady}
              className="w-full flex items-center justify-center gap-2 bg-gold-400 hover:bg-gold-500 text-navy-900 font-semibold text-sm px-4 py-3 rounded-2xl disabled:opacity-50"
            >
              <Camera size={16} /> Ambil Foto
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleRetake}
                disabled={submitting}
                className="flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-navy-900 font-semibold text-sm px-4 py-3 rounded-2xl disabled:opacity-50"
              >
                <RotateCcw size={15} /> Ulangi
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center justify-center gap-1.5 bg-navy-900 hover:bg-navy-800 text-white font-semibold text-sm px-4 py-3 rounded-2xl disabled:opacity-50"
              >
                {submitting ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                Kirim Absen
              </button>
            </div>
          )}
        </div>

        <p className="text-[11px] text-gray-400 mt-3 text-center">
          Foto akan diberi watermark waktu &amp; lokasi, lalu dikirim ke admin untuk diverifikasi.
        </p>
      </div>
    </div>
  )
}
