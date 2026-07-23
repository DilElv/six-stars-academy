'use client'

import { useEffect, useState } from 'react'
import { Save, Loader2, Plus, Trash2, Lock } from 'lucide-react'
import * as api from '@/lib/api'

function formatRupiah(n) {
  return 'Rp' + (Number(n) || 0).toLocaleString('id-ID')
}

export default function AdminPengaturanPage() {
  const [settings, setSettings] = useState(null)
  const [packages, setPackages] = useState([])
  const [branches, setBranches] = useState([])
  const [branchPrices, setBranchPrices] = useState([])
  const [newBranch, setNewBranch] = useState({ name: '', code: '' })
  const [savingBranch, setSavingBranch] = useState('')
  const [savingRegFee, setSavingRegFee] = useState('')
  const [savingPriceCell, setSavingPriceCell] = useState('')
  const [message, setMessage] = useState('')
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [savingPassword, setSavingPassword] = useState(false)

  function load() {
    api.getSettings().then(setSettings)
    api.getAllPackages().then(setPackages)
    api.getBranches().then(setBranches)
    api.getAllBranchPackages().then(setBranchPrices)
  }

  useEffect(load, [])

  function flash(msg) {
    setMessage(msg)
    setTimeout(() => setMessage(''), 3000)
  }

  function getPrice(pkgId, branchId) {
    const bp = branchPrices.find((b) => b.packageId === pkgId && b.branchId === branchId)
    return bp ? String(bp.price) : ''
  }

  function handlePriceChange(pkgId, branchId, val) {
    setBranchPrices((prev) => {
      const idx = prev.findIndex((b) => b.packageId === pkgId && b.branchId === branchId)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], price: Number(val) }
        return next
      }
      return [...prev, { packageId: pkgId, branchId, price: Number(val), id: 'new' }]
    })
  }

  async function handleSavePriceCell(pkgId, branchId) {
    const bp = branchPrices.find((b) => b.packageId === pkgId && b.branchId === branchId)
    if (!bp) return
    const key = `${pkgId}-${branchId}`
    setSavingPriceCell(key)
    try {
      if (bp.id && bp.id !== 'new') {
        await api.updateBranchPackage(bp.id, bp.price)
      } else {
        const created = await api.createBranchPackage({ branchId, packageId: pkgId, price: Number(bp.price) })
        setBranchPrices((prev) => prev.map((b) => b === bp ? { ...b, id: created.id } : b))
      }
      flash('Harga tersimpan')
    } catch (err) {
      flash(err.message)
    } finally {
      setSavingPriceCell('')
    }
  }

  async function handleAddBranch(e) {
    e.preventDefault()
    if (!newBranch.name || !newBranch.code) {
      flash('Nama dan kode cabang harus diisi')
      return
    }
    setSavingBranch('new')
    try {
      await api.createBranch(newBranch)
      setNewBranch({ name: '', code: '' })
      flash('Cabang berhasil ditambahkan')
      load()
    } catch (err) {
      flash(err.message)
    } finally {
      setSavingBranch('')
    }
  }

  async function handleDeleteBranch(id) {
    if (!confirm('Hapus cabang ini?')) return
    try {
      await api.deleteBranch(id)
      flash('Cabang dihapus')
      load()
    } catch (err) {
      flash(err.message)
    }
  }

  async function handleSavePassword(e) {
    e.preventDefault()
    if (passwordForm.newPassword.length < 6) return flash('Password baru minimal 6 karakter')
    if (passwordForm.newPassword !== passwordForm.confirmPassword) return flash('Konfirmasi password tidak cocok')
    setSavingPassword(true)
    try {
      await api.updateMe({ password: passwordForm.newPassword })
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      flash('Password berhasil diubah')
    } catch (err) {
      flash(err.message)
    } finally {
      setSavingPassword(false)
    }
  }

  if (!settings) return null

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="font-bold text-navy-900 text-lg">Pengaturan</h1>

      {message && <div className="text-sm bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-2xl px-3 py-2">{message}</div>}

      <div className="glass-card rounded-3xl p-6">
        <h2 className="font-semibold text-navy-900 text-sm mb-4">Kelola Cabang</h2>
        <div className="space-y-2 mb-4">
          {branches.map((b) => (
            <div key={b.id} className="flex items-center justify-between gap-3 border-b border-gray-50 last:border-0 pb-2 last:pb-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2 py-1 rounded-lg bg-navy-50 text-navy-700">{b.code}</span>
                <span className="text-sm text-navy-900">{b.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={b.registrationFee ?? settings.registrationFee}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setBranches((prev) => prev.map((br) => br.id === b.id ? { ...br, registrationFee: val } : br))
                  }}
                  className="w-28 px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs text-right"
                  title="Biaya pendaftaran cabang"
                />
                <button
                  onClick={async () => {
                    setSavingRegFee(b.id)
                    try {
                      await api.updateBranch(b.id, { registrationFee: b.registrationFee })
                      flash('Biaya pendaftaran cabang disimpan')
                    } catch (err) { flash(err.message) }
                    finally { setSavingRegFee('') }
                  }}
                  disabled={savingRegFee === b.id}
                  className="text-[10px] font-semibold bg-navy-900 hover:bg-navy-800 text-white px-2 py-1 rounded disabled:opacity-50"
                >
                  {savingRegFee === b.id ? <Loader2 size={10} className="animate-spin" /> : 'Simpan'}
                </button>
                <button onClick={() => handleDeleteBranch(b.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {branches.length === 0 && <p className="text-sm text-gray-400">Belum ada cabang.</p>}
        </div>
        <form onSubmit={handleAddBranch} className="flex items-end gap-2">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Nama Cabang</label>
            <input value={newBranch.name} onChange={(e) => setNewBranch((b) => ({ ...b, name: e.target.value }))} placeholder="mis. Tangerang" required className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-2xl text-sm" />
          </div>
          <div className="w-24">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Kode</label>
            <input value={newBranch.code} onChange={(e) => setNewBranch((b) => ({ ...b, code: e.target.value.toUpperCase() }))} placeholder="TGR" maxLength={5} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-2xl text-sm uppercase" />
          </div>
          <button type="submit" disabled={savingBranch === 'new'} className="flex items-center gap-1.5 bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold px-4 py-2 rounded-2xl disabled:opacity-50">
            {savingBranch === 'new' ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Tambah
          </button>
        </form>
      </div>

      <div className="glass-card rounded-3xl p-6 overflow-x-auto">
        <h2 className="font-semibold text-navy-900 text-sm mb-4">Harga Paket per Cabang</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-2 pr-4 text-gray-500 font-semibold">Paket</th>
              {branches.map((b) => (
                <th key={b.id} className="text-center py-2 px-2 text-gray-500 font-semibold min-w-[120px]">{b.code}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {packages.map((pkg) => (
              <tr key={pkg.id} className="border-b border-gray-50">
                <td className="py-3 pr-4">
                  <div className="font-medium text-navy-900">{pkg.name}</div>
                  <div className="text-xs text-gray-400">{pkg.sessionsPerWeek}x/minggu</div>
                </td>
                {branches.map((b) => {
                  const key = `${pkg.id}-${b.id}`
                  return (
                    <td key={b.id} className="py-2 px-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <input
                          type="number"
                          value={getPrice(pkg.id, b.id)}
                          onChange={(e) => handlePriceChange(pkg.id, b.id, e.target.value)}
                          placeholder={String(pkg.price)}
                          className="w-24 px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-right"
                        />
                        <button
                          onClick={() => handleSavePriceCell(pkg.id, b.id)}
                          disabled={savingPriceCell === key}
                          className="text-[10px] font-semibold bg-navy-900 hover:bg-navy-800 text-white px-2 py-1 rounded disabled:opacity-50 shrink-0"
                        >
                          {savingPriceCell === key ? <Loader2 size={10} className="animate-spin" /> : 'Simpan'}
                        </button>
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-gray-400 mt-2">Kosongkan input untuk menggunakan harga default dari paket.</p>
      </div>

      <form onSubmit={handleSavePassword} className="glass-card rounded-3xl p-6 space-y-4">
        <h2 className="font-semibold text-navy-900 text-sm flex items-center gap-1.5"><Lock size={15} /> Ganti Password</h2>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Password Baru</label>
          <input
            type="password"
            value={passwordForm.newPassword}
            onChange={(e) => setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))}
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm"
            minLength={6}
            required
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Konfirmasi Password Baru</label>
          <input
            type="password"
            value={passwordForm.confirmPassword}
            onChange={(e) => setPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }))}
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm"
            minLength={6}
            required
          />
        </div>
        <button type="submit" disabled={savingPassword} className="flex items-center gap-2 bg-navy-900 hover:bg-navy-800 text-white font-semibold text-sm px-4 py-2.5 rounded-2xl disabled:opacity-50">
          {savingPassword ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Simpan Password
        </button>
      </form>
    </div>
  )
}
