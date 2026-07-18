'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-navy-900 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-lg">
      {label}: OVR {payload[0].value}
    </div>
  )
}

export default function OvrTrendChart({ data, height = 180 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#f3f4f6" />
        <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 10]} tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#d4af37', strokeWidth: 1, strokeDasharray: '4 4' }} />
        <Line
          type="monotone"
          dataKey="ovr"
          stroke="#d4af37"
          strokeWidth={2.5}
          dot={{ r: 4, fill: '#d4af37', strokeWidth: 0 }}
          activeDot={{ r: 6 }}
          isAnimationActive
          animationDuration={900}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
