'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const COLORS = ['#132952', '#1a3870', '#234a91', '#a8812a', '#c49a35', '#d4a843']

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-navy-900 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-lg">
      {label}: {payload[0].value} siswa
    </div>
  )
}

export default function AgeGroupBarChart({ data, height = 220 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#f3f4f6" />
        <XAxis dataKey="ageGroup" tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(212,168,67,0.08)' }} />
        <Bar dataKey="count" radius={[8, 8, 0, 0]} isAnimationActive animationDuration={800} animationEasing="ease-out">
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
