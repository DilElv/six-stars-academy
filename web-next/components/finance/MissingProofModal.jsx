'use client'

import { useState } from 'react'
import { X, CheckCircle2, Loader2 } from 'lucide-react'
import * as api from '@/lib/api'
import ModalPortal from '@/components/ui/modal-portal'
import PaymentProofUpload from '@/components/PaymentProofUpload'
import { formatRupiah } from '@/components/finance/shared'

// Daftar pembayaran lunas tanpa bukti. Admin bisa mengonfirmasi manual (langsung
// masuk pemasukan); admin/head coach bisa mengunggah bukti.
export default function MissingProofModal({ missing, isAdmin, onClose, onChanged }) {
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')

  async function confirmManual(m) {
    if (!confirm(`Konfirmasi manual pembayaran ${formatRupiah(m.amount)} dari ${m.parentName || m.studentName || '-'} tanpa bukti? Pembayaran langsung masuk pemasukan.`)) return
    setBusyId(m.id)
    setError('')
    try {
      await api.confirmPaymentWithoutProof(m.id)
      onChanged()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusyId('')
    }
  }

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white rounded-3xl w-full max-w-lg max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-start justify-between gap-3 p-5 pb-3">
            <div>
              <h2 className="font-bold text-navy-900">Menunggu Konfirmasi ({missing.count})</h2>
              <p className="text-xs text-gray-500 mt-0.5">Pembayaran tanpa bukti. Belum masuk pemasukan sampai bukti diunggah atau admin mengonfirmasi.</p>
            </div>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg shrink-0"><X size={16} /></button>
          </div>

          <div className="px-5 pb-1 text-sm text-gray-500">Total <span className="font-bold text-amber-600">{formatRupiah(missing.total)}</span></div>
          {error && <div className="mx-5 mt-2 text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</div>}

          <div className="overflow-y-auto p-5 pt-3 space-y-2">
            {missing.items.length === 0 && (
              <div className="text-center text-sm text-gray-400 py-8 flex flex-col items-center gap-2"><CheckCircle2 size={22} className="text-emerald-500" />Semua pembayaran sudah punya bukti.</div>
            )}
            {missing.items.map((m) => (
              <div key={m.id} className="rounded-2xl border border-gray-100 bg-gray-50/60 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-navy-900 truncate">{m.parentName || '-'}{m.parentPhone ? ` · ${m.parentPhone}` : ''}</div>
                    <div className="text-xs text-gray-500 truncate">{m.description}</div>
                    <div className="text-[11px] text-gray-400">
                      {m.date ? new Date(m.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                      {m.paymentMethod ? ` · ${m.paymentMethod}` : ''}{m.branch?.code ? ` · ${m.branch.code}` : ''}
                    </div>
                  </div>
                  <div className="text-sm font-bold text-navy-900 tabular-nums whitespace-nowrap">{formatRupiah(m.amount)}</div>
                </div>
                <div className="flex items-center gap-2 flex-wrap mt-2">
                  <PaymentProofUpload payment={m} onUploaded={onChanged} compact />
                  {isAdmin && (
                    <button
                      onClick={() => confirmManual(m)}
                      disabled={busyId === m.id}
                      className="ml-auto flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50"
                    >
                      {busyId === m.id ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Konfirmasi manual
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}
