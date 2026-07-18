'use client'

import { useEffect, useState } from 'react'
import * as api from '@/lib/api'

const statusMap = {
  success: { label: 'Lunas', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  pending: { label: 'Menunggu Verifikasi', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  failed: { label: 'Gagal', color: 'bg-red-50 text-red-700 border-red-200' },
}

function formatRupiah(n) {
  return 'Rp' + (n || 0).toLocaleString('id-ID')
}

export default function PembayaranAnakPage() {
  const [payments, setPayments] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getMyPayments().then(setPayments).catch((err) => setError(err.message))
  }, [])

  if (error) return <p className="text-sm text-red-500">{error}</p>
  if (!payments) return null

  return (
    <div className="space-y-6">
      <h1 className="font-bold text-navy-900 text-lg">Riwayat Pembayaran</h1>

      {payments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-sm text-gray-400">
          Belum ada riwayat pembayaran.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Paket</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500">Jenis</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500">Total</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Tanggal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {payments.map((p) => {
                const s = statusMap[p.status] || statusMap.pending
                return (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-medium text-navy-900">{p.package?.name || '-'}</td>
                    <td className="px-3 py-3 text-gray-500 capitalize">{p.paymentType}</td>
                    <td className="px-3 py-3 text-right font-semibold text-navy-900">{formatRupiah(p.totalAmount)}</td>
                    <td className="px-3 py-3 text-center">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${s.color}`}>{s.label}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400">
                      {new Date(p.paidAt || p.createdAt).toLocaleDateString('id-ID')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  )
}
