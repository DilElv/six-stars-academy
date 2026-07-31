'use client'

import { useEffect, useState, useCallback } from 'react'
import { Eye, Edit3, Trash2, Loader2, Check, X, RefreshCw, ShieldAlert, MessageSquare, UserPlus, Search, Upload } from 'lucide-react'
import * as api from '@/lib/api'
import { AGE_GROUPS } from '@/lib/ageGroups'
import { POSITIONS } from '@/lib/positions'
import { AppSelect } from '@/components/ui/app-select'
import StudentDetailModal from '@/components/StudentDetailModal'
import AddStudentModal from '@/components/AddStudentModal'
import { totalSessionsFor, PAYMENT_STATUS_BADGE } from '@/lib/sessionInfo'

function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

export default function AdminDataAnakPage() {
  const [tab, setTab] = useState('data-anak')
  const [students, setStudents] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterAgeGroup, setFilterAgeGroup] = useState('')
  const [filterPosition, setFilterPosition] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterBranch, setFilterBranch] = useState('')
  const [viewStudent, setViewStudent] = useState(null)
  const [editStudent, setEditStudent] = useState(null)
  const [showAddStudent, setShowAddStudent] = useState(false)
  const [packages, setPackages] = useState([])
  const [requests, setRequests] = useState([])
  const [requestsLoading, setRequestsLoading] = useState(false)

  function load() {
    setLoading(true)
    api.getStudents().then(setStudents).catch(() => {}).finally(() => setLoading(false))
    api.getBranches().then(setBranches).catch(() => {})
    api.getPackages().then(setPackages).catch(() => {})
  }

  const loadRequests = useCallback(() => {
    setRequestsLoading(true)
    api.getPasswordResetRequests().then(setRequests).finally(() => setRequestsLoading(false))
  }, [])

  useEffect(load, [])
  useEffect(() => { if (tab === 'reset-password') loadRequests() }, [tab, loadRequests])

  async function handleDelete(id) {
    if (!confirm('Hapus data anak ini beserta seluruh riwayat pembayaran, absensi, dan penilaiannya?')) return
    try {
      await api.deleteStudent(id)
      load()
    } catch (err) {
      alert(err.message)
    }
  }

  async function handleApprove(id) {
    const result = await api.approvePasswordReset(id)
    setRequests((prev) => prev.map((r) =>
      r.id === id ? { ...r, status: 'approved', waLink: result.waLink, resetLink: result.resetLink, phone: result.phone } : r
    ))
  }

  async function handleReject(id) {
    if (!confirm('Tolak permintaan reset password ini?')) return
    await api.rejectPasswordReset(id)
    loadRequests()
  }

  const filtered = students.filter((s) => {
    const q = search.trim().toLowerCase()
    if (q && !s.fullName.toLowerCase().includes(q) && !s.studentId.toLowerCase().includes(q)) return false
    if (filterAgeGroup && s.ageGroup !== filterAgeGroup) return false
    if (filterPosition && s.position !== filterPosition) return false
    if (filterStatus && s.status !== filterStatus) return false
    if (filterBranch && s.branchId !== filterBranch) return false
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1 bg-gray-100 rounded-2xl p-1 w-fit">
        <button onClick={() => setTab('data-anak')} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === 'data-anak' ? 'bg-white shadow-sm text-navy-900' : 'text-gray-500 hover:text-navy-700'}`}>Data Anak</button>
        <button onClick={() => setTab('reset-password')} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === 'reset-password' ? 'bg-white shadow-sm text-navy-900' : 'text-gray-500 hover:text-navy-700'}`}>Reset Password</button>
      </div>

      {tab === 'data-anak' ? (
        <>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-navy-900 text-lg">Data Anak</h1>
              <button onClick={() => setShowAddStudent(true)} className="flex items-center gap-1 bg-gold-400 hover:bg-gold-500 text-navy-900 text-xs font-bold px-3 py-1.5 rounded-xl">
                <UserPlus size={14} /> Tambah Anak
              </button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama atau ID siswa..."
                  className="pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-200 w-full sm:w-56"
                />
              </div>
              <AppSelect value={filterAgeGroup} onChange={setFilterAgeGroup} allLabel="Semua Kelompok Umur" placeholder="Semua Kelompok Umur" options={AGE_GROUPS.map((ag) => ({ value: ag, label: ag }))} />
              <AppSelect value={filterPosition} onChange={setFilterPosition} allLabel="Semua Posisi" placeholder="Semua Posisi" options={POSITIONS.map((p) => ({ value: p, label: p }))} />
              <AppSelect
                value={filterStatus}
                onChange={setFilterStatus}
                allLabel="Semua Status"
                placeholder="Semua Status"
                options={[{ value: 'active', label: 'Aktif' }, { value: 'inactive', label: 'Nonaktif' }]}
              />
              <AppSelect value={filterBranch} onChange={setFilterBranch} allLabel="Semua Cabang" placeholder="Semua Cabang" options={branches.map((b) => ({ value: b.id, label: b.name }))} />
            </div>
          </div>

          {loading ? null : filtered.length === 0 ? (
            <div className="glass-card rounded-3xl p-10 text-center text-sm text-gray-400">Tidak ada data.</div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {filtered.map((s) => (
                <div key={s.id} className="glass-card rounded-3xl overflow-hidden hover:border-gold-300 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                  <div className="bg-gradient-to-br from-navy-800 to-navy-900 p-3 sm:p-5 text-center relative">
                    <span className={`absolute top-2 right-2 sm:top-3 sm:right-3 text-[9px] sm:text-[10px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-full ${s.status === 'active' ? 'bg-emerald-400/20 text-emerald-300' : 'bg-white/10 text-gray-300'}`}>
                      {s.status === 'active' ? 'Aktif' : 'Nonaktif'}
                    </span>
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white/10 mx-auto mb-2 overflow-hidden flex items-center justify-center font-bold text-white text-sm">
                      {s.photo ? <img src={s.photo} alt="" className="w-full h-full object-cover" /> : initials(s.fullName)}
                    </div>
                    <h3 className="font-heading font-bold text-white text-xs sm:text-sm truncate">{s.fullName}</h3>
                    <p className="text-[10px] sm:text-xs text-gray-300">{s.studentId}</p>
                  </div>
                  <div className="p-2.5 sm:p-4 space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Posisi</span>
                      <span className="font-medium text-navy-900">{s.position}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Kelompok</span>
                      <span className="font-medium text-navy-900">{s.ageGroup}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Cabang</span>
                      {s.branch ? <span className="text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 rounded-full bg-navy-50 text-navy-700">{s.branch.code}</span> : <span className="text-[10px] sm:text-xs text-gray-300">-</span>}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Paket</span>
                      <span className="font-medium text-navy-900 text-right truncate max-w-[60%]">{s.package?.name || '-'}</span>
                    </div>
                    {s.package && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Sesi</span>
                        <span className="font-medium text-navy-900">{s.sessionsUsed}/{totalSessionsFor(s)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Pembayaran</span>
                      {s.payments?.[0] ? (
                        <span className={`text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 rounded-full ${PAYMENT_STATUS_BADGE[s.payments[0].status]?.color || 'bg-gray-100 text-gray-500'}`}>
                          {PAYMENT_STATUS_BADGE[s.payments[0].status]?.label || s.payments[0].status}
                        </span>
                      ) : <span className="text-[10px] sm:text-xs text-gray-300">-</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 sm:gap-1 border-t border-gray-100 p-1.5 sm:p-2">
                    <button onClick={() => setViewStudent(s)} title="Lihat" className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-gray-500 hover:text-navy-700 hover:bg-gray-50 rounded-xl"><Eye size={14} /><span className="hidden sm:inline">Lihat</span></button>
                    <button onClick={() => setEditStudent(s)} title="Edit" className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-gray-500 hover:text-navy-700 hover:bg-gray-50 rounded-xl"><Edit3 size={14} /><span className="hidden sm:inline">Edit</span></button>
                    <button onClick={() => handleDelete(s.id)} title="Hapus" className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl"><Trash2 size={14} /><span className="hidden sm:inline">Hapus</span></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {viewStudent && <StudentDetailModal student={viewStudent} onClose={() => setViewStudent(null)} />}
          {editStudent && <EditModal student={editStudent} branches={branches} packages={packages} onClose={() => setEditStudent(null)} onSaved={() => { setEditStudent(null); load() }} />}
          {showAddStudent && <AddStudentModal branches={branches} packages={packages} onClose={() => setShowAddStudent(false)} onSaved={() => { setShowAddStudent(false); load() }} />}
        </>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="font-bold text-navy-900 text-lg">Permintaan Reset Password</h1>
            <button onClick={loadRequests} disabled={requestsLoading} className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-navy-700">
              <RefreshCw size={14} className={requestsLoading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>

          {requestsLoading ? (
            <div className="glass-card rounded-3xl p-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gold-500" /></div>
          ) : requests.length === 0 ? (
            <div className="glass-card rounded-3xl p-10 text-center text-sm text-gray-400">Belum ada permintaan reset password.</div>
          ) : (
            <div className="space-y-3">
              {requests.map((r) => (
                <div key={r.id} className="glass-card rounded-3xl p-4 flex items-start gap-4">
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                    <ShieldAlert size={20} className="text-amber-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-navy-900 text-sm">{r.user?.name || r.email}</div>
                    <div className="text-xs text-gray-400">{r.email}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{r.user?.role === 'parent' ? 'Orang Tua' : r.user?.role === 'coach' ? 'Coach' : r.user?.role === 'head_coach' ? 'Head Coach' : r.user?.role} · {new Date(r.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                    {r.status === 'pending' && (
                      <div className="mt-2 flex items-center gap-2">
                        <button onClick={() => handleApprove(r.id)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100"><Check size={12} /> Setujui</button>
                        <button onClick={() => handleReject(r.id)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-600 rounded-xl hover:bg-red-100"><X size={12} /> Tolak</button>
                      </div>
                    )}
                    {r.status !== 'pending' && (
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${r.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : r.status === 'used' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                          {r.status === 'approved' ? 'Disetujui' : r.status === 'used' ? 'Sudah Digunakan' : 'Ditolak'}
                        </span>
                        {r.status === 'approved' && r.waLink && (
                          <a
                            href={r.waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-green-50 text-green-700 rounded-xl hover:bg-green-100"
                          >
                            <MessageSquare size={12} /> Kirim WA
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}


function formatRupiah(n) {
  return `Rp${(n || 0).toLocaleString('id-ID')}`
}

function formatTanggal(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

function EditModal({ student, branches, packages, onClose, onSaved }) {
  const [form, setForm] = useState({
    photo: student.photo || '',
    fullName: student.fullName,
    dateOfBirth: student.dateOfBirth ? new Date(student.dateOfBirth).toISOString().slice(0, 10) : '',
    position: student.position,
    ageGroup: student.ageGroup,
    address: student.address,
    parentName: student.parentName,
    parentPhone: student.parentPhone,
    status: student.status,
    branchId: student.branchId || '',
    packageId: student.packageId || '',
    sessionsUsed: student.sessionsUsed != null ? String(student.sessionsUsed) : '0',
    parentEmail: student.parentEmail || '',
    parentPassword: '',
    registrationFee: '750000',
    amount: '',
    paymentStatus: 'pending',
  })
  const [regPayment, setRegPayment] = useState(null)
  const [initialPromoCode, setInitialPromoCode] = useState('')
  const [promoCodeInput, setPromoCodeInput] = useState('')
  const [promoDiscount, setPromoDiscount] = useState(null)
  const [promoTouched, setPromoTouched] = useState(false)
  const [promoChecking, setPromoChecking] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(true)
  const [error, setError] = useState('')

  const selectedPackage = packages?.find((p) => p.id === form.packageId)
  const totalSessions = selectedPackage ? totalSessionsFor({ package: selectedPackage }) : 0

  useEffect(() => {
    api.getStudent(student.id).then((detail) => {
      const payment = detail.payments?.find((p) => p.paymentType === 'registration')
      if (payment) {
        setRegPayment(payment)
        setForm((f) => ({
          ...f,
          registrationFee: String(payment.registrationFee),
          amount: String(payment.amount),
          paymentStatus: payment.status,
        }))
        const code = payment.promoCodeUsages?.[0]?.promoCode?.code || ''
        setInitialPromoCode(code)
        setPromoCodeInput(code)
      }
    }).catch(() => {}).finally(() => setLoadingDetail(false))
  }, [student.id])

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPhoto(true)
    setError('')
    try {
      const url = await api.uploadFile(file)
      setForm((f) => ({ ...f, photo: url }))
    } catch (err) {
      setError(err.message)
    } finally {
      setUploadingPhoto(false)
    }
  }

  async function handleCheckPromo() {
    if (!promoCodeInput.trim() || !form.packageId) return
    setPromoChecking(true)
    setError('')
    try {
      const result = await api.validatePromoCode(promoCodeInput.trim(), form.packageId, Number(form.amount) || 0, Number(form.registrationFee) || 0)
      setPromoDiscount(result)
      setPromoTouched(true)
    } catch (err) {
      setPromoDiscount(null)
      setError(err.message)
    } finally {
      setPromoChecking(false)
    }
  }

  function handleRemovePromo() {
    setPromoCodeInput('')
    setPromoDiscount(null)
    setPromoTouched(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = {
        ...form,
        sessionsUsed: Number(form.sessionsUsed) || 0,
        registrationFee: Number(form.registrationFee) || 0,
        amount: Number(form.amount) || 0,
      }
      if (!payload.parentPassword) delete payload.parentPassword
      if (promoTouched && promoCodeInput.trim() !== initialPromoCode) {
        payload.promoCode = promoCodeInput.trim()
      }
      await api.updateStudent(student.id, payload)
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[85vh] overflow-y-auto modal-scroll" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-bold text-navy-900">Edit Data Anak</h3>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center shrink-0">
              {form.photo ? <img src={form.photo} alt="" className="w-full h-full object-cover" /> : <Upload size={18} className="text-gray-300" />}
            </div>
            <label className="text-xs font-semibold text-navy-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-100">
              {uploadingPhoto ? 'Mengunggah...' : 'Ganti Foto Profil'}
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} disabled={uploadingPhoto} />
            </label>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Nama Lengkap</label>
            <input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Tanggal Lahir</label>
              <input type="date" value={form.dateOfBirth} onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Posisi</label>
              <AppSelect value={form.position} onChange={(v) => setForm((f) => ({ ...f, position: v }))} className="w-full" options={POSITIONS.map((p) => ({ value: p, label: p }))} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Kelompok Umur</label>
            <AppSelect value={form.ageGroup} onChange={(v) => setForm((f) => ({ ...f, ageGroup: v }))} className="w-full" options={AGE_GROUPS.map((ag) => ({ value: ag, label: ag }))} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Nama Orang Tua</label>
            <input value={form.parentName} onChange={(e) => setForm((f) => ({ ...f, parentName: e.target.value }))} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Email (untuk login)</label>
            <input
              type="email"
              value={form.parentEmail}
              onChange={(e) => setForm((f) => ({ ...f, parentEmail: e.target.value }))}
              pattern=".+@sixstars\.id"
              title="Email login harus menggunakan domain @sixstars.id"
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Telepon Orang Tua</label>
              <input value={form.parentPhone} onChange={(e) => setForm((f) => ({ ...f, parentPhone: e.target.value }))} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Password Baru</label>
              <input type="password" value={form.parentPassword} onChange={(e) => setForm((f) => ({ ...f, parentPassword: e.target.value }))} placeholder="Kosongkan jika tidak diubah" minLength={6} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Alamat</label>
            <textarea value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} rows={2} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Status</label>
              <AppSelect
                value={form.status}
                onChange={(v) => setForm((f) => ({ ...f, status: v }))}
                className="w-full"
                options={[{ value: 'active', label: 'Aktif' }, { value: 'inactive', label: 'Nonaktif' }]}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Paket</label>
              <AppSelect
                value={form.packageId}
                onChange={(v) => setForm((f) => ({ ...f, packageId: v }))}
                className="w-full"
                allLabel="- Tanpa Paket -"
                placeholder="- Tanpa Paket -"
                options={(packages || []).map((p) => ({ value: p.id, label: `${p.name} (${p.sessionsPerWeek}x/mgg)` }))}
              />
            </div>
          </div>
          {form.packageId && student.packageId === form.packageId && (
            <p className="text-[11px] text-gray-400 -mt-1.5">
              Paket berlaku {formatTanggal(student.packageStartDate)} &ndash; {formatTanggal(student.packageEndDate)}. Ganti paket di atas akan hitung ulang masa berlaku dari hari ini.
            </p>
          )}
          {form.packageId && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Sesi Terpakai</label>
              <input
                type="number"
                min={0}
                max={totalSessions || undefined}
                value={form.sessionsUsed}
                onChange={(e) => setForm((f) => ({ ...f, sessionsUsed: e.target.value }))}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm"
              />
              <p className="text-[11px] text-gray-400 mt-1">Dari total {totalSessions} sesi paket ini.</p>
            </div>
          )}
          {regPayment && (
            <div className="border-t border-gray-100 pt-3 space-y-3">
              <h4 className="text-xs font-bold text-navy-900 uppercase tracking-wider">Pembayaran Pendaftaran</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Harga Paket (Rp)</label>
                  <input type="number" min={0} value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Biaya Pendaftaran (Rp)</label>
                  <input type="number" min={0} value={form.registrationFee} onChange={(e) => setForm((f) => ({ ...f, registrationFee: e.target.value }))} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Status Pembayaran</label>
                <AppSelect
                  value={form.paymentStatus}
                  onChange={(v) => setForm((f) => ({ ...f, paymentStatus: v }))}
                  className="w-full"
                  options={[{ value: 'pending', label: 'Belum Lunas' }, { value: 'success', label: 'Lunas' }]}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Kode Promo</label>
                <div className="flex gap-2">
                  <input
                    value={promoCodeInput}
                    onChange={(e) => setPromoCodeInput(e.target.value)}
                    placeholder="Masukkan kode promo"
                    className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm uppercase"
                    disabled={!promoTouched && !!initialPromoCode}
                  />
                  {!promoTouched && initialPromoCode ? (
                    <button type="button" onClick={handleRemovePromo} className="text-xs font-semibold text-red-600 bg-red-50 px-3 py-2 rounded-xl hover:bg-red-100">Hapus</button>
                  ) : promoDiscount ? (
                    <button type="button" onClick={handleRemovePromo} className="text-xs font-semibold text-red-600 bg-red-50 px-3 py-2 rounded-xl hover:bg-red-100">Hapus</button>
                  ) : (
                    <button type="button" onClick={handleCheckPromo} disabled={promoChecking || !promoCodeInput.trim() || !form.packageId} className="text-xs font-semibold text-navy-900 bg-gold-400 px-3 py-2 rounded-xl hover:bg-gold-500 disabled:opacity-50">
                      {promoChecking ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                    </button>
                  )}
                </div>
                {promoDiscount && (
                  <div className="mt-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg">
                    Diskon {promoDiscount.discountPercent}% — Hemat {formatRupiah(promoDiscount.discount)}
                  </div>
                )}
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Cabang</label>
            <AppSelect
              value={form.branchId}
              onChange={(v) => setForm((f) => ({ ...f, branchId: v }))}
              className="w-full"
              allLabel="- Belum ditentukan -"
              placeholder="- Belum ditentukan -"
              options={branches.map((b) => ({ value: b.id, label: `${b.name} (${b.code})` }))}
            />
          </div>
          <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 bg-navy-900 hover:bg-navy-800 text-white font-semibold py-2.5 rounded-2xl disabled:opacity-50">
            {saving && <Loader2 size={14} className="animate-spin" />} Simpan Perubahan
          </button>
        </form>
      </div>
    </div>
  )
}
