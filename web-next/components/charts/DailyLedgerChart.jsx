'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

function formatShort(n) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}jt`
  if (n >= 1000) return `${Math.round(n / 1000)}rb`
  return String(n)
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-navy-900 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-lg">
      Tgl {label}: Rp{payload[0].value.toLocaleString('id-ID')}
    </div>
  )
}

// Single-series daily total within the selected month — gradient-fill area
// chart (no legend needed, one series named by the card title above it).
export default function DailyLedgerChart({ items, daysInMonth, color = '#10b981', gradientId = 'dailyLedgerGradient', height = 200 }) {
  const byDay = {}
  for (const item of items) {
    const day = new Date(item.date).getDate()
    byDay[day] = (byDay[day] || 0) + item.amount
  }
  const data = Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, total: byDay[i + 1] || 0 }))

  if (items.length === 0) {
    return <div className="flex items-center justify-center text-sm text-gray-400" style={{ height }}>Belum ada data bulan ini.</div>
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.32} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#f3f4f6" />
        <XAxis dataKey="day" interval={Math.ceil(daysInMonth / 12) - 1} tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={formatShort} tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: '4 4' }} />
        <Area
          type="monotone"
          dataKey="total"
          stroke={color}
          strokeWidth={2.5}
          fill={`url(#${gradientId})`}
          isAnimationActive
          animationDuration={800}
          animationEasing="ease-out"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
