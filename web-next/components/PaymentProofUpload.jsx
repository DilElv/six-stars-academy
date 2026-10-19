'use client'

import { useRef, useState } from 'react'
import { Upload, Loader2, CheckCircle2 } from 'lucide-react'
import * as api from '@/lib/api'

// Unggah bukti pembayaran (foto/screenshot). Dipakai parent (untuk transaksinya
// sendiri) maupun admin/head coach. Setelah berhasil, `onUploaded` dipanggil
// supaya pemanggil me-refresh data.
export default function PaymentProofUpload({ payment, onUploaded, compact = false, autoOpen = false }) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function pick(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const url = await api.uploadFile(file)
      await api.uploadPaymentProof(payment.id, url)
      onUploaded?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  if (payment.proofUrl) {
    return (
      <div className="flex items-center gap-2 flex-wrap text-[11px] text-emerald-700">
        <CheckCircle2 size={13} className="shrink-0" />
        <span className="font-semibold">Bukti terunggah</span>
        <a href={payment.proofUrl} target="_blank" rel="noopener noreferrer" className="underline">Lihat</a>
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className="text-gray-400 hover:text-navy-700 underline disabled:opacity-50">
          {uploading ? 'Mengunggah…' : 'Ganti'}
        </button>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={pick} />
        {uploading && <Loader2 size={12} className="animate-spin" />}
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={`flex items-center justify-center gap-2 font-semibold rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 disabled:opacity-50 ${compact ? 'px-3 py-2 text-xs' : 'w-full px-4 py-2.5 text-sm'}`}
      >
        {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
        {uploading ? 'Mengunggah…' : 'Upload Bukti Pembayaran'}
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={pick} />
      {error && <p className="text-[11px] text-red-600">{error}</p>}
    </div>
  )
}
