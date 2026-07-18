'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Send, Loader2, QrCode } from 'lucide-react'
import * as api from '@/lib/api'
import { AGE_GROUPS } from '@/lib/ageGroups'
import QrScannerModal from '@/components/QrScannerModal'
import StaffCheckinCard from '@/components/StaffCheckinCard'
import { AppSelect } from '@/components/ui/app-select'

const STATUS_OPTIONS = [
  { value: 'hadir', label: 'Hadir', color: 'bg-emerald-500 text-white' },
  { value: 'izin', label: 'Izin', color: 'bg-amber-500 text-white' },
  { value: 'sakit', label: 'Sakit', color: 'bg-blue-500 text-white' },
  { value: 'alfa', label: 'Alfa', color: 'bg-red-500 text-white' },
]

const today = new Date().toISOString().slice(0, 10)

function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

function AbsensiContent() {
  const searchParams = useSearchParams()
  const [ageGroup, setAgeGroup] = useState(searchParams.get('ageGroup') || AGE_GROUPS[0])
  const [students, setStudents] = useState([])
  const [statusMap, setStatusMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const [showScanner, setShowScanner] = useState(false)
  const [scanning, setScanning] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([api.getStudents(ageGroup), api.getAttendance(today, ageGroup)])
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
      await api.submitAttendance(today, records)
      setMessage('Absensi berhasil dikirim')
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
      setMessage(`${result.student.fullName} berhasil absen (Hadir)`)
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
          <AppSelect value={ageGroup} onChange={setAgeGroup} options={AGE_GROUPS.map((ag) => ({ value: ag, label: ag }))} />
        </div>
      </div>

      {showScanner && <QrScannerModal onScan={handleScan} onClose={() => setShowScanner(false)} />}

      {message && (
        <div className="text-sm bg-navy-50 text-navy-700 border border-navy-100 rounded-2xl px-3 py-2">{message}</div>
      )}

      {loading ? null : students.length === 0 ? (
        <div className="glass-card rounded-3xl p-10 text-center text-sm text-gray-400">
          Belum ada siswa di kelompok umur ini.
        </div>
      ) : (
        <div className="space-y-3">
          {students.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-4 glass-card rounded-3xl p-4 hover:border-gold-200 transition-colors duration-200"
            >
              <div className="w-11 h-11 rounded-full bg-navy-50 overflow-hidden flex items-center justify-center shrink-0 font-bold text-navy-700 text-sm">
                {s.photo ? <img src={s.photo} alt="" className="w-full h-full object-cover" /> : initials(s.fullName)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-navy-900 truncate">{s.fullName}</div>
                <div className="text-xs text-gray-400">{s.studentId}</div>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setStatusMap((m) => ({ ...m, [s.id]: opt.value }))}
                    className={`text-xs font-semibold px-2.5 py-1.5 rounded-xl border transition-colors duration-150 ${
                      statusMap[s.id] === opt.value ? opt.color + ' border-transparent shadow-sm' : 'border-gray-200 text-gray-400 hover:border-gray-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
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
