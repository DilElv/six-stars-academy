'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Loader2, TrendingUp, Clock, Plus, Trash2, Pencil, FileSpreadsheet, FileText, Search } from 'lucide-react'
import * as api from '@/lib/api'
import DailyLedgerChart from '@/components/charts/DailyLedgerChart'
import CategoryBreakdownChart from '@/components/charts/CategoryBreakdownChart'
import LedgerEntryModal from '@/components/finance/LedgerEntryModal'
import { exportLedgerToCSV, exportLedgerToPDF } from '@/lib/financeExport'
import { AppSelect } from '@/components/ui/app-select'
import { MONTH_LABELS, MonthFilter, useMonthFilter, formatRupiah } from '@/components/finance/shared'

export default function PemasukanTab({ canVerifyPayments = false }) {
  const { month, setMonth, year, setYear } = useMonthFilter()
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [breakdown, setBreakdown] = useState([])
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editEntry, setEditEntry] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)

  const [pendingPayments, setPendingPayments] = useState([])
  const [verifying, setVerifying] = useState('')

  useEffect(() => { api.getMe().then(setCurrentUser).catch(() => {}) }, [])

  function load() {
    setLoading(true)
    api.getPemasukan({ month, year }).then((res) => { setItems(res.items); setTotal(res.total); setBreakdown(res.breakdown || []) }).finally(() => setLoading(false))
    if (canVerifyPayments) api.getAllPayments('pending').then(setPendingPayments).catch(() => {})
  }

  useEffect(load, [month, year])
  useEffect(() => { setCategoryFilter('') }, [month, year])

  async function handleVerify(id) {
    setVerifying(id)
    try {
      await api.updatePayment(id, { status: 'success', paymentMethod: 'transfer' })
      load()
    } finally {
      setVerifying('')
    }
  }

  async function handleDelete(id) {
    if (!confirm('Hapus catatan pemasukan manual ini?')) return
    await api.deleteLedgerEntry(id)
    load()
  }

  const daysInMonth = new Date(year, month, 0).getDate()
  const canEdit = (item) => item.source === 'manual' && (currentUser?.role === 'admin' || item.createdById === currentUser?.id)

  const categoryOptions = useMemo(() => {
    const set = new Set(items.map((i) => i.category).filter(Boolean))
    return Array.from(set).sort()
  }, [items])

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((item) => {
      if (categoryFilter && item.category !== categoryFilter) return false
      if (q && !item.description.toLowerCase().includes(q) && !item.category?.toLowerCase().includes(q)) return false
      return true
    })
  }, [items, search, categoryFilter])

  const filteredTotal = useMemo(() => filteredItems.reduce((sum, i) => sum + i.amount, 0), [filteredItems])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-bold text-navy-900 text-lg">Pemasukan</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <MonthFilter month={month} setMonth={setMonth} year={year} setYear={setYear} />
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-sm"><Plus size={14} /> Tambah Manual</button>
          <div className="flex items-center gap-1">
            <button onClick={() => exportLedgerToCSV(filteredItems, { type: 'pemasukan', month, year })} title="Export CSV" className="flex items-center gap-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-navy-700 text-xs font-semibold px-3 py-2 rounded-xl"><FileSpreadsheet size={14} className="text-emerald-600" /> CSV</button>
            <button onClick={() => exportLedgerToPDF(filteredItems, { type: 'pemasukan', month, year, total: filteredTotal })} title="Export PDF" className="flex items-center gap-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-navy-700 text-xs font-semibold px-3 py-2 rounded-xl"><FileText size={14} className="text-red-600" /> PDF</button>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-4">
        <div className="lg:col-span-3 rounded-3xl p-5 flex flex-col justify-center bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/20">
          <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center mb-3"><TrendingUp size={20} /></div>
          <div className="text-xs text-emerald-100 mb-0.5">Total Pemasukan</div>
          <div className="text-2xl font-extrabold tracking-tight">{formatRupiah(total)}</div>
          <div className="text-xs text-emerald-100 mt-1">{MONTH_LABELS[month]} {year}</div>
        </div>
        <div className="lg:col-span-5 glass-card rounded-3xl p-4 sm:p-5">
          <div className="text-xs font-semibold text-gray-500 mb-2">Tren Harian — {MONTH_LABELS[month]} {year}</div>
          <DailyLedgerChart items={items} daysInMonth={daysInMonth} color="#10b981" gradientId="pemasukanGradient" height={170} />
        </div>
        <div className="lg:col-span-4 glass-card rounded-3xl p-4 sm:p-5">
          <div className="text-xs font-semibold text-gray-500 mb-2">Sumber Pemasukan</div>
          <CategoryBreakdownChart data={breakdown} height={170} />
        </div>
      </div>

      {canVerifyPayments && pendingPayments.length > 0 && (
        <div className="glass-card rounded-3xl p-4 space-y-2 border border-amber-100">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-amber-700"><Clock size={14} /> Menunggu Verifikasi ({pendingPayments.length})</div>
          {pendingPayments.map((p) => (
            <div key={p.id} className="flex items-center gap-3 bg-amber-50 rounded-2xl p-3">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-navy-900 text-sm truncate">{p.student?.fullName}</div>
                <div className="text-xs text-gray-500">{formatRupiah(p.totalAmount)} · {p.package?.name || '-'}</div>
              </div>
              <button onClick={() => handleVerify(p.id)} disabled={verifying === p.id} className="shrink-0 flex items-center gap-1 text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2 rounded-xl disabled:opacity-50">
                {verifying === p.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Verifikasi
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari deskripsi atau kategori..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
          />
        </div>
        <AppSelect
          value={categoryFilter}
          onChange={setCategoryFilter}
          allLabel="Semua Kategori"
          placeholder="Semua Kategori"
          className="min-w-[180px]"
          options={categoryOptions.map((c) => ({ value: c, label: c }))}
        />
      </div>

      {loading ? null : filteredItems.length === 0 ? (
        <div className="glass-card rounded-3xl p-10 text-center text-sm text-gray-400">{items.length === 0 ? 'Tidak ada pemasukan bulan ini.' : 'Tidak ada hasil yang cocok.'}</div>
      ) : (
        <div className="glass-card rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Tanggal</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500">Deskripsi</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500">Sumber</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500">Nominal</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredItems.map((item) => (
                  <tr key={`${item.source}-${item.id}`} className="hover:bg-gray-50/60">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</td>
                    <td className="px-3 py-3">
                      <div className="font-medium text-navy-900 flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.source === 'payment' ? 'bg-navy-400' : 'bg-emerald-500'}`} />
                        {item.description}
                      </div>
                      <div className="text-[11px] text-gray-400 ml-3.5">{item.category}{item.branch ? ` · ${item.branch.code}` : ''}</div>
                    </td>
                    <td className="px-3 py-3 text-gray-500">{item.source === 'payment' ? 'Otomatis' : `Manual${item.createdBy ? ` (${item.createdBy})` : ''}`}</td>
                    <td className="px-3 py-3 text-right font-bold text-emerald-600 whitespace-nowrap">{formatRupiah(item.amount)}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {canEdit(item) && (
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setEditEntry(item)} className="p-1.5 text-gray-400 hover:text-navy-600 hover:bg-gray-100 rounded-lg"><Pencil size={13} /></button>
                          <button onClick={() => handleDelete(item.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={13} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-emerald-50/70 border-t-2 border-emerald-200">
                  <td colSpan={3} className="px-4 py-3 text-sm font-bold text-navy-900">Total{categoryFilter || search ? ' (sesuai filter)' : ''}</td>
                  <td className="px-3 py-3 text-right text-sm font-extrabold text-emerald-700 whitespace-nowrap">{formatRupiah(filteredTotal)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {showAdd && <LedgerEntryModal type="income" onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load() }} />}
      {editEntry && <LedgerEntryModal type="income" entry={editEntry} onClose={() => setEditEntry(null)} onSaved={() => { setEditEntry(null); load() }} />}
    </div>
  )
}
