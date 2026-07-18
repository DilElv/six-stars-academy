'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Save, Loader2, FileText, Download } from 'lucide-react'
import * as api from '@/lib/api'
import { ASSESSMENT_CATEGORIES, scoreCategory } from '@/lib/assessmentFields'

const MONTHS = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const now = new Date()

function PenilaianContent() {
  const searchParams = useSearchParams()
  const [students, setStudents] = useState([])
  const [studentId, setStudentId] = useState(searchParams.get('studentId') || '')
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

  useEffect(() => {
    api.getStudents().then(setStudents)
  }, [])

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

  const overallPreview = useMemo(() => {
    const catAverages = []
    for (const cat of ASSESSMENT_CATEGORIES) {
      const values = cat.fields.map(([key]) => Number(scores[key])).filter((v) => !isNaN(v) && v > 0)
      if (values.length) catAverages.push(values.reduce((a, b) => a + b, 0) / values.length)
    }
    if (catAverages.length === 0) return null
    return Math.round((catAverages.reduce((a, b) => a + b, 0) / catAverages.length) * 10) / 10
  }, [scores])

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
          <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium min-w-[200px]">
            <option value="">Pilih Siswa</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.fullName} ({s.studentId})</option>)}
          </select>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm">
            {MONTHS.slice(1).map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm">
            {[year - 1, year, year + 1].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {!studentId ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-sm text-gray-400">
          Pilih siswa dulu untuk mulai menilai.
        </div>
      ) : loading ? null : (
        <>
          <div className="bg-navy-900 text-white rounded-2xl p-5 flex items-center justify-between">
            <div>
              <div className="font-bold">{selectedStudent?.fullName}</div>
              <div className="text-xs text-gray-300">{MONTHS[month]} {year} · {selectedStudent?.position} · {selectedStudent?.ageGroup}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-300">OVR (preview)</div>
              <div className="text-2xl font-bold text-gold-400">{overallPreview ?? '-'}</div>
            </div>
          </div>

          {message && <div className="text-sm bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl px-3 py-2">{message}</div>}

          {ASSESSMENT_CATEGORIES.map((cat) => (
            <div key={cat.key} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-semibold text-navy-900 text-sm mb-4">{cat.title}</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {cat.fields.map(([key, label]) => {
                  const val = scores[key]
                  const cat2 = val !== '' && val !== undefined ? scoreCategory(Number(val)) : null
                  return (
                    <div key={key} className="flex items-center justify-between gap-3">
                      <label className="text-sm text-gray-600">{label}</label>
                      <div className="flex items-center gap-2">
                        <select
                          value={val ?? ''}
                          onChange={(e) => setScores((s) => ({ ...s, [key]: e.target.value }))}
                          className="w-16 px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-center"
                        >
                          <option value="">-</option>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => <option key={n} value={n}>{n}</option>)}
                        </select>
                        {cat2 && <span className={`text-xs font-semibold w-20 ${cat2.color}`}>{cat2.label}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Pesan / Komentar Coach</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm"
            />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-gold-400 hover:bg-gold-500 text-navy-900 font-bold px-5 py-2.5 rounded-xl disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Simpan Penilaian
            </button>

            {hasAssessment && (
              <button
                onClick={handleGenerateReport}
                disabled={generating}
                className="flex items-center gap-2 bg-navy-900 hover:bg-navy-800 text-white font-semibold px-5 py-2.5 rounded-xl disabled:opacity-50"
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
