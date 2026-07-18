'use client'

import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts'

export default function OvrGauge({ value, size = 64 }) {
  const data = [{ name: 'ovr', value: value ?? 0, fill: '#d4a843' }]
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          data={data}
          startAngle={90}
          endAngle={-270}
          innerRadius="72%"
          outerRadius="100%"
          barSize={7}
        >
          <PolarAngleAxis type="number" domain={[0, 10]} angleAxisId={0} tick={false} />
          <RadialBar dataKey="value" background={{ fill: '#f3f4f6' }} cornerRadius={8} isAnimationActive animationDuration={1000} animationEasing="ease-out" />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center font-extrabold text-navy-900 text-sm tabular-nums">
        {value ?? '-'}
      </div>
    </div>
  )
}
