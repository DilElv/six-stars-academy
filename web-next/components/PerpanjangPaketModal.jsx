'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, Loader2, Check, ReceiptText, Banknote } from 'lucide-react'
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

const MANUAL_METHODS = [
  { value: 'cash', label: 'Tunai (Cash)' },
  { value: 'transfer_manual', label: 'Transfer Manual' },
  { value: 'lainnya', label: 'Lainnya' },
]

// Admin/head-coach-initiated renewal. Dua kemungkinan aksi:
//  - "Buat Tagihan" -> tagihan masuk ke daftar tagihan anak, parent membayarnya
//    lewat menu Perpanjang Paket (belum dihitung sebagai pendapatan, paket
//    belum aktif).
//  - "Tandai Lunas" -> pembayaran manual (cash/transfer pribadi) langsung
//    dicatat lunas + paket langsung diperpanjang.
// Lihat server-next/routes/students.js POST /:id/renew.
export default function PerpanjangPaketModal({ student, branches = [], packages = [], onClose, onSaved }) {
  const isCustomPackage = !!student.package?.isCustom
  const [memberType, setMemberType] = useState(student.isOldMember ? 'old' : isCustomPackage ? 'custom' : 'new')
  const isOldMember = memberType === 'old'
  const usesCustom = memberType !== 'new'
  const [loadingPrice, setLoadingPrice] = useState(true)
  const [branchId, setBranchId] = useState(student.branchId || '')
  const [packageId, setPackageId] = useState('')
  const [amount, setAmount] = useState('')
  const [customName, setCustomName] = useState(isCustomPackage ? student.package.name : '')
  const [customSessions, setCustomSessions] = useState(isCustomPackage ? String(student.package.sessionsPerWeek) : '1')
  const [customDuration, setCustomDuration] = useState(isCustomPackage ? String(student.package.durationMonths) : '1')
  const [customPrice, setCustomPrice] = useState(isCustomPackage ? String(student.package.price) : '')
  const [note, setNote] = useState('')
  const [manualMethod, setManualMethod] = useState('cash')
  const [branchPackages, setBranchPackages] = useState(null)
  const [saving, setSaving] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (!branchId || usesCustom) return setBranchPackages(null)
    api.getPackages(branchId).then(setBranchPackages).catch(() => setBranchPackages(null))
  }, [branchId, usesCustom])

  useEffect(() => {
    let active = true
    api.getStudent(student.id).then((fresh) => {
      if (!active) return
      const pkg = fresh.customPackage
      setMemberType(fresh.isOldMember ? 'old' : pkg ? 'custom' : 'new')
      if (pkg) {
        setCustomName(pkg.name)
        setCustomSessions(String(pkg.sessionsPerWeek))
        setCustomDuration(String(pkg.durationMonths))
        setCustomPrice(String(pkg.price))
      }
      setLoadingPrice(false)
    }).catch((err) => { if (active) setError(err.message) })
    return () => { active = false }
  }, [student.id])

  const effectivePackages = branchPackages || packages
  const selectedPackage = effectivePackages?.find((p) => p.id === packageId)

  async function submit(mode) {
    setError('')
    const payload = { isOldMember, mode, note: note.trim() || undefined }
    if (usesCustom) {
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
    if (mode === 'paid') payload.paymentMethod = manualMethod
    setSaving(mode)
    try {
      const res = await api.renewStudent(student.id, payload)
      setResult(res)
      onSaved?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving('')
    }
  }

  if (result) {
    const pkg = result.package
    const isInvoice = !!result.invoice
    return (
      <ModalPortal>
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 ${isInvoice ? 'bg-amber-50' : 'bg-emerald-50'}`}>
              {isInvoice ? <ReceiptText size={24} className="text-amber-600" /> : <Check size={24} className="text-emerald-600" />}
            </div>
            <h3 className="font-bold text-navy-900">{isInvoice ? 'Tagihan Dibuat' : 'Perpanjangan Berhasil'}</h3>
            <p className="text-sm text-gray-500 mt-1">
              {student.fullName} — {pkg.name} ({pkg.sessionsPerWeek}x/minggu) — {formatRupiah(isInvoice ? result.amount : result.payment.amount)}
            </p>
            {isInvoice ? (
              <p className="text-xs text-gray-400 mt-1">
                Belum dihitung sebagai pendapatan. Tagihan muncul di menu Perpanjang Paket orang tua; paket aktif setelah dibayar.
              </p>
            ) : (
              <p className="text-xs text-gray-400 mt-1">Berlaku sampai {formatTanggal(result.quote.packageEndDate)}</p>
            )}
            <button onClick={onClose} className="mt-4 w-full text-sm font-semibold text-gray-500 hover:text-navy-700 py-2">Tutup</button>
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
          <form onSubmit={(e) => { e.preventDefault(); submit('invoice') }} className="p-5 space-y-3">
            {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}

            <fieldset disabled={loadingPrice || !!saving} className="flex gap-2">
              <button
                type="button"
                onClick={() => setMemberType('new')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${memberType === 'new' ? 'bg-navy-900 text-white border-navy-900' : 'bg-gray-50 text-gray-500 border-gray-200'}`}
              >
                Anak Baru
              </button>
              <button
                type="button"
                onClick={() => setMemberType('old')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${isOldMember ? 'bg-navy-900 text-white border-navy-900' : 'bg-gray-50 text-gray-500 border-gray-200'}`}
              >
                Anak Lama
              </button>
              <button type="button" onClick={() => setMemberType('custom')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold border ${memberType === 'custom' ? 'bg-navy-900 text-white border-navy-900' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                Custom
              </button>
            </fieldset>

            {usesCustom ? (
              <div className="space-y-3">
                <p className="text-[11px] text-gray-400">
                  Harga khusus tersimpan untuk anak ini dan otomatis digunakan pada perpanjangan berikutnya. Harga berlaku per durasi paket.
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
              <label className="block text-xs font-semibold text-gray-500 mb-1">Keterangan (opsional)</label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="mis. Anak berprestasi, keringanan, titipan orang tua"
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm"
              />
            </div>

            <button type="submit" disabled={!!saving || loadingPrice} className="w-full flex items-center justify-center gap-2 bg-navy-900 hover:bg-navy-800 text-white font-semibold py-2.5 rounded-2xl disabled:opacity-50">
              {saving === 'invoice' ? <Loader2 size={14} className="animate-spin" /> : <ReceiptText size={14} />} Buat Tagihan (Belum Dibayar)
            </button>

            <div className="rounded-2xl border border-gray-200 p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500">
                <Banknote size={12} /> Sudah dibayar tunai / transfer pribadi? Tandai lunas sekarang
              </div>
              <AppSelect value={manualMethod} onChange={setManualMethod} className="w-full" options={MANUAL_METHODS} />
              <button
                type="button"
                onClick={() => submit('paid')}
                disabled={!!saving || loadingPrice}
                className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2.5 rounded-2xl disabled:opacity-50"
              >
                {saving === 'paid' ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Tandai Lunas
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  )
}
