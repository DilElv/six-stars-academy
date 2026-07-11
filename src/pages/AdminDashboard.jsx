import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, Award, Calendar, Star, LogOut, ChevronDown,
  UserPlus, Edit3, Trash2, Shield, Settings,
  User, X, Plus, CreditCard, Phone, Baby, Eye, EyeOff, Check, CircleDot,
  ClipboardList, MapPin, Clock, Search as SearchIcon,
} from 'lucide-react'
import * as api from '../api'

const tabs = [
  { key: 'students', label: 'Data Siswa', icon: Baby },
  { key: 'parents', label: 'Orang Tua', icon: Users },
  { key: 'coaches', label: 'Coach', icon: Award },
  { key: 'payments', label: 'Pembayaran', icon: CreditCard },
  { key: 'absensi', label: 'Absensi', icon: ClipboardList },
  { key: 'content', label: 'Landing Page', icon: Settings },
  { key: 'schedules', label: 'Jadwal Latihan', icon: Calendar },
]

function getSession() {
  try { return JSON.parse(localStorage.getItem('ssb_admin_session') || 'null') } catch { return null }
}

function formatCurrency(n) {
  return 'Rp ' + (n || 0).toLocaleString('id-ID')
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('parents')
  const [profiles, setProfiles] = useState([])
  const [adminStudents, setAdminStudents] = useState([])
  const [payments, setPayments] = useState([])
  const [attendanceReports, setAttendanceReports] = useState([])
  const [siteContent, setSiteContent] = useState({})
  const [schedules, setSchedules] = useState([])
  const [ageGroups, setAgeGroups] = useState([])
  const [statusMsg, setStatusMsg] = useState('')
  const [search, setSearch] = useState('')

  const [showAddParent, setShowAddParent] = useState(false)
  const [showAddCoach, setShowAddCoach] = useState(false)
  const [editUser, setEditUser] = useState(null)

  const [showContentEdit, setShowContentEdit] = useState(null)
  const [contentForm, setContentForm] = useState('')
  const [showAddSchedule, setShowAddSchedule] = useState(false)
  const [editSchedule, setEditSchedule] = useState(null)
  const [scheduleForm, setScheduleForm] = useState({ day: 'Senin', time: '16:00 - 18:00 WIB', venue: '', focus: '', age_group_id: '' })

  const [parentForm, setParentForm] = useState({ email: '', password: '', name: '', childName: '', childPhone: '', childDob: '', childAddress: '' })
  const [coachForm, setCoachForm] = useState({ email: '', password: '', name: '', title: '' })

  useEffect(() => {
    const s = getSession()
    if (!s) { navigate('/login', { replace: true }); return }
    setSession(s)

    api.getMe().then((profile) => {
      setSession(profile)
      localStorage.setItem('ssb_admin_session', JSON.stringify(profile))
    }).catch(() => {})

    loadData()
    setLoading(false)
  }, [])

  async function loadData() {
    try {
      const [p, pay, sc, att, studs] = await Promise.all([
        api.getProfiles().catch(() => []),
        api.getPayments().catch(() => []),
        api.getAllSiteContent().catch(() => ({})),
        api.getAttendanceReport().catch(() => []),
        api.getAdminStudents().catch(() => []),
      ])
      setProfiles(p)
      setPayments(pay)
      setSiteContent(sc)
      setAttendanceReports(att)
      setAdminStudents(studs)
      api.getSchedules().then(setSchedules).catch(() => {})
      api.getAgeGroups().then(setAgeGroups).catch(() => {})
    } catch (e) { console.error(e) }
  }

  function handleLogout() { api.logout(); navigate('/login', { replace: true }) }
  function flash(msg) { setStatusMsg(msg); setTimeout(() => setStatusMsg(''), 3000) }

  const parents = profiles.filter((p) => p.role === 'parent')
  const coaches = profiles.filter((p) => p.role === 'coach')
  const filteredParents = parents.filter((p) => {
    if (!search) return true
    const q = search.toLowerCase()
    const childNames = (p.children || []).map((c) => c.name?.toLowerCase() || '').join(' ')
    return p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q) || childNames.includes(q)
  })
  const filteredCoaches = coaches.filter((c) => {
    if (!search) return true
    const q = search.toLowerCase()
    return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
  })
  const filteredPayments = payments.filter((p) => {
    if (!search) return true
    const q = search.toLowerCase()
    return p.student_name?.toLowerCase().includes(q) || p.parent_name?.toLowerCase().includes(q)
  })

  async function handleCreateParent(e) {
    e.preventDefault()
    try {
      await api.createProfile({ ...parentForm, role: 'parent' })
      flash('Akun orang tua berhasil dibuat')
      setShowAddParent(false)
      setParentForm({ email: '', password: '', name: '', childName: '', childPhone: '', childDob: '', childAddress: '' })
      loadData()
    } catch (err) { flash(err.message) }
  }

  async function handleCreateCoach(e) {
    e.preventDefault()
    try {
      await api.createProfile({ ...coachForm, role: 'coach' })
      flash('Akun coach berhasil dibuat')
      setShowAddCoach(false)
      setCoachForm({ email: '', password: '', name: '', title: '' })
      loadData()
    } catch (err) { flash(err.message) }
  }

  async function handleUpdateUser(id, data) {
    try {
      await api.updateProfile(id, data)
      flash('User berhasil diupdate')
      setEditUser(null)
      loadData()
    } catch (err) { flash(err.message) }
  }

  async function handleDeleteUser(id) {
    if (!confirm('Hapus user ini? Semua data terkait juga akan terhapus.')) return
    try {
      await api.deleteProfile(id)
      flash('User dihapus')
      loadData()
    } catch (err) { flash(err.message) }
  }

  async function handleUpdatePayment(id, status) {
    try {
      await api.updatePaymentStatus(id, status)
      flash('Status pembayaran diupdate')
      loadData()
    } catch (err) { flash(err.message) }
  }

  async function handleSaveContent(section, data) {
    try {
      let parsed
      try { parsed = JSON.parse(data) } catch { return flash('JSON tidak valid') }
      await api.updateSiteContent(section, parsed)
      flash('Konten berhasil disimpan')
      setShowContentEdit(null)
      loadData()
    } catch (err) { flash(err.message) }
  }

  async function handleSaveSchedule(sched) {
    try {
      if (sched.id) await api.updateSchedule(sched.id, sched)
      else await api.createSchedule(sched)
      flash('Jadwal tersimpan')
      setShowAddSchedule(false)
      setEditSchedule(null)
      setScheduleForm({ day: 'Senin', time: '16:00 - 18:00 WIB', venue: '', focus: '', age_group_id: '' })
      loadData()
    } catch (err) { flash(err.message) }
  }

  async function handleDeleteSchedule(id) {
    if (!confirm('Hapus jadwal ini?')) return
    try {
      await api.deleteSchedule(id)
      flash('Jadwal dihapus')
      loadData()
    } catch (err) { flash(err.message) }
  }

  if (loading || !session) return null

  return (
    <div className="bg-gray-50 min-h-screen">
      <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center">
                <Shield size={16} className="text-navy-900" />
              </div>
              <span className="font-heading font-bold text-navy-900">Admin SSB Six Star</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-1.5">
                <img src={session.avatar} alt={session.name} className="w-7 h-7 rounded-full" />
                <span className="text-sm font-medium text-navy-800">{session.name}</span>
              </div>
              <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50 rounded-lg">
                <LogOut size={16} /> Keluar
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {statusMsg && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-6 text-sm text-emerald-700">{statusMsg}</div>
        )}

        <div className="flex gap-2 mb-6 flex-wrap">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => { setActiveTab(t.key); setSearch('') }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === t.key ? 'bg-navy-800 text-white' : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <t.icon size={16} /> {t.label}
            </button>
          ))}
        </div>

        {/* Students Tab */}
        {activeTab === 'students' && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-5 flex items-center justify-between border-b border-gray-100">
              <div>
                <h2 className="font-heading font-bold text-navy-900">Data Semua Siswa</h2>
                <p className="text-xs text-gray-400 mt-1">{adminStudents.length} siswa terdaftar</p>
              </div>
              <div className="relative">
                <input type="text" placeholder="Cari nama siswa..." value={search} onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm w-56 focus:outline-none focus:border-gold-400" />
                <User size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Siswa</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500">Usia</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500">Grup</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500">Posisi</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500">Orang Tua</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500">Telepon</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500">Bergabung</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {adminStudents
                    .filter((s) => {
                      if (!search) return true
                      return s.name.toLowerCase().includes(search.toLowerCase()) || (s.parent_name || '').toLowerCase().includes(search.toLowerCase())
                    })
                    .map((s) => {
                      let age = '-'
                      if (s.date_of_birth) {
                        const birth = new Date(s.date_of_birth)
                        const today = new Date()
                        let a = today.getFullYear() - birth.getFullYear()
                        const m = today.getMonth() - birth.getMonth()
                        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) a--
                        age = a + ' thn'
                      }
                      const ovr = s.passing != null ? Math.round((s.passing + s.dribbling + s.stamina + s.shooting + s.tactics) / 5) : null
                      return (
                        <tr key={s.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <img src={s.avatar} alt="" className="w-8 h-8 rounded-full" />
                              <div>
                                <p className="font-medium text-navy-900">{s.name}</p>
                                <p className="text-[11px] text-gray-400">{s.id.substring(0, 8)}...</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center text-xs text-gray-600">{age}</td>
                          <td className="px-3 py-3 text-center">
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-navy-100 text-navy-700">{s.age_group_label || '-'}</span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{s.position_label || '-'}</span>
                          </td>
                          <td className="px-3 py-3 text-xs text-gray-600">{s.parent_name || <span className="text-gray-300 italic">-</span>}</td>
                          <td className="px-3 py-3 text-xs text-gray-500">{s.parent_phone || '-'}</td>
                          <td className="px-3 py-3 text-center text-xs text-gray-500">{s.joined_date || '-'}</td>
                        </tr>
                      )
                    })}
                  {adminStudents.filter((s) => !search || s.name.toLowerCase().includes(search.toLowerCase()) || (s.parent_name || '').toLowerCase().includes(search.toLowerCase())).length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">Tidak ada data</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Parents Tab */}
        {activeTab === 'parents' && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-5 flex items-center justify-between border-b border-gray-100">
              <div>
                <h2 className="font-heading font-bold text-navy-900">Data Orang Tua & Anak</h2>
                <p className="text-xs text-gray-400 mt-1">{filteredParents.length} akun terdaftar</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <input type="text" placeholder="Cari nama / email / anak..." value={search} onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm w-56 focus:outline-none focus:border-gold-400" />
                  <User size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
                <button onClick={() => setShowAddParent(true)} className="flex items-center gap-1.5 bg-navy-800 text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-navy-700">
                  <UserPlus size={15} /> Tambah Orang Tua
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Orang Tua</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500">Email</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500">Nama Anak</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500">Telepon</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500">Bergabung</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredParents.map((p) => {
                    const children = p.children || []
                    return (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <img src={p.avatar} alt={p.name} className="w-8 h-8 rounded-full" />
                            <span className="font-medium text-navy-900">{p.name}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-500">{p.email}</td>
                        <td className="px-3 py-3">
                          {children.length > 0 ? children.map((c, i) => (
                            <div key={i} className="flex items-center gap-1.5 text-xs">
                              <Baby size={12} className="text-gold-500 flex-shrink-0" />
                              <span className="text-navy-700 font-medium">{c.name}</span>
                            </div>
                          )) : <span className="text-xs text-gray-400 italic">-</span>}
                        </td>
                        <td className="px-3 py-3">
                          {children.length > 0 ? children.map((c, i) => (
                            <div key={i} className="flex items-center gap-1.5 text-xs">
                              <Phone size={11} className="text-gray-400 flex-shrink-0" />
                              <span className="text-gray-600">{c.phone || '-'}</span>
                            </div>
                          )) : <span className="text-xs text-gray-400">-</span>}
                        </td>
                        <td className="px-3 py-3 text-center text-xs text-gray-500">{new Date(p.created_at).toLocaleDateString('id-ID')}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => setEditUser(p)} className="p-1.5 text-gray-400 hover:text-navy-600 hover:bg-gray-100 rounded-lg">
                              <Edit3 size={14} />
                            </button>
                            <button onClick={() => handleDeleteUser(p.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {filteredParents.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">Tidak ada data</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Coaches Tab */}
        {activeTab === 'coaches' && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-5 flex items-center justify-between border-b border-gray-100">
              <div>
                <h2 className="font-heading font-bold text-navy-900">Data Coach</h2>
                <p className="text-xs text-gray-400 mt-1">{filteredCoaches.length} coach terdaftar</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <input type="text" placeholder="Cari nama / email..." value={search} onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm w-56 focus:outline-none focus:border-gold-400" />
                  <User size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
                <button onClick={() => setShowAddCoach(true)} className="flex items-center gap-1.5 bg-navy-800 text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-navy-700">
                  <UserPlus size={15} /> Tambah Coach
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Coach</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500">Email</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500">Jabatan</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500">Bergabung</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredCoaches.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <img src={c.avatar} alt={c.name} className="w-8 h-8 rounded-full" />
                          <span className="font-medium text-navy-900">{c.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-500">{c.email}</td>
                      <td className="px-3 py-3">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">{c.coach_title || 'Coach'}</span>
                      </td>
                      <td className="px-3 py-3 text-center text-xs text-gray-500">{new Date(c.created_at).toLocaleDateString('id-ID')}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setEditUser(c)} className="p-1.5 text-gray-400 hover:text-navy-600 hover:bg-gray-100 rounded-lg">
                            <Edit3 size={14} />
                          </button>
                          <button onClick={() => handleDeleteUser(c.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredCoaches.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">Tidak ada data</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-5 flex items-center justify-between border-b border-gray-100">
              <div>
                <h2 className="font-heading font-bold text-navy-900">Pembayaran SPP</h2>
                <p className="text-xs text-gray-400 mt-1">{filteredPayments.length} record pembayaran</p>
              </div>
              <div className="relative">
                <input type="text" placeholder="Cari nama siswa / orang tua..." value={search} onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm w-64 focus:outline-none focus:border-gold-400" />
                <User size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Siswa</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500">Orang Tua</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500">Bulan</th>
                    <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500">Nominal</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500">Status</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500">Bukti</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-navy-900 text-xs">{p.student_name}</td>
                      <td className="px-3 py-3 text-xs text-gray-500">{p.parent_name}</td>
                      <td className="px-3 py-3 text-center text-xs text-navy-700 font-medium">{p.month} {p.year}</td>
                      <td className="px-3 py-3 text-right text-xs font-semibold text-navy-800">{formatCurrency(p.amount)}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                          p.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                          p.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-600'
                        }`}>{p.status}</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        {p.proof_url ? (
                          <a href={p.proof_url} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline text-xs flex items-center justify-center gap-1">
                            <Eye size={12} /> Lihat
                          </a>
                        ) : <span className="text-xs text-gray-300">-</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {p.status !== 'paid' && (
                            <button onClick={() => handleUpdatePayment(p.id, 'paid')}
                              className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100">
                              <Check size={12} /> Bayar
                            </button>
                          )}
                          {p.status !== 'unpaid' && (
                            <button onClick={() => handleUpdatePayment(p.id, 'unpaid')}
                              className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-red-50 text-red-500 hover:bg-red-100">
                              <X size={12} /> Batal
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredPayments.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">Tidak ada data pembayaran</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Attendance Tab */}
        {activeTab === 'absensi' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="p-5 border-b border-gray-100">
                <h2 className="font-heading font-bold text-navy-900">Laporan Absensi</h2>
                <p className="text-xs text-gray-400 mt-1">{attendanceReports.length} sesi tercatat</p>
              </div>
              {attendanceReports.length === 0 ? (
                <div className="p-10 text-center text-gray-400 text-sm">Belum ada laporan absensi</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {attendanceReports.map((r) => {
                    const att = r.attendance || []
                    return (
                      <div key={r.session_id} className="p-5 hover:bg-gray-50 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-heading font-bold text-navy-900">{r.schedule_day}</span>
                              <span className="text-xs text-gray-400">&middot;</span>
                              <span className="text-sm text-gray-600">{r.date}</span>
                              <span className="text-xs text-gray-400">&middot;</span>
                              <span className="text-sm text-gray-500">{r.start_time}</span>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                              <span className="flex items-center gap-1"><MapPin size={11} /> {r.venue}</span>
                              <span className="flex items-center gap-1"><Award size={11} /> {r.coach_name || '-'}</span>
                              <span>{r.age_group || '-'}</span>
                              {r.focus && <span>&middot; {r.focus}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {r.coach_check_in && (
                              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                                'bg-emerald-100 text-emerald-700'
                              }`}>
                                Coach hadir {r.coach_check_in_at ? new Date(r.coach_check_in_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                            )}
                            <div className="flex items-center gap-2 text-xs font-semibold">
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">H: {r.hadir_count || 0}</span>
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">I: {r.izin_count || 0}</span>
                              <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700">A: {r.alfa_count || 0}</span>
                            </div>
                          </div>
                        </div>

                        {att.length > 0 && (
                          <div className="mt-3 bg-gray-50 rounded-xl overflow-hidden">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-gray-200">
                                  <th className="text-left px-3 py-2 font-semibold text-gray-500">Nama Siswa</th>
                                  <th className="text-left px-3 py-2 font-semibold text-gray-500">Orang Tua</th>
                                  <th className="text-center px-3 py-2 font-semibold text-gray-500">Status</th>
                                  <th className="text-right px-3 py-2 font-semibold text-gray-500">Waktu Scan</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {att.map((a, i) => (
                                  <tr key={i} className="hover:bg-gray-100">
                                    <td className="px-3 py-2">
                                      <div className="flex items-center gap-2">
                                        <img src={a.student_avatar} alt="" className="w-5 h-5 rounded-full" />
                                        <span className="font-medium text-navy-800">{a.student_name}</span>
                                      </div>
                                    </td>
                                    <td className="px-3 py-2 text-gray-500">{a.parent_name || '-'}</td>
                                    <td className="px-3 py-2 text-center">
                                      <span className={`font-bold px-2 py-0.5 rounded-full ${
                                        a.status === 'hadir' ? 'bg-emerald-100 text-emerald-700'
                                        : a.status === 'izin' ? 'bg-amber-100 text-amber-700'
                                        : 'bg-red-100 text-red-700'
                                      }`}>
                                        {a.status === 'hadir' ? 'Hadir' : a.status === 'izin' ? 'Izin' : 'Alfa'}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-right text-gray-400">
                                      {a.scanned_at ? new Date(a.scanned_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                        {att.length === 0 && (
                          <p className="text-xs text-gray-400 italic mt-2">Belum ada absensi tercatat untuk sesi ini</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Content Tab */}
        {activeTab === 'content' && (
          <div className="space-y-4">
            {Object.entries(siteContent).map(([section, data]) => (
              <div key={section} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <button onClick={() => setShowContentEdit(showContentEdit === section ? null : section)}
                  className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-navy-700 hover:bg-gray-50">
                  <span className="capitalize">{section.replace(/([A-Z])/g, ' $1')}</span>
                  <ChevronDown size={16} className={`transition-transform ${showContentEdit === section ? 'rotate-180' : ''}`} />
                </button>
                {showContentEdit === section && (
                  <div className="border-t border-gray-100 p-4 space-y-3">
                    <textarea rows={8}
                      defaultValue={JSON.stringify(data, null, 2)}
                      onChange={(e) => setContentForm(e.target.value)}
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono text-navy-900 focus:outline-none focus:border-gold-400"
                    />
                    <button onClick={() => handleSaveContent(section, contentForm)}
                      className="bg-navy-800 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-navy-700">
                      Simpan
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Schedules Tab */}
        {activeTab === 'schedules' && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-5 flex items-center justify-between border-b border-gray-100">
              <h2 className="font-heading font-bold text-navy-900">Jadwal Latihan</h2>
              <button onClick={() => { setShowAddSchedule(true); setScheduleForm({ day: 'Senin', time: '16:00 - 18:00 WIB', venue: '', focus: '', age_group_id: ageGroups[0]?.id || '' }) }}
                className="flex items-center gap-1.5 bg-navy-800 text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-navy-700">
                <Plus size={15} /> Tambah Jadwal
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Hari</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500">Waktu</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500">Venue</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500">Fokus</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500">Grup</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {schedules.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-navy-900">{s.day}</td>
                      <td className="px-3 py-3 text-xs text-gray-500">{s.time}</td>
                      <td className="px-3 py-3 text-xs text-gray-500">{s.venue}</td>
                      <td className="px-3 py-3 text-xs text-gray-500">{s.focus}</td>
                      <td className="px-3 py-3 text-center"><span className="text-xs px-2 py-0.5 rounded-full bg-navy-100 text-navy-700">{ageGroups.find((a) => a.id === s.age_group_id)?.label || '-'}</span></td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => { setEditSchedule(s); setScheduleForm({ day: s.day, time: s.time, venue: s.venue, focus: s.focus, age_group_id: s.age_group_id || '' }); setShowAddSchedule(true) }}
                            className="p-1.5 text-gray-400 hover:text-navy-600 hover:bg-gray-100 rounded-lg">
                            <Edit3 size={14} />
                          </button>
                          <button onClick={() => handleDeleteSchedule(s.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
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

        {/* Add/Edit Schedule Modal */}
        {(showAddSchedule || editSchedule) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => { setShowAddSchedule(false); setEditSchedule(null) }}>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-br from-navy-800 to-navy-900 p-5 text-center">
                <Calendar size={28} className="mx-auto text-gold-400 mb-2" />
                <h3 className="font-heading font-bold text-white">{editSchedule ? 'Edit Jadwal' : 'Tambah Jadwal Baru'}</h3>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); handleSaveSchedule(editSchedule ? { ...scheduleForm, id: editSchedule.id } : scheduleForm) }} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Hari</label>
                  <select value={scheduleForm.day} onChange={(e) => setScheduleForm({ ...scheduleForm, day: e.target.value })}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm">
                    {['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu'].map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Waktu</label>
                  <input type="text" value={scheduleForm.time} onChange={(e) => setScheduleForm({ ...scheduleForm, time: e.target.value })} required
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm" placeholder="16:00 - 18:00 WIB" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Venue</label>
                  <input type="text" value={scheduleForm.venue} onChange={(e) => setScheduleForm({ ...scheduleForm, venue: e.target.value })} required
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm" placeholder="Nama lapangan" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Fokus</label>
                  <input type="text" value={scheduleForm.focus} onChange={(e) => setScheduleForm({ ...scheduleForm, focus: e.target.value })} required
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm" placeholder="Teknik Dasar" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Kelompok Umur</label>
                  <select value={scheduleForm.age_group_id} onChange={(e) => setScheduleForm({ ...scheduleForm, age_group_id: e.target.value })}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm">
                    <option value="">Pilih grup</option>
                    {ageGroups.map((ag) => <option key={ag.id} value={ag.id}>{ag.label}</option>)}
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => { setShowAddSchedule(false); setEditSchedule(null) }} className="flex-1 py-2.5 text-sm font-semibold text-gray-500 bg-gray-100 rounded-xl">Batal</button>
                  <button type="submit" className="flex-1 py-2.5 text-sm font-semibold text-white bg-navy-800 rounded-xl">{editSchedule ? 'Simpan' : 'Tambah'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Parent Modal */}
        {showAddParent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowAddParent(false)}>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-br from-navy-800 to-navy-900 p-5 text-center sticky top-0 z-10">
                <UserPlus size={28} className="mx-auto text-gold-400 mb-2" />
                <h3 className="font-heading font-bold text-white">Tambah Akun Orang Tua</h3>
              </div>
              <form onSubmit={handleCreateParent} className="p-5 space-y-4">
                <p className="text-xs font-semibold text-navy-600 border-b border-gray-100 pb-2">Data Orang Tua</p>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Nama Lengkap</label>
                  <input type="text" value={parentForm.name} onChange={(e) => setParentForm({ ...parentForm, name: e.target.value })} required
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Email</label>
                  <input type="email" value={parentForm.email} onChange={(e) => setParentForm({ ...parentForm, email: e.target.value })} required
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Password</label>
                  <input type="password" value={parentForm.password} onChange={(e) => setParentForm({ ...parentForm, password: e.target.value })} required
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
                </div>
                <p className="text-xs font-semibold text-navy-600 border-b border-gray-100 pb-2 pt-2">Data Anak Pemain</p>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Nama Anak</label>
                  <input type="text" value={parentForm.childName} onChange={(e) => setParentForm({ ...parentForm, childName: e.target.value })}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm" placeholder="Nama lengkap anak" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Telepon Anak/Wali</label>
                  <input type="text" value={parentForm.childPhone} onChange={(e) => setParentForm({ ...parentForm, childPhone: e.target.value })}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm" placeholder="08xxx" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Tanggal Lahir</label>
                  <input type="date" value={parentForm.childDob} onChange={(e) => setParentForm({ ...parentForm, childDob: e.target.value })}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Alamat</label>
                  <input type="text" value={parentForm.childAddress} onChange={(e) => setParentForm({ ...parentForm, childAddress: e.target.value })}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm" placeholder="Alamat rumah" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowAddParent(false)} className="flex-1 py-2.5 text-sm font-semibold text-gray-500 bg-gray-100 rounded-xl">Batal</button>
                  <button type="submit" className="flex-1 py-2.5 text-sm font-semibold text-white bg-navy-800 rounded-xl">Simpan</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Coach Modal */}
        {showAddCoach && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowAddCoach(false)}>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-br from-navy-800 to-navy-900 p-5 text-center">
                <Award size={28} className="mx-auto text-gold-400 mb-2" />
                <h3 className="font-heading font-bold text-white">Tambah Coach Baru</h3>
              </div>
              <form onSubmit={handleCreateCoach} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Nama Lengkap</label>
                  <input type="text" value={coachForm.name} onChange={(e) => setCoachForm({ ...coachForm, name: e.target.value })} required
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Email</label>
                  <input type="email" value={coachForm.email} onChange={(e) => setCoachForm({ ...coachForm, email: e.target.value })} required
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Password</label>
                  <input type="password" value={coachForm.password} onChange={(e) => setCoachForm({ ...coachForm, password: e.target.value })} required
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Jabatan</label>
                  <input type="text" value={coachForm.title} onChange={(e) => setCoachForm({ ...coachForm, title: e.target.value })}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm" placeholder="Head Coach U-12" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowAddCoach(false)} className="flex-1 py-2.5 text-sm font-semibold text-gray-500 bg-gray-100 rounded-xl">Batal</button>
                  <button type="submit" className="flex-1 py-2.5 text-sm font-semibold text-white bg-navy-800 rounded-xl">Simpan</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit User Modal */}
        {editUser && (
          <EditUserModal user={editUser} onClose={() => setEditUser(null)} onSave={handleUpdateUser} />
        )}
      </div>
    </div>
  )
}

function EditUserModal({ user, onClose, onSave }) {
  const [name, setName] = useState(user.name)
  const [role, setRole] = useState(user.role)
  const [password, setPassword] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const data = { name, role }
    if (password) data.password = password
    onSave(user.id, data)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-br from-navy-800 to-navy-900 p-5 text-center">
          <Edit3 size={28} className="mx-auto text-gold-400 mb-2" />
          <h3 className="font-heading font-bold text-white">Edit User</h3>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Nama</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm">
              <option value="parent">Parent</option>
              <option value="coach">Coach</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Password baru (kosongkan jika tidak diubah)</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Biarkan kosong"
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold text-gray-500 bg-gray-100 rounded-xl">Batal</button>
            <button type="submit" className="flex-1 py-2.5 text-sm font-semibold text-white bg-navy-800 rounded-xl">Simpan</button>
          </div>
        </form>
      </div>
    </div>
  )
}
