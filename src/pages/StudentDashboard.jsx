import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp,
  Target,
  Award,
  Calendar,
  Download,
  Printer,
  X,
  Upload,
  ShieldCheck,
  AlertTriangle,
  CreditCard,
  Clock,
  User,
  Hash,
  Users,
  CheckCircle,
  Zap,
  Star,
  Send,
} from 'lucide-react'

const defaultSpp = { status: 'unpaid', package: '8 Sesi / Bulan', sessionsUsed: 0, sessionsPaid: 8 }
const defaultMetrics = { passing: 0, dribbling: 0, stamina: 0, shooting: 0, tactics: 0 }
const defaultFeedback = { name: 'Coach', note: 'Belum ada catatan dari pelatih.', avatar: '' }

function TrafficLightCard({ child }) {
  const [status, setStatus] = useState(child?.spp?.status || defaultSpp.status)
  const [uploadedFile, setUploadedFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [proofSent, setProofSent] = useState(false)

  const sessionsLabel = `Sesi Berjalan: ${child?.spp?.sessionsUsed || defaultSpp.sessionsUsed} / ${child?.spp?.sessionsPaid || defaultSpp.sessionsPaid} Sesi`

  const trafficStates = [
    { key: 'paid', label: 'Lunas', icon: CheckCircle },
    { key: 'unpaid', label: 'Belum Bayar', icon: AlertTriangle },
    { key: 'oversession', label: 'Over-Sesi', icon: Clock },
  ]

  function handleFileDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer?.files?.[0] || e.target?.files?.[0]
    if (file) setUploadedFile(file)
  }

  async function handleSubmitProof() {
    if (!uploadedFile || !child?.sppId) return
    setUploading(true)
    try {
      const api = await import('../api')
      const { url } = await api.uploadFile(uploadedFile)
      await api.uploadProof(child.sppId, url)
      setProofSent(true)
      setUploadedFile(null)
    } catch (err) {
      console.error('Upload failed:', err)
    }
    setUploading(false)
  }

  function renderStatusContent() {
    if (status === 'paid') {
      return (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="bg-green-100 rounded-full p-2 shrink-0">
              <ShieldCheck className="text-green-600" size={22} />
            </div>
            <div>
              <p className="font-semibold text-green-800 text-sm">Pembayaran Aman - Terima Kasih!</p>
              <p className="text-green-600 text-xs mt-1">
                SPP bulan ini sudah lunas. Nikmati latihan tanpa khawatir.
              </p>
            </div>
          </div>
        </div>
      )
    }

    if (status === 'unpaid') {
      return (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="bg-red-100 rounded-full p-2 shrink-0">
              <AlertTriangle className="text-red-600" size={22} />
            </div>
            <div>
              <p className="font-semibold text-red-800 text-sm">Tagihan Bulan Ini Belum Dibayar</p>
              <p className="text-red-600 text-xs mt-1">
                Segera lakukan pembayaran untuk melanjutkan latihan tanpa hambatan.
              </p>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="bg-yellow-100 rounded-full p-2 shrink-0">
            <Clock className="text-yellow-600" size={22} />
          </div>
          <div>
            <p className="font-semibold text-yellow-800 text-sm">Melebihi Sesi / Over-Session</p>
            <p className="text-yellow-700 text-xs mt-1">
              {sessionsLabel}. Kuota sesi Anda habis, mohon lakukan pembayaran untuk sesi tambahan.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CreditCard className="text-navy-700" size={20} />
          <h3 className="font-heading font-bold text-navy-900">SPP & Manajemen Biaya</h3>
        </div>
        <span className="bg-navy-100 text-navy-700 text-xs font-semibold px-3 py-1 rounded-full">
          {child?.spp?.package || defaultSpp.package}
        </span>
      </div>

      <div className="flex gap-2 mb-4">
        {trafficStates.map((s) => (
          <button
            key={s.key}
            onClick={() => { setStatus(s.key); setUploadedFile(null) }}
            className={`flex-1 text-xs font-semibold py-2 rounded-lg border-2 transition-all duration-200 flex items-center justify-center gap-1.5 ${
              status === s.key
                ? 'border-navy-600 bg-navy-50 text-navy-800'
                : 'border-gray-200 text-gray-400 hover:border-gray-300'
            }`}
          >
            <s.icon size={14} />
            {s.label}
          </button>
        ))}
      </div>

      <div className="transition-all duration-300">
        {renderStatusContent()}

        {status !== 'paid' && (
          <div className="mt-4">
            {proofSent ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2">
                <CheckCircle size={16} className="text-emerald-600" />
                <span className="text-sm text-emerald-700">Bukti pembayaran sudah dikirim!</span>
              </div>
            ) : uploadedFile ? (
              <div className="space-y-2">
                <div className="bg-navy-50 border border-navy-200 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate">
                    <Upload className="text-navy-600 shrink-0" size={18} />
                    <span className="text-sm text-navy-700 truncate">{uploadedFile.name}</span>
                  </div>
                  <button
                    onClick={() => setUploadedFile(null)}
                    className="text-red-500 hover:text-red-700 transition-colors shrink-0 ml-2"
                  >
                    <X size={18} />
                  </button>
                </div>
                <button
                  onClick={handleSubmitProof}
                  disabled={uploading}
                  className="w-full bg-navy-800 hover:bg-navy-700 disabled:bg-gray-300 text-white font-semibold text-sm py-2.5 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <Send size={14} />
                  {uploading ? 'Mengirim...' : 'Kirim Bukti'}
                </button>
              </div>
            ) : (
              <label
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-4 cursor-pointer transition-all duration-200 ${
                  dragOver
                    ? 'border-gold-400 bg-gold-50'
                    : 'border-gray-300 bg-gray-50 hover:border-navy-400 hover:bg-navy-50'
                }`}
              >
                <Upload
                  className={`mb-2 transition-colors duration-200 ${dragOver ? 'text-gold-500' : 'text-gray-400'}`}
                  size={28}
                />
                <span className="text-sm font-medium text-gray-600">
                  Unggah Bukti Transfer
                </span>
                <span className="text-xs text-gray-400 mt-1">
                  Seret & lepas atau klik untuk memilih file
                </span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileDrop}
                  className="hidden"
                />
              </label>
            )}
            <p className="text-xs text-gray-400 mt-2 text-center">
              Format: JPG, PNG, PDF. Maks 5MB
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function QRModal({ show, onClose, child }) {
  if (!show) return null

  const profileName = child?.name || 'Arkananta Putra'
  const profileAvatar = child?.avatar || 'https://api.dicebear.com/9.x/avataaars/svg?seed=Arkananta'
  const profileId = child?.studentId || '6S-2026-042'
  const profileAgeGroup = child?.ageGroup || 'U-12 Pre-Academy'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-white/90 hover:bg-white rounded-full p-2 shadow-md transition-all duration-200 hover:scale-105"
        >
          <X size={20} className="text-navy-800" />
        </button>

        <div className="bg-gradient-to-br from-navy-800 to-navy-900 p-6 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur rounded-full px-4 py-1.5 mb-4">
            <Star size={14} className="text-gold-400" />
            <span className="text-white/80 text-xs font-medium">ID Card Akademi</span>
            <Star size={14} className="text-gold-400" />
          </div>
          <div className="w-20 h-20 mx-auto bg-white rounded-full flex items-center justify-center shadow-lg mb-3">
            <img
              src={profileAvatar}
              alt={profileName}
              className="w-16 h-16 rounded-full"
            />
          </div>
          <h3 className="font-heading font-bold text-white text-lg">
            {profileName}
          </h3>
          <p className="text-gold-400 text-sm font-medium mt-0.5">
            {profileAgeGroup}
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Hash className="text-navy-400" size={16} />
              <span className="text-xs text-gray-500">ID Siswa</span>
            </div>
            <span className="text-sm font-bold text-navy-800">{profileId}</span>
          </div>

          <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="text-navy-400" size={16} />
              <span className="text-xs text-gray-500">Kelompok Umur</span>
            </div>
            <span className="text-sm font-bold text-navy-800">{profileAgeGroup}</span>
          </div>

          <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="text-navy-400" size={16} />
              <span className="text-xs text-gray-500">Posisi</span>
            </div>
            <span className="text-sm font-bold text-navy-800">{child?.position || '-'}</span>
          </div>

          <div className="border-t border-gray-100 pt-4 text-center">
            <div className="bg-white border-2 border-gray-200 rounded-xl p-3 inline-block">
              <div className="w-28 h-28 mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="grid grid-cols-7 gap-0.5 mb-2">
                    {Array.from({ length: 49 }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-2.5 h-2.5 rounded-sm ${
                          Math.random() > 0.5 ? 'bg-navy-800' : 'bg-white border border-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[8px] font-mono font-bold text-navy-800 tracking-widest">
                    SSB SIX STAR
                  </span>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Tunjukkan QR Code ini saat presensi latihan. Pelatih akan memindai untuk mencatat kehadiranmu.
            </p>
          </div>
        </div>

        <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full bg-navy-800 hover:bg-navy-700 text-white font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
          >
            <Printer size={18} />
            Cetak ID Card
          </button>
        </div>
      </div>
    </div>
  )
}

function AttendanceCard({ child }) {
  const [showModal, setShowModal] = useState(false)

  const defaultAtt = { sessionsAttended: 0, totalSessions: 12, percentage: 0 }
  const att = child?.attendance || defaultAtt

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 transition-all duration-300">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="text-navy-700" size={20} />
        <h3 className="font-heading font-bold text-navy-900">Kehadiran & ID Card</h3>
      </div>

      <div className="bg-gradient-to-br from-navy-50 to-blue-50 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-navy-700 font-medium">Kehadiran Bulan Ini</span>
          <span className="text-navy-800 font-bold text-lg">
            {att.sessionsAttended}{' '}
            <span className="text-navy-500 text-sm font-normal">
              / {att.totalSessions} Sesi
            </span>
          </span>
        </div>

        <div className="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden mb-2">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-navy-500 to-gold-400 rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${att.percentage}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Target: 100%</span>
          <span className="text-sm font-bold text-navy-700">{att.percentage}%</span>
        </div>
      </div>

      <button
        onClick={() => setShowModal(true)}
        className="w-full mt-4 bg-navy-800 hover:bg-navy-700 text-white font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 group"
      >
        <Download size={18} className="group-hover:scale-110 transition-transform" />
        Unduh / Cetak ID Card QR
      </button>

      <QRModal show={showModal} onClose={() => setShowModal(false)} child={child} />
    </div>
  )
}

function CoachFeedbackCard({ child }) {
  const feedback = child?.coachFeedback || defaultFeedback

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 transition-all duration-300 mt-5">
      <div className="flex items-center gap-2 mb-4">
        <User className="text-navy-700" size={20} />
        <h3 className="font-heading font-bold text-navy-900">Catatan Pelatih</h3>
      </div>

      <div className="relative">
        <div className="absolute -top-2 left-6 w-4 h-4 bg-gold-400 rotate-45" />
        <div className="bg-gradient-to-br from-gold-400 to-gold-500 rounded-2xl p-4 relative">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-white/30 flex items-center justify-center shrink-0">
              <img
                src={feedback.avatar}
                alt={feedback.name}
                className="w-9 h-9 rounded-full"
              />
            </div>
            <div>
              <p className="font-heading font-bold text-navy-900 text-sm">
                {feedback.name}
              </p>
              <p className="text-navy-800/70 text-xs">Head Pre-Academy Coach</p>
            </div>
          </div>
          <div className="bg-white/20 backdrop-blur rounded-xl p-3">
            <p className="text-navy-900 text-sm leading-relaxed">
              <span className="font-semibold">Catatan Coach:</span>{' '}
              {feedback.note}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function RadarChartCard({ child }) {
  const metrics = child?.metrics || defaultMetrics
  const reportPeriod = child?.monthlyReportPeriod || null
  const periodLabel = reportPeriod
    ? (() => { const [y, m] = reportPeriod.split('-'); const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']; return months[parseInt(m)-1] + ' ' + y })()
    : 'Bulan Ini'

  const radarData = [
    { metric: 'Passing', score: metrics.passing },
    { metric: 'Dribbling', score: metrics.dribbling },
    { metric: 'Stamina', score: metrics.stamina },
    { metric: 'Shooting', score: metrics.shooting },
    { metric: 'Tactics', score: metrics.tactics },
  ]

  const overallRating = Math.round(
    (metrics.passing + metrics.dribbling + metrics.stamina + metrics.shooting + metrics.tactics) / 5
  )

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 transition-all duration-300">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Target className="text-navy-700" size={20} />
          <h3 className="font-heading font-bold text-navy-900">Analytics Performa</h3>
        </div>
        <span className="text-xs text-gray-400 font-medium">{periodLabel}</span>
      </div>

      <div className="relative">
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid stroke="#e5e7eb" strokeWidth={1} />
            <PolarAngleAxis
              dataKey="metric"
              tick={{ fill: '#1e293b', fontSize: 12, fontWeight: 600 }}
              stroke="#cbd5e1"
              strokeWidth={0.5}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 100]}
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickCount={6}
            />
            <Radar
              name="Skor"
              dataKey="score"
              stroke="#c49a35"
              strokeWidth={2.5}
              fill="#c49a35"
              fillOpacity={0.2}
              animationDuration={800}
              animationEasing="ease-out"
            />
          </RadarChart>
        </ResponsiveContainer>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 shadow-lg shadow-gold-400/30">
              <div>
                <p className="text-white text-2xl font-black font-heading leading-none">
                  {overallRating}
                </p>
                <p className="text-white/80 text-[10px] font-semibold tracking-wider">
                  OVR
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-3 flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="text-green-600" size={18} />
          <span className="text-sm font-medium text-green-700">
            Naik +3 bulan ini!
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Zap className="text-gold-500" size={14} />
          <span className="text-xs text-gray-500">Terus tingkatkan!</span>
        </div>
      </div>

      <CoachFeedbackCard child={child} />
    </div>
  )
}

function DashboardHeader({ child }) {
  const metrics = child?.metrics || defaultMetrics
  const overallRating = Math.round(
    (metrics.passing + metrics.dribbling + metrics.stamina + metrics.shooting + metrics.tactics) / 5
  )

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy-800 via-navy-900 to-navy-950 shadow-xl mb-6">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-gold-400/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-gold-400/5 rounded-full blur-3xl" />
      </div>

      <div className="relative p-6 lg:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur rounded-full px-4 py-1.5 mb-3">
              <Star size={14} className="text-gold-400" />
              <span className="text-white/80 text-xs font-medium">Akademi Sepak Bola</span>
              <Star size={14} className="text-gold-400" />
            </div>
            <h1 className="font-heading text-2xl lg:text-3xl font-bold text-white">
              Halo, Selamat Datang Kembali!
            </h1>
            <p className="text-gold-400 text-lg lg:text-xl font-heading font-bold mt-1">
              {child?.name || 'Arkananta Putra'}
            </p>
            <p className="text-white/60 text-sm mt-1 max-w-xl">
              Pantau perkembangan latihan, kehadiran, dan informasi akademi putra Anda di sini.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-4 shrink-0">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 p-0.5 shrink-0">
              <div className="w-full h-full rounded-full bg-navy-800 flex items-center justify-center">
                <img
                  src={child?.avatar || 'https://api.dicebear.com/9.x/avataaars/svg?seed=Arkananta'}
                  alt={child?.name || 'Arkananta Putra'}
                  className="w-full h-full rounded-full"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Hash size={12} className="text-gold-400" />
                <span className="text-white text-xs">
                  ID:{' '}
                  <span className="font-semibold text-gold-400">
                    {child?.studentId || '6S-2026-042'}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users size={12} className="text-gold-400" />
                <span className="text-white text-xs">
                  Kelompok Umur:{' '}
                  <span className="font-semibold text-gold-400">
                    {child?.ageGroup || 'U-12 Pre-Academy'}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Award size={12} className="text-gold-400" />
                <span className="text-white text-xs">
                  OVR:{' '}
                  <span className="font-semibold text-gold-400">
                    {overallRating}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Star size={12} className="text-gold-400" />
                <span className="text-white text-xs">
                  Posisi:{' '}
                  <span className="font-semibold text-gold-400">
                    {child?.position || '-'}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function StudentDashboard() {
  const { session } = useOutletContext()
  const [child, setChild] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session?.id && session?.child) {
      setChild(session.child)
      setLoading(false)
      return
    }
    import('../api').then((api) => {
      api.getMyChild().then((data) => {
        const monthlyMetrics = data.monthlyReport || data.metrics
        const c = {
          name: data.student?.name || '-',
          studentId: data.student?.id?.substring(0, 8) || '-',
          ageGroup: data.student?.age_group_label || '-',
          avatar: data.student?.avatar || '',
          position: data.student?.position_singkatan || '',
          metrics: monthlyMetrics || { passing: 0, dribbling: 0, stamina: 0, shooting: 0, tactics: 0 },
          monthlyReportPeriod: data.monthlyReport?.period || null,
          attendance: data.attendance || { sessionsAttended: 0, totalSessions: 12, percentage: 0 },
          coachFeedback: {
            name: '-',
            note: monthlyMetrics?.coach_note || 'Belum ada catatan dari pelatih.',
            avatar: data.student?.avatar || '',
          },
          spp: data.spp ? { ...data.spp, id: data.spp.id, package: '8 Sesi / Bulan' } : { package: '8 Sesi / Bulan', status: 'unpaid', sessionsUsed: 0, sessionsPaid: 8 },
        }
        c.sppId = data.spp?.id || null
        setChild(c)
        setLoading(false)
      }).catch(() => {
        const s = session?.child
        setChild(s || null)
        setLoading(false)
      })
    })
  }, [session])

  if (loading) return null

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      <DashboardHeader child={child} />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-5">
          <RadarChartCard child={child} />
        </div>

        <div className="lg:col-span-2 space-y-5">
          <AttendanceCard child={child} />
          <TrafficLightCard child={child} />
        </div>
      </div>
    </div>
  )
}
