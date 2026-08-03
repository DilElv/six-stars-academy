'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, Loader2, MessageCircle, Check } from 'lucide-react'
import * as api from '@/lib/api'
import { AppSelect } from '@/components/ui/app-select'
import { RupiahInput } from '@/components/ui/rupiah-input'
import ModalPortal from '@/components/ui/modal-portal'

function formatRupiah(n) {
  return `Rp${(n || 0).toLocaleString('id-ID')}`
}

function formatTanggal(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

function renewalWaLink(phone, parentName, studentName, pkg, amount, endDate) {
  const normalized = phone.startsWith('62') ? phone : `62${phone.replace(/^0/, '')}`
  const message = `Halo ${parentName}, ini pengingat dari SixStars Academy untuk perpanjangan paket latihan ${studentName}.\n\nPaket: ${pkg.name} (${pkg.sessionsPerWeek}x/minggu)\nHarga: ${formatRupiah(amount)}\nBerlaku sampai: ${formatTanggal(endDate)}\n\nSilakan lakukan pembayaran perpanjangan agar ${studentName} bisa lanjut latihan. Terima kasih!`
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`
}

// Admin/head-coach-initiated renewal — distinct from EditModal's plain
// package correction: this always records a real (already-paid) payment,
// resets the session quota, and lets legacy ("anak lama") members renew on
// a hidden, student-specific custom price instead of ever being matched to
// the standard Pengaturan catalog. See server-next/routes/students.js
// POST /:id/renew.
export default function PerpanjangPaketModal({ student, branches, packages, onClose, onSaved }) {
  const isCustomPackage = !!student.package?.isCustom
  const [isOldMember, setIsOldMember] = useState(student.isOldMember || false)
  const [paymentStatus, setPaymentStatus] = useState('pending')
  const [branchId, setBranchId] = useState(student.branchId || '')
  const [packageId, setPackageId] = useState('')
  const [amount, setAmount] = useState('')
  const [customName, setCustomName] = useState(isCustomPackage ? student.package.name : '')
  const [customSessions, setCustomSessions] = useState(isCustomPackage ? String(student.package.sessionsPerWeek) : '1')
  const [customDuration, setCustomDuration] = useState(isCustomPackage ? String(student.package.durationMonths) : '1')
  const [customPrice, setCustomPrice] = useState(isCustomPackage ? String(student.package.price) : '')
  const [branchPackages, setBranchPackages] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (!branchId || isOldMember) return setBranchPackages(null)
    api.getPackages(branchId).then(setBranchPackages).catch(() => setBranchPackages(null))
  }, [branchId, isOldMember])

  const effectivePackages = branchPackages || packages
  const selectedPackage = effectivePackages?.find((p) => p.id === packageId)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const payload = { isOldMember, paymentStatus }
    if (isOldMember) {
      if (!customName.trim()) return setError('Nama paket wajib diisi')
      if (!customPrice) return setError('Harga wajib diisi')
      payload.customPackage = {
        name: customName.trim(),
        sessionsPerWeek: Number(customSessions) || 1,
        durationMonths: Number(customDuration) || 1,
        price: Number(customPrice) || 0,
      }
    } else {
      if (!packageId) return setError('Pilih paket terlebih dahulu')
      payload.packageId = packageId
      if (amount !== '') payload.amount = Number(amount)
    }
    setSaving(true)
    try {
      const res = await api.renewStudent(student.id, payload)
      setResult(res)
      onSaved?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (result) {
    const pkg = result.package
    const waHref = student.parentPhone
      ? renewalWaLink(student.parentPhone, student.parentName, student.fullName, pkg, result.payment.amount, result.quote.packageEndDate)
      : null
    return (
      <ModalPortal>
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 ${result.paid ? 'bg-emerald-50' : 'bg-amber-50'}`}>
              <Check size={24} className={result.paid ? 'text-emerald-600' : 'text-amber-600'} />
            </div>
            <h3 className="font-bold text-navy-900">{result.paid ? 'Perpanjangan Berhasil' : 'Perpanjangan Dicatat — Menunggu Pembayaran'}</h3>
            <p className="text-sm text-gray-500 mt-1">
              {student.fullName} — {pkg.name} ({pkg.sessionsPerWeek}x/minggu) — {formatRupiah(result.payment.amount)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {result.paid ? 'Berlaku sampai' : 'Kalau sudah bayar, berlaku sampai'} {formatTanggal(result.quote.packageEndDate)}
            </p>
            {!result.paid && (
              <p className="text-[11px] text-amber-600 mt-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                Sesi & paket BELUM aktif. Tandai lunas di Keuangan Pemasukan setelah orang tua membayar.
              </p>
            )}
            {waHref && (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm px-4 py-2.5 rounded-2xl"
              >
                <MessageCircle size={16} /> Kirim Reminder WA
              </a>
            )}
            <button onClick={onClose} className="mt-2 w-full text-sm font-semibold text-gray-500 hover:text-navy-700 py-2">Tutup</button>
          </div>
        </div>
      </ModalPortal>
    )
  }

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[85vh] overflow-y-auto modal-scroll" onClick={(e) => e.stopPropagation()}>
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-bold text-navy-900 flex items-center gap-2"><RefreshCw size={16} /> Perpanjang Paket</h3>
            <p className="text-xs text-gray-400 mt-0.5">{student.fullName} ({student.studentId})</p>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-3">
            {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsOldMember(false)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${!isOldMember ? 'bg-navy-900 text-white border-navy-900' : 'bg-gray-50 text-gray-500 border-gray-200'}`}
              >
                Anak Baru
              </button>
              <button
                type="button"
                onClick={() => setIsOldMember(true)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${isOldMember ? 'bg-navy-900 text-white border-navy-900' : 'bg-gray-50 text-gray-500 border-gray-200'}`}
              >
                Anak Lama
              </button>
            </div>

            {isOldMember ? (
              <div className="space-y-3">
                <p className="text-[11px] text-gray-400">
                  {isCustomPackage
                    ? 'Paket harga lama anak ini — ubah kalau harganya berubah, tetap dipakai otomatis di perpanjangan berikutnya.'
                    : 'Belum ada paket custom untuk anak ini — isi sekali, akan tersimpan otomatis untuk perpanjangan berikutnya.'}
                </p>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Nama Paket</label>
                  <input required value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="mis. Paket Lama 1x/minggu" className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Sesi/Minggu</label>
                    <input type="number" min={1} required value={customSessions} onChange={(e) => setCustomSessions(e.target.value)} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Durasi (bulan)</label>
                    <input type="number" min={1} required value={customDuration} onChange={(e) => setCustomDuration(e.target.value)} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Harga (Rp)</label>
                  <RupiahInput value={customPrice} onChange={(n) => setCustomPrice(String(n))} className="w-full" />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Cabang</label>
                  <AppSelect
                    value={branchId}
                    onChange={(v) => { setBranchId(v); setPackageId('') }}
                    className="w-full"
                    allLabel="- Pilih -"
                    placeholder="- Pilih -"
                    options={branches.map((b) => ({ value: b.id, label: `${b.name} (${b.code})` }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Paket</label>
                  <AppSelect
                    value={packageId}
                    onChange={(v) => { setPackageId(v); setAmount('') }}
                    className="w-full"
                    disabled={!branchId}
                    allLabel="- Pilih Paket -"
                    placeholder={branchId ? '- Pilih Paket -' : 'Pilih cabang dulu'}
                    options={branchId ? effectivePackages.map((p) => ({ value: p.id, label: `${p.name} (${p.sessionsPerWeek}x/mgg) — ${formatRupiah(p.price)}` })) : []}
                  />
                </div>
                {packageId && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Harga (Rp)</label>
                    <RupiahInput
                      value={amount !== '' ? amount : String(selectedPackage?.price || 0)}
                      onChange={(n) => setAmount(String(n))}
                      className="w-full"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">Otomatis terisi dari harga paket cabang ini — bisa diubah manual kalau perlu.</p>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Status Pembayaran</label>
              <AppSelect
                value={paymentStatus}
                onChange={setPaymentStatus}
                className="w-full"
                options={[{ value: 'pending', label: 'Belum Lunas' }, { value: 'success', label: 'Lunas' }]}
              />
              <p className="text-[11px] text-gray-400 mt-1">
                {paymentStatus === 'pending'
                  ? 'Paket & sesi baru BELUM aktif sampai pembayaran ditandai lunas (verifikasi di Keuangan Pemasukan).'
                  : 'Paket & sesi baru langsung aktif sekarang.'}
              </p>
            </div>

            <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 bg-navy-900 hover:bg-navy-800 text-white font-semibold py-2.5 rounded-2xl disabled:opacity-50">
              {saving && <Loader2 size={14} className="animate-spin" />} {paymentStatus === 'pending' ? 'Simpan & Kirim Reminder' : 'Perpanjang & Tandai Lunas'}
            </button>
          </form>
        </div>
      </div>
    </ModalPortal>
  )
}
