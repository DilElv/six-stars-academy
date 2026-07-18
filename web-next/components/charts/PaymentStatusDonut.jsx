'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts'

const COLORS = { success: '#10b981', pending: '#d4a843', failed: '#ef4444' }
const LABELS = { success: 'Lunas', pending: 'Pending', failed: 'Gagal' }

export default function PaymentStatusDonut({ counts, height = 200 }) {
  const data = Object.entries(counts)
    .filter(([, v]) => v > 0)
    .map(([status, value]) => ({ name: LABELS[status] || status, value, fill: COLORS[status] || '#9ca3af' }))

  if (data.length === 0) {
    return <div className="h-[200px] flex items-center justify-center text-sm text-gray-400">Belum ada data pembayaran.</div>
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius="58%"
          outerRadius="85%"
          paddingAngle={3}
          isAnimationActive
          animationDuration={800}
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.fill} stroke="none" />
          ))}
        </Pie>
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
