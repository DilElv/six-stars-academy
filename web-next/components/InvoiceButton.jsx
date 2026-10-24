'use client'

import { useState } from 'react'
import { FileDown, Loader2 } from 'lucide-react'
import * as api from '@/lib/api'

// Tombol unduh invoice PDF untuk pembayaran yang sudah lunas.
export default function InvoiceButton({ paymentId, className = '', label = 'Unduh Invoice' }) {
  const [busy, setBusy] = useState(false)

  async function download(e) {
    e.stopPropagation()
    setBusy(true)
    try {
      await api.downloadInvoice(paymentId)
    } catch (err) {
      alert(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={download}
      disabled={busy}
      className={`inline-flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-navy-200 text-navy-800 bg-white hover:bg-navy-50 disabled:opacity-60 ${className}`}
    >
      {busy ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />} {label}
    </button>
  )
}
