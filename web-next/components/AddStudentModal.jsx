'use client'

import { useState } from 'react'
import { UserPlus, Loader2, Upload } from 'lucide-react'
import * as api from '@/lib/api'
import { POSITIONS } from '@/lib/positions'
import { AppSelect } from '@/components/ui/app-select'
import { RupiahInput } from '@/components/ui/rupiah-input'
import { totalSessionsFor } from '@/lib/sessionInfo'
import ScholarshipField from '@/components/ScholarshipField'

function formatRupiah(n) {
  return `Rp${(n || 0).toLocaleString('id-ID')}`
}

export default function AddStudentModal({ branches, packages, isAdmin = false, onClose, onSaved }) {
  const [form, setForm] = useState({
    parentName: '', parentEmail: '', parentPhone: '', parentPassword: '',
    fullName: '', dateOfBirth: '', position: 'CM', branchId: '', packageId: '',
    photo: '', sessionsUsed: '0',
    registrationFee: '750000',
    paymentStatus: 'pending',
    registrationScholarshipPercent: 0,
    sppScholarshipPercent: 0,
  })
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

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

  const selectedPackage = packages.find((p) => p.id === form.packageId)
  const totalSessions = selectedPackage ? totalSessionsFor({ package: selectedPackage }) : 0
  const pkgAmount = selectedPackage?.price || 0
  const regFee = Number(form.registrationFee) || 0
  const subtotal = pkgAmount + regFee
  const discount = Math.round(pkgAmount * form.sppScholarshipPercent / 100) + Math.round(regFee * form.registrationScholarshipPercent / 100)
  const total = Math.max(subtotal - discount, 0)

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.parentPassword.length < 6) return setError('Password minimal 6 karakter')
    setSaving(true)
    setError('')
    try {
      await api.createStudent({
        ...form,
        registrationFee: regFee,
        sessionsUsed: Number(form.sessionsUsed) || 0,
      })
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
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto modal-scroll" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-br from-navy-800 to-navy-900 p-5 text-center">
          <UserPlus size={24} className="mx-auto text-gold-400 mb-2" />
          <h3 className="font-bold text-white">Tambah Anak</h3>
          <p className="text-xs text-gray-300 mt-1">Buat akun untuk orang tua & siswa yang sudah deal via WhatsApp</p>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}

          <div>
            <h4 className="text-xs font-bold text-navy-900 mb-2 uppercase tracking-wider">Data Orang Tua</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Nama Orang Tua</label>
                <input required value={form.parentName} onChange={(e) => setForm((f) => ({ ...f, parentName: e.target.value }))} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Email (untuk login anak)</label>
                <input
                  type="email"
                  required
                  value={form.parentEmail}
                  onChange={(e) => setForm((f) => ({ ...f, parentEmail: e.target.value }))}
                  placeholder="contoh: budi.santoso@sixstars.id"
                  pattern=".+@sixstars\.id"
                  title="Email login harus menggunakan domain @sixstars.id"
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm"
                />
                <p className="text-[11px] text-gray-400 mt-1">Wajib domain @sixstars.id — ini akun untuk orang tua login melihat progres anaknya, bukan email pribadi.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">No. Telepon</label>
                  <input value={form.parentPhone} onChange={(e) => setForm((f) => ({ ...f, parentPhone: e.target.value }))} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Password</label>
                  <input type="password" required value={form.parentPassword} onChange={(e) => setForm((f) => ({ ...f, parentPassword: e.target.value }))} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm" minLength={6} />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <h4 className="text-xs font-bold text-navy-900 mb-2 uppercase tracking-wider">Data Siswa</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center shrink-0">
                  {form.photo ? <img src={form.photo} alt="" className="w-full h-full object-cover" /> : <Upload size={18} className="text-gray-300" />}
                </div>
                <label className="text-xs font-semibold text-navy-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-100">
                  {uploadingPhoto ? 'Mengunggah...' : 'Unggah Foto Profil'}
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} disabled={uploadingPhoto} />
                </label>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Nama Lengkap Siswa</label>
                <input required value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Tanggal Lahir</label>
                  <input type="date" required value={form.dateOfBirth} onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Posisi</label>
                  <AppSelect value={form.position} onChange={(v) => setForm((f) => ({ ...f, position: v }))} className="w-full" options={POSITIONS.map((p) => ({ value: p, label: p }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Cabang</label>
                  <AppSelect
                    value={form.branchId}
                    onChange={(v) => setForm((f) => ({ ...f, branchId: v }))}
                    className="w-full"
                    allLabel="- Pilih -"
                    placeholder="- Pilih -"
                    options={branches.map((b) => ({ value: b.id, label: `${b.name} (${b.code})` }))}
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
                    options={packages.map((p) => ({ value: p.id, label: `${p.name} (${p.sessionsPerWeek}x/mgg)` }))}
                  />
                </div>
              </div>
              {form.packageId && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Sesi Saat Ini (opsional)</label>
                  <input
                    type="number"
                    min={0}
                    max={totalSessions || undefined}
                    value={form.sessionsUsed}
                    onChange={(e) => setForm((f) => ({ ...f, sessionsUsed: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Isi kalau anak ini sudah pernah latihan/absen sebelum akunnya dibuat di sistem, dari total {totalSessions} sesi paket ini. Kosongkan / 0 kalau baru mulai dari nol.
                  </p>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Biaya Pendaftaran (Rp)</label>
                <RupiahInput
                  value={form.registrationFee}
                  onChange={(n) => setForm((f) => ({ ...f, registrationFee: String(n) }))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Status Pembayaran</label>
                <AppSelect
                  value={form.paymentStatus}
                  onChange={(v) => setForm((f) => ({ ...f, paymentStatus: v }))}
                  className="w-full"
                  options={[
                    { value: 'pending', label: 'Belum Lunas' },
                    { value: 'success', label: 'Lunas' },
                  ]}
                />
              </div>
              {isAdmin && (
                <div className="pt-3 border-t border-gray-100 space-y-3">
                  <h4 className="text-xs font-bold text-navy-900 uppercase tracking-wider">Beasiswa</h4>
                  <ScholarshipField
                    label="Beasiswa Biaya Pendaftaran"
                    percent={form.registrationScholarshipPercent}
                    onChange={(p) => setForm((f) => ({ ...f, registrationScholarshipPercent: p }))}
                  />
                  <ScholarshipField
                    label="Beasiswa SPP / Paket"
                    percent={form.sppScholarshipPercent}
                    onChange={(p) => setForm((f) => ({ ...f, sppScholarshipPercent: p }))}
                  />
                </div>
              )}

              {form.packageId && (
                <div className="bg-navy-50 rounded-2xl p-3.5 space-y-1.5 text-xs">
                  <div className="flex justify-between text-gray-500">
                    <span>Harga Paket</span>
                    <span className="font-medium text-navy-900">{formatRupiah(pkgAmount)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Biaya Pendaftaran</span>
                    <span className="font-medium text-navy-900">{formatRupiah(regFee)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Diskon Beasiswa</span>
                      <span className="font-medium">-{formatRupiah(discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1.5 border-t border-navy-100 font-bold text-navy-900 text-sm">
                    <span>Total Dibayar</span>
                    <span>{formatRupiah(total)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 bg-gold-400 hover:bg-gold-500 text-navy-900 font-bold py-2.5 rounded-2xl disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />} Buat Akun & Daftarkan Siswa
          </button>
        </form>
      </div>
    </div>
  )
}
