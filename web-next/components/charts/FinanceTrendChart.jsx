'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const INCOME_COLOR = '#10b981'
const EXPENSE_COLOR = '#ef4444'

function formatShort(n) {
  if (Math.abs(n) >= 1000000) return `${(n / 1000000).toFixed(1)}jt`
  if (Math.abs(n) >= 1000) return `${Math.round(n / 1000)}rb`
  return String(n)
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-navy-900 text-white text-xs px-3 py-2.5 rounded-xl shadow-lg space-y-1">
      <div className="font-bold mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.fill }} />
          <span className="text-gray-300">{p.name}</span>
          <span className="font-semibold ml-auto tabular-nums">Rp{p.value.toLocaleString('id-ID')}</span>
        </div>
      ))}
    </div>
  )
}

// Grouped bar: income vs expense per month. Single Rupiah axis (never dual-axis
// even though the two series can differ in scale — that's the point of the
// comparison), legend always shown since there are 2 series.
export default function FinanceTrendChart({ data, height = 260 }) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center text-sm text-gray-400" style={{ height }}>Belum ada data.</div>
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} barGap={4}>
        <CartesianGrid vertical={false} stroke="#f3f4f6" />
        <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={formatShort} tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span className="text-xs text-gray-600 font-medium">{value}</span>}
        />
        <Bar dataKey="income" name="Pemasukan" fill={INCOME_COLOR} radius={[4, 4, 0, 0]} isAnimationActive animationDuration={800} />
        <Bar dataKey="expense" name="Pengeluaran" fill={EXPENSE_COLOR} radius={[4, 4, 0, 0]} isAnimationActive animationDuration={800} />
      </BarChart>
    </ResponsiveContainer>
  )
}
