'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2, FileText, Download, Search, Info } from 'lucide-react'
import * as api from '@/lib/api'
import { getCategoriesForStudent, formatPeriodLabel } from '@/lib/assessmentFields'
import AgeGroupFilter from '@/components/AgeGroupFilter'
import SkillRadar from '@/components/charts/SkillRadar'
import { AppSelect } from '@/components/ui/app-select'
import AssessmentCategories from '@/components/AssessmentCategories'

// Read-only mirror of the head-coach Penilaian view: a coach can open the same
// assessment content (scores, radar, comment, and the generated report) for the
// students in their assigned branches, but cannot edit scores or generate PDFs.
function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

function categoryAvg(scores, fields) {
  const values = fields.map(([key]) => Number(scores[key])).filter((v) => !isNaN(v) && v > 0)
  if (values.length === 0) return 0
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
}

const MONTHS = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const now = new Date()

function LaporanContent() {
  const searchParams = useSearchParams()
  const [students, setStudents] = useState([])
  const [studentId, setStudentId] = useState(searchParams.get('studentId') || '')
  const [filterBranch, setFilterBranch] = useState('')
  const [filterAgeGroup, setFilterAgeGroup] = useState('')
  const [search, setSearch] = useState('')
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [customPeriod, setCustomPeriod] = useState(false)
  const [endMonth, setEndMonth] = useState(now.getMonth() + 1)
  const [endYear, setEndYear] = useState(now.getFullYear())
  const [scores, setScores] = useState({})
  const [comment, setComment] = useState('')
  const [activeCategories, setActiveCategories] = useState([])
  const [overallAvg, setOverallAvg] = useState(null)
  const [hasAssessment, setHasAssessment] = useState(false)
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.getStudents().then(setStudents)
  }, [])

  const branchOptions = useMemo(() => {
    const map = new Map()
    for (const s of students) if (s.branch) map.set(s.branch.id, `${s.branch.name} (${s.branch.code})`)
    return [...map.entries()].map(([value, label]) => ({ value, label }))
  }, [students])

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase()
    return students.filter((s) => {
      if (filterBranch && s.branchId !== filterBranch) return false
      if (filterAgeGroup && s.ageGroup !== filterAgeGroup) return false
      if (q && !s.fullName.toLowerCase().includes(q) && !s.studentId.toLowerCase().includes(q)) return false
      return true
    })
  }, [students, filterBranch, filterAgeGroup, search])

  const selectedStudent = students.find((s) => s.id === studentId)
  const categories = useMemo(() => getCategoriesForStudent(selectedStudent?.position, selectedStudent?.ageGroup), [selectedStudent?.position, selectedStudent?.ageGroup])
  const periodEndMonth = customPeriod ? endMonth : month
  const periodEndYear = customPeriod ? endYear : year

  useEffect(() => {
    if (!studentId) { setHasAssessment(false); setReport(null); return }
    setLoading(true)
    api.getAssessment(studentId, month, year, periodEndMonth, periodEndYear)
      .then((data) => {
        if (data) {
          const s = {}
          for (const cat of categories) for (const [key] of cat.fields) s[key] = data[key] ?? ''
          setScores(s)
          setComment(data.coachComment || '')
          setActiveCategories(data.activeCategories?.length ? data.activeCategories : categories.map((c) => c.key))
          setOverallAvg(data.overallAvg ?? null)
          setHasAssessment(true)
        } else {
          setScores({})
          setComment('')
          setActiveCategories(categories.map((c) => c.key))
          setOverallAvg(null)
          setHasAssessment(false)
        }
      })
      .finally(() => setLoading(false))
    api.getReport(studentId, month, year, periodEndMonth, periodEndYear).then(setReport).catch(() => setReport(null))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, month, year, periodEndMonth, periodEndYear])

  const liveAssessment = useMemo(() => {
    const avgByKey = {}
    for (const cat of categories) avgByKey[cat.avgKey] = categoryAvg(scores, cat.fields)
    const taktikParts = [avgByKey.attackingAvg, avgByKey.defendingAvg].filter((v) => v > 0)
    return {
      teknikAvg: avgByKey.teknikAvg || 0,
      taktikAvg: taktikParts.length ? Math.round((taktikParts.reduce((a, b) => a + b, 0) / taktikParts.length) * 10) / 10 : 0,
      fisikAvg: avgByKey.fisikAvg || 0,
      mentalAvg: avgByKey.mentalAvg || 0,
    }
  }, [scores, categories])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-bold text-navy-900 text-lg">Laporan Siswa</h1>
          <p className="text-sm text-gray-400 mt-0.5">Lihat isi rapor & penilaian siswa di cabang Anda (read-only).</p>
        </div>
      </div>

      <div className="glass-card rounded-3xl p-4 space-y-3">
        <label className="block text-xs font-semibold text-gray-500">Periode Penilaian</label>
        <div className="flex items-center gap-2 flex-wrap">
          <AppSelect
            value={String(month)}
            onChange={(v) => setMonth(Number(v))}
            options={MONTHS.slice(1).map((m, i) => ({ value: String(i + 1), label: m }))}
          />
          <AppSelect
            value={String(year)}
            onChange={(v) => setYear(Number(v))}
            options={[year - 1, year, year + 1].map((y) => ({ value: String(y), label: String(y) }))}
          />
          <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 cursor-pointer ml-1">
            <input
              type="checkbox"
              checked={customPeriod}
              onChange={(e) => { setCustomPeriod(e.target.checked); setEndMonth(month); setEndYear(year) }}
              className="rounded"
            />
            Periode custom (rentang bulan)
          </label>
          {customPeriod && (
            <>
              <span className="text-xs text-gray-400">sampai</span>
              <AppSelect
                value={String(endMonth)}
                onChange={(v) => setEndMonth(Number(v))}
                options={MONTHS.slice(1).map((m, i) => ({ value: String(i + 1), label: m }))}
              />
              <AppSelect
                value={String(endYear)}
                onChange={(v) => setEndYear(Number(v))}
                options={[year - 1, year, year + 1].map((y) => ({ value: String(y), label: String(y) }))}
              />
            </>
          )}
        </div>
      </div>

      <div className="glass-card rounded-3xl p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama atau ID siswa..."
              className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-gold-400"
            />
          </div>
          <AppSelect
            value={filterBranch}
            onChange={setFilterBranch}
            allLabel="Semua Cabang"
            placeholder="Semua Cabang"
            className="min-w-[160px]"
            options={branchOptions}
          />
          <AgeGroupFilter value={filterAgeGroup} onChange={setFilterAgeGroup} allowAll />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {filteredStudents.length === 0 && (
            <div className="text-sm text-gray-400 py-3 px-1">Tidak ada siswa yang cocok.</div>
          )}
          {filteredStudents.map((s) => {
            const active = s.id === studentId
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setStudentId(s.id)}
                className={`flex items-center gap-2 shrink-0 pl-2 pr-3.5 py-2 rounded-2xl border text-left transition-colors duration-150 ${
                  active ? 'border-gold-400 bg-gold-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="w-7 h-7 rounded-full bg-navy-900 text-white text-[10px] font-bold flex items-center justify-center overflow-hidden shrink-0">
                  {s.photo ? <img src={s.photo} alt="" className="w-full h-full object-cover" /> : initials(s.fullName)}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-navy-900 truncate max-w-[140px]">{s.fullName}</div>
                  <div className="text-[10px] text-gray-400">{s.studentId} · {s.ageGroup}{s.position === 'GK' ? ' · GK' : ''}</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {!studentId ? (
        <div className="glass-card rounded-3xl p-10 text-center text-sm text-gray-400">
          Pilih siswa dulu untuk melihat rapor.
        </div>
      ) : loading ? (
        <div className="py-10 text-center"><Loader2 size={18} className="animate-spin text-navy-300 mx-auto" /></div>
      ) : (
        <>
          <div className="relative overflow-hidden bg-gradient-to-br from-navy-900 via-navy-900 to-navy-800 text-white rounded-3xl p-6 flex items-center justify-between">
            <div aria-hidden="true" className="absolute -top-10 -right-10 w-56 h-56 rounded-full bg-gold-400/15 blur-[80px]" />
            <div className="relative">
              <div className="font-bold text-lg">{selectedStudent?.fullName}</div>
              <div className="text-xs text-gray-300">{formatPeriodLabel(MONTHS, month, year, periodEndMonth, periodEndYear)} · {selectedStudent?.position} · {selectedStudent?.ageGroup}</div>
            </div>
            <div className="relative text-right">
              <div className="text-xs text-gray-300 mb-0.5">OVR</div>
              <div className="text-4xl font-extrabold text-gold-400 tabular-nums leading-none">{overallAvg ?? '-'}</div>
            </div>
          </div>

          {!hasAssessment ? (
            <div className="glass-card rounded-3xl p-10 text-center">
              <Info size={26} className="text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-400">Belum ada penilaian untuk periode ini.</p>
            </div>
          ) : (
            <>
              <div className="glass-card rounded-3xl p-5">
                <h2 className="text-sm font-semibold text-gray-500 mb-2">Radar Skill</h2>
                <SkillRadar assessment={liveAssessment} height={240} />
              </div>

              <AssessmentCategories
                scores={scores}
                position={selectedStudent?.position}
                ageGroup={selectedStudent?.ageGroup}
                activeCategories={activeCategories}
              />

              <div className="glass-card rounded-3xl p-5">
                <label className="block text-xs font-semibold text-gray-500 mb-1">Pesan / Komentar Coach</label>
                <p className="text-sm text-navy-900 whitespace-pre-wrap">{comment || '—'}</p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {report?.pdfUrl ? (
                  <a
                    href={report.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 bg-navy-900 hover:bg-navy-800 text-white font-semibold px-5 py-2.5 rounded-2xl"
                  >
                    <Download size={16} /> Unduh Rapor PDF
                  </a>
                ) : (
                  <span className="flex items-center gap-2 text-xs text-gray-400">
                    <FileText size={14} /> Rapor PDF belum dibuat oleh Head Coach.
                  </span>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

export default function CoachLaporanPage() {
  return (
    <Suspense fallback={null}>
      <LaporanContent />
    </Suspense>
  )
}
