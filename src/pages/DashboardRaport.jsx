import { useState, useEffect, useRef } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts'
import { Download, FileText, ChevronDown, Star, Award } from 'lucide-react'
import { getMetricsDef, computeOverall } from '../data/raportMetrics'

const monthsIndo = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const [y, m, d] = dateStr.split('-')
  return d ? `${d} ${monthsIndo[parseInt(m)-1]} ${y}` : `${monthsIndo[parseInt(m)-1]} ${y}`
}

function formatPrice(n) {
  return 'Rp' + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

function getScoreColor(val) {
  if (val >= 80) return 'text-emerald-600'
  if (val >= 65) return 'text-amber-600'
  return 'text-red-500'
}

function getScoreBg(val) {
  if (val >= 80) return 'bg-emerald-100'
  if (val >= 65) return 'bg-amber-100'
  return 'bg-red-100'
}

function getCategory(val) {
  if (val >= 80) return 'Baik Sekali'
  if (val >= 65) return 'Baik'
  return 'Perlu Latihan'
}

function RaportTable({ report, metricsDef }) {
  const data = report?.metrics_data || {}

  return (
    <table className="w-full border-collapse text-xs sm:text-sm">
      <thead>
        <tr className="border-b-2 border-navy-800">
          <th className="text-left py-2 px-3 font-bold text-navy-800 uppercase tracking-wider">Materi Penilaian</th>
          <th className="text-center py-2 px-3 font-bold text-navy-800 uppercase tracking-wider">Nilai</th>
          <th className="text-center py-2 px-3 font-bold text-navy-800 uppercase tracking-wider">Kategori</th>
        </tr>
      </thead>
      <tbody>
        {metricsDef.categories.map((cat) => (
          <CatGroup key={cat.id} cat={cat} data={data} />
        ))}
      </tbody>
      <tfoot>
        <tr className="border-t-2 border-navy-800">
          <td className="py-2.5 px-3 text-sm font-bold text-navy-900">Rata-rata (OVR)</td>
          <td className="py-2.5 px-3 text-center">
            <span className="inline-block text-base font-black text-gold-600 bg-gold-50 rounded-lg px-4 py-1">
              {report ? computeOverall(report, metricsDef.position) : 0}
            </span>
          </td>
          <td className="py-2.5 px-3 text-center text-sm text-gray-400">—</td>
        </tr>
      </tfoot>
    </table>
  )
}

function CatGroup({ cat, data }) {
  const hasItems = cat.items && cat.items.length > 0
  const hasSubGroups = cat.subGroups && cat.subGroups.length > 0
  const allKeys = []
  if (hasItems) for (const item of cat.items) allKeys.push(item.key)
  if (hasSubGroups) for (const sg of cat.subGroups) for (const item of sg.items) allKeys.push(item.key)

  return (
    <>
      <tr className="border-b border-gray-200 bg-gray-50/80">
        <td colSpan={3} className="py-2 px-3 text-xs font-bold text-navy-800 uppercase tracking-wider">
          {cat.label}
          {allKeys.length > 0 && (
            <span className="ml-2 text-[10px] font-normal text-gray-400">
              (rata-rata: {Math.round(allKeys.reduce((s, k) => s + (data[k] ?? 0), 0) / allKeys.length)})
            </span>
          )}
        </td>
      </tr>
      {hasItems && cat.items.map((item) => (
        <tr key={item.key} className="border-b border-gray-100">
          <td className="py-1.5 px-3 pl-6 text-sm text-navy-900">
            {item.label}
            <span className="text-gray-400 text-[10px] ml-1">({item.desc})</span>
          </td>
          <td className="py-1.5 px-3 text-center">
            <span className={`inline-block text-xs font-bold ${getScoreColor(data[item.key] ?? 0)} bg-gray-50 rounded-lg px-2.5 py-0.5 min-w-[40px]`}>
              {data[item.key] ?? 0}
            </span>
          </td>
          <td className="py-1.5 px-3 text-center">
            <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${getScoreBg(data[item.key] ?? 0)} ${getScoreColor(data[item.key] ?? 0)}`}>
              {getCategory(data[item.key] ?? 0)}
            </span>
          </td>
        </tr>
      ))}
      {hasSubGroups && cat.subGroups.map((sg) => (
        <SubGroup key={sg.id} sg={sg} data={data} />
      ))}
    </>
  )
}

function SubGroup({ sg, data }) {
  return (
    <>
      {sg.items.length > 0 && (
        <tr className="border-b border-gray-100 bg-gray-50/30">
          <td colSpan={3} className="py-1.5 px-3 pl-4 text-[11px] font-bold text-navy-700 italic">
            {sg.label}
            <span className="ml-2 text-[10px] font-normal text-gray-400">
              (rata-rata: {Math.round(sg.items.reduce((s, item) => s + (data[item.key] ?? 0), 0) / sg.items.length)})
            </span>
          </td>
        </tr>
      )}
      {sg.items.map((item) => (
        <tr key={item.key} className="border-b border-gray-100">
          <td className="py-1.5 px-3 pl-8 text-sm text-navy-900">
            {item.label}
            <span className="text-gray-400 text-[10px] ml-1">({item.desc})</span>
          </td>
          <td className="py-1.5 px-3 text-center">
            <span className={`inline-block text-xs font-bold ${getScoreColor(data[item.key] ?? 0)} bg-gray-50 rounded-lg px-2.5 py-0.5 min-w-[40px]`}>
              {data[item.key] ?? 0}
            </span>
          </td>
          <td className="py-1.5 px-3 text-center">
            <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${getScoreBg(data[item.key] ?? 0)} ${getScoreColor(data[item.key] ?? 0)}`}>
              {getCategory(data[item.key] ?? 0)}
            </span>
          </td>
        </tr>
      ))}
    </>
  )
}

export default function DashboardRaport() {
  const { session } = useOutletContext()
  const printRef = useRef(null)
  const [child, setChild] = useState(null)
  const [reports, setReports] = useState([])
  const [selectedPeriod, setSelectedPeriod] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session?.id && session?.child) {
      const s = session.child
      setChild(s)
      setLoading(false)
      return
    }
    import('../api').then((api) => {
      api.getMyChild().then((data) => {
        const c = {
          name: data.student?.name || '-',
          studentId: data.student?.id || '-',
          ageGroup: data.student?.age_group_label || '-',
          position: data.student?.position_singkatan || '-',
          avatar: data.student?.avatar || '',
          metrics: data.monthlyReport || data.metrics || { metrics_data: '{}' },
          monthlyReportPeriod: data.monthlyReport?.period || null,
          joinedDate: data.student?.joined_date || '-',
          parentName: data.student?.parent_name || '-',
          coachFeedback: {
            name: '-',
            note: (data.monthlyReport || data.metrics)?.coach_note || 'Belum ada catatan dari pelatih.',
          },
        }
        setChild(c)
        if (data.student?.id) {
          api.getMetricsHistory(data.student.id).then((history) => {
            const published = history.filter(r => r.report_type === 'monthly' && r.is_published)
            setReports(published)
            if (published.length > 0 && !selectedPeriod) {
              setSelectedPeriod(published[0].period)
            }
          }).catch(() => {})
        }
        setLoading(false)
      }).catch(() => {
        setLoading(false)
      })
    })
  }, [session])

  const activeReport = reports.find(r => r.period === selectedPeriod) || child?.metrics || null
  const pos = child?.position || ''
  const metricsDef = getMetricsDef(pos)
  const radarData = activeReport ? metricsDef.getRadarData(activeReport) : []

  function handlePrint() {
    window.print()
  }

  if (loading) return null

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <FileText size={22} className="text-navy-700" />
          <h1 className="font-heading font-bold text-navy-900 text-xl">Rapor Saya</h1>
        </div>
        <div className="flex items-center gap-2">
          {reports.length > 1 && (
            <div className="relative">
              <select
                value={selectedPeriod || ''}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="appearance-none text-xs font-semibold px-3 py-2 pr-8 bg-white border border-gray-200 rounded-xl text-navy-900 focus:outline-none focus:border-gold-400"
              >
                {reports.map(r => (
                  <option key={r.period} value={r.period}>{formatDate(r.period)}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          )}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 bg-navy-800 hover:bg-navy-700 text-white rounded-xl transition-all"
          >
            <Download size={14} />
            Download PDF
          </button>
        </div>
      </div>

      <div ref={printRef} id="raport-print" className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden print:shadow-none print:border-0">
        <div className="bg-gradient-to-br from-navy-800 via-navy-900 to-navy-950 p-6 lg:p-8 print:bg-navy-900">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img src={child?.avatar} alt={child?.name} className="w-16 h-16 lg:w-20 lg:h-20 rounded-2xl bg-white/10 ring-2 ring-gold-400/30" />
              <div>
                <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1 mb-1.5 w-fit">
                  <Award size={12} className="text-gold-400" />
                  <span className="text-white/60 text-[10px] font-semibold">RAPOR BULANAN</span>
                </div>
                <h2 className="font-heading font-bold text-white text-xl lg:text-2xl">{child?.name}</h2>
                <p className="text-gold-400 text-xs mt-0.5">{child?.ageGroup} • {child?.position}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 lg:gap-6">
              <div className="text-center">
                <p className="text-white/50 text-[10px] font-semibold uppercase tracking-wider">Periode</p>
                <p className="text-white font-bold text-lg">{activeReport?.period ? formatDate(activeReport.period) : '-'}</p>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div className="text-center">
                <p className="text-white/50 text-[10px] font-semibold uppercase tracking-wider">OVR</p>
                <p className="text-gold-400 font-black text-3xl font-heading">
                  {activeReport ? computeOverall(activeReport, pos) : 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 lg:p-8">
          <div className="mb-8">
            <h3 className="font-heading font-bold text-navy-900 text-sm mb-3 flex items-center gap-1.5">
              <Star size={16} className="text-gold-400" />
              Visual Radar
            </h3>
            <div className="bg-gray-50 rounded-2xl p-4">
              <ResponsiveContainer width="100%" height={320}>
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                  <PolarGrid stroke="#d1d5db" strokeWidth={0.5} />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: '#1e293b', fontSize: 12, fontWeight: 600 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 9 }} tickCount={5} />
                  <Radar name="Skor" dataKey="score" stroke="#c49a35" strokeWidth={2} fill="#c49a35" fillOpacity={0.15} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h3 className="font-heading font-bold text-navy-900 text-sm mb-3 flex items-center gap-1.5">
              <Award size={16} className="text-gold-400" />
              Detail Nilai
            </h3>
            <div className="bg-gray-50 rounded-2xl p-4 overflow-x-auto">
              <RaportTable report={activeReport} metricsDef={metricsDef} />
            </div>
          </div>

          {child?.coachFeedback?.note && child.coachFeedback.note !== 'Belum ada catatan dari pelatih.' && (
            <div className="mt-6 bg-gold-50 border border-gold-100 rounded-2xl p-4">
              <h4 className="font-heading font-bold text-navy-900 text-xs mb-2">Catatan Pelatih</h4>
              <p className="text-sm text-navy-700 leading-relaxed">{child.coachFeedback.note}</p>
            </div>
          )}

          <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 font-semibold uppercase">Nama</p>
              <p className="font-medium text-navy-900 mt-0.5">{child?.name}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 font-semibold uppercase">Grup</p>
              <p className="font-medium text-navy-900 mt-0.5">{child?.ageGroup}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 font-semibold uppercase">Posisi</p>
              <p className="font-medium text-navy-900 mt-0.5">{child?.position}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 font-semibold uppercase">Gabung</p>
              <p className="font-medium text-navy-900 mt-0.5">{child?.joinedDate}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 border-t border-gray-100 px-6 lg:px-8 py-4 text-center print:block">
          <p className="text-[10px] text-gray-400">SSB Six Star • Rapor ini digenerate secara otomatis • {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white !important; }
          nav, .no-print { display: none !important; }
          #raport-print { page-break-inside: avoid; box-shadow: none !important; border: none !important; border-radius: 0 !important; }
          #raport-print > div:first-child { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .bg-gradient-to-br { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .bg-gray-50 { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  )
}
