'use client'

import { useEffect, useState } from 'react'
import { CalendarCheck, Loader2, RefreshCw, ChevronDown, ChevronRight, Clock, CheckCircle2, XCircle, FileSpreadsheet, FileText, MapPin } from 'lucide-react'
import * as api from '@/lib/api'
import { AppSelect } from '@/components/ui/app-select'
import { exportCoachRecapToExcel, exportCoachRecapToPDF, exportCoachRecapDetailToExcel, exportCoachRecapDetailToPDF } from '@/lib/export'

const MONTHS = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const now = new Date()

function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: 'short' })
}

function formatTime(value) {
  if (!value) return '-'
  return new Date(value).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

function StatusPill({ status, type = 'in' }) {
  const map = {
    approved: { label: type === 'in' ? 'Hadir' : 'Pulang OK', cls: 'bg-emerald-50 text-emerald-700', Icon: CheckCircle2 },
    pending: { label: 'Pending', cls: 'bg-amber-50 text-amber-700', Icon: Clock },
    rejected: { label: 'Ditolak', cls: 'bg-red-50 text-red-600', Icon: XCircle },
  }
  const entry = map[status] || { label: '—', cls: 'bg-gray-100 text-gray-500', Icon: Clock }
  const { Icon } = entry
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${entry.cls}`}>
      <Icon size={11} /> {entry.label}
    </span>
  )
}

function PhotoThumb({ src, label }) {
  if (!src) return <span className="text-gray-300">-</span>
  return (
    <a href={src} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-navy-700 hover:text-gold-600">
      <img src={src} alt={label} className="w-7 h-7 rounded-lg object-cover border border-gray-200" />
      {label}
    </a>
  )
}

export default function AdminAbsensiCoachPage() {
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [branchId, setBranchId] = useState('')
  const [branches, setBranches] = useState([])
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState('')
  const [busy, setBusy] = useState('')

  useEffect(() => { api.getBranches().then(setBranches).catch(() => {}) }, [])

  function load() {
    setLoading(true)
    setError('')
    api.getCoachAttendanceRecap(month, year, branchId)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [month, year, branchId])

  const periodLabel = `${MONTHS[month]} ${year}`
  const totals = data?.totals
  const exportDisabled = !data?.coaches?.length || !!busy

  async function runExport(key, fn) {
    setBusy(key)
    setError('')
    try {
      await fn()
    } catch (err) {
      setError(err.message || 'Gagal membuat berkas')
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-navy-600 to-navy-800 shadow-md shadow-navy-900/25 flex items-center justify-center shrink-0">
            <CalendarCheck size={18} className="text-gold-300" />
          </div>
          <div>
            <h1 className="font-bold text-navy-900 text-lg">Absensi Coach</h1>
            <p className="text-sm text-gray-400">Rekap kehadiran bulanan per coach</p>
          </div>
        </div>
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
          <AppSelect
            value={branchId}
            onChange={setBranchId}
            allLabel="Semua Cabang"
            placeholder="Semua Cabang"
            className="min-w-[150px]"
            options={branches.map((b) => ({ value: b.id, label: `${b.name} (${b.code})` }))}
          />
          <button onClick={load} className="flex items-center gap-1.5 bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold px-4 py-2 rounded-2xl">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Muat Ulang
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-2xl p-3 text-sm text-red-600">{error}</div>}

      {totals && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCard label="Coach aktif" value={totals.coaches} />
          <SummaryCard label="Total hari hadir" value={totals.daysPresent} tone="emerald" />
          <SummaryCard label="Total absen" value={totals.totalRecords} tone="amber" />
          <SummaryCard label="Ditolak" value={totals.rejected} tone="red" />
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs text-gray-400">
          Absen coach &amp; head coach langsung tercatat tanpa verifikasi. Foto selfie tersimpan di menu Absensi; laporan ekspor berisi keterangan kalimat absen masuk &amp; keluar.
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => runExport('xlsx', () => exportCoachRecapToExcel(data?.coaches || [], periodLabel))}
            disabled={exportDisabled}
            className="flex items-center gap-1.5 text-xs font-semibold text-navy-700 border border-gray-200 hover:border-gold-300 rounded-2xl px-3 py-2 disabled:opacity-40"
          >
            <FileSpreadsheet size={13} /> Excel Rekap
          </button>
          <button
            onClick={() => runExport('pdf', () => exportCoachRecapToPDF(data?.coaches || [], periodLabel))}
            disabled={exportDisabled}
            className="flex items-center gap-1.5 text-xs font-semibold text-navy-700 border border-gray-200 hover:border-gold-300 rounded-2xl px-3 py-2 disabled:opacity-40"
          >
            {busy === 'pdf' ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />} PDF Rekap
          </button>
          <button
            onClick={() => runExport('xlsx-detail', () => exportCoachRecapDetailToExcel(data?.coaches || [], periodLabel))}
            disabled={exportDisabled}
            className="flex items-center gap-1.5 text-xs font-semibold text-navy-700 border border-gray-200 hover:border-gold-300 rounded-2xl px-3 py-2 disabled:opacity-40"
          >
            {busy === 'xlsx-detail' ? <Loader2 size={13} className="animate-spin" /> : <FileSpreadsheet size={13} />} Excel Keterangan
          </button>
          <button
            onClick={() => runExport('pdf-detail', () => exportCoachRecapDetailToPDF(data?.coaches || [], periodLabel))}
            disabled={exportDisabled}
            title="Laporan PDF berisi kalimat keterangan absen masuk & keluar tiap coach"
            className="flex items-center gap-1.5 text-xs font-semibold text-navy-700 border border-gray-200 hover:border-gold-300 rounded-2xl px-3 py-2 disabled:opacity-40"
          >
            {busy === 'pdf-detail' ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />} PDF Keterangan
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="py-12 text-center"><Loader2 size={18} className="animate-spin text-navy-300 inline" /></div>
      ) : !data?.coaches?.length ? (
        <div className="glass-card rounded-3xl p-10 text-center text-sm text-gray-400">Belum ada absensi coach pada periode ini.</div>
      ) : (
        <div className="space-y-3">
          {data.coaches.map((entry) => {
            const open = expanded === entry.coach.id
            return (
              <div key={entry.coach.id} className="glass-card rounded-3xl overflow-hidden">
                <button
                  onClick={() => setExpanded(open ? '' : entry.coach.id)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50"
                >
                  <div className="w-9 h-9 rounded-full bg-navy-900 text-white text-[11px] font-bold flex items-center justify-center overflow-hidden shrink-0">
                    {entry.coach.photo ? <img src={entry.coach.photo} alt="" className="w-full h-full object-cover" /> : initials(entry.coach.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-navy-900 truncate">{entry.coach.name}</div>
                    <div className="text-[11px] text-gray-400">
                      {entry.coach.role === 'head_coach' ? 'Head Coach' : 'Coach'} · {entry.coach.branches?.map((b) => b.branch.code).join(', ') || 'tanpa cabang'}
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-4 text-center">
                    <Stat label="Hari hadir" value={entry.stats.daysPresent} tone="emerald" />
                    <Stat label="Pending" value={entry.stats.pending} tone="amber" />
                    <Stat label="Ditolak" value={entry.stats.rejected} tone="red" />
                    <Stat label="Tanpa pulang" value={entry.stats.missingCheckout} />
                  </div>
                  <div className="sm:hidden text-right">
                    <div className="font-bold text-navy-900 tabular-nums">{entry.stats.daysPresent}</div>
                    <div className="text-[10px] text-gray-400">hari hadir</div>
                  </div>
                  {open ? <ChevronDown size={16} className="text-gray-300" /> : <ChevronRight size={16} className="text-gray-300" />}
                </button>

                {open && (
                  <div className="border-t border-gray-100 overflow-x-auto modal-scroll">
                    <table className="w-full text-sm min-w-[680px]">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-4 py-2 text-[11px] font-semibold text-gray-500">Tanggal</th>
                          <th className="text-left px-3 py-2 text-[11px] font-semibold text-gray-500">Cabang</th>
                          <th className="text-left px-3 py-2 text-[11px] font-semibold text-gray-500">Masuk</th>
                          <th className="text-left px-3 py-2 text-[11px] font-semibold text-gray-500">Pulang</th>
                          <th className="text-left px-3 py-2 text-[11px] font-semibold text-gray-500">Foto</th>
                          <th className="text-left px-3 py-2 text-[11px] font-semibold text-gray-500">Lokasi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {entry.records.map((record) => (
                          <tr key={record.id}>
                            <td className="px-4 py-2.5 whitespace-nowrap text-gray-600">{formatDate(record.date)}</td>
                            <td className="px-3 py-2.5 text-gray-500">{record.branch?.code || '-'}</td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-2">
                                <span className="tabular-nums text-gray-600">{formatTime(record.checkInTime)}</span>
                                <StatusPill status={record.verifyStatus} type="in" />
                              </div>
                              {record.rejectReason && <div className="text-[10px] text-red-500 mt-0.5">{record.rejectReason}</div>}
                            </td>
                            <td className="px-3 py-2.5">
                              {record.checkOutTime ? (
                                <>
                                  <div className="flex items-center gap-2">
                                    <span className="tabular-nums text-gray-600">{formatTime(record.checkOutTime)}</span>
                                    <StatusPill status={record.checkOutVerifyStatus} type="out" />
                                  </div>
                                  {record.checkOutRejectReason && <div className="text-[10px] text-red-500 mt-0.5">{record.checkOutRejectReason}</div>}
                                </>
                              ) : <span className="text-[11px] text-gray-400">belum absen pulang</span>}
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-2">
                                <PhotoThumb src={record.photo} label="Masuk" />
                                {record.checkOutPhoto && <PhotoThumb src={record.checkOutPhoto} label="Pulang" />}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-[11px] text-gray-500 max-w-[200px]">
                              {record.locationName ? (
                                <span className="inline-flex items-start gap-1"><MapPin size={11} className="mt-0.5 shrink-0" /> {record.locationName}</span>
                              ) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <p className="text-xs text-gray-400">
        Hari hadir dihitung dari absen masuk (check-in ke dua cabang di hari yang sama tetap dihitung 1 hari). Angka ini menjadi dasar honor di menu Payroll.
      </p>
    </div>
  )
}

function Stat({ label, value, tone = 'gray' }) {
  const tones = { emerald: 'text-emerald-600', amber: 'text-amber-600', red: 'text-red-600', gray: 'text-navy-900' }
  return (
    <div className="min-w-[64px]">
      <div className={`font-bold tabular-nums ${tones[tone]}`}>{value}</div>
      <div className="text-[10px] text-gray-400">{label}</div>
    </div>
  )
}

function SummaryCard({ label, value, tone = 'gray' }) {
  const tones = { navy: 'text-navy-800', emerald: 'text-emerald-600', amber: 'text-amber-600', red: 'text-red-600', gray: 'text-navy-900' }
  return (
    <div className="glass-card rounded-2xl p-4">
      <div className={`text-xl font-bold tabular-nums ${tones[tone]}`}>{value}</div>
      <div className="text-xs text-gray-400 mt-0.5">{label}</div>
    </div>
  )
}
