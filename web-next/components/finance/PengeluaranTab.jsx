'use client'

import { useEffect, useMemo, useState } from 'react'
import { TrendingDown, Plus, Trash2, Pencil, FileSpreadsheet, FileText, Search } from 'lucide-react'
import * as api from '@/lib/api'
import DailyLedgerChart from '@/components/charts/DailyLedgerChart'
import CategoryBreakdownChart from '@/components/charts/CategoryBreakdownChart'
import LedgerEntryModal from '@/components/finance/LedgerEntryModal'
import { exportLedgerToCSV, exportLedgerToPDF } from '@/lib/financeExport'
import { AppSelect } from '@/components/ui/app-select'
import { MONTH_LABELS, MonthFilter, useMonthFilter, formatRupiah } from '@/components/finance/shared'

export default function PengeluaranTab() {
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

  useEffect(() => { api.getMe().then(setCurrentUser).catch(() => {}) }, [])

  function load() {
    setLoading(true)
    api.getPengeluaran({ month, year }).then((res) => { setItems(res.items); setTotal(res.total); setBreakdown(res.breakdown || []) }).finally(() => setLoading(false))
  }

  useEffect(load, [month, year])
  useEffect(() => { setCategoryFilter('') }, [month, year])

  async function handleDelete(id) {
    if (!confirm('Hapus catatan pengeluaran ini?')) return
    await api.deleteLedgerEntry(id)
    load()
  }

  const daysInMonth = new Date(year, month, 0).getDate()
  const canEdit = (item) => currentUser?.role === 'admin' || item.createdById === currentUser?.id

  const categoryOptions = useMemo(() => {
    const set = new Set(items.map((i) => i.category || 'Lainnya'))
    return Array.from(set).sort()
  }, [items])

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((item) => {
      const cat = item.category || 'Lainnya'
      if (categoryFilter && cat !== categoryFilter) return false
      if (q && !item.description.toLowerCase().includes(q) && !cat.toLowerCase().includes(q)) return false
      return true
    })
  }, [items, search, categoryFilter])

  const filteredTotal = useMemo(() => filteredItems.reduce((sum, i) => sum + i.amount, 0), [filteredItems])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-bold text-navy-900 text-lg">Pengeluaran</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <MonthFilter month={month} setMonth={setMonth} year={year} setYear={setYear} />
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-sm"><Plus size={14} /> Tambah Pengeluaran</button>
          <div className="flex items-center gap-1">
            <button onClick={() => exportLedgerToCSV(filteredItems, { type: 'pengeluaran', month, year })} title="Export CSV" className="flex items-center gap-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-navy-700 text-xs font-semibold px-3 py-2 rounded-xl"><FileSpreadsheet size={14} className="text-emerald-600" /> CSV</button>
            <button onClick={() => exportLedgerToPDF(filteredItems, { type: 'pengeluaran', month, year, total: filteredTotal })} title="Export PDF" className="flex items-center gap-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-navy-700 text-xs font-semibold px-3 py-2 rounded-xl"><FileText size={14} className="text-red-600" /> PDF</button>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-4">
        <div className="lg:col-span-3 rounded-3xl p-5 flex flex-col justify-center bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg shadow-red-500/20">
          <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center mb-3"><TrendingDown size={20} /></div>
          <div className="text-xs text-red-100 mb-0.5">Total Pengeluaran</div>
          <div className="text-2xl font-extrabold tracking-tight">{formatRupiah(total)}</div>
          <div className="text-xs text-red-100 mt-1">{MONTH_LABELS[month]} {year}</div>
        </div>
        <div className="lg:col-span-5 glass-card rounded-3xl p-4 sm:p-5">
          <div className="text-xs font-semibold text-gray-500 mb-2">Tren Harian — {MONTH_LABELS[month]} {year}</div>
          <DailyLedgerChart items={items} daysInMonth={daysInMonth} color="#ef4444" gradientId="pengeluaranGradient" height={170} />
        </div>
        <div className="lg:col-span-4 glass-card rounded-3xl p-4 sm:p-5">
          <div className="text-xs font-semibold text-gray-500 mb-2">Kategori Pengeluaran</div>
          <CategoryBreakdownChart data={breakdown} height={170} />
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari deskripsi atau kategori..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
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
        <div className="glass-card rounded-3xl p-10 text-center text-sm text-gray-400">{items.length === 0 ? 'Tidak ada pengeluaran bulan ini.' : 'Tidak ada hasil yang cocok.'}</div>
      ) : (
        <div className="glass-card rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Tanggal</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500">Deskripsi</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500">Dicatat Oleh</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500">Nominal</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</td>
                    <td className="px-3 py-3">
                      <div className="font-medium text-navy-900">{item.description}</div>
                      <div className="text-[11px] text-gray-400">{item.category || 'Lainnya'}{item.branch ? ` · ${item.branch.code}` : ''}</div>
                    </td>
                    <td className="px-3 py-3 text-gray-500">{item.createdBy?.name || '-'}</td>
                    <td className="px-3 py-3 text-right font-bold text-red-600 whitespace-nowrap">{formatRupiah(item.amount)}</td>
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
                <tr className="bg-red-50/70 border-t-2 border-red-200">
                  <td colSpan={3} className="px-4 py-3 text-sm font-bold text-navy-900">Total{categoryFilter || search ? ' (sesuai filter)' : ''}</td>
                  <td className="px-3 py-3 text-right text-sm font-extrabold text-red-700 whitespace-nowrap">{formatRupiah(filteredTotal)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {showAdd && <LedgerEntryModal type="expense" onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load() }} />}
      {editEntry && <LedgerEntryModal type="expense" entry={editEntry} onClose={() => setEditEntry(null)} onSaved={() => { setEditEntry(null); load() }} />}
    </div>
  )
}
