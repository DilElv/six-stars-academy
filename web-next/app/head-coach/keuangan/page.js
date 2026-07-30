'use client'

import { useEffect, useState } from 'react'
import { Loader2, Wallet, TrendingUp, TrendingDown, Plus, Trash2, Save } from 'lucide-react'
import * as api from '@/lib/api'
import { AppSelect } from '@/components/ui/app-select'

const MONTH_LABELS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

function formatRupiah(n) {
  return 'Rp' + (n || 0).toLocaleString('id-ID')
}

function useMonthFilter() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  return { month, setMonth, year, setYear }
}

function MonthFilter({ month, setMonth, year, setYear }) {
  const thisYear = new Date().getFullYear()
  return (
    <div className="flex items-center gap-2">
      <AppSelect value={month} onChange={(v) => setMonth(Number(v))} className="w-40" options={MONTH_LABELS.map((m, i) => ({ value: i + 1, label: m }))} />
      <AppSelect value={year} onChange={(v) => setYear(Number(v))} className="w-28" options={[thisYear - 1, thisYear, thisYear + 1].map((y) => ({ value: y, label: String(y) }))} />
    </div>
  )
}

export default function HeadCoachKeuanganPage() {
  const [tab, setTab] = useState('pemasukan')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1 bg-gray-100 rounded-2xl p-1 w-fit">
        <button onClick={() => setTab('pemasukan')} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === 'pemasukan' ? 'bg-white shadow-sm text-navy-900' : 'text-gray-500 hover:text-navy-700'}`}>Pemasukan</button>
        <button onClick={() => setTab('pengeluaran')} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === 'pengeluaran' ? 'bg-white shadow-sm text-navy-900' : 'text-gray-500 hover:text-navy-700'}`}>Pengeluaran</button>
      </div>

      {tab === 'pemasukan' ? <PemasukanTab /> : <PengeluaranTab />}
    </div>
  )
}

function PemasukanTab() {
  const { month, setMonth, year, setYear } = useMonthFilter()
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  function load() {
    setLoading(true)
    api.getPemasukan({ month, year }).then((res) => { setItems(res.items); setTotal(res.total) }).finally(() => setLoading(false))
  }

  useEffect(load, [month, year])

  return (
    <>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-bold text-navy-900 text-lg">Pemasukan</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <MonthFilter month={month} setMonth={setMonth} year={year} setYear={setYear} />
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 bg-gold-400 hover:bg-gold-500 text-navy-900 text-xs font-semibold px-3 py-2 rounded-xl"><Plus size={14} /> Tambah Manual</button>
        </div>
      </div>

      <div className="glass-card rounded-3xl p-4 sm:p-5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-md shadow-emerald-500/25 flex items-center justify-center shrink-0"><TrendingUp size={16} /></div>
        <div>
          <div className="text-xs text-gray-400 mb-0.5">Total Pemasukan — {MONTH_LABELS[month - 1]} {year}</div>
          <div className="text-lg font-bold text-navy-900">{formatRupiah(total)}</div>
        </div>
      </div>

      {loading ? null : items.length === 0 ? (
        <div className="glass-card rounded-3xl p-10 text-center text-sm text-gray-400">Tidak ada pemasukan bulan ini.</div>
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => (
            <div key={`${item.source}-${item.id}`} className="flex items-center gap-4 glass-card rounded-3xl p-4">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${item.source === 'payment' ? 'bg-navy-50 text-navy-700' : 'bg-emerald-50 text-emerald-700'}`}>
                <Wallet size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-navy-900 text-sm truncate">{item.description}</div>
                <div className="text-xs text-gray-400">{new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} · {item.source === 'payment' ? 'Otomatis' : `Manual${item.createdBy ? ` · ${item.createdBy}` : ''}`}{item.branch ? ` · ${item.branch.code}` : ''}</div>
              </div>
              <div className="font-bold text-navy-900 shrink-0">{formatRupiah(item.amount)}</div>
            </div>
          ))}
        </div>
      )}

      {showAdd && <AddLedgerModal type="income" onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load() }} />}
    </>
  )
}

function PengeluaranTab() {
  const { month, setMonth, year, setYear } = useMonthFilter()
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  function load() {
    setLoading(true)
    api.getPengeluaran({ month, year }).then((res) => { setItems(res.items); setTotal(res.total) }).finally(() => setLoading(false))
  }

  useEffect(load, [month, year])

  async function handleDelete(id) {
    if (!confirm('Hapus catatan pengeluaran ini?')) return
    await api.deleteLedgerEntry(id)
    load()
  }

  return (
    <>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-bold text-navy-900 text-lg">Pengeluaran</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <MonthFilter month={month} setMonth={setMonth} year={year} setYear={setYear} />
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 bg-gold-400 hover:bg-gold-500 text-navy-900 text-xs font-semibold px-3 py-2 rounded-xl"><Plus size={14} /> Tambah Pengeluaran</button>
        </div>
      </div>

      <div className="glass-card rounded-3xl p-4 sm:p-5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-400 to-red-600 text-white shadow-md shadow-red-500/25 flex items-center justify-center shrink-0"><TrendingDown size={16} /></div>
        <div>
          <div className="text-xs text-gray-400 mb-0.5">Total Pengeluaran — {MONTH_LABELS[month - 1]} {year}</div>
          <div className="text-lg font-bold text-navy-900">{formatRupiah(total)}</div>
        </div>
      </div>

      {loading ? null : items.length === 0 ? (
        <div className="glass-card rounded-3xl p-10 text-center text-sm text-gray-400">Tidak ada pengeluaran bulan ini.</div>
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-4 glass-card rounded-3xl p-4">
              <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0"><TrendingDown size={14} /></div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-navy-900 text-sm truncate">{item.description}</div>
                <div className="text-xs text-gray-400">{new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}{item.createdBy ? ` · ${item.createdBy.name}` : ''}{item.branch ? ` · ${item.branch.code}` : ''}</div>
              </div>
              <div className="font-bold text-navy-900 shrink-0">{formatRupiah(item.amount)}</div>
              <button onClick={() => handleDelete(item.id)} className="shrink-0 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}

      {showAdd && <AddLedgerModal type="expense" onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load() }} />}
    </>
  )
}

function AddLedgerModal({ type, onClose, onSaved }) {
  const [form, setForm] = useState({ description: '', amount: '', date: new Date().toISOString().slice(0, 10) })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.createLedgerEntry({ type, description: form.description, amount: Number(form.amount), date: form.date })
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-bold text-navy-900">{type === 'income' ? 'Tambah Pemasukan Manual' : 'Tambah Pengeluaran'}</h3>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Deskripsi</label>
            <input required value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder={type === 'income' ? 'mis. Sponsor lokal' : 'mis. Beli minum & obat latihan'} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Nominal (Rp)</label>
            <input required type="number" min={1} value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Tanggal</label>
            <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm" />
          </div>
          <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 bg-gold-400 hover:bg-gold-500 text-navy-900 font-bold py-2.5 rounded-2xl disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Simpan
          </button>
        </form>
      </div>
    </div>
  )
}
