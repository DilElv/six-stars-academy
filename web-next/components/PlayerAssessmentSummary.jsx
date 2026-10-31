'use client'

import { Star } from 'lucide-react'

const METRICS = [['Teknik', 'teknikAvg'], ['Taktik', 'taktikAvg'], ['Fisik', 'fisikAvg'], ['Mental', 'mentalAvg']]

function Stars({ score }) {
  const filled = Math.round((Number(score) || 0) / 2)
  return <span className="inline-flex items-center gap-0.5">{[0, 1, 2, 3, 4].map((index) => <Star key={index} size={17} className={index < filled ? 'fill-gold-400 text-gold-400' : 'text-gray-200'} />)}</span>
}

export default function PlayerAssessmentSummary({ assessment }) {
  if (!assessment) return <div className="text-sm text-gray-400 py-2">Belum ada penilaian dari pelatih.</div>
  return (
    <div className="rounded-3xl bg-gray-50 border border-gray-100 p-4 space-y-3">
      {METRICS.map(([label, key]) => (
        <div key={key} className="flex items-center justify-between gap-3">
          <span className="text-xs font-bold uppercase tracking-wide text-navy-800">{label}</span>
          <div className="flex items-center gap-2"><Stars score={assessment[key]} /><span className="text-xs font-bold text-navy-900 w-7 text-right">{assessment[key] ?? '-'}</span></div>
        </div>
      ))}
    </div>
  )
}
