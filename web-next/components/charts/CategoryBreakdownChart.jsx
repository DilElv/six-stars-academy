'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

// Fixed categorical palette in a set order — never cycled/reassigned per
// filter, so a category keeps the same color across re-renders.
const PALETTE = ['#134e9c', '#d4a843', '#10b981', '#ef4444', '#8b5cf6', '#0ea5e9', '#f97316', '#64748b', '#ec4899']

function formatRupiah(n) {
  return 'Rp' + (n || 0).toLocaleString('id-ID')
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const p = payload[0]
  return (
    <div className="bg-navy-900 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-lg">
      {p.name}: {formatRupiah(p.value)}
    </div>
  )
}

export default function CategoryBreakdownChart({ data, height = 220 }) {
  const sorted = [...(data || [])].filter((d) => d.value > 0).sort((a, b) => b.value - a.value)

  if (sorted.length === 0) {
    return <div className="flex items-center justify-center text-sm text-gray-400" style={{ height }}>Belum ada data untuk periode ini.</div>
  }

  const chartData = sorted.map((d, i) => ({ name: d.label, value: d.value, fill: PALETTE[i % PALETTE.length] }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          innerRadius="55%"
          outerRadius="85%"
          paddingAngle={2}
          isAnimationActive
          animationDuration={700}
        >
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.fill} stroke="none" />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltip />} />
        <Legend
          verticalAlign="middle"
          align="right"
          layout="vertical"
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span className="text-xs text-gray-600">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
