'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Eye, Edit3, Star, Loader2, UserPlus, Search } from 'lucide-react'
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

export default function DataAnakPage() {
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

  function load() {
    setLoading(true)
    api.getStudents().then(setStudents).finally(() => setLoading(false))
    api.getBranches().then(setBranches)
    api.getPackages().then(setPackages)
  }

  useEffect(load, [])

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
                <Link href={`/head-coach/penilaian?studentId=${s.id}`} title="Nilai" className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-gray-500 hover:text-gold-500 hover:bg-gray-50 rounded-xl"><Star size={14} /><span className="hidden sm:inline">Nilai</span></Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {viewStudent && <StudentDetailModal student={viewStudent} onClose={() => setViewStudent(null)} />}
      {editStudent && <EditModal student={editStudent} branches={branches} onClose={() => setEditStudent(null)} onSaved={() => { setEditStudent(null); load() }} />}
      {showAddStudent && <AddStudentModal branches={branches} packages={packages} onClose={() => setShowAddStudent(false)} onSaved={() => { setShowAddStudent(false); load() }} />}
    </div>
  )
}


function EditModal({ student, branches, onClose, onSaved }) {
  const [form, setForm] = useState({
    fullName: student.fullName,
    position: student.position,
    ageGroup: student.ageGroup,
    address: student.address,
    parentName: student.parentName,
    parentPhone: student.parentPhone,
    status: student.status,
    branchId: student.branchId || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.updateStudent(student.id, form)
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
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Nama Lengkap</label>
            <input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Posisi</label>
              <AppSelect value={form.position} onChange={(v) => setForm((f) => ({ ...f, position: v }))} className="w-full" options={POSITIONS.map((p) => ({ value: p, label: p }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Kelompok Umur</label>
              <AppSelect value={form.ageGroup} onChange={(v) => setForm((f) => ({ ...f, ageGroup: v }))} className="w-full" options={AGE_GROUPS.map((ag) => ({ value: ag, label: ag }))} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Nama Orang Tua</label>
            <input value={form.parentName} onChange={(e) => setForm((f) => ({ ...f, parentName: e.target.value }))} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Telepon Orang Tua</label>
            <input value={form.parentPhone} onChange={(e) => setForm((f) => ({ ...f, parentPhone: e.target.value }))} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Alamat</label>
            <textarea value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} rows={2} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm" />
          </div>
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
