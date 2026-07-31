'use client'

import { useEffect, useState } from 'react'
import { X, Loader2, RefreshCw, ExternalLink, CheckCircle2, ChevronLeft, Tag } from 'lucide-react'
import * as api from '@/lib/api'
import { PAYMENT_METHOD_LOGOS } from '@/lib/paymentMethodLogos'
import { qrImageUrl } from '@/lib/qrImage'

const FALLBACK_METHODS = [
  { value: 'QRIS', label: 'QRIS' },
  { value: 'VAMANDIRI', label: 'Virtual Account Mandiri' },
  { value: 'VABNI', label: 'Virtual Account BNI' },
  { value: 'VABRI', label: 'Virtual Account BRI' },
  { value: 'TOKOPEDIA CC', label: 'Kartu Kredit (Tokopedia)' },
  { value: 'TOKOPEDIA NON CC', label: 'Tokopedia (Non Kartu Kredit)' },
  { value: 'BLIBLI CC', label: 'Kartu Kredit (Blibli)' },
]

function formatRupiah(n) {
  return 'Rp' + (Number(n) || 0).toLocaleString('id-ID')
}

export default function RenewalModal({ onClose, onDone }) {
  const [step, setStep] = useState('package') // package | method | result
  const [packages, setPackages] = useState([])
  const [methods, setMethods] = useState(FALLBACK_METHODS)
  const [selectedPackage, setSelectedPackage] = useState(null)
  const [method, setMethod] = useState('QRIS')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [promoCodeInput, setPromoCodeInput] = useState('')
  const [promoDiscount, setPromoDiscount] = useState(null)
  const [promoChecking, setPromoChecking] = useState(false)

  useEffect(() => {
    api.getPackages().then(setPackages).catch(() => {})
    api.getPaymentMethods().then((m) => { if (m?.length) setMethods(m) }).catch(() => {})
  }, [])

  async function handleCheckPromo() {
    if (!promoCodeInput.trim() || !selectedPackage) return
    setPromoChecking(true)
    setError('')
    try {
      const res = await api.validatePromoCode(promoCodeInput.trim(), selectedPackage.id, selectedPackage.price)
      setPromoDiscount(res)
    } catch (err) {
      setPromoDiscount(null)
      setError(err.message)
    } finally {
      setPromoChecking(false)
    }
  }

  const discountAmount = promoDiscount?.discount || 0
  const finalAmount = Math.max(0, (selectedPackage?.price || 0) - discountAmount)

  async function handleConfirm() {
    setLoading(true)
    setError('')
    try {
      const res = await api.createRenewalPayment({
        packageId: selectedPackage.id,
        paymentMethod: method,
        ...(promoDiscount ? { promoCode: promoCodeInput.trim() } : {}),
      })
      setResult(res)
      setStep('result')
    } catch (err) {
      setError(err.message || 'Gagal membuat tagihan perpanjangan')
    } finally {
      setLoading(false)
    }
  }

  const paymentLink = result?.rintisan?.rintisan_billing_link || result?.rintisan?.payment_link || result?.payment?.paymentLink
  const qrString = result?.rintisan?.qr_string || result?.payment?.qrString

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60" onClick={loading ? undefined : onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full max-h-[85vh] overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {step === 'method' && (
              <button onClick={() => setStep('package')} className="p-1 -ml-1 text-gray-400 hover:text-gray-600">
                <ChevronLeft size={18} />
              </button>
            )}
            <RefreshCw size={16} className="text-navy-700" />
            <h3 className="font-bold text-navy-900 text-sm">Perpanjang Paket</h3>
          </div>
          {!loading && (
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          )}
        </div>

        {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">{error}</div>}

        {step === 'package' && (
          <>
            <label className="block text-xs font-semibold text-gray-500 mb-2">Pilih Paket Baru</label>
            <div className="space-y-2 mb-5 max-h-72 overflow-y-auto pr-1">
              {packages.length === 0 && <div className="text-sm text-gray-400 py-4 text-center">Memuat paket...</div>}
              {packages.map((pkg) => (
                <button
                  key={pkg.id}
                  onClick={() => setSelectedPackage(pkg)}
                  className={`w-full text-left px-4 py-3 rounded-2xl border transition-colors duration-150 ${
                    selectedPackage?.id === pkg.id
                      ? 'border-gold-400 bg-gold-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold text-navy-900 text-sm">{pkg.name}</div>
                  <div className="text-xs text-gray-400">{pkg.sessionsPerWeek}x/minggu &middot; {formatRupiah(pkg.price)}</div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep('method')}
              disabled={!selectedPackage}
              className="w-full flex items-center justify-center gap-2 bg-navy-900 hover:bg-navy-800 text-white font-semibold text-sm px-4 py-3 rounded-2xl disabled:opacity-50"
            >
              Lanjut
            </button>
          </>
        )}

        {step === 'method' && (
          <>
            <div className="bg-navy-50 rounded-2xl px-4 py-3 mb-4 text-center">
              <div className="text-xs text-gray-500">Total Tagihan</div>
              <div className="text-lg font-bold text-navy-900">
                {discountAmount > 0 ? (
                  <>
                    {formatRupiah(finalAmount)}{' '}
                    <span className="text-xs text-gray-400 font-normal line-through">{formatRupiah(selectedPackage?.price)}</span>
                  </>
                ) : (
                  formatRupiah(selectedPackage?.price)
                )}
              </div>
            </div>

            <label className="block text-xs font-semibold text-gray-500 mb-2">Punya Kode Promo?</label>
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={promoCodeInput}
                  onChange={(e) => setPromoCodeInput(e.target.value)}
                  placeholder="Masukkan kode promo"
                  disabled={promoDiscount !== null}
                  className="w-full pl-8 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm uppercase disabled:opacity-60"
                />
              </div>
              {promoDiscount ? (
                <button onClick={() => { setPromoDiscount(null); setPromoCodeInput('') }} className="text-xs font-semibold text-red-600 bg-red-50 px-3 py-2 rounded-xl hover:bg-red-100 shrink-0">Hapus</button>
              ) : (
                <button onClick={handleCheckPromo} disabled={promoChecking || !promoCodeInput.trim()} className="text-xs font-semibold text-navy-900 bg-gold-400 px-3 py-2 rounded-xl hover:bg-gold-500 disabled:opacity-50 shrink-0">
                  {promoChecking ? <Loader2 size={14} className="animate-spin" /> : 'Cek'}
                </button>
              )}
            </div>
            {promoDiscount && (
              <div className="text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg mb-4 -mt-2">
                Diskon {promoDiscount.discountPercent}% — Hemat {formatRupiah(discountAmount)}
              </div>
            )}

            <label className="block text-xs font-semibold text-gray-500 mb-2">Pilih Metode Pembayaran</label>
            <div className="space-y-2 mb-5 max-h-56 overflow-y-auto pr-1">
              {methods.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMethod(m.value)}
                  className={`w-full flex items-center gap-2.5 text-left px-4 py-2.5 rounded-2xl border text-sm font-medium transition-colors duration-150 ${
                    method === m.value
                      ? 'border-gold-400 bg-gold-50 text-navy-900'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {PAYMENT_METHOD_LOGOS[m.value] && (
                    <img src={PAYMENT_METHOD_LOGOS[m.value]} alt="" className="h-6 w-9 object-contain shrink-0" />
                  )}
                  <span className="min-w-0">{m.label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gold-400 hover:bg-gold-500 text-navy-900 font-bold text-sm px-4 py-3 rounded-2xl disabled:opacity-50"
            >
              {loading && <Loader2 size={15} className="animate-spin" />} Buat Tagihan
            </button>
          </>
        )}

        {step === 'result' && result && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3 text-sm">
              <CheckCircle2 size={16} className="shrink-0" />
              Tagihan berhasil dibuat. Selesaikan pembayaran melalui link di bawah.
            </div>
            {paymentLink ? (
              <a
                href={paymentLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-gold-400 hover:bg-gold-500 text-navy-900 font-semibold text-sm px-4 py-3 rounded-2xl"
              >
                <ExternalLink size={16} /> Bayar Sekarang
              </a>
            ) : qrString ? (
              <div className="text-center">
                <img src={qrImageUrl(qrString)} alt="QRIS" className="w-52 h-52 mx-auto rounded-2xl border border-gray-200" />
                <p className="text-xs text-gray-500 mt-2">Scan QRIS ini pakai aplikasi e-wallet/mobile banking kamu.</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center">Link pembayaran tidak tersedia, hubungi admin.</p>
            )}
            <button
              onClick={() => onDone?.(result)}
              className="w-full text-sm font-semibold text-gray-500 hover:text-navy-700 py-2"
            >
              Tutup
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
