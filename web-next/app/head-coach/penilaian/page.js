'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Save, Loader2, FileText, Download, ChevronDown, Search } from 'lucide-react'
import * as api from '@/lib/api'
import { ASSESSMENT_CATEGORIES, scoreCategory } from '@/lib/assessmentFields'
import { AGE_GROUPS } from '@/lib/ageGroups'
import SkillRadar from '@/components/charts/SkillRadar'
import { AppSelect } from '@/components/ui/app-select'

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

function PenilaianContent() {
  const searchParams = useSearchParams()
  const [students, setStudents] = useState([])
  const [branches, setBranches] = useState([])
  const [studentId, setStudentId] = useState(searchParams.get('studentId') || '')
  const [filterBranch, setFilterBranch] = useState('')
  const [filterAgeGroup, setFilterAgeGroup] = useState('')
  const [search, setSearch] = useState('')
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [scores, setScores] = useState({})
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [hasAssessment, setHasAssessment] = useState(false)
  const [report, setReport] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [openCategory, setOpenCategory] = useState(ASSESSMENT_CATEGORIES[0]?.key)

  useEffect(() => {
    api.getStudents().then(setStudents)
    api.getBranches().then(setBranches)
  }, [])

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase()
    return students.filter((s) => {
      if (filterBranch && s.branchId !== filterBranch) return false
      if (filterAgeGroup && s.ageGroup !== filterAgeGroup) return false
      if (q && !s.fullName.toLowerCase().includes(q) && !s.studentId.toLowerCase().includes(q)) return false
      return true
    })
  }, [students, filterBranch, filterAgeGroup, search])

  useEffect(() => {
    if (!studentId) { setLoading(false); return }
    setLoading(true)
    api.getAssessment(studentId, month, year)
      .then((data) => {
        if (data) {
          const s = {}
          for (const cat of ASSESSMENT_CATEGORIES) for (const [key] of cat.fields) s[key] = data[key] ?? ''
          setScores(s)
          setComment(data.coachComment || '')
          setHasAssessment(true)
        } else {
          setScores({})
          setComment('')
          setHasAssessment(false)
        }
      })
      .finally(() => setLoading(false))
    api.getReport(studentId, month, year).then(setReport).catch(() => setReport(null))
  }, [studentId, month, year])

  const liveAssessment = useMemo(() => {
    const teknikAvg = categoryAvg(scores, ASSESSMENT_CATEGORIES[0].fields)
    const attackingAvg = categoryAvg(scores, ASSESSMENT_CATEGORIES[1].fields)
    const defendingAvg = categoryAvg(scores, ASSESSMENT_CATEGORIES[2].fields)
    const fisikAvg = categoryAvg(scores, ASSESSMENT_CATEGORIES[3].fields)
    const mentalAvg = categoryAvg(scores, ASSESSMENT_CATEGORIES[4].fields)
    const taktikParts = [attackingAvg, defendingAvg].filter((v) => v > 0)
    const taktikAvg = taktikParts.length ? Math.round((taktikParts.reduce((a, b) => a + b, 0) / taktikParts.length) * 10) / 10 : 0
    return { teknikAvg, taktikAvg, fisikAvg, mentalAvg }
  }, [scores])

  const overallPreview = useMemo(() => {
    const catAverages = [liveAssessment.teknikAvg, liveAssessment.taktikAvg, liveAssessment.fisikAvg, liveAssessment.mentalAvg].filter((v) => v > 0)
    if (catAverages.length === 0) return null
    return Math.round((catAverages.reduce((a, b) => a + b, 0) / catAverages.length) * 10) / 10
  }, [liveAssessment])

  async function handleSave() {
    setSaving(true)
    setMessage('')
    try {
      const numericScores = {}
      for (const cat of ASSESSMENT_CATEGORIES) for (const [key] of cat.fields) {
        numericScores[key] = scores[key] === '' || scores[key] === undefined ? null : Number(scores[key])
      }
      await api.saveAssessment({ studentId, month, year, coachComment: comment, ...numericScores })
      setHasAssessment(true)
      setMessage('Penilaian berhasil disimpan')
    } catch (err) {
      setMessage(err.message)
    } finally {
      setSaving(false)
      setTimeout(() => setMessage(''), 3000)
    }
  }

  async function handleGenerateReport() {
    setGenerating(true)
    setMessage('')
    try {
      const r = await api.generateReport(studentId, month, year)
      setReport(r)
      setMessage('Rapor PDF berhasil dibuat')
    } catch (err) {
      setMessage(err.message)
    } finally {
      setGenerating(false)
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const selectedStudent = students.find((s) => s.id === studentId)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-bold text-navy-900 text-lg">Penilaian</h1>
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
            options={branches.map((b) => ({ value: b.id, label: `${b.name} (${b.code})` }))}
          />
          <AppSelect
            value={filterAgeGroup}
            onChange={setFilterAgeGroup}
            allLabel="Semua Kelompok Umur"
            placeholder="Semua Kelompok Umur"
            className="min-w-[180px]"
            options={AGE_GROUPS.map((ag) => ({ value: ag, label: ag }))}
          />
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
                  <div className="text-[10px] text-gray-400">{s.studentId} · {s.ageGroup}</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {!studentId ? (
        <div className="glass-card rounded-3xl p-10 text-center text-sm text-gray-400">
          Pilih siswa dulu untuk mulai menilai.
        </div>
      ) : loading ? null : (
        <>
          <div className="relative overflow-hidden bg-gradient-to-br from-navy-900 via-navy-900 to-navy-800 text-white rounded-3xl p-6 flex items-center justify-between">
            <div aria-hidden="true" className="absolute -top-10 -right-10 w-56 h-56 rounded-full bg-gold-400/15 blur-[80px]" />
            <div className="relative">
              <div className="font-bold text-lg">{selectedStudent?.fullName}</div>
              <div className="text-xs text-gray-300">{MONTHS[month]} {year} · {selectedStudent?.position} · {selectedStudent?.ageGroup}</div>
            </div>
            <div className="relative text-right">
              <div className="text-xs text-gray-300 mb-0.5">OVR (preview)</div>
              <div className="text-4xl font-extrabold text-gold-400 tabular-nums leading-none">{overallPreview ?? '-'}</div>
            </div>
          </div>

          <div className="glass-card rounded-3xl p-5">
            <h2 className="text-sm font-semibold text-gray-500 mb-2">Preview Radar Skill</h2>
            <SkillRadar assessment={liveAssessment} height={240} />
          </div>

          {message && <div className="text-sm bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-2xl px-3 py-2">{message}</div>}

          {ASSESSMENT_CATEGORIES.map((cat) => {
            const isOpen = openCategory === cat.key
            const avg = categoryAvg(scores, cat.fields)
            return (
              <div key={cat.key} className="glass-card rounded-3xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenCategory((k) => (k === cat.key ? null : cat.key))}
                  className="w-full flex items-center justify-between gap-3 p-5"
                >
                  <h2 className="font-semibold text-navy-900 text-sm">{cat.title}</h2>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gold-600 tabular-nums">{avg > 0 ? avg : '-'}</span>
                    <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                  </div>
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 grid sm:grid-cols-2 gap-3">
                    {cat.fields.map(([key, label]) => {
                      const val = scores[key]
                      const cat2 = val !== '' && val !== undefined ? scoreCategory(Number(val)) : null
                      return (
                        <div key={key} className="flex items-center justify-between gap-3">
                          <label className="text-sm text-gray-600">{label}</label>
                          <div className="flex items-center gap-2">
                            <AppSelect
                              value={val === undefined || val === '' ? '' : String(val)}
                              onChange={(v) => setScores((s) => ({ ...s, [key]: v }))}
                              allLabel="-"
                              placeholder="-"
                              className="w-16 py-1.5 px-2.5 justify-center"
                              options={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => ({ value: String(n), label: String(n) }))}
                            />
                            {cat2 && <span className={`text-xs font-semibold w-20 ${cat2.color}`}>{cat2.label}</span>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}

          <div className="glass-card rounded-3xl p-5">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Pesan / Komentar Coach</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm"
            />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-gold-400 hover:bg-gold-500 text-navy-900 font-bold px-5 py-2.5 rounded-2xl disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Simpan Penilaian
            </button>

            {hasAssessment && (
              <button
                onClick={handleGenerateReport}
                disabled={generating}
                className="flex items-center gap-2 bg-navy-900 hover:bg-navy-800 text-white font-semibold px-5 py-2.5 rounded-2xl disabled:opacity-50"
              >
                {generating ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                {report ? 'Buat Ulang Rapor PDF' : 'Generate Rapor PDF'}
              </button>
            )}

            {report?.pdfUrl && (
              <a
                href={report.pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-sm font-semibold text-gold-600"
              >
                <Download size={15} /> Unduh Rapor Terakhir
              </a>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default function PenilaianPage() {
  return (
    <Suspense fallback={null}>
      <PenilaianContent />
    </Suspense>
  )
}
