'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Send, Loader2, QrCode, Search } from 'lucide-react'
import * as api from '@/lib/api'
import { AGE_GROUPS } from '@/lib/ageGroups'
import QrScannerModal from '@/components/QrScannerModal'
import StaffCheckinCard from '@/components/StaffCheckinCard'
import { AppSelect } from '@/components/ui/app-select'

const STATUS_OPTIONS = [
  { value: 'hadir', label: 'Hadir', color: 'bg-emerald-500 text-white border-transparent shadow-sm hover:bg-emerald-500' },
  { value: 'izin', label: 'Izin', color: 'bg-amber-500 text-white border-transparent shadow-sm hover:bg-amber-500' },
  { value: 'sakit', label: 'Sakit', color: 'bg-blue-500 text-white border-transparent shadow-sm hover:bg-blue-500' },
  { value: 'alfa', label: 'Alfa', color: 'bg-red-500 text-white border-transparent shadow-sm hover:bg-red-500' },
]

const today = new Date().toISOString().slice(0, 10)

function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

function totalSessionsFor(student) {
  return student.package ? student.package.sessionsPerWeek * 4 * student.package.durationMonths : 0
}

function AbsensiContent() {
  const searchParams = useSearchParams()
  const [ageGroup, setAgeGroup] = useState(searchParams.get('ageGroup') ?? AGE_GROUPS[0])
  const [search, setSearch] = useState('')
  const [students, setStudents] = useState([])
  const [statusMap, setStatusMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const [showScanner, setShowScanner] = useState(false)
  const [scanning, setScanning] = useState(false)

  const filteredStudents = students.filter((s) =>
    s.fullName.toLowerCase().includes(search.trim().toLowerCase())
  )

  useEffect(() => {
    setLoading(true)
    Promise.all([api.getStudents(ageGroup || undefined), api.getAttendance(today, ageGroup || undefined)])
      .then(([studentList, attendanceList]) => {
        setStudents(studentList)
        const map = {}
        for (const a of attendanceList) map[a.studentId] = a.status
        setStatusMap(map)
      })
      .finally(() => setLoading(false))
  }, [ageGroup])

  async function handleSubmit() {
    const records = students
      .filter((s) => statusMap[s.id])
      .map((s) => ({ studentId: s.id, status: statusMap[s.id] }))
    if (records.length === 0) return setMessage('Tandai status minimal 1 siswa dulu')
    setSending(true)
    try {
      const result = await api.submitAttendance(today, records)
      setMessage(
        result.alreadyRecorded?.length > 0
          ? `Absensi berhasil dikirim (${result.alreadyRecorded.length} siswa sudah tercatat hari ini, sesi tidak bertambah)`
          : 'Absensi berhasil dikirim'
      )
    } catch (err) {
      setMessage(err.message)
    } finally {
      setSending(false)
      setTimeout(() => setMessage(''), 3000)
    }
  }

  async function handleScan(qrCode) {
    if (scanning) return
    setScanning(true)
    setShowScanner(false)
    try {
      const result = await api.scanAttendance(qrCode)
      setStatusMap((m) => ({ ...m, [result.student.id]: 'hadir' }))
      setMessage(
        result.attendance?.alreadyRecorded
          ? `${result.student.fullName} sudah tercatat hari ini — sesi tidak bertambah lagi`
          : `${result.student.fullName} berhasil absen (Hadir)`
      )
    } catch (err) {
      setMessage(err.message)
    } finally {
      setScanning(false)
      setTimeout(() => setMessage(''), 3000)
    }
  }

  return (
    <div className="space-y-6">
      <StaffCheckinCard />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-bold text-navy-900 text-lg">Absensi</h1>
          <p className="text-sm text-gray-400">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowScanner(true)}
            className="flex items-center gap-1.5 bg-gold-400 hover:bg-gold-500 text-navy-900 text-sm font-semibold px-3 py-2 rounded-2xl"
          >
            <QrCode size={16} /> Scan QR
          </button>
          <AppSelect
            value={ageGroup}
            onChange={setAgeGroup}
            allLabel="Semua Umur"
            options={AGE_GROUPS.map((ag) => ({ value: ag, label: ag }))}
          />
        </div>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama siswa..."
          className="w-full glass-card rounded-2xl pl-10 pr-4 py-2.5 text-sm text-navy-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-300"
        />
      </div>

      {showScanner && <QrScannerModal onScan={handleScan} onClose={() => setShowScanner(false)} />}

      {message && (
        <div className="text-sm bg-navy-50 text-navy-700 border border-navy-100 rounded-2xl px-3 py-2">{message}</div>
      )}

      {loading ? null : students.length === 0 ? (
        <div className="glass-card rounded-3xl p-10 text-center text-sm text-gray-400">
          Belum ada siswa di kelompok umur ini.
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="glass-card rounded-3xl p-10 text-center text-sm text-gray-400">
          Siswa dengan nama tersebut tidak ditemukan.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredStudents.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-4 glass-card rounded-3xl p-4 hover:border-gold-200 transition-colors duration-200"
            >
              <div className="w-11 h-11 rounded-full bg-navy-50 overflow-hidden flex items-center justify-center shrink-0 font-bold text-navy-700 text-sm">
                {s.photo ? <img src={s.photo} alt="" className="w-full h-full object-cover" /> : initials(s.fullName)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-navy-900 truncate">{s.fullName}</div>
                <div className="text-xs text-gray-400">
                  {s.studentId}
                  {totalSessionsFor(s) > 0 && <span className="ml-2 text-gray-500 font-medium">{s.sessionsUsed}/{totalSessionsFor(s)} sesi</span>}
                </div>
                {s.status === 'needs_renewal' && (
                  <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600">Kuota Habis</span>
                )}
              </div>
              <div className="shrink-0 w-[118px] sm:w-[136px]">
                {s.status === 'needs_renewal' ? (
                  <div className="w-full text-center text-[11px] font-semibold text-red-500 bg-red-50 border border-red-100 rounded-2xl py-2.5">
                    Perlu Perpanjang
                  </div>
                ) : (
                  <AppSelect
                    value={statusMap[s.id] || ''}
                    onChange={(v) => setStatusMap((m) => ({ ...m, [s.id]: v }))}
                    placeholder="Absen"
                    className={`w-full text-xs font-semibold ${
                      statusMap[s.id]
                        ? STATUS_OPTIONS.find((o) => o.value === statusMap[s.id])?.color || ''
                        : 'opacity-60'
                    }`}
                    options={STATUS_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))}
                  />
                )}
              </div>
            </div>
          ))}

          <div className="sticky bottom-4 pt-2">
            <button
              onClick={handleSubmit}
              disabled={sending}
              className="w-full flex items-center justify-center gap-2 bg-navy-900 hover:bg-navy-800 text-white font-semibold text-sm px-5 py-3.5 rounded-2xl shadow-lg disabled:opacity-50"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Kirim Absensi
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AbsensiPage() {
  return (
    <Suspense fallback={null}>
      <AbsensiContent />
    </Suspense>
  )
}
