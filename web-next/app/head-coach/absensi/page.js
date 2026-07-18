'use client'

import { useEffect, useState } from 'react'
import { Send, Loader2, QrCode } from 'lucide-react'
import * as api from '@/lib/api'
import { AGE_GROUPS } from '@/lib/ageGroups'
import QrScannerModal from '@/components/QrScannerModal'
import StaffCheckinCard from '@/components/StaffCheckinCard'

const STATUS_OPTIONS = [
  { value: 'hadir', label: 'Hadir', color: 'bg-emerald-500 text-white' },
  { value: 'izin', label: 'Izin', color: 'bg-amber-500 text-white' },
  { value: 'sakit', label: 'Sakit', color: 'bg-blue-500 text-white' },
  { value: 'alfa', label: 'Alfa', color: 'bg-red-500 text-white' },
]

const today = new Date().toISOString().slice(0, 10)

export default function HeadCoachAbsensiPage() {
  const [ageGroup, setAgeGroup] = useState(AGE_GROUPS[0])
  const [date, setDate] = useState(today)
  const [students, setStudents] = useState([])
  const [statusMap, setStatusMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const [showScanner, setShowScanner] = useState(false)
  const [scanning, setScanning] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([api.getStudents(ageGroup), api.getAttendance(date, ageGroup)])
      .then(([studentList, attendanceList]) => {
        setStudents(studentList)
        const map = {}
        for (const a of attendanceList) map[a.studentId] = a.status
        setStatusMap(map)
      })
      .finally(() => setLoading(false))
  }, [ageGroup, date])

  async function handleSubmit() {
    const records = students
      .filter((s) => statusMap[s.id])
      .map((s) => ({ studentId: s.id, status: statusMap[s.id] }))
    if (records.length === 0) return setMessage('Tandai status minimal 1 siswa dulu')
    setSending(true)
    try {
      await api.submitAttendance(date, records)
      setMessage('Absensi berhasil disimpan')
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
          <p className="text-sm text-gray-400">Head Coach bisa lihat &amp; koreksi absensi semua kelompok umur, termasuk tanggal sebelumnya.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowScanner(true)}
            className="flex items-center gap-1.5 bg-gold-400 hover:bg-gold-500 text-navy-900 text-sm font-semibold px-3 py-2 rounded-2xl"
          >
            <QrCode size={16} /> Scan QR
          </button>
          <input
            type="date"
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-200 rounded-2xl text-sm font-medium"
          />
          <select
            value={ageGroup}
            onChange={(e) => setAgeGroup(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-200 rounded-2xl text-sm font-medium"
          >
            {AGE_GROUPS.map((ag) => <option key={ag} value={ag}>{ag}</option>)}
          </select>
        </div>
      </div>

      {showScanner && <QrScannerModal onScan={handleScan} onClose={() => setShowScanner(false)} />}

      {message && (
        <div className="text-sm bg-navy-50 text-navy-700 border border-navy-100 rounded-2xl px-3 py-2">{message}</div>
      )}

      {loading ? null : students.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-10 text-center text-sm text-gray-400">
          Belum ada siswa di kelompok umur ini.
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Nama</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500">ID</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {students.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3 font-medium text-navy-900">{s.fullName}</td>
                  <td className="px-3 py-3 text-gray-400">{s.studentId}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5 flex-wrap">
                      {STATUS_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setStatusMap((m) => ({ ...m, [s.id]: opt.value }))}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${
                            statusMap[s.id] === opt.value ? opt.color + ' border-transparent' : 'border-gray-200 text-gray-400 hover:border-gray-300'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <div className="p-4 border-t border-gray-100 flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={sending}
              className="flex items-center gap-2 bg-navy-900 hover:bg-navy-800 text-white font-semibold text-sm px-5 py-2.5 rounded-2xl disabled:opacity-50"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Simpan Absensi
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
