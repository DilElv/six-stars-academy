'use client'

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
function periodLabel(row) {
  const start = `${MONTHS[row.month]} ${row.year}`
  if (row.month === row.endMonth && row.year === row.endYear) return start
  return `${start}–${row.endYear === row.year ? MONTHS[row.endMonth] : `${MONTHS[row.endMonth]} ${row.endYear}`}`
}

export default function AssessmentProgressChart({ history = [] }) {
  const data = history.map((row) => ({ period: periodLabel(row), Teknik: row.teknikAvg, Taktik: row.taktikAvg, Fisik: row.fisikAvg, Mental: row.mentalAvg }))
  if (data.length === 0) return null
  // Empat batang per rapor butuh ruang tetap agar saat riwayat sudah banyak
  // batang dan label tidak saling menumpuk. Container dapat digeser horizontal.
  const chartWidth = Math.max(520, data.length * 180)
  return (
    <div className="glass-card rounded-3xl p-5">
      <div className="flex items-end justify-between gap-3">
        <div><h2 className="font-bold text-navy-900">Tren Perkembangan</h2><p className="text-sm text-gray-400 mt-1">Perbandingan teknik, taktik, fisik, dan mental setiap periode rapor dua bulanan.</p></div>
        {data.length > 3 && <span className="shrink-0 text-[11px] text-gray-400">Geser untuk riwayat</span>}
      </div>
      <div className="mt-4 overflow-x-auto pb-2 -mx-1 px-1">
        <div className="h-[290px]" style={{ width: chartWidth }}>
          <ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 35 }} barGap={3} barCategoryGap="24%">
          <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" /><XAxis dataKey="period" angle={-28} textAnchor="end" interval={0} tick={{ fill: '#6b7280', fontSize: 11 }} /><YAxis domain={[0, 10]} tickCount={6} tick={{ fill: '#6b7280', fontSize: 11 }} /><Tooltip formatter={(value) => [`${value ?? '-'} / 10`]} /><Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
          <Bar dataKey="Teknik" fill="#0ea5e9" barSize={16} radius={[4, 4, 0, 0]} /><Bar dataKey="Taktik" fill="#f59e0b" barSize={16} radius={[4, 4, 0, 0]} /><Bar dataKey="Fisik" fill="#22c55e" barSize={16} radius={[4, 4, 0, 0]} /><Bar dataKey="Mental" fill="#a855f7" barSize={16} radius={[4, 4, 0, 0]} />
          </BarChart></ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
