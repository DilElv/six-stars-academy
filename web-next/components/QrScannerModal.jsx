'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Camera } from 'lucide-react'

const SCANNER_ELEMENT_ID = 'qr-scanner-region'

export default function QrScannerModal({ onScan, onClose }) {
  const scannerRef = useRef(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let html5Qrcode
    let stopped = false

    import('html5-qrcode').then(({ Html5Qrcode }) => {
      if (stopped) return
      html5Qrcode = new Html5Qrcode(SCANNER_ELEMENT_ID)
      scannerRef.current = html5Qrcode
      html5Qrcode
        .start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: 220 },
          (decodedText) => {
            onScan(decodedText)
          },
          () => {}
        )
        .catch((err) => setError('Tidak bisa mengakses kamera: ' + err.message))
    })

    return () => {
      stopped = true
      if (scannerRef.current) {
        scannerRef.current.stop().then(() => scannerRef.current.clear()).catch(() => {})
      }
    }
  }, [onScan])

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full max-h-[85vh] overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Camera size={16} className="text-navy-700" />
            <h3 className="font-bold text-navy-900 text-sm">Scan QR Kartu Siswa</h3>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
        {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">{error}</div>}
        <div id={SCANNER_ELEMENT_ID} className="rounded-2xl overflow-hidden bg-black" />
        <p className="text-xs text-gray-400 mt-3 text-center">Arahkan kamera ke QR pada kartu siswa.</p>
      </div>
    </div>
  )
}
