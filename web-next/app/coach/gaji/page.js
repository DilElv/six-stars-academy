'use client'

import { useEffect, useState } from 'react'
import { Banknote, CalendarDays, CheckCircle2, Clock, Loader2, RefreshCw } from 'lucide-react'
import * as api from '@/lib/api'
import { AppSelect } from '@/components/ui/app-select'

const MONTHS = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const now = new Date()

function rupiah(value) {
  return 'Rp' + (Number(value) || 0).toLocaleString('id-ID')
}

export default function CoachGajiPage() {
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  function load() {
    setLoading(true)
    setError('')
    api.getMyPayroll(month, year)
      .then(setData)
      .catch((err) => setError(err.message || 'Gagal memuat data gaji'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [month, year])
  const payroll = data?.payroll
  const paid = payroll?.status === 'paid'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-navy-600 to-navy-800 shadow-md shadow-navy-900/25 flex items-center justify-center">
            <Banknote size={18} className="text-gold-300" />
          </div>
          <div>
            <h1 className="font-bold text-navy-900 text-lg">Gaji Saya</h1>
            <p className="text-sm text-gray-400">Rincian honor bulanan Anda</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AppSelect value={String(month)} onChange={(v) => setMonth(Number(v))} options={MONTHS.slice(1).map((label, i) => ({ value: String(i + 1), label }))} />
          <AppSelect value={String(year)} onChange={(v) => setYear(Number(v))} options={[year - 1, year, year + 1].map((value) => ({ value: String(value), label: String(value) }))} />
          <button onClick={load} className="p-2.5 rounded-2xl border border-gray-200 text-navy-700 hover:bg-gray-50" title="Muat ulang">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-2xl p-3 text-sm text-red-600">{error}</div>}

      {loading ? (
        <div className="py-16 text-center"><Loader2 size={20} className="animate-spin text-navy-300 inline" /></div>
      ) : !payroll ? (
        <div className="glass-card rounded-3xl p-10 text-center">
          <CalendarDays size={28} className="text-gray-300 mx-auto mb-3" />
          <div className="font-semibold text-navy-800">Slip gaji belum tersedia</div>
          <p className="text-sm text-gray-400 mt-1">Payroll {MONTHS[month]} {year} akan tampil setelah dibuat oleh Admin atau Head Coach.</p>
        </div>
      ) : (
        <div className="max-w-2xl glass-card rounded-3xl overflow-hidden">
          <div className="bg-gradient-to-r from-navy-900 to-navy-700 px-6 py-5 text-white flex items-start justify-between gap-4">
            <div>
              <div className="text-xs text-gray-300">Periode Penggajian</div>
              <div className="font-bold text-lg mt-0.5">{MONTHS[payroll.month]} {payroll.year}</div>
            </div>
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${paid ? 'bg-emerald-400/20 text-emerald-200' : 'bg-amber-400/20 text-amber-100'}`}>
              {paid ? <CheckCircle2 size={13} /> : <Clock size={13} />} {paid ? 'Sudah Dibayar' : 'Menunggu Pembayaran'}
            </span>
          </div>
          <div className="p-6 space-y-4">
            <div className="rounded-2xl bg-gold-50 border border-gold-100 px-5 py-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-navy-800">Total Gaji</span>
              <span className="text-2xl font-bold text-navy-900 tabular-nums">{rupiah(payroll.total)}</span>
            </div>
            <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden text-sm">
              <Row label="Honor per hari" value={rupiah(payroll.dailyRate)} />
              <Row label="Hari hadir" value={`${payroll.daysPresent} hari`} />
              <Row label="Honor kehadiran" value={rupiah(payroll.dailyRate * payroll.daysPresent)} />
              <Row label="Bonus" value={rupiah(payroll.bonus)} positive />
              <Row label="Potongan" value={`-${rupiah(payroll.deduction)}`} negative />
            </div>
            {payroll.note && <div className="text-sm bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3"><span className="font-semibold text-navy-800">Catatan: </span><span className="text-gray-600">{payroll.note}</span></div>}
            {paid && payroll.paidAt && <p className="text-xs text-emerald-700">Dibayar pada {new Date(payroll.paidAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}.</p>}
            <p className="text-[11px] text-gray-400">Data ini hanya dapat dilihat. Perubahan payroll dilakukan oleh Admin atau Head Coach.</p>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value, positive, negative }) {
  return <div className="flex items-center justify-between px-4 py-3"><span className="text-gray-500">{label}</span><span className={`font-semibold tabular-nums ${positive ? 'text-emerald-600' : negative ? 'text-red-600' : 'text-navy-900'}`}>{value}</span></div>
}
