'use client'

import { useEffect, useState } from 'react'
import { UserPlus, Edit3, Trash2, Loader2 } from 'lucide-react'
import * as api from '@/lib/api'
import { sanitizePhoneInput, PHONE_PLACEHOLDER } from '@/lib/phone'
import { AppSelect } from '@/components/ui/app-select'
import { MultiSelectCheckbox } from '@/components/ui/multi-select-checkbox'

export default function CoachUserManager({ role, label }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editUser, setEditUser] = useState(null)

  function load() {
    setLoading(true)
    api.getUsers(role).then(setUsers).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(load, [role])

  async function handleDelete(id) {
    if (!confirm(`Hapus akun ${label.toLowerCase()} ini?`)) return
    try {
      await api.deleteUser(id)
      load()
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-navy-900 text-lg">Data {label}</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold px-4 py-2 rounded-2xl"
        >
          <UserPlus size={16} /> Tambah {label}
        </button>
      </div>

      {loading ? null : users.length === 0 ? (
        <div className="glass-card rounded-3xl p-10 text-center text-sm text-gray-400">Belum ada {label.toLowerCase()}.</div>
      ) : (
        <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {users.map((u) => (
            <div key={u.id} className="glass-card rounded-3xl overflow-hidden">
              <div className="bg-gradient-to-br from-navy-800 to-navy-900 p-4 sm:p-5 text-center relative">
                <span className={`absolute top-3 right-3 text-[10px] font-semibold px-2 py-0.5 rounded-full ${u.status === 'active' ? 'bg-emerald-400/20 text-emerald-200' : 'bg-white/10 text-gray-300'}`}>{u.status === 'active' ? 'Aktif' : 'Nonaktif'}</span>
                <div className="w-full h-44 sm:h-52 rounded-3xl bg-white/10 overflow-hidden flex items-center justify-center text-white text-4xl font-bold shadow-lg shadow-black/10">
                  {u.photo ? <img src={u.photo} alt={u.name} className="w-full h-full object-cover object-top" /> : u.name?.[0]?.toUpperCase()}
                </div>
                <h2 className="font-bold text-white text-lg mt-3 truncate">{u.name}</h2>
                <p className="text-xs text-gray-300 truncate mt-0.5">{u.email}</p>
              </div>
              <div className="p-4 space-y-2 text-sm">
                <Info label="Telepon" value={u.phone || '-'} />
                {role !== 'admin' && <Info label="Cabang" value={u.branches?.map((b) => b.branch.code).join(', ') || '-'} />}
                {role !== 'admin' && <Info label="Honor/hari" value={u.dailyRate ? 'Rp' + u.dailyRate.toLocaleString('id-ID') : '-'} />}
                {role !== 'admin' && <div className="grid grid-cols-2 gap-2 pt-1 text-center"><MiniStat label="Absensi" value={u._count?.coachAttendances ?? 0} /><MiniStat label="Topik" value={u._count?.trainingSessions ?? 0} /></div>}
              </div>
              <div className="flex border-t border-gray-100 p-2 gap-1"><button onClick={() => setEditUser(u)} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-gray-500 hover:text-navy-700 hover:bg-gray-50 rounded-xl"><Edit3 size={14} /> Edit</button><button onClick={() => handleDelete(u.id)} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl"><Trash2 size={14} /> Hapus</button></div>
            </div>
          ))}
        </div>
      )}

      {showAdd && <AddModal role={role} label={label} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load() }} />}
      {editUser && <EditModal user={editUser} onClose={() => setEditUser(null)} onSaved={() => { setEditUser(null); load() }} />}
    </div>
  )
}

function Info({ label, value }) {
  return <div className="flex items-center justify-between gap-2"><span className="text-xs text-gray-400">{label}</span><span className="text-xs font-semibold text-navy-900 text-right truncate">{value}</span></div>
}

function MiniStat({ label, value }) {
  return <div className="rounded-xl bg-gray-50 py-2"><div className="font-bold text-navy-900">{value}</div><div className="text-[10px] text-gray-400">{label}</div></div>
}

function AddModal({ role, label, onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', branchIds: [], dailyRate: '' })
  const [branches, setBranches] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { if (role !== 'admin') api.getBranches().then(setBranches) }, [role])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.createUser({ ...form, role })
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
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-br from-navy-800 to-navy-900 p-5 text-center">
          <UserPlus size={24} className="mx-auto text-gold-400 mb-2" />
          <h3 className="font-bold text-white">Tambah {label}</h3>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Nama</label>
            <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Email</label>
            <input type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Password</label>
            <input type="password" required value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">No. Telepon</label>
            <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: sanitizePhoneInput(e.target.value) }))} inputMode="numeric" maxLength={15} placeholder={PHONE_PLACEHOLDER} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm" />
          </div>
          {role !== 'admin' && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Cabang (bisa lebih dari satu)</label>
              <MultiSelectCheckbox
                values={form.branchIds}
                onChange={(v) => setForm((f) => ({ ...f, branchIds: v }))}
                options={branches.map((b) => ({ value: b.id, label: `${b.name} (${b.code})` }))}
              />
            </div>
          )}
          {role !== 'admin' && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Honor harian (Rp)</label>
              <input type="number" min="0" value={form.dailyRate} onChange={(e) => setForm((f) => ({ ...f, dailyRate: e.target.value }))} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm tabular-nums" placeholder="0" />
            </div>
          )}
          <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 bg-navy-900 hover:bg-navy-800 text-white font-semibold py-2.5 rounded-2xl disabled:opacity-50">
            {saving && <Loader2 size={14} className="animate-spin" />} Buat Akun
          </button>
        </form>
      </div>
    </div>
  )
}

function EditModal({ user, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: user.name,
    phone: user.phone || '',
    status: user.status,
    password: '',
    branchIds: user.branches?.map((b) => b.branch.id) || [],
    dailyRate: String(user.dailyRate ?? 0),
  })
  const [branches, setBranches] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { if (user.role !== 'admin') api.getBranches().then(setBranches) }, [user.role])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = { ...form }
      if (!payload.password) delete payload.password
      await api.updateUser(user.id, payload)
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
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-bold text-navy-900">Edit {user.name}</h3>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Nama</label>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">No. Telepon</label>
            <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: sanitizePhoneInput(e.target.value) }))} inputMode="numeric" maxLength={15} placeholder={PHONE_PLACEHOLDER} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm" />
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
          {user.role !== 'admin' && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Cabang (bisa lebih dari satu)</label>
              <MultiSelectCheckbox
                values={form.branchIds}
                onChange={(v) => setForm((f) => ({ ...f, branchIds: v }))}
                options={branches.map((b) => ({ value: b.id, label: `${b.name} (${b.code})` }))}
              />
            </div>
          )}
          {user.role !== 'admin' && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Honor harian (Rp)</label>
              <input type="number" min="0" value={form.dailyRate} onChange={(e) => setForm((f) => ({ ...f, dailyRate: e.target.value }))} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm tabular-nums" placeholder="0" />
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Password baru (kosongkan jika tidak diubah)</label>
            <input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm" />
          </div>
          <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 bg-navy-900 hover:bg-navy-800 text-white font-semibold py-2.5 rounded-2xl disabled:opacity-50">
            {saving && <Loader2 size={14} className="animate-spin" />} Simpan
          </button>
        </form>
      </div>
    </div>
  )
}
