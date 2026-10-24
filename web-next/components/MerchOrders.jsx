'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ShoppingBag, Search, FileSpreadsheet, CheckCircle2, Clock, Wallet, Loader2, Phone } from 'lucide-react'
import * as api from '@/lib/api'
import { AppSelect } from '@/components/ui/app-select'
import { formatRupiah } from '@/components/finance/shared'

// Pesanan merchandise (admin & head coach): siapa yang memesan, isian custom
// (nama punggung, ukuran, nomor, catatan), status pembayaran, dan progres pengerjaan.
const PAY = {
  paid: { label: 'Lunas', cls: 'bg-emerald-50 text-emerald-700' },
  awaiting: { label: 'Menunggu bayar', cls: 'bg-amber-50 text-amber-700' },
  unpaid: { label: 'Belum bayar', cls: 'bg-rose-50 text-rose-600' },
}
const FULFILL = [
  { value: 'baru', label: 'Baru' },
  { value: 'diproses', label: 'Diproses' },
  { value: 'siap', label: 'Siap diambil' },
  { value: 'selesai', label: 'Selesai' },
]

function csvCell(v) {
  return `"${String(v ?? '').replace(/"/g, '""')}"`
}

export default function MerchOrders() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [productFilter, setProductFilter] = useState('')
  const [payFilter, setPayFilter] = useState('all')
  const [savingId, setSavingId] = useState('')

  const load = useCallback(() => {
    api.getMerchOrders().then((res) => { setData(res); setError('') }).catch((err) => setError(err.message))
  }, [])

  useEffect(() => {
    load()
    const timer = setInterval(load, 30000)
    return () => clearInterval(timer)
  }, [load])

  const products = useMemo(() => {
    const map = new Map()
    ;(data?.orders || []).forEach((o) => map.set(o.productId || o.productName, o.productName))
    return Array.from(map, ([value, label]) => ({ value, label }))
  }, [data])

  const orders = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (data?.orders || []).filter((o) => {
      if (productFilter && (o.productId || o.productName) !== productFilter) return false
      if (payFilter === 'paid' && o.paymentStatus !== 'paid') return false
      if (payFilter === 'unpaid' && o.paymentStatus === 'paid') return false
      if (!q) return true
      return [o.student?.fullName, o.student?.parentName, o.student?.parentPhone, o.productName, ...o.custom.map((c) => String(c.value))]
        .some((v) => String(v || '').toLowerCase().includes(q))
    })
  }, [data, search, productFilter, payFilter])

  async function changeFulfillment(order, fulfillment) {
    setSavingId(order.id)
    try {
      await api.setOrderFulfillment(order.id, fulfillment)
      setData((d) => ({ ...d, orders: d.orders.map((o) => (o.id === order.id ? { ...o, fulfillment } : o)) }))
    } catch (err) {
      alert(err.message)
    } finally {
      setSavingId('')
    }
  }

  function exportCsv() {
    const header = ['Tanggal', 'Produk', 'Anak', 'Cabang', 'Orang Tua', 'No. HP', 'Detail Custom', 'Catatan', 'Harga', 'Status Bayar', 'Progres']
    const rows = orders.map((o) => [
      new Date(o.createdAt).toLocaleDateString('id-ID'),
      o.productName,
      o.student?.fullName,
      o.student?.branch?.code,
      o.student?.parentName,
      o.student?.parentPhone,
      o.custom.map((c) => `${c.label}: ${c.value}`).join('; '),
      o.note,
      o.amount,
      PAY[o.paymentStatus].label,
      FULFILL.find((f) => f.value === o.fulfillment)?.label,
    ])
    const csv = [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `pesanan-merchandise-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!data && !error) return <div className="text-sm text-gray-400">Memuat...</div>
  const summary = data?.summary

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-navy-600 to-navy-800 shadow-md shadow-navy-900/25 flex items-center justify-center shrink-0">
            <ShoppingBag size={18} className="text-gold-300" />
          </div>
          <div>
            <h1 className="font-bold text-navy-900 text-lg">Pesanan Merchandise</h1>
            <p className="text-sm text-gray-400">Pesanan parent beserta detail custom dan status pembayaran</p>
          </div>
        </div>
        <button onClick={exportCsv} disabled={orders.length === 0} className="flex items-center gap-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-navy-700 text-xs font-semibold px-3 py-2 rounded-xl disabled:opacity-50">
          <FileSpreadsheet size={14} className="text-emerald-600" /> Export CSV
        </button>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 rounded-2xl px-4 py-3">{error}</div>}

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            ['Total pesanan', summary.total, 'text-navy-900', ShoppingBag],
            ['Sudah bayar', summary.paid, 'text-emerald-600', CheckCircle2],
            ['Belum bayar', summary.unpaid, 'text-rose-600', Clock],
            ['Pendapatan merch', formatRupiah(summary.revenue), 'text-navy-800', Wallet],
          ].map(([label, value, tone, Icon]) => (
            <div key={label} className="glass-card rounded-2xl p-4 flex items-center gap-3">
              <Icon size={18} className={tone} />
              <div><div className={`text-lg font-extrabold tabular-nums ${tone}`}>{value}</div><div className="text-[11px] text-gray-400">{label}</div></div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex bg-gray-100 rounded-2xl p-1">
          {[['all', 'Semua'], ['paid', 'Lunas'], ['unpaid', 'Belum bayar']].map(([key, label]) => (
            <button key={key} onClick={() => setPayFilter(key)} className={`px-3 py-1.5 text-xs font-semibold rounded-xl ${payFilter === key ? 'bg-white text-navy-900 shadow-sm' : 'text-gray-500'}`}>{label}</button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[180px]">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari anak, orang tua, nama punggung, nomor..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-100" />
        </div>
        <AppSelect value={productFilter} onChange={setProductFilter} allLabel="Semua Produk" placeholder="Semua Produk" className="min-w-[160px]" options={products} />
      </div>

      {orders.length === 0 ? (
        <div className="glass-card rounded-3xl p-10 text-center text-sm text-gray-400">{data?.orders.length ? 'Tidak ada hasil yang cocok.' : 'Belum ada pesanan merchandise.'}</div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="glass-card rounded-3xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-navy-900">{o.productName}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PAY[o.paymentStatus].cls}`}>{PAY[o.paymentStatus].label}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {o.student?.fullName}{o.student?.branch?.code ? ` (${o.student.branch.code})` : ''} · {new Date(o.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                  <div className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                    {o.student?.parentName}
                    {o.student?.parentPhone && <><Phone size={10} /> {o.student.parentPhone}</>}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-extrabold text-navy-900 tabular-nums">{formatRupiah(o.amount)}</div>
                  {o.paidAt && <div className="text-[11px] text-gray-400">dibayar {new Date(o.paidAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</div>}
                </div>
              </div>

              {(o.custom.length > 0 || o.note) && (
                <div className="flex flex-wrap gap-1.5">
                  {o.custom.map((c) => (
                    <span key={c.key} className="text-xs rounded-xl bg-gold-50 border border-gold-100 px-2.5 py-1 text-navy-800"><span className="text-gray-500">{c.label}:</span> <b>{c.value}</b></span>
                  ))}
                  {o.note && <span className="text-xs rounded-xl bg-gray-50 border border-gray-100 px-2.5 py-1 text-gray-600">Catatan: {o.note}</span>}
                </div>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] text-gray-400">Progres</span>
                <div className="flex bg-gray-100 rounded-xl p-0.5">
                  {FULFILL.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => o.fulfillment !== f.value && changeFulfillment(o, f.value)}
                      disabled={savingId === o.id}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg ${o.fulfillment === f.value ? 'bg-navy-900 text-white' : 'text-gray-500 hover:text-navy-700'}`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                {savingId === o.id && <Loader2 size={12} className="animate-spin text-navy-300" />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
