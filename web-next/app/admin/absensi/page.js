'use client'

import { useEffect, useState, useRef } from 'react'
import { UserCheck, FileSpreadsheet, FileText, Download } from 'lucide-react'
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
const ROLE_LABEL = { head_coach: 'Head Coach', coach: 'Coach' }

const today = new Date().toISOString().slice(0, 10)

export default function AdminAbsensiPage() {
  const [date, setDate] = useState(today)
  const [ageGroup, setAgeGroup] = useState('')
  const [branchId, setBranchId] = useState('')
  const [branches, setBranches] = useState([])
  const [records, setRecords] = useState([])
  const [staffRecords, setStaffRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [exportOpen, setExportOpen] = useState(false)
  const exportRef = useRef(null)

  useEffect(() => {
    api.getBranches().then(setBranches)
  }, [])

  useEffect(() => {
    function handleClick(e) {
      if (exportRef.current && !exportRef.current.contains(e.target)) setExportOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([
      Promise.all(
        ageGroup ? [api.getAttendance(date, ageGroup, branchId)] : AGE_GROUPS.map((ag) => api.getAttendance(date, ag, branchId))
      ).then((results) => results.flat()),
      api.getStaffAttendance(date, branchId),
    ])
      .then(([studentRecords, staff]) => {
        setRecords(studentRecords)
        setStaffRecords(staff)
      })
      .finally(() => setLoading(false))
  }, [date, ageGroup, branchId])

  const counts = records.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc }, {})

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-bold text-navy-900 text-lg">Laporan Absensi</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <DatePicker value={date} max={today} onChange={setDate} />
          <AppSelect value={branchId} onChange={setBranchId} allLabel="Semua Cabang" placeholder="Semua Cabang" options={branches.map((b) => ({ value: b.id, label: b.name }))} />
          <AppSelect value={ageGroup} onChange={setAgeGroup} allLabel="Semua Kelompok Umur" placeholder="Semua Kelompok Umur" options={AGE_GROUPS.map((ag) => ({ value: ag, label: ag }))} />
          <div className="relative" ref={exportRef}>
            <button onClick={() => setExportOpen(!exportOpen)} className="flex items-center gap-1.5 bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold px-3 py-2 rounded-xl"><Download size={14} /> Export</button>
            {exportOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-2xl shadow-xl border border-gray-100 py-1 min-w-[180px] overflow-hidden">
                <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Absensi Siswa</div>
                <button onClick={() => { exportAttendanceToExcel(records, 'siswa'); setExportOpen(false) }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"><FileSpreadsheet size={14} className="text-emerald-600" /> Excel</button>
                <button onClick={() => { exportAttendanceToPDF(records, 'siswa'); setExportOpen(false) }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"><FileText size={14} className="text-red-600" /> PDF</button>
                <div className="border-t border-gray-100 my-1" />
                <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Absensi Staff</div>
                <button onClick={() => { exportAttendanceToExcel(staffRecords, 'staff'); setExportOpen(false) }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"><FileSpreadsheet size={14} className="text-emerald-600" /> Excel</button>
                <button onClick={() => { exportAttendanceToPDF(staffRecords, 'staff'); setExportOpen(false) }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"><FileText size={14} className="text-red-600" /> PDF</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-500 mb-3">Staff Hadir</h2>
        {loading ? null : staffRecords.length === 0 ? (
          <div className="glass-card rounded-3xl p-6 text-center text-sm text-gray-400">
            Belum ada Head Coach/Coach yang check-in untuk filter ini.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {staffRecords.map((r) => (
              <div key={r.id} className="flex items-center gap-3 glass-card rounded-3xl p-4">
                <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                  <UserCheck size={16} className="text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-navy-900 truncate">{r.user?.name}</div>
                  <div className="text-xs text-gray-400">
                    {ROLE_LABEL[r.user?.role] || r.user?.role} · {r.branch?.code || '-'} · {r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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
