'use client'

import { useEffect, useState } from 'react'
import { QrCode, Printer, Loader2, Upload, Save } from 'lucide-react'
import * as api from '@/lib/api'
import { printStudentCard } from '@/lib/studentCard'

function Row({ label, value }) {
  return (
    <div className="flex justify-between py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-navy-900 text-right">{value || '-'}</span>
    </div>
  )
}

export default function ProfilAnakPage() {
  const [tab, setTab] = useState('anak')
  const [student, setStudent] = useState(null)
  const [error, setError] = useState('')
  const [qrUrl, setQrUrl] = useState('')
  const [printing, setPrinting] = useState(false)

  async function handlePrint() {
    setPrinting(true)
    try {
      await printStudentCard(student, qrUrl)
    } finally {
      setPrinting(false)
    }
  }

  useEffect(() => {
    api.getMyChild().then(setStudent).catch((err) => setError(err.message))
    api.getMyChildQrCodeUrl().then(setQrUrl).catch(() => {})
  }, [])

  if (error) return <p className="text-sm text-red-500">{error}</p>
  if (!student) return null

  const age = Math.floor((Date.now() - new Date(student.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1 bg-gray-100 rounded-2xl p-1 w-fit">
        <button onClick={() => setTab('anak')} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === 'anak' ? 'bg-white shadow-sm text-navy-900' : 'text-gray-500 hover:text-navy-700'}`}>Profil Anak</button>
        <button onClick={() => setTab('akun')} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === 'akun' ? 'bg-white shadow-sm text-navy-900' : 'text-gray-500 hover:text-navy-700'}`}>Akun Saya</button>
      </div>

      {tab === 'anak' ? (
        <>
          <p className="text-xs text-gray-400">Data ini hanya bisa diubah oleh Head Coach.</p>

          <div className="glass-card rounded-3xl p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-20 h-20 rounded-full bg-gray-100 overflow-hidden shrink-0">
                {student.photo && <img src={student.photo} alt="" className="w-full h-full object-cover" />}
              </div>
              <div>
                <div className="font-bold text-navy-900 text-lg">{student.fullName}</div>
                <div className="text-sm text-gray-400">{student.studentId}</div>
              </div>
            </div>

            <Row label="Tanggal Lahir" value={new Date(student.dateOfBirth).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} />
            <Row label="Umur" value={`${age} tahun`} />
            <Row label="Posisi" value={student.position} />
            <Row label="Kelompok Umur" value={student.ageGroup} />
            <Row label="Paket" value={student.package ? `${student.package.name} · ${student.package.sessionsPerWeek}x/minggu` : '-'} />
            <Row label="Nama Orang Tua" value={student.parentName} />
            <Row label="Telepon Orang Tua" value={student.parentPhone} />
            <Row label="Alamat" value={student.address} />
            <Row label="Status" value={student.status} />
          </div>

          <div className="glass-card rounded-3xl p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <QrCode size={16} className="text-navy-700" />
              <h2 className="font-semibold text-navy-900 text-sm">Kartu Siswa (untuk Absensi QR)</h2>
            </div>
            {qrUrl ? (
              <>
                <img src={qrUrl} alt="QR Kartu Siswa" className="w-40 h-40 mx-auto mb-3" />
                <div className="font-bold text-navy-900">{student.studentId}</div>
                <p className="text-xs text-gray-400 mb-4">Tunjukkan kode ini ke Coach untuk absen scan QR.</p>
                <button
                  onClick={handlePrint}
                  disabled={printing}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold bg-navy-900 hover:bg-navy-800 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  {printing ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />} Cetak Kartu
                </button>
              </>
            ) : (
              <p className="text-sm text-gray-400">Memuat QR code...</p>
            )}
          </div>
        </>
      ) : (
        <AkunSayaTab studentBranch={student.branch} />
      )}
    </div>
  )
}

function AkunSayaTab({ studentBranch }) {
  const [form, setForm] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    api.getMe().then((profile) => {
      setForm({ name: profile.name, phone: profile.phone || '', photo: profile.photo || '', email: profile.email || '', address: profile.address || '' })
    })
  }, [])

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await api.uploadFile(file)
      setForm((f) => ({ ...f, photo: url }))
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.updateMe(form)
      setMessage('Akun berhasil disimpan')
    } catch (err) {
      setMessage(err.message)
    } finally {
      setSaving(false)
      setTimeout(() => setMessage(''), 3000)
    }
  }

  if (!form) return null

  return (
    <div className="max-w-lg space-y-4">
      {message && <div className="text-sm bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-2xl px-3 py-2">{message}</div>}

      <form onSubmit={handleSubmit} className="glass-card rounded-3xl p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center shrink-0">
            {form.photo ? <img src={form.photo} alt="" className="w-full h-full object-cover" /> : <Upload size={18} className="text-gray-300" />}
          </div>
          <label className="text-xs font-semibold text-navy-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-100">
            {uploading ? 'Mengunggah...' : 'Ganti Foto'}
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} disabled={uploading} />
          </label>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Nama</label>
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            pattern=".+@sixstars\.id"
            title="Email login harus menggunakan domain @sixstars.id"
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">No. Telepon</label>
          <input
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Alamat</label>
          <textarea
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            rows={2}
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Cabang Anak</label>
          <div className="w-full px-3 py-2.5 bg-gray-100 border border-gray-200 rounded-2xl text-sm text-gray-500">
            {studentBranch ? `${studentBranch.name} (${studentBranch.code})` : 'Belum ditentukan'}
          </div>
          <p className="text-[11px] text-gray-400 mt-1">Akun orang tua tidak punya cabang sendiri — ini cabang tempat anak Anda latihan.</p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 bg-navy-900 hover:bg-navy-800 text-white font-semibold text-sm px-4 py-2.5 rounded-2xl disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Simpan
        </button>
      </form>
    </div>
  )
}
