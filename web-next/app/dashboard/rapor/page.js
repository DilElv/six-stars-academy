'use client'

import { useEffect, useState } from 'react'
import { FileText, Download } from 'lucide-react'
import * as api from '@/lib/api'
import SkillRadar from '@/components/charts/SkillRadar'
import OvrGauge from '@/components/charts/OvrGauge'

const MONTHS = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

export default function RaporAnakPage() {
  const [reports, setReports] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getMyReports().then(setReports).catch((err) => setError(err.message))
  }, [])

  if (error) return <p className="text-sm text-red-500">{error}</p>
  if (!reports) return null

  const [latest, ...older] = reports

  return (
    <div className="space-y-6">
      <h1 className="font-bold text-navy-900 text-lg">Rapor Bulanan</h1>

      {reports.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-10 text-center">
          <FileText className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Belum ada rapor bulanan. Rapor akan muncul setelah Coach/Head Coach menyelesaikan penilaian bulan berjalan.</p>
        </div>
      ) : (
        <>
          {latest?.assessment && (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-xs text-gray-400">Rapor Terbaru</div>
                  <div className="font-bold text-navy-900 text-lg">{MONTHS[latest.month]} {latest.year}</div>
                </div>
                <OvrGauge value={latest.assessment.overallAvg ?? 0} size={56} />
              </div>
              <SkillRadar assessment={latest.assessment} height={280} />
              {latest.assessment.coachComment && (
                <p className="text-sm text-gray-500 italic border-t border-gray-100 pt-4 mt-2">"{latest.assessment.coachComment}"</p>
              )}
              {latest.pdfUrl && (
                <a
                  href={latest.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-gold-600 mt-4"
                >
                  <Download size={13} /> Unduh PDF
                </a>
              )}
            </div>
          )}

          {older.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 mb-3">Riwayat Rapor</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {older.map((r) => (
                  <div key={r.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
                    <div className="font-bold text-navy-900 mb-1">{MONTHS[r.month]} {r.year}</div>
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
