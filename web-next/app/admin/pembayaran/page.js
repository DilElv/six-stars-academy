'use client'

import { useEffect, useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import * as api from '@/lib/api'

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
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 bg-white border border-gray-200 rounded-2xl text-sm">
          <option value="">Semua Status</option>
          <option value="pending">Menunggu Verifikasi</option>
          <option value="success">Lunas</option>
          <option value="failed">Gagal</option>
        </select>
      </div>

      {loading ? null : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Siswa</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500">Paket</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500">Total</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500">Status</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500">Tanggal</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {payments.map((p) => {
                const s = statusMap[p.status] || statusMap.pending
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-navy-900">{p.student?.fullName}</div>
                      <div className="text-xs text-gray-400">{p.student?.studentId} · {p.student?.parentName}</div>
                    </td>
                    <td className="px-3 py-3 text-gray-500">{p.package?.name || '-'}</td>
                    <td className="px-3 py-3 text-right font-semibold text-navy-900">{formatRupiah(p.totalAmount)}</td>
                    <td className="px-3 py-3 text-center">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${s.color}`}>{s.label}</span>
                    </td>
                    <td className="px-3 py-3 text-right text-gray-400">{new Date(p.paidAt || p.createdAt).toLocaleDateString('id-ID')}</td>
                    <td className="px-4 py-3 text-right">
                      {p.status === 'pending' && (
                        <button
                          onClick={() => handleVerify(p.id)}
                          disabled={verifying === p.id}
                          className="flex items-center gap-1 ml-auto text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg disabled:opacity-50"
                        >
                          {verifying === p.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Verifikasi
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
          {payments.length === 0 && <div className="p-10 text-center text-sm text-gray-400">Tidak ada transaksi.</div>}
        </div>
      )}
    </div>
  )
}
