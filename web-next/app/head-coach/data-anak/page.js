'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Eye, Edit3, Star, Loader2 } from 'lucide-react'
import * as api from '@/lib/api'
import { AGE_GROUPS } from '@/lib/ageGroups'
import { POSITIONS } from '@/lib/positions'

export default function DataAnakPage() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterAgeGroup, setFilterAgeGroup] = useState('')
  const [filterPosition, setFilterPosition] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [viewStudent, setViewStudent] = useState(null)
  const [editStudent, setEditStudent] = useState(null)

  function load() {
    setLoading(true)
    api.getStudents().then(setStudents).finally(() => setLoading(false))
  }

  useEffect(load, [])

  const filtered = students.filter((s) => {
    if (filterAgeGroup && s.ageGroup !== filterAgeGroup) return false
    if (filterPosition && s.position !== filterPosition) return false
    if (filterStatus && s.status !== filterStatus) return false
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-bold text-navy-900 text-lg">Data Anak</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={filterAgeGroup} onChange={(e) => setFilterAgeGroup(e.target.value)} className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm">
            <option value="">Semua Kelompok Umur</option>
            {AGE_GROUPS.map((ag) => <option key={ag} value={ag}>{ag}</option>)}
          </select>
          <select value={filterPosition} onChange={(e) => setFilterPosition(e.target.value)} className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm">
            <option value="">Semua Posisi</option>
            {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm">
            <option value="">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </select>
        </div>
      </div>

      {loading ? null : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">ID</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500">Nama</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500">Posisi</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500">Kelompok</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400">{s.studentId}</td>
                  <td className="px-3 py-3 font-medium text-navy-900">{s.fullName}</td>
                  <td className="px-3 py-3 text-center">{s.position}</td>
                  <td className="px-3 py-3 text-center">{s.ageGroup}</td>
                  <td className="px-3 py-3 text-center">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {s.status === 'active' ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setViewStudent(s)} className="p-1.5 text-gray-400 hover:text-navy-600 hover:bg-gray-100 rounded-lg"><Eye size={14} /></button>
                      <button onClick={() => setEditStudent(s)} className="p-1.5 text-gray-400 hover:text-navy-600 hover:bg-gray-100 rounded-lg"><Edit3 size={14} /></button>
                      <Link href={`/head-coach/penilaian?studentId=${s.id}`} className="p-1.5 text-gray-400 hover:text-gold-500 hover:bg-gray-100 rounded-lg"><Star size={14} /></Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          {filtered.length === 0 && <div className="p-10 text-center text-sm text-gray-400">Tidak ada data.</div>}
        </div>
      )}

      {viewStudent && <ViewModal student={viewStudent} onClose={() => setViewStudent(null)} />}
      {editStudent && <EditModal student={editStudent} onClose={() => setEditStudent(null)} onSaved={() => { setEditStudent(null); load() }} />}
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-50 last:border-0 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-navy-900 text-right">{value || '-'}</span>
    </div>
  )
}

function ViewModal({ student, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-br from-navy-800 to-navy-900 p-5 text-center">
          <div className="w-16 h-16 rounded-full bg-white/10 mx-auto mb-2 overflow-hidden">
            {student.photo && <img src={student.photo} alt="" className="w-full h-full object-cover" />}
          </div>
          <h3 className="font-heading font-bold text-white">{student.fullName}</h3>
          <p className="text-xs text-gray-300">{student.studentId}</p>
        </div>
        <div className="p-5">
          <Row label="Tanggal Lahir" value={new Date(student.dateOfBirth).toLocaleDateString('id-ID')} />
          <Row label="Posisi" value={student.position} />
          <Row label="Kelompok Umur" value={student.ageGroup} />
          <Row label="Nama Orang Tua" value={student.parentName} />
          <Row label="Telepon" value={student.parentPhone} />
          <Row label="Alamat" value={student.address} />
          <Row label="Paket" value={student.package?.name} />
          <Row label="Status" value={student.status} />
        </div>
      </div>
    </div>
  )
}

function EditModal({ student, onClose, onSaved }) {
  const [form, setForm] = useState({
    fullName: student.fullName,
    position: student.position,
    ageGroup: student.ageGroup,
    address: student.address,
    parentName: student.parentName,
    parentPhone: student.parentPhone,
    status: student.status,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-bold text-navy-900">Edit Data Anak</h3>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Nama Lengkap</label>
            <input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Posisi</label>
              <select value={form.position} onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm">
                {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Kelompok Umur</label>
              <select value={form.ageGroup} onChange={(e) => setForm((f) => ({ ...f, ageGroup: e.target.value }))} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm">
                {AGE_GROUPS.map((ag) => <option key={ag} value={ag}>{ag}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Nama Orang Tua</label>
            <input value={form.parentName} onChange={(e) => setForm((f) => ({ ...f, parentName: e.target.value }))} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Telepon Orang Tua</label>
            <input value={form.parentPhone} onChange={(e) => setForm((f) => ({ ...f, parentPhone: e.target.value }))} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Alamat</label>
            <textarea value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} rows={2} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Status</label>
            <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm">
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
            </select>
          </div>
          <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 bg-navy-900 hover:bg-navy-800 text-white font-semibold py-2.5 rounded-xl disabled:opacity-50">
            {saving && <Loader2 size={14} className="animate-spin" />} Simpan Perubahan
          </button>
        </form>
      </div>
    </div>
  )
}
