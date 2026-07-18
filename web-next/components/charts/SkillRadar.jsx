'use client'

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts'

export default function SkillRadar({ assessment, height = 260 }) {
  const data = [
    { category: 'Teknik', value: assessment.teknikAvg ?? 0 },
    { category: 'Taktik', value: assessment.taktikAvg ?? 0 },
    { category: 'Fisik', value: assessment.fisikAvg ?? 0 },
    { category: 'Mental', value: assessment.mentalAvg ?? 0 },
  ]

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} outerRadius="75%">
        <PolarGrid stroke="#e5e7eb" />
        <PolarAngleAxis dataKey="category" tick={{ fill: '#0a1628', fontSize: 12, fontWeight: 600 }} />
        <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fill: '#9ca3af', fontSize: 10 }} tickCount={6} />
        <Radar
          dataKey="value"
          stroke="#d4a843"
          fill="#d4a843"
          fillOpacity={0.35}
          strokeWidth={2}
          isAnimationActive
          animationDuration={900}
          animationEasing="ease-out"
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}
