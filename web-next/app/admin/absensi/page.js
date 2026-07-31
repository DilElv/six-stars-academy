'use client'

import { useEffect, useState, useRef } from 'react'
import { UserCheck, FileSpreadsheet, FileText, Download, Clock3, CheckCircle2, XCircle, MapPin, Loader2, X } from 'lucide-react'
import * as api from '@/lib/api'
import { AGE_GROUPS } from '@/lib/ageGroups'
import { AppSelect } from '@/components/ui/app-select'
import { DatePicker } from '@/components/ui/date-picker'
import { exportAttendanceToExcel, exportAttendanceToPDF } from '@/lib/export'

const STATUS_LABEL = { hadir: 'Hadir', izin: 'Izin', sakit: 'Sakit', alfa: 'Alfa' }
const STATUS_COLOR = {
  hadir: 'bg-emerald-50 text-emerald-700',
  izin: 'bg-amber-50 text-amber-700',
  sakit: 'bg-blue-50 text-blue-700',
  alfa: 'bg-red-50 text-red-700',
}

const today = new Date().toISOString().slice(0, 10)
const MONTH_LABELS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

const VERIFY_LABEL = { pending: 'Menunggu Verifikasi', approved: 'Disetujui', rejected: 'Ditolak' }
const VERIFY_COLOR = {
  pending: 'bg-amber-50 text-amber-700 border-amber-100',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  rejected: 'bg-red-50 text-red-700 border-red-100',
}
const VERIFY_ICON = { pending: Clock3, approved: CheckCircle2, rejected: XCircle }

function RejectModal({ record, onClose, onDone }) {
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleReject() {
    setSaving(true)
    try {
      await api.rejectStaffAttendance(record.id, reason)
      onDone()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60" onClick={saving ? undefined : onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-navy-900 text-sm">Tolak Absen {record.user?.name}</h3>
          {!saving && (
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X size={18} /></button>
          )}
        </div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">Alasan (opsional)</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="mis. Foto tidak jelas / lokasi tidak sesuai lapangan"
          className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm mb-4"
        />
        <button
          onClick={handleReject}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm px-4 py-3 rounded-2xl disabled:opacity-50"
        >
          {saving && <Loader2 size={14} className="animate-spin" />} Tolak Absen
        </button>
      </div>
    </div>
  )
}

function PhotoPreviewModal({ record, onClose }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/80" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-navy-900 text-sm">Foto Selfie {record.user?.name}</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <img src={record.photo} alt="" className="w-full rounded-2xl object-cover" />
        <div className="mt-3 space-y-1 text-xs text-gray-500">
          <div>Waktu: {record.checkInTime ? new Date(record.checkInTime).toLocaleString('id-ID') : '-'}</div>
          {record.locationName && (
            <div className="flex items-start gap-1"><MapPin size={12} className="shrink-0 mt-0.5" /> {record.locationName}</div>
          )}
        </div>
      </div>
    </div>
  )
}

function StaffAttendanceTab() {
  const [role, setRole] = useState('head_coach')
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [branchId, setBranchId] = useState('')
  const [branches, setBranches] = useState([])
  const [staffRecords, setStaffRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [previewPhoto, setPreviewPhoto] = useState(null)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [actingId, setActingId] = useState(null)

  useEffect(() => { api.getBranches().then(setBranches) }, [])

  function load() {
    setLoading(true)
    api.getStaffAttendance({ month, year, role, branchId }).then(setStaffRecords).finally(() => setLoading(false))
  }

  useEffect(load, [role, month, year, branchId])

  async function handleApprove(record) {
    setActingId(record.id)
    try {
      await api.approveStaffAttendance(record.id)
      load()
    } finally {
      setActingId(null)
    }
  }

  const byUser = staffRecords.reduce((acc, r) => {
    const key = r.user?.name || r.userId
    if (!acc[key]) acc[key] = { user: r.user, branch: r.branch, records: [] }
    acc[key].records.push(r)
    return acc
  }, {})
  const groups = Object.values(byUser).sort((a, b) => (a.user?.name || '').localeCompare(b.user?.name || ''))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1 bg-gray-100 rounded-2xl p-1 w-fit">
          <button onClick={() => setRole('head_coach')} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${role === 'head_coach' ? 'bg-white shadow-sm text-navy-900' : 'text-gray-500 hover:text-navy-700'}`}>Head Coach</button>
          <button onClick={() => setRole('coach')} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${role === 'coach' ? 'bg-white shadow-sm text-navy-900' : 'text-gray-500 hover:text-navy-700'}`}>Coach</button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <AppSelect value={month} onChange={(v) => setMonth(Number(v))} className="w-40" options={MONTH_LABELS.map((m, i) => ({ value: i + 1, label: m }))} />
          <AppSelect value={year} onChange={(v) => setYear(Number(v))} className="w-28" options={[year - 1, year, year + 1].map((y) => ({ value: y, label: String(y) }))} />
          <AppSelect value={branchId} onChange={setBranchId} allLabel="Semua Cabang" placeholder="Semua Cabang" options={branches.map((b) => ({ value: b.id, label: b.name }))} />
        </div>
      </div>

      {loading ? null : groups.length === 0 ? (
        <div className="glass-card rounded-3xl p-10 text-center text-sm text-gray-400">
          Belum ada {role === 'head_coach' ? 'Head Coach' : 'Coach'} yang absen di bulan {MONTH_LABELS[month - 1]} {year}.
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => {
            const hadirCount = g.records.filter((r) => r.verifyStatus === 'approved').length
            const pendingCount = g.records.filter((r) => r.verifyStatus === 'pending').length
            const sortedRecords = [...g.records].sort((a, b) => new Date(b.date) - new Date(a.date))
            return (
              <div key={g.user?.name} className="glass-card rounded-3xl p-4 sm:p-5">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-3 pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-navy-50 flex items-center justify-center shrink-0 overflow-hidden">
                      {g.user?.photo ? <img src={g.user.photo} alt="" className="w-full h-full object-cover" /> : <UserCheck size={16} className="text-navy-700" />}
                    </div>
                    <div>
                      <div className="font-semibold text-navy-900 text-sm">{g.user?.name}</div>
                      <div className="text-xs text-gray-400">{g.branch?.code || '-'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">{hadirCount}x Hadir bulan ini</span>
                    {pendingCount > 0 && <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">{pendingCount} Menunggu</span>}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {sortedRecords.map((r) => {
                    const VerifyIcon = VERIFY_ICON[r.verifyStatus] || Clock3
                    return (
                      <div key={r.id} className="bg-gray-50 rounded-2xl p-3.5 space-y-2.5">
                        <div className="flex items-center gap-2.5">
                          {r.photo ? (
                            <button onClick={() => setPreviewPhoto(r)} className="w-10 h-10 rounded-xl overflow-hidden shrink-0">
                              <img src={r.photo} alt="" className="w-full h-full object-cover" />
                            </button>
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0">
                              <UserCheck size={14} className="text-emerald-600" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1 text-xs text-gray-500">
                            <div className="font-semibold text-navy-900">{new Date(r.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</div>
                            <div>{r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}</div>
                          </div>
                        </div>

                        {r.locationName && (
                          <div className="flex items-center gap-1 text-[11px] text-gray-400">
                            <MapPin size={11} className="shrink-0" />
                            <span className="truncate">{r.locationName}</span>
                          </div>
                        )}

                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full border ${VERIFY_COLOR[r.verifyStatus] || VERIFY_COLOR.pending}`}>
                          <VerifyIcon size={11} /> {VERIFY_LABEL[r.verifyStatus] || 'Menunggu Verifikasi'}
                        </span>

                        {r.verifyStatus === 'rejected' && r.rejectReason && (
                          <div className="text-[11px] text-red-600">Alasan: {r.rejectReason}</div>
                        )}

                        {r.verifyStatus === 'pending' && (
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <button
                              onClick={() => setRejectTarget(r)}
                              disabled={actingId === r.id}
                              className="flex items-center justify-center gap-1 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold px-3 py-2 rounded-xl disabled:opacity-50"
                            >
                              <XCircle size={13} /> Tolak
                            </button>
                            <button
                              onClick={() => handleApprove(r)}
                              disabled={actingId === r.id}
                              className="flex items-center justify-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold px-3 py-2 rounded-xl disabled:opacity-50"
                            >
                              {actingId === r.id ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Setujui
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {previewPhoto && <PhotoPreviewModal record={previewPhoto} onClose={() => setPreviewPhoto(null)} />}
      {rejectTarget && (
        <RejectModal
          record={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onDone={() => { setRejectTarget(null); load() }}
        />
      )}
    </div>
  )
}

function SiswaAttendanceTab() {
  const [date, setDate] = useState(today)
  const [ageGroup, setAgeGroup] = useState('')
  const [branchId, setBranchId] = useState('')
  const [branches, setBranches] = useState([])
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [exportOpen, setExportOpen] = useState(false)
  const exportRef = useRef(null)

  useEffect(() => { api.getBranches().then(setBranches) }, [])

  useEffect(() => {
    function handleClick(e) {
      if (exportRef.current && !exportRef.current.contains(e.target)) setExportOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all(
      ageGroup ? [api.getAttendance(date, ageGroup, branchId)] : AGE_GROUPS.map((ag) => api.getAttendance(date, ag, branchId))
    ).then((results) => results.flat())
      .then(setRecords)
      .finally(() => setLoading(false))
  }, [date, ageGroup, branchId])

  const counts = records.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc }, {})

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <DatePicker value={date} max={today} onChange={setDate} />
          <AppSelect value={branchId} onChange={setBranchId} allLabel="Semua Cabang" placeholder="Semua Cabang" options={branches.map((b) => ({ value: b.id, label: b.name }))} />
          <AppSelect value={ageGroup} onChange={setAgeGroup} allLabel="Semua Kelompok Umur" placeholder="Semua Kelompok Umur" options={AGE_GROUPS.map((ag) => ({ value: ag, label: ag }))} />
        </div>
        <div className="relative" ref={exportRef}>
          <button onClick={() => setExportOpen(!exportOpen)} className="flex items-center gap-1.5 bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold px-3 py-2 rounded-xl"><Download size={14} /> Export</button>
          {exportOpen && (
            <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-2xl shadow-xl border border-gray-100 py-1 min-w-[180px] overflow-hidden">
              <button onClick={() => { exportAttendanceToExcel(records, 'siswa'); setExportOpen(false) }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"><FileSpreadsheet size={14} className="text-emerald-600" /> Excel</button>
              <button onClick={() => { exportAttendanceToPDF(records, 'siswa'); setExportOpen(false) }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"><FileText size={14} className="text-red-600" /> PDF</button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {Object.entries(STATUS_LABEL).map(([key, label]) => (
          <div key={key} className="glass-card rounded-3xl p-4 text-center">
            <div className="text-xl font-bold text-navy-900">{counts[key] || 0}</div>
            <div className="text-xs text-gray-400">{label}</div>
          </div>
        ))}
      </div>

      {loading ? null : (
        <div className="glass-card rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Nama Siswa</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500">Kelompok</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500">Cabang</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500">Dicatat Oleh</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Waktu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {records.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-medium text-navy-900">{r.student?.fullName}</td>
                  <td className="px-3 py-3 text-gray-500">{r.student?.ageGroup}</td>
                  <td className="px-3 py-3 text-gray-500">{r.student?.branch?.code || '-'}</td>
                  <td className="px-3 py-3 text-gray-500">{r.coach?.name || '-'}</td>
                  <td className="px-3 py-3 text-center">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-400">{r.submittedAt ? new Date(r.submittedAt).toLocaleTimeString('id-ID') : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          {records.length === 0 && <div className="p-10 text-center text-sm text-gray-400">Belum ada absensi untuk filter ini.</div>}
        </div>
      )}
    </div>
  )
}

export default function AdminAbsensiPage() {
  const [tab, setTab] = useState('siswa')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-bold text-navy-900 text-lg">Absensi</h1>
        <div className="flex items-center gap-1 bg-gray-100 rounded-2xl p-1 w-fit">
          <button onClick={() => setTab('siswa')} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === 'siswa' ? 'bg-white shadow-sm text-navy-900' : 'text-gray-500 hover:text-navy-700'}`}>Siswa</button>
          <button onClick={() => setTab('staff')} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === 'staff' ? 'bg-white shadow-sm text-navy-900' : 'text-gray-500 hover:text-navy-700'}`}>Head Coach &amp; Coach</button>
        </div>
      </div>

      {tab === 'siswa' ? <SiswaAttendanceTab /> : <StaffAttendanceTab />}
    </div>
  )
}
