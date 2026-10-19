'use client'

import { X } from 'lucide-react'
import { formatRupiah, formatDateTime } from '@/components/finance/shared'

const STATUS_LABEL = { success: 'Lunas', pending: 'Menunggu Pembayaran', failed: 'Gagal', expired: 'Kedaluwarsa' }

export default function PaymentDetailModal({ item, onClose }) {
  const rows = [
    ['Waktu Pembayaran', formatDateTime(item.paidAt)],
    ['Tagihan Dibuat', formatDateTime(item.createdAt)],
    ['Status', STATUS_LABEL[item.status] || item.status],
    ['Kategori', item.category],
    ['Anak', item.studentName],
    ['Orang Tua', item.parentName],
    ['Telepon Orang Tua', item.parentPhone],
    ['Cabang', item.branch ? `${item.branch.name || ''}${item.branch.code ? ` (${item.branch.code})` : ''}` : null],
    ['Event', item.eventTitle],
    ['Paket', item.packageName],
    ['Metode Pembayaran', item.paymentMethod],
    ['Ref Transaksi', item.transactionId],
    ['Keterangan', item.note],
    ['Biaya Pendaftaran', item.registrationFee ? formatRupiah(item.registrationFee) : null],
    ['Nominal', formatRupiah(item.amount)],
  ].filter(([, v]) => v)

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-navy-900">Detail Transaksi</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"><X size={16} /></button>
        </div>
        <dl className="divide-y divide-gray-100 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-2">
              <dt className="text-gray-500 shrink-0">{k}</dt>
              <dd className="text-navy-900 font-medium text-right break-all">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}
