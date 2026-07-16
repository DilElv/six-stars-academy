import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Award,
  Users,
  Calendar,
  Clock,
  Check,
  Search,
  Plus,
  Trash2,
  Edit3,
  Save,
  Star,
  LogOut,
  ClipboardList,
  UserPlus,
  BarChart3,
  ChevronDown,
  Menu,
  MessageSquare,
  Filter,
  MapPin,
  QrCode,
  Camera,
  ShieldCheck,
  Send,
  Loader2,
  ChevronLeft,
  ChevronRight,
  User,
  Mail,
  Phone,
} from 'lucide-react'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts'
import * as api from '../api'
import { getMetricsDef, computeOverall } from '../data/raportMetrics'

const navItems = [
  { label: 'Absensi', icon: ClipboardList, key: 'attendance' },
  { label: 'Nilai & Performa', icon: BarChart3, key: 'grading' },
  { label: 'Data Murid', icon: Users, key: 'biodata' },
  { label: 'Profil', icon: User, key: 'profile' },
]

const dayNameMap = {
  Minggu: 0, Senin: 1, Selasa: 2, Rabu: 3, Kamis: 4, Jumat: 5, Sabtu: 6,
}

/* ─── HELPERS ─── */
function calculateAge(dob) {
  const birth = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

function getGroupFromAge(age, groups) {
  const g = (groups || []).find((grp) => age >= grp.minAge && age <= grp.maxAge)
  return g ? g.label : (groups?.[0]?.label || 'U-12')
}

function formatDate(iso) {
  if (!iso) return '-'
  const parts = iso.slice(0, 10).split('-')
  if (parts.length === 3) {
    const monthsIndo = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
    return `${parseInt(parts[2])} ${monthsIndo[parseInt(parts[1]) - 1]} ${parts[0]}`
  }
  const d = new Date(iso)
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

function getSessionStatus(session, now) {
  const dayNum = dayNameMap[session.day]
  const today = new Date(now)
  const sessionDate = new Date(today)
  const currentDay = today.getDay()
  let diff = dayNum - currentDay
  if (diff < 0) diff += 7
  sessionDate.setDate(today.getDate() + diff)
  sessionDate.setHours(session.startHour, 0, 0, 0)

  const checkInOpen = new Date(sessionDate)
  checkInOpen.setMinutes(checkInOpen.getMinutes() - 30)

  if (now < checkInOpen) return { status: 'upcoming', label: 'Belum Dibuka', color: 'text-gray-400 bg-gray-100', canCheckIn: false, sessionDate }
  if (now >= checkInOpen && now < sessionDate) return { status: 'open', label: 'Sesi Absensi Dibuka', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', canCheckIn: true, sessionDate }
  return { status: 'late', label: 'Terlambat Melapor - Tercatat di Admin', color: 'text-red-700 bg-red-50 border-red-200', canCheckIn: true, isLate: true, sessionDate }
}

/* ─── COACH NAVBAR ─── */
function CoachNavbar({ coach, onLogout, activeTab, onTabChange }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden text-navy-700 hover:text-navy-900">
              <Menu size={22} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-navy-800 to-navy-600 flex items-center justify-center">
                <Star size={16} className="text-gold-400" />
              </div>
              <span className="font-heading font-bold text-navy-900 text-sm hidden sm:block">SSB Six Star</span>
              <span className="text-gray-300 text-sm hidden sm:block">/</span>
              <span className="text-navy-500 text-sm font-medium hidden sm:block">Pelatih</span>
            </div>
            <div className="hidden lg:flex items-center gap-1 ml-8">
              {navItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => onTabChange(item.key)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === item.key ? 'bg-navy-50 text-navy-900' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <item.icon size={16} />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-1.5">
              <img src={coach.avatar} alt={coach.name} className="w-7 h-7 rounded-full" />
              <span className="text-sm font-medium text-navy-800">{coach.name}</span>
              <ChevronDown size={14} className="text-gray-400" />
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </div>
      {mobileOpen && (
        <div className="lg:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => { onTabChange(item.key); setMobileOpen(false) }}
              className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium ${
                activeTab === item.key ? 'bg-navy-50 text-navy-900' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <item.icon size={16} />
              {item.label}
            </button>
          ))}
          <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 border-t border-gray-100 pt-3 mt-2">
            <img src={coach.avatar} alt={coach.name} className="w-6 h-6 rounded-full" />
            {coach.name}
          </div>
        </div>
      )}
    </nav>
  )
}

/* ─── TIME SIMULATOR ─── */
const timePresets = [
  { label: 'Waktu Nyata (Sekarang)', value: null },
  { label: 'Kamis 15:00 - Sebelum sesi (H-60)', value: 'Kamis 15:00' },
  { label: 'Kamis 15:30 - Siap absen (H-30)', value: 'Kamis 15:30' },
  { label: 'Kamis 16:01 - Telat melapor', value: 'Kamis 16:01' },
  { label: 'Sabtu 07:00 - Sebelum sesi (H-60)', value: 'Sabtu 07:00' },
  { label: 'Sabtu 07:30 - Siap absen (H-30)', value: 'Sabtu 07:30' },
  { label: 'Sabtu 08:01 - Telat melapor', value: 'Sabtu 08:01' },
]

function parseSimulatedTime(label) {
  if (!label) return null
  const [day, time] = label.split(' ')
  const [h, m] = time.split(':').map(Number)
  const dayIndex = dayNameMap[day]
  const now = new Date()
  const d = new Date(now)
  let diff = dayIndex - d.getDay()
  if (diff < 0) diff += 7
  d.setDate(d.getDate() + diff)
  d.setHours(h, m, 0, 0)
  return d
}

function TimeSimulator({ simulatedLabel, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <Clock size={14} className="text-navy-400 shrink-0" />
      <select
        value={simulatedLabel || ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="text-xs bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-navy-700 font-medium focus:outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-400/30 cursor-pointer"
      >
        {timePresets.map((p) => (
          <option key={p.label} value={p.value || ''}>{p.label}</option>
        ))}
      </select>
    </div>
  )
}

/* ─── QR SCAN MODAL ─── */
function QrScannerModal({ onScan, onClose }) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus()
  }, [])

  async function handleLookup(e) {
    e.preventDefault()
    if (!code.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const student = await api.lookupStudent(code.trim())
      setResult(student)
    } catch (err) {
      setError(err.message || 'Siswa tidak ditemukan')
    } finally {
      setLoading(false)
    }
  }

  function handleConfirm() {
    if (result) {
      onScan(result)
      setCode('')
      setResult(null)
      setError('')
      if (inputRef.current) inputRef.current.focus()
    }
  }

  function handleManualAdd() {
    setCode('')
    setResult(null)
    setError('')
    if (inputRef.current) inputRef.current.focus()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-br from-navy-800 to-navy-900 p-5 text-center">
          <QrCode size={36} className="mx-auto text-gold-400 mb-2" />
          <h3 className="font-heading font-bold text-white text-lg">Scan Kartu Murid</h3>
          <p className="text-white/60 text-xs mt-1">Arahkan kamera ke QR kartu atau masukkan ID manual</p>
        </div>

        <div className="p-5 space-y-4">
          <form onSubmit={handleLookup} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ketik ID atau nama siswa..."
              className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gold-400"
            />
            <button type="submit" disabled={loading || !code.trim()}
              className="px-4 py-2.5 bg-navy-800 text-white text-sm font-semibold rounded-xl hover:bg-navy-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              Cari
            </button>
          </form>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
              <p className="text-red-600 text-sm font-semibold">{error}</p>
              <button onClick={handleManualAdd} className="text-xs text-navy-600 underline mt-1">Coba lagi</button>
            </div>
          )}

          {result && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <img src={result.avatar} alt={result.name} className="w-12 h-12 rounded-full border-2 border-emerald-300" />
                <div>
                  <p className="font-heading font-bold text-navy-900">{result.name}</p>
                  <p className="text-xs text-gray-500">{result.age_group_label || '-'} &middot; {result.position_label || '-'}</p>
                  <p className="text-[11px] text-gray-400">{result.id}</p>
                </div>
              </div>
              <button onClick={handleConfirm}
                className="w-full mt-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all">
                <Check size={16} /> Tandai Hadir
              </button>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200">
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── ATTENDANCE TAB ─── */
function AttendanceTab({ students, coachScheduleData }) {
  const [simulatedLabel, setSimulatedLabel] = useState(null)
  const [attendanceMap, setAttendanceMap] = useState({})
  const [coachCheckIn, setCoachCheckIn] = useState(null)
  const [reportSent, setReportSent] = useState(false)
  const [showQrScanner, setShowQrScanner] = useState(false)
  const [selectedSession, setSelectedSession] = useState(null)
  const [activeSessionId, setActiveSessionId] = useState(null)
  const [scanHistory, setScanHistory] = useState([])

  const now = parseSimulatedTime(simulatedLabel) || new Date()

  const sessionsWithStatus = coachScheduleData.map((s) => ({
    ...s,
    ...getSessionStatus(s, now),
  }))

  const activeSession = selectedSession || sessionsWithStatus.find((s) => s.canCheckIn) || sessionsWithStatus[0]
  const activeStudents = students.filter((s) => s.ageGroup === activeSession?.group)
  const canCheckIn = activeSession?.canCheckIn

  const sessionKey = activeSession?.day + activeSession?.venue
  const coachDone = activeSession ? coachCheckIn?.[sessionKey] : null

  useEffect(() => {
    if (!activeSession?.id) return
    const today = new Date().toISOString().split('T')[0]
    api.createSession({
      schedule_id: activeSession.id,
      date: today,
      start_time: (activeSession.time || '').split(' - ')[0] || '16:00',
      venue: activeSession.venue,
    }).then((s) => { if (s?.id) setActiveSessionId(s.id) }).catch(() => {})
  }, [activeSession?.id])

  function toggleAttendance(studentId, val) {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: prev[studentId] === val ? null : val,
    }))
    if (activeSessionId && val) {
      api.markAttendance(studentId, activeSessionId, val).catch(() => {})
    }
  }

  async function handleCoachCheckIn() {
    const isLate = activeSession?.isLate || false
    if (activeSessionId) {
      try {
        await api.coachCheckIn(activeSessionId)
      } catch {
        /* fallback to local */
      }
    }
    setCoachCheckIn((prev) => ({
      ...prev,
      [sessionKey]: { checkedIn: true, isLate, timestamp: now.toISOString() },
    }))
  }

  function handleQrScan(student) {
    if (!activeSessionId) return
    setAttendanceMap((prev) => ({
      ...prev,
      [student.id]: 'hadir',
    }))
    api.markAttendance(student.id, activeSessionId, 'hadir').catch(() => {})
    setScanHistory((prev) => [{ name: student.name, time: new Date().toLocaleTimeString('id-ID'), id: student.id }, ...prev].slice(0, 20))
  }

  async function handleSendReport() {
    if (activeSessionId) {
      try {
        await api.submitReport(activeSessionId, attendanceMap, coachCheckIn?.[sessionKey])
      } catch {
        /* proceed with local state */
      }
    }
    setReportSent(true)
  }

  function getStatusCount(status) {
    return Object.values(attendanceMap).filter((v) => v === status).length
  }

  return (
    <div className="space-y-6">
      {/* QR Scanner Modal */}
      {showQrScanner && (
        <QrScannerModal onScan={handleQrScan} onClose={() => setShowQrScanner(false)} />
      )}

      {/* Time Simulator */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Clock size={18} className="text-navy-600" />
          <span className="text-sm font-medium text-navy-800">Simulasi Waktu Absensi</span>
        </div>
        <TimeSimulator simulatedLabel={simulatedLabel} onChange={setSimulatedLabel} />
        {simulatedLabel && (
          <span className="text-xs text-gold-600 bg-gold-50 px-3 py-1 rounded-full font-medium">
            Mode Simulasi
          </span>
        )}
      </div>

      {/* Schedule Sessions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sessionsWithStatus.map((s, i) => {
          const sk = s.day + s.venue
          const coachStatus = coachCheckIn?.[sk]
          const isActive = activeSession?.day === s.day && activeSession?.venue === s.venue
          return (
            <button
              key={i}
              onClick={() => { setSelectedSession(s); setReportSent(false) }}
              className={`text-left bg-white rounded-2xl border-2 p-5 transition-all duration-200 hover:shadow-lg ${
                isActive ? 'border-navy-600 shadow-md' : 'border-gray-100'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-bold text-navy-900">{s.day}</p>
                  <p className="text-xs text-gray-500">{s.time}</p>
                </div>
                <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${s.color}`}>
                  {s.label}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <MapPin size={12} />
                {s.venue}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1">
                <Users size={12} />
                {s.group} &middot; {s.focus}
              </div>
              {coachStatus && (
                <div className={`text-xs font-semibold mt-2 flex items-center gap-1 ${
                  coachStatus.isLate ? 'text-red-600' : 'text-emerald-600'
                }`}>
                  <ShieldCheck size={12} />
                  {coachStatus.isLate ? 'Coach terlambat' : 'Coach sudah absen'}
                </div>
              )}
              {reportSent && (
                <div className="text-xs font-semibold mt-1 text-navy-600">Laporan terkirim ke Admin</div>
              )}
            </button>
          )
        })}
      </div>

      {/* Active Session Panel */}
      {activeSession && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          {/* Coach Check-in Section */}
          <div className="p-5 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldCheck size={20} className="text-navy-600" />
                <div>
                  <p className="text-sm font-semibold text-navy-900">Absen Pelatih</p>
                  <p className="text-xs text-gray-400">{activeSession.venue} &middot; {activeSession.time}</p>
                </div>
              </div>

              {coachDone ? (
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold ${
                  coachDone.isLate ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
                }`}>
                  <ShieldCheck size={16} />
                  {coachDone.isLate ? 'Terlambat' : 'Tepat Waktu'}
                </div>
              ) : canCheckIn ? (
                <button
                  onClick={handleCoachCheckIn}
                  className={`px-5 py-2 rounded-xl text-sm font-bold text-white transition-all flex items-center gap-2 ${
                    activeSession.isLate
                      ? 'bg-red-500 hover:bg-red-600'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  <Check size={16} />
                  {activeSession.isLate ? 'Absen Masuk (Terlambat)' : 'Absen Masuk'}
                </button>
              ) : (
                <span className="text-xs text-gray-400 bg-gray-200 px-3 py-2 rounded-xl font-medium">
                  Belum waktunya absen
                </span>
              )}
            </div>

            {coachDone && (
              <div className="mt-3 bg-white rounded-xl p-3 flex items-center gap-3 text-sm">
                <Clock size={14} className="text-gray-400" />
                <span className="text-gray-500">
                  Absen masuk:{' '}
                  <span className="font-medium text-navy-700">
                    {new Date(coachDone.timestamp).toLocaleString('id-ID', {
                      hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short',
                    })}
                  </span>
                </span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  coachDone.isLate ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
                }`}>
                  {coachDone.isLate ? 'Terlambat' : 'Tepat Waktu'}
                </span>
                <span className="text-xs text-gray-400 ml-auto">
                  Laporan otomatis ke Admin
                </span>
              </div>
            )}
          </div>

          {/* Session Header */}
          <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-heading font-bold text-navy-900">
                {activeSession.day} &middot; {activeSession.venue}
              </h3>
              <p className="text-xs text-gray-400">
                {activeSession.group} &middot; {activeSession.focus} &middot; {activeSession.time}
                {coachDone && ' &middot; Absen coach sudah masuk'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 text-xs">
                <span className="text-emerald-600 font-medium">H: {getStatusCount('hadir')}</span>
                <span className="text-amber-600 font-medium">I: {getStatusCount('izin')}</span>
                <span className="text-red-600 font-medium">A: {getStatusCount('alfa')}</span>
              </div>
              {!reportSent && (
                <button
                  onClick={() => setShowQrScanner(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-navy-800 text-white text-xs font-bold rounded-xl hover:bg-navy-700 transition-all"
                >
                  <QrCode size={14} /> Scan Kartu
                </button>
              )}
            </div>
          </div>

          {/* Scan History */}
          {scanHistory.length > 0 && (
            <div className="px-5 py-3 bg-blue-50 border-b border-blue-100">
              <p className="text-[11px] font-semibold text-blue-700 mb-1.5">Scan Terakhir:</p>
              <div className="flex flex-wrap gap-1.5">
                {scanHistory.slice(0, 8).map((h, i) => (
                  <span key={i} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                    {h.name} &middot; {h.time}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Student List */}
          {activeStudents.length === 0 ? (
            <div className="p-10 text-center text-gray-400">Tidak ada murid di grup ini.</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {activeStudents.map((st) => {
                const val = attendanceMap[st.id]
                return (
                  <div key={st.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <img src={st.avatar} alt={st.name} className="w-9 h-9 rounded-full bg-gray-100" />
                      <div>
                        <p className="text-sm font-medium text-navy-900">{st.name}</p>
                        <p className="text-xs text-gray-400">{st.id}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Status indicator after scan */}
                      {val === 'hadir' && (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                          <ShieldCheck size={12} /> Hadir
                        </span>
                      )}

                      {/* Manual toggle */}
                      {reportSent ? (
                        <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
                          val === 'hadir' ? 'bg-emerald-100 text-emerald-700'
                          : val === 'izin' ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-700'
                        }`}>
                          {val === 'hadir' ? 'Hadir' : val === 'izin' ? 'Izin' : 'Alfa'}
                        </span>
                      ) : (
                        <div className="flex items-center gap-1">
                          {['hadir', 'izin', 'alfa'].map((opt) => (
                            <button
                              key={opt}
                              onClick={() => toggleAttendance(st.id, opt)}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                val === opt
                                  ? opt === 'hadir' ? 'bg-emerald-500 text-white border-emerald-500'
                                    : opt === 'izin' ? 'bg-amber-400 text-white border-amber-400'
                                    : 'bg-red-400 text-white border-red-400'
                                  : 'bg-gray-50 text-gray-400 border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              {opt === 'hadir' ? 'Hadir' : opt === 'izin' ? 'Izin' : 'Alfa'}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Send Report */}
          {!reportSent ? (
            <div className="p-4 bg-gray-50 border-t border-gray-100">
              <button
                onClick={handleSendReport}
                disabled={!coachDone}
                className={`w-full font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 ${
                  coachDone
                    ? 'bg-navy-800 hover:bg-navy-700 text-white'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Send size={18} />
                Kirim Laporan ke Admin
              </button>
              {!coachDone && (
                <p className="text-xs text-gray-400 text-center mt-2">
                  Harap absen masuk pelatih terlebih dahulu sebelum mengirim laporan.
                </p>
              )}
            </div>
          ) : (
            <div className="p-4 bg-emerald-50 border-t border-gray-100 text-center">
              <div className="flex items-center justify-center gap-2 text-emerald-700 font-semibold text-sm">
                <ShieldCheck size={18} />
                Laporan sudah dikirim ke Admin
              </div>
              <p className="text-xs text-emerald-600 mt-1">
                Data absen coach &middot; {getStatusCount('hadir')} Hadir &middot; {getStatusCount('izin')} Izin &middot; {getStatusCount('alfa')} Alfa
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── GRADING TAB ─── */
function GradeModal({ student, onClose, onSave, sessionDate, detailMode, position }) {
  const [metrics, setMetrics] = useState(student?.metrics || { passing: 50, dribbling: 50, stamina: 50, shooting: 50, tactics: 50 })
  const [metricsData, setMetricsData] = useState(student?.metrics_data || {})
  const [note, setNote] = useState(student?.coachNote || '')

  const metricsDef = detailMode ? getMetricsDef(position || student?.position) : null
  const allKeys = metricsDef ? metricsDef.getAllKeys() : []
  const ovr = detailMode && allKeys.length > 0
    ? Math.round(allKeys.reduce((s, k) => s + (metricsData[k] ?? 0), 0) / allKeys.length)
    : Math.round((metrics.passing + metrics.dribbling + metrics.stamina + metrics.shooting + metrics.tactics) / 5)

  const radarData = detailMode && metricsDef
    ? metricsDef.getRadarData({ metrics_data: metricsData })
    : [
        { metric: 'Passing', score: metrics.passing },
        { metric: 'Dribbling', score: metrics.dribbling },
        { metric: 'Stamina', score: metrics.stamina },
        { metric: 'Shooting', score: metrics.shooting },
        { metric: 'Tactics', score: metrics.tactics },
      ]

  function handleChange(key, val) {
    setMetrics((prev) => ({ ...prev, [key]: Math.max(0, Math.min(100, Number(val))) }))
  }

  function handleDetailChange(key, val) {
    setMetricsData((prev) => ({ ...prev, [key]: Math.max(0, Math.min(100, Number(val))) }))
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  const inputLabel = (key) => key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-br from-navy-800 to-navy-900 p-6 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur rounded-full px-3 py-1 mb-2 w-fit">
                <Calendar size={12} className="text-gold-400" />
                <span className="text-white/70 text-xs font-medium">{formatDate(sessionDate)}</span>
              </div>
              <h3 className="font-heading font-bold text-white text-lg">{student?.name}</h3>
              <p className="text-gold-400 text-xs">{student?.id} &middot; {student?.ageGroup} &middot; {student?.position || position}</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-lg">
                <div>
                  <p className="text-white text-lg font-black font-heading leading-none">{ovr}</p>
                  <p className="text-white/80 text-[8px] font-semibold">OVR</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="font-heading font-bold text-navy-900 text-sm mb-4">Input Nilai</h4>
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
              {detailMode && metricsDef ? (
                metricsDef.categories.map((cat) => (
                  <div key={cat.id}>
                    <p className="text-xs font-bold text-navy-800 mb-2 uppercase tracking-wider">{cat.label}</p>
                    {cat.items && cat.items.map((item) => (
                      <div key={item.key} className="mb-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-medium text-gray-600">{item.label}</span>
                          <span className="text-sm font-bold text-navy-800">{metricsData[item.key] ?? 50}</span>
                        </div>
                        <input type="range" min="0" max="100" value={metricsData[item.key] ?? 50}
                          onChange={(e) => handleDetailChange(item.key, e.target.value)}
                          className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-gold-500" />
                      </div>
                    ))}
                    {cat.subGroups && cat.subGroups.map((sg) => (
                      <div key={sg.id} className="ml-3 mb-2">
                        <p className="text-[11px] font-bold text-navy-700 italic mb-1">{sg.label}</p>
                        {sg.items.map((item) => (
                          <div key={item.key} className="mb-1.5">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[11px] font-medium text-gray-600">{item.label}</span>
                              <span className="text-sm font-bold text-navy-800">{metricsData[item.key] ?? 50}</span>
                            </div>
                            <input type="range" min="0" max="100" value={metricsData[item.key] ?? 50}
                              onChange={(e) => handleDetailChange(item.key, e.target.value)}
                              className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-gold-500" />
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))
              ) : (
                ['passing', 'dribbling', 'stamina', 'shooting', 'tactics'].map((key) => (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-gray-500 uppercase">{key === 'tactics' ? 'Tactics' : key.charAt(0).toUpperCase() + key.slice(1)}</span>
                      <span className="text-sm font-bold text-navy-800">{metrics[key]}</span>
                    </div>
                    <input type="range" min="0" max="100" value={metrics[key]}
                      onChange={(e) => handleChange(key, e.target.value)}
                      className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-gold-500" />
                  </div>
                ))
              )}
            </div>

            <div className="mt-5">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1.5">
                <MessageSquare size={14} />
                Catatan Pelatih
              </label>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-navy-900 placeholder:text-gray-400 focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20 resize-none"
                placeholder="Masukkan catatan untuk pemain..." />
            </div>
          </div>

          <div>
            <h4 className="font-heading font-bold text-navy-900 text-sm mb-4">Visual Radar</h4>
            <div className="bg-gray-50 rounded-2xl p-2">
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid stroke="#d1d5db" strokeWidth={0.5} />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: '#1e293b', fontSize: 11, fontWeight: 600 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 9 }} tickCount={5} />
                  <Radar name="Skor" dataKey="score" stroke="#c49a35" strokeWidth={2} fill="#c49a35" fillOpacity={0.15} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors">Batal</button>
          <button onClick={() => { onSave(student.id, metrics, note, metricsData); onClose() }}
            className="px-5 py-2.5 bg-navy-800 hover:bg-navy-700 text-white font-semibold rounded-xl text-sm transition-all flex items-center gap-2">
            <Save size={16} />
            Simpan Rapor
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── RAPOR BULANAN VIEW ─── */
function RaportBulananView({ students, onUpdateMetrics, ageGroups }) {
  const [metricsDefCache, setMetricsDefCache] = useState({})
  const monthsIndo = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth())
  const [year, setYear] = useState(now.getFullYear())
  const [reportRows, setReportRows] = useState(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [editStudentModal, setEditStudentModal] = useState(null)
  const [message, setMessage] = useState('')

  const period = `${year}-${String(month + 1).padStart(2, '0')}`
  const isPublished = reportRows?.length > 0 && reportRows.every(r => r.is_published)

  async function loadReport() {
    setLoading(true)
    setMessage('')
    try {
      const data = await api.getMonthlyReport(period)
      setReportRows(data)
    } catch {
      setReportRows(null)
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerate() {
    setGenerating(true)
    setMessage('')
    try {
      await api.generateMonthlyReport(period)
      setMessage('✅ Rapor berhasil dibuat')
      await loadReport()
    } catch (err) {
      setMessage('❌ Gagal membuat rapor: ' + err.message)
    } finally {
      setGenerating(false)
    }
  }

  async function handlePublish() {
    setPublishing(true)
    setMessage('')
    try {
      await api.publishMonthlyReport(period)
      setMessage('📨 Rapor berhasil dikirim ke dashboard siswa/parent!')
      await loadReport()
    } catch (err) {
      setMessage('❌ Gagal mengirim: ' + err.message)
    } finally {
      setPublishing(false)
    }
  }

  function handleEditSave(studentId, metrics, note, metricsData) {
    const row = reportRows.find(r => r.student_id === studentId)
    onUpdateMetrics(studentId, metrics, note, period, 'monthly', metricsData)
    setReportRows(prev => prev.map(r => r.student_id === studentId ? { ...r, ...metrics, metrics_data: metricsData, coach_note: note } : r))
    setEditStudentModal(null)
  }

  const studentMap = {}
  students.forEach(s => { studentMap[s.id] = s })

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-br from-navy-800 to-navy-900 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-gold-400" />
            <h3 className="font-heading font-bold text-white">Rapor Bulanan</h3>
          </div>
          <div className="flex items-center gap-2">
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
              className="text-xs font-semibold px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-gold-400">
              {monthsIndo.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))}
              className="w-20 text-xs font-semibold px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-gold-400" />
            <button onClick={loadReport} className="text-xs font-semibold px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all">
              Muat
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleGenerate} disabled={generating}
              className="text-xs font-semibold px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-all disabled:opacity-50">
              {generating ? '...' : '🔄 Buat Rapor'}
            </button>
            {reportRows?.length > 0 && !isPublished && (
              <button onClick={handlePublish} disabled={publishing}
                className="text-xs font-semibold px-3.5 py-2 bg-gold-400 hover:bg-gold-500 text-navy-900 rounded-xl transition-all disabled:opacity-50 flex items-center gap-1.5">
                <Send size={14} />
                {publishing ? 'Mengirim...' : 'Kirim Hasil Rapor'}
              </button>
            )}
            {reportRows?.length > 0 && isPublished && (
              <span className="text-xs font-semibold px-3 py-2 bg-emerald-500/20 text-emerald-300 rounded-lg">
                ✓ Terkirim
              </span>
            )}
          </div>
        </div>
      </div>

      {message && (
        <div className="bg-white rounded-xl shadow border border-gray-100 p-3 text-sm text-navy-700">
          {message}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Nama</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500">Grup</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500">Pos</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500">OVR</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400">Memuat data...</td></tr>
              )}
              {!loading && !reportRows && (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400">Belum ada rapor. Pilih bulan & tahun lalu klik "Buat Rapor"</td></tr>
              )}
              {!loading && reportRows?.map((row) => {
                const pos = row.position_singkatan || ''
                const ovr = computeOverall(row, pos)
                return (
                  <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <img src={row.avatar} alt={row.student_name} className="w-8 h-8 rounded-full bg-gray-100" />
                        <span className="font-medium text-navy-900 text-sm">{row.student_name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center"><span className="text-xs text-gray-500">{row.age_group || '-'}</span></td>
                    <td className="px-3 py-3 text-center"><span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{row.position_singkatan || '-'}</span></td>
                    <td className="px-3 py-3 text-center"><span className="font-bold text-gold-600">{ovr}</span></td>
                    <td className="px-3 py-3 text-center">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${row.is_published ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {row.is_published ? 'Terkirim' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          const st = studentMap[row.student_id]
                          if (st) setEditStudentModal({ ...st, metrics: { passing: row.passing, dribbling: row.dribbling, stamina: row.stamina, shooting: row.shooting, tactics: row.tactics }, metrics_data: row.metrics_data || {}, coachNote: row.coach_note || '' })
                        }}
                        className="p-1.5 text-gray-400 hover:text-navy-600 hover:bg-gray-100 rounded-lg transition-all"
                      >
                        <Edit3 size={15} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {!loading && reportRows?.length === 0 && (
          <div className="p-10 text-center text-gray-400">Tidak ada data rapor untuk periode ini.</div>
        )}
      </div>

      {editStudentModal && (
        <GradeModal
          student={editStudentModal}
          sessionDate={period + '-01'}
          onClose={() => setEditStudentModal(null)}
          onSave={(id, metrics, note, metricsData) => handleEditSave(id, metrics, note, metricsData)}
          detailMode={true}
          position={editStudentModal.position}
        />
      )}
    </div>
  )
}

function ScoreCell({ val }) {
  return <span className={`text-xs font-semibold ${val >= 75 ? 'text-emerald-600' : val >= 60 ? 'text-amber-600' : 'text-red-500'}`}>{val}</span>
}

function GradingTab({ students, onUpdateMetrics, ageGroups }) {
  const [filterGroup, setFilterGroup] = useState('Semua')
  const [filterMode, setFilterMode] = useState('session')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10))
  const [editStudent, setEditStudent] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [averageData, setAverageData] = useState(null)
  const [avgLoading, setAvgLoading] = useState(false)

  const groups = ['Semua', ...(ageGroups || []).map((g) => g.label)]

  useEffect(() => {
    if (filterMode === 'session' || filterMode === 'report') {
      setAverageData(null)
      return
    }
    setAvgLoading(true)
    let promise
    if (filterMode === 'week') {
      promise = api.getAverageReport({ days: 7 })
    } else if (filterMode === 'month') {
      const period = selectedDate.slice(0, 7)
      promise = api.getAverageReport({ period, type: 'monthly' })
    } else if (filterMode === 'year') {
      const year = selectedDate.slice(0, 4)
      promise = api.getAverageReport({ days: 365 })
    }
    if (promise) {
      promise.then((data) => {
        const map = {}
        data.forEach((d) => { map[d.student_id] = d })
        setAverageData(map)
      }).catch(() => setAverageData(null))
        .finally(() => setAvgLoading(false))
    }
  }, [filterMode, selectedDate])

  function getStudentMetrics(st) {
    if (filterMode === 'session') {
      return st.metrics || { passing: 0, dribbling: 0, stamina: 0, shooting: 0, tactics: 0 }
    }
    const avg = averageData?.[st.id]
    return avg || null
  }

  function navigateDate(delta) {
    const d = new Date(selectedDate + 'T00:00:00')
    d.setDate(d.getDate() + delta)
    setSelectedDate(d.toISOString().slice(0, 10))
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  function isReadOnly() {
    return filterMode !== 'session'
  }

  const filtered = students.filter((s) => filterGroup === 'Semua' || s.ageGroup === filterGroup)

  if (filterMode === 'report') {
    return <RaportBulananView students={students} onUpdateMetrics={onUpdateMetrics} ageGroups={ageGroups} />
  }

  return (
    <div className="space-y-5">
      {/* Filter Bar */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 flex flex-wrap items-center gap-3">
        <Filter size={16} className="text-navy-400" />
        {groups.map((g) => (
          <button
            key={g}
            onClick={() => setFilterGroup(g)}
            className={`text-xs font-semibold px-3.5 py-1.5 rounded-lg border transition-all ${
              filterGroup === g ? 'bg-navy-800 text-white border-navy-800' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Mode & Date Navigation */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 flex flex-wrap items-center gap-2">
        {filterMode === 'session' && (
          <div className="flex items-center gap-1 mr-3">
            <button onClick={() => navigateDate(-1)} className="p-1.5 text-gray-500 hover:text-navy-700 hover:bg-gray-100 rounded-lg transition-all">
              <ChevronLeft size={16} />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs font-semibold text-navy-900 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-gold-400"
            />
            <button onClick={() => navigateDate(1)} className="p-1.5 text-gray-500 hover:text-navy-700 hover:bg-gray-100 rounded-lg transition-all">
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-0.5">
          {[
            { key: 'session', label: 'Sesi' },
            { key: 'week', label: '7 Hari' },
            { key: 'month', label: 'Bulan' },
            { key: 'year', label: 'Tahun' },
            { key: 'report', label: '📋 Rapor' },
          ].map((m) => (
            <button
              key={m.key}
              onClick={() => setFilterMode(m.key)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                filterMode === m.key ? 'bg-white text-navy-800 shadow-sm' : 'text-gray-500 hover:text-navy-700'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Nama</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500">Grup</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500">Pos</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500">OVR</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500">Pass</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500">Drib</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500">Stam</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500">Shot</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500">Tac</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {avgLoading && (
                <tr><td colSpan={10} className="text-center py-8 text-gray-400">Memuat data...</td></tr>
              )}
              {!avgLoading && filtered.map((st) => {
                const m = getStudentMetrics(st)
                if (!m) return null
                const ovr = Math.round((m.passing + m.dribbling + m.stamina + m.shooting + m.tactics) / 5)
                return (
                  <tr key={st.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <img src={st.avatar} alt={st.name} className="w-8 h-8 rounded-full bg-gray-100" />
                        <span className="font-medium text-navy-900 text-sm">{st.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center"><span className="text-xs text-gray-500">{st.ageGroup}</span></td>
                    <td className="px-3 py-3 text-center"><span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{st.position || '-'}</span></td>
                    <td className="px-3 py-3 text-center"><span className="font-bold text-gold-600">{ovr}</span></td>
                    <td className="px-3 py-3 text-center"><ScoreCell val={m.passing} /></td>
                    <td className="px-3 py-3 text-center"><ScoreCell val={m.dribbling} /></td>
                    <td className="px-3 py-3 text-center"><ScoreCell val={m.stamina} /></td>
                    <td className="px-3 py-3 text-center"><ScoreCell val={m.shooting} /></td>
                    <td className="px-3 py-3 text-center"><ScoreCell val={m.tactics} /></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!isReadOnly() && (
                          <>
                            <button onClick={() => setEditStudent(st)} className="p-1.5 text-gray-400 hover:text-navy-600 hover:bg-gray-100 rounded-lg transition-all">
                              <Edit3 size={15} />
                            </button>
                            <button onClick={() => setDeleteConfirm(st.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                              <Trash2 size={15} />
                            </button>
                          </>
                        )}
                        {isReadOnly() && (
                          <span className="text-[10px] text-gray-400 italic">rata-rata</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {!avgLoading && filtered.length === 0 && <div className="p-10 text-center text-gray-400">Tidak ada murid.</div>}
      </div>

      {editStudent && (
        <GradeModal
          student={editStudent}
          sessionDate={selectedDate}
          onClose={() => setEditStudent(null)}
          onSave={(id, metrics, note) => onUpdateMetrics(id, metrics, note, selectedDate, 'session')}
        />
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
            <Trash2 size={40} className="mx-auto text-red-400 mb-3" />
            <h3 className="text-center font-heading font-bold text-navy-900">Reset Nilai?</h3>
            <p className="text-center text-sm text-gray-500 mt-1">Nilai performa murid akan direset ke 0 untuk sesi {formatDate(selectedDate)}.</p>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 text-sm font-semibold text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all">Batal</button>
              <button
                onClick={() => { onUpdateMetrics(deleteConfirm, { passing: 0, dribbling: 0, stamina: 0, shooting: 0, tactics: 0 }, '', selectedDate, 'session'); setDeleteConfirm(null) }}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-500 rounded-xl hover:bg-red-600 transition-all"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── ADD POSITION MODAL ─── */
/* ─── ADD GROUP MODAL ─── */
function AddGroupModal({ group, onClose, onSave, ageGroups }) {
  const isEdit = !!group
  const [label, setLabel] = useState(group?.label || '')
  const [minAge, setMinAge] = useState(group?.minAge ?? 10)
  const [maxAge, setMaxAge] = useState(group?.maxAge ?? 13)
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!label.trim()) return setError('Nama grup harus diisi.')
    if (minAge >= maxAge) return setError('Usia maksimal harus lebih besar dari usia minimal.')
    const overlap = ageGroups.some(
      (g) => g.id !== group?.id && !(maxAge < g.minAge || minAge > g.maxAge)
    )
    if (overlap) return setError('Rentang usia bentrok dengan grup yang sudah ada.')
    onSave({ label: label.trim(), minAge, maxAge })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-br from-navy-800 to-navy-900 p-5 text-center">
          <Users size={28} className="mx-auto text-gold-400 mb-2" />
          <h3 className="font-heading font-bold text-white">{isEdit ? 'Edit Grup' : 'Tambah Grup Baru'}</h3>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Nama Grup</label>
            <input
              type="text" value={label} onChange={(e) => setLabel(e.target.value)} required
              placeholder="U-8"
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-navy-900 focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Usia Min</label>
              <input
                type="number" value={minAge} onChange={(e) => setMinAge(Number(e.target.value))} required min={3} max={20}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-navy-900 focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Usia Max</label>
              <input
                type="number" value={maxAge} onChange={(e) => setMaxAge(Number(e.target.value))} required min={3} max={20}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-navy-900 focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20"
              />
            </div>
          </div>
          {minAge >= maxAge && (
            <p className="text-xs text-red-500">Usia maksimal harus lebih besar dari usia minimal.</p>
          )}
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200">Batal</button>
            <button type="submit" className="flex-1 py-2.5 text-sm font-semibold text-white bg-navy-800 rounded-xl hover:bg-navy-700">Simpan</button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── BIODATA TAB ─── */
function AddEditStudentModal({ student, onClose, onSave, ageGroups, positions }) {
  const isEdit = !!student
  const [form, setForm] = useState({
    name: student?.name || '',
    dateOfBirth: student?.dateOfBirth ? student.dateOfBirth.slice(0, 10) : '',
    birthPlace: student?.birthPlace || '',
    address: student?.address || '',
    parentName: student?.parentName || '',
    parentPhone: student?.parentPhone || '',
  })

  const age = form.dateOfBirth ? calculateAge(form.dateOfBirth) : null
  const computedGroup = age !== null ? getGroupFromAge(age, ageGroups) : ''
  const [selectedGroup, setSelectedGroup] = useState(student?.ageGroup || computedGroup)
  const [selectedPosition, setSelectedPosition] = useState(student?.position || (positions?.[0]?.singkatan || ''))

  useEffect(() => {
    if (!isEdit && computedGroup) setSelectedGroup(computedGroup)
  }, [computedGroup, isEdit])

  function handleChange(key, val) {
    setForm((prev) => ({ ...prev, [key]: val }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.name || !form.dateOfBirth) return
    const groupObj = (ageGroups || []).find((g) => g.label === selectedGroup)
    const posObj = (positions || []).find((p) => p.singkatan === selectedPosition)
    onSave({
      ...form,
      id: student?.id || 'STU-' + Date.now(),
      age_group_id: groupObj?.id || student?.ageGroupId || null,
      position_id: posObj?.id || student?.positionId || null,
      ageGroup: selectedGroup,
      position: selectedPosition,
      avatar: student?.avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(form.name)}`,
      metrics: student?.metrics || { passing: 50, dribbling: 50, stamina: 50, shooting: 50, tactics: 50 },
      coachNote: student?.coachNote || '',
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-br from-navy-800 to-navy-900 p-6 sticky top-0 z-10">
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur rounded-full px-3 py-1 mb-2 w-fit">
            <UserPlus size={12} className="text-gold-400" />
            <span className="text-white/70 text-xs font-medium">{isEdit ? 'Edit' : 'Tambah'} Murid</span>
          </div>
          <h3 className="font-heading font-bold text-white text-lg">{isEdit ? 'Edit Data Murid' : 'Tambah Murid Baru'}</h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Nama Lengkap</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-navy-900 focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20"
              placeholder="Nama murid"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Tanggal Lahir</label>
              <input
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                required
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-navy-900 focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Tempat Lahir</label>
              <input
                type="text"
                value={form.birthPlace}
                onChange={(e) => handleChange('birthPlace', e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-navy-900 focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20"
                placeholder="Kota"
              />
            </div>
          </div>

          {age !== null && (
            <div className="bg-navy-50 border border-navy-200 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-navy-500" />
                  <span className="text-sm text-navy-700">Usia: <strong>{age} tahun</strong></span>
                </div>
                <Check size={16} className="text-emerald-500" />
              </div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Grup (otomatis, bisa diubah)</label>
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-navy-900 focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20"
              >
                {(ageGroups || []).map((g) => (
                  <option key={g.id} value={g.label}>{g.label} ({g.minAge}-{g.maxAge} thn)</option>
                ))}
              </select>
              {computedGroup && computedGroup !== selectedGroup && (
                <p className="text-xs text-amber-600 mt-1">
                  Sistem menyarankan <strong>{computedGroup}</strong> untuk usia {age} tahun.
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Posisi</label>
            <select
              value={selectedPosition}
              onChange={(e) => setSelectedPosition(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-navy-900 focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20"
            >
              {(positions || []).map((p) => (
                <option key={p.id} value={p.singkatan}>{p.singkatan} &mdash; {p.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Alamat</label>
            <textarea
              value={form.address}
              onChange={(e) => handleChange('address', e.target.value)}
              rows={2}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-navy-900 focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20 resize-none"
              placeholder="Alamat tempat tinggal"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Nama Orang Tua</label>
              <input
                type="text"
                value={form.parentName}
                onChange={(e) => handleChange('parentName', e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-navy-900 focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20"
                placeholder="Nama orang tua"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">No. Telepon</label>
              <input
                type="text"
                value={form.parentPhone}
                onChange={(e) => handleChange('parentPhone', e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-navy-900 focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20"
                placeholder="+62 8xx-xxxx-xxxx"
              />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-700">Batal</button>
            <button type="submit" className="px-5 py-2.5 bg-navy-800 hover:bg-navy-700 text-white font-semibold rounded-xl text-sm transition-all flex items-center gap-2">
              <Save size={16} />
              {isEdit ? 'Simpan' : 'Tambah Murid'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function BiodataTab({ students, onAddStudent, onEditStudent, onDeleteStudent, ageGroups, onAddGroup, onEditGroup, onDeleteGroup, positions }) {
  const [search, setSearch] = useState('')
  const [filterGroup, setFilterGroup] = useState('Semua')
  const [editStudent, setEditStudent] = useState(null)
  const [showAddStudent, setShowAddStudent] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [showAddGroup, setShowAddGroup] = useState(false)
  const [editGroup, setEditGroup] = useState(null)
  const [deleteGroupId, setDeleteGroupId] = useState(null)
  const [showGroupPanel, setShowGroupPanel] = useState(false)

  const groupLabels = ['Semua', ...(ageGroups || []).map((g) => g.label)]
  const filtered = useMemo(() => {
    let list = students
    if (filterGroup !== 'Semua') list = list.filter((s) => s.ageGroup === filterGroup)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((s) => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q))
    }
    return list
  }, [students, filterGroup, search])

  const studentCountByGroup = (label) => students.filter((s) => s.ageGroup === label).length

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau ID..."
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-navy-900 placeholder:text-gray-400 focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20"
          />
        </div>
        <div className="flex items-center gap-2">
          {groupLabels.map((g) => (
            <button
              key={g}
              onClick={() => setFilterGroup(g)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                filterGroup === g ? 'bg-navy-800 text-white border-navy-800' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
              }`}
            >
              {g}
            </button>
          ))}
          </div>
        <button
          onClick={() => setShowAddGroup(true)}
          className="flex items-center gap-1.5 bg-navy-100 hover:bg-navy-200 text-navy-700 font-semibold text-xs px-3.5 py-2 rounded-xl transition-all"
        >
          <Plus size={14} />
          Grup
        </button>
        <button
          onClick={() => setShowAddStudent(true)}
          className="flex items-center gap-1.5 bg-gold-400 hover:bg-gold-500 text-navy-900 font-semibold text-xs px-4 py-2 rounded-xl transition-all"
        >
          <Plus size={15} />
          Murid
        </button>
      </div>

      {/* Group Management Panel */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <button
          onClick={() => setShowGroupPanel(!showGroupPanel)}
          className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-navy-700 hover:bg-gray-50 transition-all"
        >
          <span>Kelola Grup Umur ({ageGroups?.length || 0} grup)</span>
          <ChevronDown size={16} className={`transition-transform ${showGroupPanel ? 'rotate-180' : ''}`} />
        </button>
        {showGroupPanel && (
          <div className="border-t border-gray-100 p-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-gray-500">
                    <th className="px-3 py-2">Grup</th>
                    <th className="px-3 py-2">Usia Min</th>
                    <th className="px-3 py-2">Usia Max</th>
                    <th className="px-3 py-2">Jumlah Murid</th>
                    <th className="px-3 py-2 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(ageGroups || []).map((g) => (
                    <tr key={g.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2.5 font-semibold text-navy-800">{g.label}</td>
                      <td className="px-3 py-2.5 text-gray-500">{g.minAge} tahun</td>
                      <td className="px-3 py-2.5 text-gray-500">{g.maxAge} tahun</td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-navy-100 text-navy-700">{studentCountByGroup(g.label)}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setEditGroup(g)} className="p-1.5 text-gray-400 hover:text-navy-600 hover:bg-gray-100 rounded-lg">
                            <Edit3 size={14} />
                          </button>
                          <button onClick={() => setDeleteGroupId(g.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Table Murid */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Murid</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500">ID</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500">Tgl Lahir</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500">Usia</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500">Posisi</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500">Grup</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500">Orang Tua</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((st) => (
                <tr key={st.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <img src={st.avatar} alt={st.name} className="w-8 h-8 rounded-full bg-gray-100" />
                      <span className="font-medium text-navy-900 text-sm">{st.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-500">{st.id}</td>
                  <td className="px-3 py-3 text-xs text-gray-500">{formatDate(st.dateOfBirth)}</td>
                  <td className="px-3 py-3 text-center text-xs font-semibold text-navy-700">{calculateAge(st.dateOfBirth)} thn</td>
                  <td className="px-3 py-3 text-center">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{st.position || '-'}</span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-navy-100 text-navy-700">{st.ageGroup}</span>
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-500">{st.parentName}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setEditStudent(st)} className="p-1.5 text-gray-400 hover:text-navy-600 hover:bg-gray-100 rounded-lg transition-all">
                        <Edit3 size={15} />
                      </button>
                      <button onClick={() => setDeleteId(st.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="p-10 text-center text-gray-400">Tidak ada murid ditemukan.</div>}
      </div>

      {/* Modals */}
      {showAddStudent && (
        <AddEditStudentModal
          ageGroups={ageGroups}
          positions={positions}
          onClose={() => setShowAddStudent(false)}
          onSave={(data) => { onAddStudent(data); setShowAddStudent(false) }}
        />
      )}
      {editStudent && (
        <AddEditStudentModal
          student={editStudent}
          ageGroups={ageGroups}
          positions={positions}
          onClose={() => setEditStudent(null)}
          onSave={(data) => { onEditStudent(data); setEditStudent(null) }}
        />
      )}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setDeleteId(null)}>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
            <Trash2 size={40} className="mx-auto text-red-400 mb-3" />
            <h3 className="text-center font-heading font-bold text-navy-900">Hapus Murid?</h3>
            <p className="text-center text-sm text-gray-500 mt-1">Data murid akan dihapus permanen.</p>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 text-sm font-semibold text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200">Batal</button>
              <button onClick={() => { onDeleteStudent(deleteId); setDeleteId(null) }} className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-500 rounded-xl hover:bg-red-600">Hapus</button>
            </div>
          </div>
        </div>
      )}

      {/* Group Modals */}
      {showAddGroup && (
        <AddGroupModal
          ageGroups={ageGroups}
          onClose={() => setShowAddGroup(false)}
          onSave={(data) => { onAddGroup(data); setShowAddGroup(false) }}
        />
      )}
      {editGroup && (
        <AddGroupModal
          group={editGroup}
          ageGroups={ageGroups}
          onClose={() => setEditGroup(null)}
          onSave={(data) => { onEditGroup(editGroup.id, data); setEditGroup(null) }}
        />
      )}
      {deleteGroupId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setDeleteGroupId(null)}>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
            <Trash2 size={40} className="mx-auto text-red-400 mb-3" />
            <h3 className="text-center font-heading font-bold text-navy-900">Hapus Grup?</h3>
            <p className="text-center text-sm text-gray-500 mt-1">
              {studentCountByGroup(ageGroups.find((g) => g.id === deleteGroupId)?.label || '') > 0
                ? `Masih ada ${studentCountByGroup(ageGroups.find((g) => g.id === deleteGroupId)?.label || '')} murid di grup ini. Pindahkan mereka terlebih dahulu.`
                : 'Grup akan dihapus permanen.'}
            </p>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setDeleteGroupId(null)} className="flex-1 py-2.5 text-sm font-semibold text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200">Batal</button>
              <button
                disabled={studentCountByGroup(ageGroups.find((g) => g.id === deleteGroupId)?.label || '') > 0}
                onClick={() => { onDeleteGroup(deleteGroupId); setDeleteGroupId(null) }}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-500 rounded-xl hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

/* ─── MAIN ─── */
function getSession() {
  try {
    const raw = localStorage.getItem('ssb_coach_session')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/* ─── PROFILE TAB ─── */
function ProfileTab({ coach, onUpdateProfile }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [title, setTitle] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (coach) {
      setName(coach.name || '')
      setTitle(coach.title || '')
      setPhone(coach.phone || '')
    }
  }, [coach])

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const { url } = await api.uploadFile(file)
      const updated = await api.updateCoachProfile({ avatar: url })
      onUpdateProfile(updated)
    } catch (err) {
      console.error('Avatar upload failed:', err)
    }
    setUploading(false)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const updated = await api.updateCoachProfile({ title, phone })
      await api.updateMyProfile({ name })
      onUpdateProfile({ ...updated, name })
      setEditing(false)
    } catch (err) {
      console.error('Profile update failed:', err)
    }
    setSaving(false)
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Banner + Avatar */}
      <div className="relative h-32 bg-gradient-to-br from-navy-800 via-navy-900 to-navy-950">
        <div className="absolute -bottom-12 left-8">
          <div
            className="w-24 h-24 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 p-0.5 relative group cursor-pointer"
            onClick={() => fileRef.current?.click()}
          >
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
              <img src={coach.avatar} alt={coach.name} className="w-full h-full rounded-full object-cover" />
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                {uploading ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera size={20} className="text-white" />
                )}
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
        </div>
      </div>

      <div className="pt-16 pb-8 px-8">
        {!editing ? (
          <>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-heading text-2xl font-bold text-navy-900">{coach.name}</h2>
                <p className="text-gold-600 font-medium">{coach.title || 'Coach'}</p>
              </div>
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-navy-50 text-navy-700 rounded-xl text-sm font-medium hover:bg-navy-100 transition-all"
              >
                <Edit3 size={14} />
                Edit Profil
              </button>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                <Mail size={16} className="text-gray-400 shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">Email</p>
                  <p className="text-sm font-medium text-navy-800">{coach.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                <Phone size={16} className="text-gray-400 shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">Telepon</p>
                  <p className="text-sm font-medium text-navy-800">{coach.phone || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                <User size={16} className="text-gray-400 shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">Role</p>
                  <p className="text-sm font-medium text-navy-800">Pelatih</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                <Award size={16} className="text-gray-400 shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">Jabatan</p>
                  <p className="text-sm font-medium text-navy-800">{coach.title || 'Coach'}</p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <h2 className="font-heading text-xl font-bold text-navy-900 mb-6">Edit Profil</h2>
            <div className="space-y-4 max-w-md">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Nama Lengkap</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-navy-900 focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Jabatan</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-navy-900 focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Telepon</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-navy-900 focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20 transition-all"
                />
              </div>
              <div className="flex items-center gap-3 pt-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-navy-800 text-white rounded-xl text-sm font-medium hover:bg-navy-700 transition-all disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Save size={14} />
                  )}
                  Simpan
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="px-5 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-all"
                >
                  Batal
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function CoachDashboard() {
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('attendance')
  const [students, setStudents] = useState([])
  const [ageGroups, setAgeGroups] = useState([])
  const [positions, setPositions] = useState([])
  const [coachProfile, setCoachProfile] = useState(null)
  const [coachScheduleData, setCoachScheduleData] = useState([])
  const [avatarUploading, setAvatarUploading] = useState(false)
  const avatarInputRef = useRef(null)

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarUploading(true)
    try {
      const { url } = await api.uploadFile(file)
      const updated = await api.updateCoachProfile({ avatar: url })
      setCoachProfile(updated)
      const raw = localStorage.getItem('ssb_coach_session')
      if (raw) {
        const s = JSON.parse(raw)
        s.avatar = updated.avatar
        localStorage.setItem('ssb_coach_session', JSON.stringify(s))
      }
    } catch (err) {
      console.error('Avatar upload failed:', err)
    }
    setAvatarUploading(false)
  }

  async function fetchAllData() {
    try {
      const [studs, ags, poss, scheds] = await Promise.all([
        api.getStudents(),
        api.getAgeGroups().catch(() => []),
        api.getPositions().catch(() => []),
        api.getSchedules().catch(() => []),
      ])
      const mappedStudents = studs.map((s) => ({
        id: s.id,
        name: s.name,
        dateOfBirth: s.date_of_birth,
        birthPlace: s.birth_place,
        address: s.address,
        parentName: s.parent_name,
        parentPhone: s.parent_phone,
        ageGroup: s.age_group_label || '',
        ageGroupId: s.age_group_id,
        position: s.position_singkatan || '',
        positionId: s.position_id,
        positionLabel: s.position_label || '',
        avatar: s.avatar,
        bloodType: s.blood_type,
        height: s.height,
        weight: s.weight,
        preferredFoot: s.preferred_foot,
        school: s.school,
        medicalHistory: s.medical_history,
        joinedDate: s.joined_date,
        emergencyContact: s.emergency_contact,
        metrics: null,
        coachNote: '',
      }))
      const mappedSchedules = scheds.map((sc) => {
        const startHour = parseInt((sc.time || '').split(':')[0]) || 16
        const group = ags.find((a) => a.id === sc.age_group_id)
        return {
          id: sc.id,
          day: sc.day,
          time: sc.time,
          startHour,
          venue: sc.venue,
          focus: sc.focus,
          group: group?.label || 'U-12',
          coachName: sc.coach_name || '',
          ageGroupId: sc.age_group_id,
        }
      })
      setStudents(mappedStudents)
      setAgeGroups(ags)
      setPositions(poss)
      setCoachScheduleData(mappedSchedules)

      const studsWithMetrics = await Promise.all(
        mappedStudents.map(async (s) => {
          try {
            const m = await api.getMetrics(s.id)
            return { ...s, metrics: m, coachNote: m.coach_note || '' }
          } catch {
            return { ...s, metrics: { passing: 0, dribbling: 0, stamina: 0, shooting: 0, tactics: 0 }, coachNote: '' }
          }
        })
      )
      setStudents(studsWithMetrics)
    } catch (err) {
      console.error('Failed to fetch data:', err)
    }
  }

  useEffect(() => {
    const s = getSession()
    if (!s) {
      navigate('/login', { replace: true })
      return
    }
    setSession(s)

    api.getCoachProfile().then((cp) => {
      setCoachProfile(cp)
    }).catch(() => {
      setCoachProfile(s)
    })

    fetchAllData()
    setLoading(false)
  }, [navigate])

  function handleLogout() {
    api.logout()
    navigate('/login', { replace: true })
  }

  function handleUpdateProfile(updated) {
    setCoachProfile(updated)
    const raw = localStorage.getItem('ssb_coach_session')
    if (raw) {
      const s = JSON.parse(raw)
      s.name = updated.name
      s.avatar = updated.avatar
      localStorage.setItem('ssb_coach_session', JSON.stringify(s))
    }
  }

  async function updateMetrics(id, metrics, note, period, reportType, metricsData) {
    try {
      const p = period || new Date().toISOString().slice(0, 10)
      const rt = reportType || 'session'
      const payload = {
        passing: metrics.passing,
        dribbling: metrics.dribbling,
        stamina: metrics.stamina,
        shooting: metrics.shooting,
        tactics: metrics.tactics,
        coach_note: note,
        period: p,
        report_type: rt,
      }
      if (metricsData) payload.metrics_data = metricsData
      await api.updateMetrics(id, payload)
      setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, metrics, coachNote: note } : s)))
    } catch (err) {
      console.error('Failed to update metrics:', err)
    }
  }

  async function addStudent(data) {
    try {
      const payload = {
        name: data.name,
        date_of_birth: data.dateOfBirth,
        birth_place: data.birthPlace,
        address: data.address,
        parent_name: data.parentName,
        parent_phone: data.parentPhone,
        age_group_id: data.age_group_id,
        position_id: data.position_id,
        avatar: data.avatar,
      }
      const created = await api.createStudent(payload)
      if (data.metrics) {
        await api.updateMetrics(created.id, data.metrics)
      }
      await fetchAllData()
    } catch (err) {
      console.error('Failed to add student:', err)
    }
  }

  async function editStudent(data) {
    try {
      const payload = {
        name: data.name,
        date_of_birth: data.dateOfBirth,
        birth_place: data.birthPlace,
        address: data.address,
        parent_name: data.parentName,
        parent_phone: data.parentPhone,
        age_group_id: data.age_group_id,
        position_id: data.position_id,
      }
      await api.updateStudent(data.id, payload)
      await fetchAllData()
    } catch (err) {
      console.error('Failed to update student:', err)
    }
  }

  async function deleteStudent(id) {
    try {
      await api.deleteStudent(id)
      setStudents((prev) => prev.filter((s) => s.id !== id))
    } catch (err) {
      console.error('Failed to delete student:', err)
    }
  }

  async function addGroup(data) {
    try {
      await api.createAgeGroup(data)
      const ags = await api.getAgeGroups()
      setAgeGroups(ags)
    } catch (err) {
      console.error('Failed to add group:', err)
    }
  }

  async function editGroup(id, data) {
    try {
      await api.updateAgeGroup(id, data)
      const ags = await api.getAgeGroups()
      setAgeGroups(ags)
    } catch (err) {
      console.error('Failed to edit group:', err)
    }
  }

  async function deleteGroup(id) {
    try {
      await api.deleteAgeGroup(id)
      const ags = await api.getAgeGroups()
      setAgeGroups(ags)
    } catch (err) {
      console.error('Failed to delete group:', err)
    }
  }

  if (loading || !session) return null

  const coach = coachProfile || session

  return (
    <div className="bg-gray-50 min-h-screen">
      <CoachNavbar coach={coach} onLogout={handleLogout} activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* Coach Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy-800 via-navy-900 to-navy-950 shadow-xl mb-6">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-20 -right-20 w-60 h-60 bg-gold-400/10 rounded-full blur-3xl" />
          </div>
          <div className="relative p-6 lg:p-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 p-0.5 shrink-0 relative group cursor-pointer"
                  onClick={() => avatarInputRef.current?.click()}
                >
                  <div className="w-full h-full rounded-full bg-navy-800 flex items-center justify-center overflow-hidden">
                    <img src={coach.avatar} alt={coach.name} className="w-full h-full rounded-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                      {avatarUploading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Camera size={18} className="text-white" />
                      )}
                    </div>
                  </div>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </div>
                <div>
                  <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur rounded-full px-3 py-1 mb-1.5">
                    <Award size={12} className="text-gold-400" />
                    <span className="text-white/70 text-xs font-medium">Dashboard Pelatih</span>
                  </div>
                  <h1 className="font-heading text-2xl font-bold text-white">{coach.name}</h1>
                  <p className="text-gold-400 text-sm">{coach.title || 'Coach'}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Total Murid', value: students.length, icon: Users },
                  { label: 'Sesi/Minggu', value: coachScheduleData.length, icon: Calendar },
                  { label: 'Rata-rata Hadir', value: students.length > 0 ? '91%' : '0%', icon: Check },
                ].map((stat) => (
                  <div key={stat.label} className="bg-white/10 backdrop-blur border border-white/10 rounded-xl p-3 text-center">
                    <stat.icon size={14} className="mx-auto text-gold-400 mb-1" />
                    <p className="text-white text-lg font-bold font-heading">{stat.value}</p>
                    <p className="text-white/60 text-[10px]">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'attendance' && <AttendanceTab students={students} coachScheduleData={coachScheduleData} />}
        {activeTab === 'grading' && <GradingTab students={students} onUpdateMetrics={updateMetrics} ageGroups={ageGroups} />}
        {activeTab === 'biodata' && (
          <BiodataTab
            students={students}
            onAddStudent={addStudent}
            onEditStudent={editStudent}
            onDeleteStudent={deleteStudent}
            ageGroups={ageGroups}
            onAddGroup={addGroup}
            onEditGroup={editGroup}
            onDeleteGroup={deleteGroup}
            positions={positions}
          />
        )}
        {activeTab === 'profile' && (
          <ProfileTab coach={coach} onUpdateProfile={handleUpdateProfile} />
        )}
      </div>
    </div>
  )
}
