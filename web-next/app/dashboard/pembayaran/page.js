'use client'

import { useEffect, useState } from 'react'
import { Wallet, CheckCircle2, Clock, ChevronDown, Receipt, CreditCard, Hash, CalendarCheck, RefreshCw, AlertTriangle, ExternalLink } from 'lucide-react'
import * as api from '@/lib/api'
import RenewalModal from '@/components/RenewalModal'

const statusMap = {
  success: { label: 'Lunas', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  pending: { label: 'Menunggu Verifikasi', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  failed: { label: 'Gagal', color: 'bg-red-50 text-red-700 border-red-200' },
}

const FILTERS = [
  { value: 'all', label: 'Semua' },
  { value: 'success', label: 'Lunas' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Gagal' },
]

function formatRupiah(n) {
  return 'Rp' + (n || 0).toLocaleString('id-ID')
}

export default function PembayaranAnakPage() {
  const [payments, setPayments] = useState(null)
  const [child, setChild] = useState(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [expanded, setExpanded] = useState(null)
  const [showRenewal, setShowRenewal] = useState(false)

  function load() {
    api.getMyPayments().then(setPayments).catch((err) => setError(err.message))
    api.getMyChild().then(setChild).catch(() => {})
  }

  useEffect(load, [])

  if (error) return <p className="text-sm text-red-500">{error}</p>
  if (!payments) return null

  const totalLunas = payments.filter((p) => p.status === 'success').reduce((sum, p) => sum + p.totalAmount, 0)
  const jumlahLunas = payments.filter((p) => p.status === 'success').length
  const jumlahPending = payments.filter((p) => p.status === 'pending').length
  const filtered = filter === 'all' ? payments : payments.filter((p) => p.status === filter)

  const isExpired = child?.packageEndDate && new Date(child.packageEndDate) < new Date()
  const daysLeft = child?.packageEndDate ? Math.ceil((new Date(child.packageEndDate) - new Date()) / (1000 * 60 * 60 * 24)) : null
  const nearExpiry = daysLeft != null && daysLeft <= 14 && daysLeft >= 0

  return (
    <div className="space-y-6">
      <h1 className="font-bold text-navy-900 text-lg">Riwayat Pembayaran</h1>

      {child && (isExpired || nearExpiry) && (
        <div className={`flex items-center justify-between gap-3 flex-wrap rounded-3xl px-5 py-4 border ${isExpired ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'}`}>
          <div className="flex items-center gap-3">
            <AlertTriangle size={18} className={isExpired ? 'text-red-600 shrink-0' : 'text-amber-600 shrink-0'} />
            <div className={`text-sm ${isExpired ? 'text-red-800' : 'text-amber-800'}`}>
              {isExpired
                ? `Paket ${child.fullName} sudah berakhir. Perpanjang sekarang agar bisa tetap ikut latihan.`
                : `Paket ${child.fullName} akan berakhir dalam ${daysLeft} hari.`}
            </div>
          </div>
          <button
            onClick={() => setShowRenewal(true)}
            className="flex items-center gap-1.5 bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold px-4 py-2 rounded-2xl shrink-0"
          >
            <RefreshCw size={14} /> Perpanjang Paket
          </button>
        </div>
      )}

      {child && !isExpired && !nearExpiry && (
        <div className="flex items-center justify-between gap-3 flex-wrap glass-card rounded-3xl px-5 py-4">
          <div className="flex items-center gap-3">
            <Wallet size={18} className="text-navy-700 shrink-0" />
            <div className="text-sm text-navy-800">
              Paket aktif hingga <b>{child.packageEndDate ? new Date(child.packageEndDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</b>
            </div>
          </div>
          <button
            onClick={() => setShowRenewal(true)}
            className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-navy-900 text-sm font-semibold px-4 py-2 rounded-2xl shrink-0"
          >
            <RefreshCw size={14} /> Perpanjang Paket
          </button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="glass-card rounded-3xl p-3 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-navy-600 to-navy-800 text-gold-300 shadow-md shadow-navy-900/25 flex items-center justify-center shrink-0"><Wallet size={15} /></div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-xs text-gray-400 mb-0.5">Total Dibayar</div>
            <div className="text-xs sm:text-lg font-bold text-navy-900 leading-tight break-all sm:break-normal">{formatRupiah(totalLunas)}</div>
          </div>
        </div>
        <div className="glass-card rounded-3xl p-3 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-md shadow-emerald-500/25 flex items-center justify-center shrink-0"><CheckCircle2 size={15} /></div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-xs text-gray-400 mb-0.5">Transaksi Lunas</div>
            <div className="text-sm sm:text-lg font-bold text-navy-900">{jumlahLunas}</div>
          </div>
        </div>
        <div className="glass-card rounded-3xl p-3 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-md shadow-amber-500/25 flex items-center justify-center shrink-0"><Clock size={15} /></div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-xs text-gray-400 mb-0.5">Pending</div>
            <div className="text-sm sm:text-lg font-bold text-navy-900">{jumlahPending}</div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`text-xs font-semibold px-3.5 py-2 rounded-full border transition-colors duration-150 ${
              filter === f.value ? 'bg-navy-900 border-navy-900 text-white' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="glass-card rounded-3xl p-10 text-center text-sm text-gray-400">
          Belum ada riwayat pembayaran.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => {
            const s = statusMap[p.status] || statusMap.pending
            const isOpen = expanded === p.id
            return (
              <div key={p.id} className="glass-card rounded-3xl overflow-hidden hover:border-gold-200 transition-colors duration-200">
                <button
                  onClick={() => setExpanded((e) => (e === p.id ? null : p.id))}
                  className="w-full flex items-center gap-4 p-4 text-left"
                >
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-navy-600 to-navy-800 text-gold-300 shadow-md shadow-navy-900/25 flex items-center justify-center shrink-0">
                    <Wallet size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-navy-900 truncate">{p.package?.name || p.eventParticipant?.event?.title || '-'}</div>
                    <div className="text-xs text-gray-400 capitalize">{p.paymentType} · {new Date(p.paidAt || p.createdAt).toLocaleDateString('id-ID')}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-navy-900">{formatRupiah(p.totalAmount)}</div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${s.color}`}>{s.label}</span>
                  </div>
                  <ChevronDown size={16} className={`text-gray-300 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                  <div className="px-4 pb-4">
                    <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4 space-y-3">
                      <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                        <Receipt size={13} /> Rincian Pembayaran
                      </div>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Biaya Paket</span>
                          <span className="text-navy-900 font-medium tabular-nums">{formatRupiah(p.amount)}</span>
                        </div>
                        {p.registrationFee > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Biaya Pendaftaran</span>
                            <span className="text-navy-900 font-medium tabular-nums">{formatRupiah(p.registrationFee)}</span>
                          </div>
                        )}
                        <div className="h-px bg-gray-200 my-1" />
                        <div className="flex justify-between font-bold">
                          <span className="text-navy-900">Total</span>
                          <span className="text-navy-900 tabular-nums">{formatRupiah(p.totalAmount)}</span>
                        </div>
                      </div>
                      <div className="h-px bg-gray-200" />
                      <div className="grid sm:grid-cols-2 gap-2.5 text-xs text-gray-500">
                        <div className="flex items-center gap-2">
                          <CreditCard size={13} className="text-gray-400 shrink-0" />
                          Metode: {p.paymentMethod || '-'}
                        </div>
                        <div className="flex items-center gap-2">
                          <Hash size={13} className="text-gray-400 shrink-0" />
                          ID Transaksi: {p.transactionId || p.id.slice(0, 10)}
                        </div>
                        <div className="flex items-center gap-2">
                          <CalendarCheck size={13} className="text-gray-400 shrink-0" />
                          Dibuat: {new Date(p.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                        {p.paidAt && (
                          <div className="flex items-center gap-2">
                            <CalendarCheck size={13} className="text-emerald-500 shrink-0" />
                            Dibayar: {new Date(p.paidAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </div>
                        )}
                      </div>
                      {p.status === 'pending' && p.paymentLink && (
                        <a
                          href={p.paymentLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 bg-gold-400 hover:bg-gold-500 text-navy-900 font-semibold text-sm px-4 py-2.5 rounded-2xl"
                        >
                          <ExternalLink size={14} /> Lanjutkan Pembayaran
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showRenewal && (
        <RenewalModal
          onClose={() => setShowRenewal(false)}
          onDone={() => { setShowRenewal(false); load() }}
        />
      )}
    </div>
  )
}
