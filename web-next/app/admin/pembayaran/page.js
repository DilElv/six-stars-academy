'use client'

import { useEffect, useState } from 'react'
import { Check, Loader2, Wallet, CheckCircle2, Clock, FileSpreadsheet, FileText } from 'lucide-react'
import * as api from '@/lib/api'
import { AppSelect } from '@/components/ui/app-select'
import { exportPaymentsToExcel, exportPaymentsToPDF } from '@/lib/export'

const statusMap = {
  success: { label: 'Lunas', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  pending: { label: 'Menunggu Verifikasi', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  failed: { label: 'Gagal', color: 'bg-red-50 text-red-700 border-red-200' },
}

function formatRupiah(n) {
  return 'Rp' + (n || 0).toLocaleString('id-ID')
}

export default function AdminPembayaranPage() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [verifying, setVerifying] = useState('')

  function load() {
    setLoading(true)
    api.getAllPayments(filterStatus || undefined).then(setPayments).finally(() => setLoading(false))
  }

  useEffect(load, [filterStatus])

  async function handleVerify(id) {
    setVerifying(id)
    try {
      await api.updatePayment(id, { status: 'success', paymentMethod: 'transfer' })
      load()
    } finally {
      setVerifying('')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-bold text-navy-900 text-lg">Pembayaran</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <AppSelect
            value={filterStatus}
            onChange={setFilterStatus}
            allLabel="Semua Status"
            placeholder="Semua Status"
            options={[
              { value: 'pending', label: 'Menunggu Verifikasi' },
              { value: 'success', label: 'Lunas' },
              { value: 'failed', label: 'Gagal' },
            ]}
          />
          <button onClick={() => exportPaymentsToExcel(payments)} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-xl"><FileSpreadsheet size={14} /> Excel</button>
          <button onClick={() => exportPaymentsToPDF(payments)} className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-2 rounded-xl"><FileText size={14} /> PDF</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="glass-card rounded-3xl p-3 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-navy-600 to-navy-800 text-gold-300 shadow-md shadow-navy-900/25 flex items-center justify-center shrink-0"><Wallet size={15} /></div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-xs text-gray-400 mb-0.5">Pendapatan Lunas</div>
            <div className="text-xs sm:text-lg font-bold text-navy-900 leading-tight break-all sm:break-normal">{formatRupiah(payments.filter((p) => p.status === 'success').reduce((sum, p) => sum + p.totalAmount, 0))}</div>
          </div>
        </div>
        <div className="glass-card rounded-3xl p-3 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-md shadow-emerald-500/25 flex items-center justify-center shrink-0"><CheckCircle2 size={15} /></div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-xs text-gray-400 mb-0.5">Transaksi Lunas</div>
            <div className="text-sm sm:text-lg font-bold text-navy-900">{payments.filter((p) => p.status === 'success').length}</div>
          </div>
        </div>
        <div className="glass-card rounded-3xl p-3 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-md shadow-amber-500/25 flex items-center justify-center shrink-0"><Clock size={15} /></div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-xs text-gray-400 mb-0.5">Pending</div>
            <div className="text-sm sm:text-lg font-bold text-navy-900">{payments.filter((p) => p.status === 'pending').length}</div>
          </div>
        </div>
      </div>

      {loading ? null : payments.length === 0 ? (
        <div className="glass-card rounded-3xl p-10 text-center text-sm text-gray-400">Tidak ada transaksi.</div>
      ) : (
        <div className="space-y-3">
          {payments.map((p) => {
            const s = statusMap[p.status] || statusMap.pending
            return (
              <div key={p.id} className="flex items-center gap-4 glass-card rounded-3xl p-4 hover:border-gold-200 transition-colors duration-200">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-navy-900 truncate">{p.student?.fullName}</div>
                  <div className="text-xs text-gray-400">{p.student?.studentId} · {p.student?.parentName}</div>
                  <div className="text-xs text-gray-400">{p.package?.name || '-'} · {new Date(p.paidAt || p.createdAt).toLocaleDateString('id-ID')}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold text-navy-900">{formatRupiah(p.totalAmount)}</div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${s.color}`}>{s.label}</span>
                </div>
                {p.status === 'pending' && (
                  <button
                    onClick={() => handleVerify(p.id)}
                    disabled={verifying === p.id}
                    className="shrink-0 flex items-center gap-1 text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2 rounded-xl disabled:opacity-50"
                  >
                    {verifying === p.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Verifikasi
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
