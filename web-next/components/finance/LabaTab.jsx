'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, Scale, FileSpreadsheet, FileText, ArrowUp, ArrowDown } from 'lucide-react'
import * as api from '@/lib/api'
import FinanceTrendChart from '@/components/charts/FinanceTrendChart'
import { exportLabaToCSV, exportLabaToPDF } from '@/lib/financeExport'
import { MONTH_LABELS, MonthFilter, useMonthFilter, formatRupiah } from '@/components/finance/shared'

function ChangeBadge({ percent }) {
  if (percent === null || percent === undefined) return null
  const isUp = percent > 0
  const isFlat = percent === 0
  return (
    <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-white/90 bg-white/15 px-1.5 py-0.5 rounded-full mt-1">
      {!isFlat && (isUp ? <ArrowUp size={10} /> : <ArrowDown size={10} />)}
      {isFlat ? 'Sama dgn bulan lalu' : `${Math.abs(percent)}% dari bulan lalu`}
    </span>
  )
}

export default function LabaTab() {
  const { month, setMonth, year, setYear } = useMonthFilter()
  const [data, setData] = useState({ income: 0, expense: 0, laba: 0 })
  const [trend, setTrend] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.getLaba({ month, year }),
      api.getLedgerTrend({ months: 6 }),
    ]).then(([summary, trendData]) => {
      setData(summary)
      setTrend(trendData)
    }).finally(() => setLoading(false))
  }, [month, year])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-bold text-navy-900 text-lg">Laba & Overview</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <MonthFilter month={month} setMonth={setMonth} year={year} setYear={setYear} />
          <div className="flex items-center gap-1">
            <button onClick={() => exportLabaToCSV(trend, { month, year })} title="Export CSV" className="flex items-center gap-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-navy-700 text-xs font-semibold px-3 py-2 rounded-xl"><FileSpreadsheet size={14} className="text-emerald-600" /> CSV</button>
            <button onClick={() => exportLabaToPDF(trend, data, { month, year })} title="Export PDF" className="flex items-center gap-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-navy-700 text-xs font-semibold px-3 py-2 rounded-xl"><FileText size={14} className="text-red-600" /> PDF</button>
          </div>
        </div>
      </div>

      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-3xl p-5 flex items-center gap-4 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/20">
            <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center shrink-0"><TrendingUp size={18} /></div>
            <div>
              <div className="text-xs text-emerald-100 mb-0.5">Pemasukan</div>
              <div className="text-xl font-extrabold tracking-tight">{formatRupiah(data.income)}</div>
              <ChangeBadge percent={data.incomeChangePercent} />
            </div>
          </div>
          <div className="rounded-3xl p-5 flex items-center gap-4 bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg shadow-red-500/20">
            <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center shrink-0"><TrendingDown size={18} /></div>
            <div>
              <div className="text-xs text-red-100 mb-0.5">Pengeluaran</div>
              <div className="text-xl font-extrabold tracking-tight">{formatRupiah(data.expense)}</div>
              <ChangeBadge percent={data.expenseChangePercent} />
            </div>
          </div>
          <div className={`rounded-3xl p-5 flex items-center gap-4 text-white shadow-lg ${data.laba >= 0 ? 'bg-gradient-to-br from-navy-700 to-navy-900 shadow-navy-900/20' : 'bg-gradient-to-br from-red-600 to-red-800 shadow-red-800/20'}`}>
            <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center shrink-0"><Scale size={18} /></div>
            <div>
              <div className={`text-xs mb-0.5 ${data.laba >= 0 ? 'text-gold-300' : 'text-red-100'}`}>{data.laba >= 0 ? 'Laba Bersih' : 'Rugi Bersih'}</div>
              <div className="text-xl font-extrabold tracking-tight">{formatRupiah(Math.abs(data.laba))}</div>
              <ChangeBadge percent={data.labaChangePercent} />
            </div>
          </div>
        </div>
      )}

      <div className="glass-card rounded-3xl p-4 sm:p-5">
        <div className="text-xs font-semibold text-gray-500 mb-2">Tren 6 Bulan Terakhir</div>
        <FinanceTrendChart data={trend} height={260} />
      </div>

      <div className="glass-card rounded-3xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Bulan</th>
              <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500">Pemasukan</th>
              <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500">Pengeluaran</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Laba / Rugi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {trend.map((t) => (
              <tr key={t.label} className="hover:bg-gray-50/60">
                <td className="px-4 py-3 font-medium text-navy-900">{t.label}</td>
                <td className="px-3 py-3 text-right text-emerald-600 font-semibold">{formatRupiah(t.income)}</td>
                <td className="px-3 py-3 text-right text-red-600 font-semibold">{formatRupiah(t.expense)}</td>
                <td className={`px-4 py-3 text-right font-bold ${t.laba >= 0 ? 'text-navy-900' : 'text-red-600'}`}>{formatRupiah(t.laba)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="glass-card rounded-3xl p-5 text-sm text-gray-500">
        Pemasukan mencakup seluruh pembayaran lunas (pendaftaran, perpanjangan, event) ditambah pemasukan manual. Pengeluaran hanya mencakup catatan manual. Laba dihitung otomatis secara real-time dari kedua data tersebut untuk periode {MONTH_LABELS[month]} {year}.
      </div>
    </div>
  )
}
