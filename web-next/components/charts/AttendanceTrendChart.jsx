'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const SERIES = [
  { key: 'hadir', label: 'Hadir', color: '#10b981' },
  { key: 'izin', label: 'Izin', color: '#d4a843' },
  { key: 'sakit', label: 'Sakit', color: '#3b82f6' },
  { key: 'alfa', label: 'Alfa', color: '#ef4444' },
]

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const total = payload.reduce((sum, p) => sum + (p.value || 0), 0)
  return (
    <div className="bg-navy-900 text-white text-xs px-3 py-2 rounded-xl shadow-lg space-y-0.5">
      <div className="font-semibold mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.fill }} />
          {p.name}: {p.value}
        </div>
      ))}
      {total === 0 && <div className="text-gray-400">Belum ada absensi</div>}
    </div>
  )
}

export default function AttendanceTrendChart({ data, height = 220 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#f3f4f6" />
        <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(212,168,67,0.08)' }} />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span className="text-xs text-gray-600">{value}</span>}
        />
        {SERIES.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            stackId="attendance"
            fill={s.color}
            radius={i === SERIES.length - 1 ? [6, 6, 0, 0] : 0}
            isAnimationActive
            animationDuration={800}
            animationEasing="ease-out"
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
