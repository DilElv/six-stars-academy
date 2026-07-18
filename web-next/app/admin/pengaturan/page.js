'use client'

import { useEffect, useState } from 'react'
import { Save, Loader2, Plus, Trash2 } from 'lucide-react'
import * as api from '@/lib/api'

export default function AdminPengaturanPage() {
  const [settings, setSettings] = useState(null)
  const [packages, setPackages] = useState([])
  const [branches, setBranches] = useState([])
  const [newBranch, setNewBranch] = useState({ name: '', code: '' })
  const [savingSettings, setSavingSettings] = useState(false)
  const [savingPackage, setSavingPackage] = useState('')
  const [savingBranch, setSavingBranch] = useState('')
  const [message, setMessage] = useState('')

  function load() {
    api.getSettings().then(setSettings)
    api.getAllPackages().then(setPackages)
    api.getBranches().then(setBranches)
  }

  useEffect(load, [])

  function flash(msg) {
    setMessage(msg)
    setTimeout(() => setMessage(''), 3000)
  }

  async function handleSaveSettings(e) {
    e.preventDefault()
    setSavingSettings(true)
    try {
      await api.updateSettings(settings)
      flash('Pengaturan berhasil disimpan')
    } catch (err) {
      flash(err.message)
    } finally {
      setSavingSettings(false)
    }
  }

  async function handlePackagePriceChange(pkg, price) {
    setPackages((list) => list.map((p) => (p.id === pkg.id ? { ...p, price } : p)))
  }

  async function handleSavePackage(pkg) {
    setSavingPackage(pkg.id)
    try {
      await api.updatePackage(pkg.id, { price: Number(pkg.price), status: pkg.status })
      flash(`Harga paket "${pkg.name} (${pkg.sessionsPerWeek}x)" tersimpan`)
    } catch (err) {
      flash(err.message)
    } finally {
      setSavingPackage('')
    }
  }

  async function handleAddBranch(e) {
    e.preventDefault()
    if (!newBranch.name || !newBranch.code) return
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

  if (!settings) return null

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="font-bold text-navy-900 text-lg">Pengaturan</h1>

      {message && <div className="text-sm bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-2xl px-3 py-2">{message}</div>}

      <form onSubmit={handleSaveSettings} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-navy-900 text-sm">Data SSB &amp; Biaya Pendaftaran</h2>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Biaya Pendaftaran (Rp)</label>
          <input
            type="number"
            value={settings.registrationFee}
            onChange={(e) => setSettings((s) => ({ ...s, registrationFee: Number(e.target.value) }))}
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Nama SSB</label>
          <input value={settings.ssbName} onChange={(e) => setSettings((s) => ({ ...s, ssbName: e.target.value }))} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Alamat</label>
          <input value={settings.ssbAddress} onChange={(e) => setSettings((s) => ({ ...s, ssbAddress: e.target.value }))} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Telepon</label>
            <input value={settings.ssbPhone} onChange={(e) => setSettings((s) => ({ ...s, ssbPhone: e.target.value }))} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Email</label>
            <input value={settings.ssbEmail} onChange={(e) => setSettings((s) => ({ ...s, ssbEmail: e.target.value }))} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm" />
          </div>
        </div>
        <button type="submit" disabled={savingSettings} className="flex items-center gap-2 bg-navy-900 hover:bg-navy-800 text-white font-semibold text-sm px-4 py-2.5 rounded-2xl disabled:opacity-50">
          {savingSettings ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Simpan Pengaturan
        </button>
      </form>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-semibold text-navy-900 text-sm mb-4">Kelola Cabang</h2>
        <div className="space-y-2 mb-4">
          {branches.map((b) => (
            <div key={b.id} className="flex items-center justify-between gap-3 border-b border-gray-50 last:border-0 pb-2 last:pb-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2 py-1 rounded-lg bg-navy-50 text-navy-700">{b.code}</span>
                <span className="text-sm text-navy-900">{b.name}</span>
              </div>
              <button onClick={() => handleDeleteBranch(b.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {branches.length === 0 && <p className="text-sm text-gray-400">Belum ada cabang.</p>}
        </div>
        <form onSubmit={handleAddBranch} className="flex items-end gap-2">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Nama Cabang</label>
            <input
              value={newBranch.name}
              onChange={(e) => setNewBranch((b) => ({ ...b, name: e.target.value }))}
              placeholder="mis. Tangerang"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-2xl text-sm"
            />
          </div>
          <div className="w-24">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Kode</label>
            <input
              value={newBranch.code}
              onChange={(e) => setNewBranch((b) => ({ ...b, code: e.target.value.toUpperCase() }))}
              placeholder="TGR"
              maxLength={5}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-2xl text-sm uppercase"
            />
          </div>
          <button type="submit" disabled={savingBranch === 'new'} className="flex items-center gap-1.5 bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold px-4 py-2 rounded-2xl disabled:opacity-50">
            {savingBranch === 'new' ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Tambah
          </button>
        </form>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
        <h2 className="font-semibold text-navy-900 text-sm mb-4">Harga Paket Latihan</h2>
        <div className="space-y-3">
          {packages.map((pkg) => (
            <div key={pkg.id} className="flex items-center justify-between gap-3 border-b border-gray-50 last:border-0 pb-3 last:pb-0">
              <div className="text-sm">
                <div className="font-medium text-navy-900">{pkg.name}</div>
                <div className="text-xs text-gray-400">{pkg.sessionsPerWeek}x/minggu</div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={pkg.price}
                  onChange={(e) => handlePackagePriceChange(pkg, e.target.value)}
                  className="w-32 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-right"
                />
                <button
                  onClick={() => handleSavePackage(pkg)}
                  disabled={savingPackage === pkg.id}
                  className="text-xs font-semibold bg-navy-900 hover:bg-navy-800 text-white px-3 py-1.5 rounded-lg disabled:opacity-50"
                >
                  {savingPackage === pkg.id ? '...' : 'Simpan'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
