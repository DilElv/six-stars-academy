'use client'

import { useCallback, useEffect, useState } from 'react'
import { FileText, Download, RefreshCw } from 'lucide-react'
import * as api from '@/lib/api'
import SkillRadar from '@/components/charts/SkillRadar'
import OvrGauge from '@/components/charts/OvrGauge'
import AssessmentCategories from '@/components/AssessmentCategories'
import { formatPeriodLabel } from '@/lib/assessmentFields'

const MONTHS = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

export default function RaporAnakPage() {
  const [assessment, setAssessment] = useState(null)
  const [reports, setReports] = useState(null)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback((silent) => {
    if (!silent) setRefreshing(true)
    Promise.all([api.getMyAssessment(), api.getMyReports()])
      .then(([a, r]) => { setAssessment(a); setReports(r) })
      .catch((err) => setError(err.message))
      .finally(() => setRefreshing(false))
  }, [])

  useEffect(() => {
    load(true)
    // Real-time-ish: re-fetch whenever the tab regains focus, so a rapor the
    // head-coach just saved shows up without the parent needing to manually
    // reload — no websocket infra in this app, so focus-refresh is the
    // lightweight equivalent.
    function onFocus() { load(true) }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [load])

  if (error) return <p className="text-sm text-red-500">{error}</p>
  if (!reports) return null

  const isSamePeriod = (r, a) => r.month === a.month && r.year === a.year && r.endMonth === a.endMonth && r.endYear === a.endYear
  const pdfForLatest = reports.find((r) => assessment && isSamePeriod(r, assessment))
  const olderReports = reports.filter((r) => !(assessment && isSamePeriod(r, assessment)))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-navy-900 text-lg">Rapor Bulanan</h1>
        <button
          onClick={() => load(false)}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-navy-700 disabled:opacity-50"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> Muat Ulang
        </button>
      </div>

      {!assessment ? (
        <div className="glass-card rounded-3xl p-10 text-center">
          <FileText className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Belum ada penilaian. Rapor akan muncul setelah Head Coach mengisi penilaian bulan berjalan.</p>
        </div>
      ) : (
        <>
          <div className="relative overflow-hidden bg-gradient-to-br from-navy-900 via-navy-900 to-navy-800 text-white rounded-3xl p-6 flex items-center justify-between">
            <div aria-hidden="true" className="absolute -top-10 -right-10 w-56 h-56 rounded-full bg-gold-400/15 blur-[80px]" />
            <div className="relative">
              <div className="text-xs text-gray-300">Rapor Terbaru</div>
              <div className="font-bold text-lg">{formatPeriodLabel(MONTHS, assessment.month, assessment.year, assessment.endMonth, assessment.endYear)}</div>
            </div>
            <div className="relative">
              <OvrGauge value={assessment.overallAvg ?? 0} size={56} />
            </div>
          </div>

          <div className="glass-card rounded-3xl p-5">
            <h2 className="text-sm font-semibold text-gray-500 mb-2">Radar Skill</h2>
            <SkillRadar assessment={assessment} height={280} />
          </div>

          <AssessmentCategories scores={assessment} editable={false} position={assessment.position} activeCategories={assessment.activeCategories} />

          {assessment.coachComment && (
            <div className="glass-card rounded-3xl p-5">
              <div className="text-xs font-semibold text-gray-500 mb-1">Pesan / Komentar Coach</div>
              <p className="text-sm text-gray-600 italic">&ldquo;{assessment.coachComment}&rdquo;</p>
            </div>
          )}

          {pdfForLatest?.pdfUrl && (
            <a
              href={pdfForLatest.pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gold-600"
            >
              <Download size={13} /> Unduh PDF
            </a>
          )}

          {olderReports.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 mb-3">Riwayat Rapor</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {olderReports.map((r) => (
                  <div key={r.id} className="glass-card rounded-3xl p-5">
                    <div className="font-bold text-navy-900 mb-1">{formatPeriodLabel(MONTHS, r.month, r.year, r.endMonth, r.endYear)}</div>
                    <div className="text-sm text-gray-500 mb-3">
                      Nilai Rata-rata (OVR): <b className="text-navy-900">{r.assessment?.overallAvg ?? '-'}</b>
                    </div>
                    {r.pdfUrl && (
                      <a href={r.pdfUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-gold-500">
                        Unduh PDF
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
