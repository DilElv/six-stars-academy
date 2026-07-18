'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Check, ChevronRight, ChevronLeft, Loader2, Upload, PartyPopper } from 'lucide-react'
import * as api from '@/lib/api'

const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'CM', 'CAM', 'LW', 'RW', 'ST']
const AGE_GROUP_BRACKETS = [
  { label: 'U-8', min: 0, max: 8 },
  { label: 'U-10', min: 9, max: 10 },
  { label: 'U-12', min: 11, max: 12 },
  { label: 'U-14', min: 13, max: 14 },
  { label: 'U-16', min: 15, max: 16 },
  { label: 'U-18', min: 17, max: 999 },
]

function formatRupiah(n) {
  return 'Rp' + (n || 0).toLocaleString('id-ID')
}

function previewAgeGroup(dob) {
  if (!dob) return null
  const birth = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  const bracket = AGE_GROUP_BRACKETS.find((b) => age >= b.min && age <= b.max)
  return { age, label: bracket ? bracket.label : 'U-8' }
}

function groupPackages(packages) {
  const byName = {}
  for (const p of packages) {
    if (!byName[p.name]) byName[p.name] = { name: p.name, durationMonths: p.durationMonths }
    if (p.sessionsPerWeek === 1) byName[p.name].opt1 = p
    if (p.sessionsPerWeek === 2) byName[p.name].opt2 = p
  }
  return Object.values(byName).sort((a, b) => a.durationMonths - b.durationMonths)
}

function DaftarWizard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState(1)
  const [packages, setPackages] = useState([])
  const [selectedPackage, setSelectedPackage] = useState(null)
  const [registrationFee, setRegistrationFee] = useState(750000)
  const [form, setForm] = useState({
    fullName: '', dateOfBirth: '', position: 'CM', photo: '',
    parentName: '', parentPhone: '', address: '', email: '', password: '',
  })
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  useEffect(() => {
    api.getPackages().then((data) => {
      setPackages(data)
      const preId = searchParams.get('packageId')
      if (preId) {
        const found = data.find((p) => p.id === preId)
        if (found) setSelectedPackage(found)
      }
    })
    api.getSettings().then((s) => setRegistrationFee(s.registrationFee))
  }, [searchParams])

  const grouped = groupPackages(packages)
  const agePreview = previewAgeGroup(form.dateOfBirth)

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await api.uploadFile(file)
      setForm((f) => ({ ...f, photo: url }))
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  function next() {
    setError('')
    if (step === 1 && !selectedPackage) return setError('Pilih paket terlebih dahulu')
    if (step === 2) {
      if (!form.fullName || !form.dateOfBirth || !form.parentName || !form.parentPhone || !form.address || !form.email || !form.password) {
        return setError('Lengkapi semua field yang wajib diisi')
      }
    }
    setStep((s) => s + 1)
  }

  function back() {
    setError('')
    setStep((s) => s - 1)
  }

  async function handleConfirm() {
    setSubmitting(true)
    setError('')
    try {
      const data = await api.register({
        packageId: selectedPackage.id,
        fullName: form.fullName,
        dateOfBirth: form.dateOfBirth,
        position: form.position,
        photo: form.photo || null,
        parentName: form.parentName,
        parentPhone: form.parentPhone,
        address: form.address,
        email: form.email,
        password: form.password,
      })
      setResult(data)
      setStep(6)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const totalAmount = selectedPackage ? selectedPackage.price + registrationFee : 0

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold-400 to-gold-600" />
            <span className="font-bold text-navy-900">SixStars Academy</span>
          </Link>
          {step <= 5 && (
            <div className="flex items-center justify-center gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className={`h-1.5 w-8 rounded-full ${n <= step ? 'bg-gold-400' : 'bg-gray-200'}`} />
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sm:p-8">
          {error && (
            <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>
          )}

          {step === 1 && (
            <>
              <h1 className="font-bold text-navy-900 text-lg mb-1">Pilih Paket Latihan</h1>
              <p className="text-sm text-gray-400 mb-6">Langkah 1 dari 5</p>
              <div className="space-y-3">
                {grouped.map((g) => (
                  <div key={g.name} className="border border-gray-200 rounded-xl p-4">
                    <div className="font-semibold text-navy-900 mb-2">{g.name}</div>
                    <div className="grid grid-cols-2 gap-2">
                      {[g.opt1, g.opt2].filter(Boolean).map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => setSelectedPackage(opt)}
                          className={`text-left px-3 py-2 rounded-lg border text-sm ${
                            selectedPackage?.id === opt.id ? 'border-gold-400 bg-gold-50' : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="text-xs text-gray-400">{opt.sessionsPerWeek} Sesi/Minggu</div>
                          <div className="font-semibold text-navy-900">{formatRupiah(opt.price)}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="font-bold text-navy-900 text-lg mb-1">Form Pendaftaran Anak</h1>
              <p className="text-sm text-gray-400 mb-6">Langkah 2 dari 5</p>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center shrink-0">
                    {form.photo ? <img src={form.photo} alt="" className="w-full h-full object-cover" /> : <Upload size={18} className="text-gray-300" />}
                  </div>
                  <label className="text-xs font-semibold text-navy-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-100">
                    {uploading ? 'Mengunggah...' : 'Upload Foto Anak'}
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} disabled={uploading} />
                  </label>
                </div>
                <Field label="Nama Lengkap Anak" value={form.fullName} onChange={(v) => setForm((f) => ({ ...f, fullName: v }))} required />
                <div className="grid grid-cols-2 gap-3">
                  <Field type="date" label="Tanggal Lahir" value={form.dateOfBirth} onChange={(v) => setForm((f) => ({ ...f, dateOfBirth: v }))} required />
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Posisi</label>
                    <select
                      value={form.position}
                      onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                    >
                      {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
                {agePreview && (
                  <div className="text-xs text-gray-400">Umur {agePreview.age} tahun → Kelompok umur <b className="text-navy-700">{agePreview.label}</b></div>
                )}
                <Field label="Nama Orang Tua" value={form.parentName} onChange={(v) => setForm((f) => ({ ...f, parentName: v }))} required />
                <Field label="No. Telepon Orang Tua" value={form.parentPhone} onChange={(v) => setForm((f) => ({ ...f, parentPhone: v }))} required />
                <Field label="Alamat Lengkap" value={form.address} onChange={(v) => setForm((f) => ({ ...f, address: v }))} required />
                <Field type="email" label="Email (untuk akun login)" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} required />
                <Field type="password" label="Password" value={form.password} onChange={(v) => setForm((f) => ({ ...f, password: v }))} required />
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h1 className="font-bold text-navy-900 text-lg mb-1">Konfirmasi Data</h1>
              <p className="text-sm text-gray-400 mb-6">Langkah 3 dari 5 — ID Siswa akan dibuat otomatis (format SS-XXXX) saat pendaftaran dikonfirmasi.</p>
              <dl className="text-sm divide-y divide-gray-100">
                <Row label="Nama Anak" value={form.fullName} />
                <Row label="Tanggal Lahir" value={form.dateOfBirth} />
                <Row label="Posisi" value={form.position} />
                <Row label="Kelompok Umur" value={agePreview?.label} />
                <Row label="Nama Orang Tua" value={form.parentName} />
                <Row label="Telepon" value={form.parentPhone} />
                <Row label="Email" value={form.email} />
                <Row label="Paket" value={selectedPackage ? `${selectedPackage.name} · ${selectedPackage.sessionsPerWeek}x/minggu` : '-'} />
              </dl>
            </>
          )}

          {step === 4 && (
            <>
              <h1 className="font-bold text-navy-900 text-lg mb-1">Invoice Pendaftaran</h1>
              <p className="text-sm text-gray-400 mb-6">Langkah 4 dari 5</p>
              <dl className="text-sm divide-y divide-gray-100 mb-4">
                <Row label={`Paket ${selectedPackage?.name} (${selectedPackage?.sessionsPerWeek}x/minggu)`} value={formatRupiah(selectedPackage?.price)} />
                <Row label="Biaya Pendaftaran (Jersey 2 set, kaos kaki, 1 bola)" value={formatRupiah(registrationFee)} />
              </dl>
              <div className="flex justify-between items-center bg-navy-900 text-white rounded-xl px-4 py-3">
                <span className="text-sm font-medium">Total Tagihan</span>
                <span className="font-bold text-gold-400">{formatRupiah(totalAmount)}</span>
              </div>
            </>
          )}

          {step === 5 && (
            <>
              <h1 className="font-bold text-navy-900 text-lg mb-1">Konfirmasi Pendaftaran</h1>
              <p className="text-sm text-gray-400 mb-6">
                Langkah 5 dari 5 — Akun akan langsung aktif, status pembayaran <b>menunggu verifikasi Admin</b> (integrasi payment gateway menyusul).
              </p>
              <button
                onClick={handleConfirm}
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 bg-gold-400 hover:bg-gold-500 text-navy-900 font-bold py-3 rounded-xl disabled:opacity-50"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Daftar Sekarang
              </button>
            </>
          )}

          {step === 6 && result && (
            <div className="text-center py-4">
              <PartyPopper className="w-10 h-10 text-gold-400 mx-auto mb-3" />
              <h1 className="font-bold text-navy-900 text-lg mb-1">Pendaftaran Berhasil!</h1>
              <p className="text-sm text-gray-500 mb-4">
                ID Siswa: <b className="text-navy-900">{result.student.studentId}</b>
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Total tagihan {formatRupiah(result.payment.totalAmount)} berstatus <b>menunggu verifikasi</b>. Login untuk melihat detail.
              </p>
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full bg-navy-900 hover:bg-navy-800 text-white font-bold py-3 rounded-xl"
              >
                Ke Dashboard
              </button>
            </div>
          )}

          {step <= 5 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
              <button
                onClick={back}
                disabled={step === 1}
                className="flex items-center gap-1 text-sm font-medium text-gray-400 hover:text-navy-700 disabled:opacity-0"
              >
                <ChevronLeft size={16} /> Kembali
              </button>
              {step < 5 && (
                <button onClick={next} className="flex items-center gap-1 text-sm font-semibold text-navy-900 hover:text-gold-500">
                  Lanjut <ChevronRight size={16} />
                </button>
              )}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Sudah punya akun? <Link href="/login" className="text-gold-500 font-semibold">Masuk</Link>
        </p>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', required }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gold-400"
      />
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between py-2">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-navy-900 text-right">{value || '-'}</span>
    </div>
  )
}

export default function DaftarPage() {
  return (
    <Suspense fallback={null}>
      <DaftarWizard />
    </Suspense>
  )
}
