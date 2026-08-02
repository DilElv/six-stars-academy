'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Loader2, CreditCard, ExternalLink, CheckCircle2 } from 'lucide-react'
import * as api from '@/lib/api'
import { PAYMENT_METHOD_LOGOS } from '@/lib/paymentMethodLogos'
import { qrImageUrl } from '@/lib/qrImage'
import PaymentStatusIcon from './PaymentStatusIcon'

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

/**
 * Reusable "pick a payment method → get a Rintisan billing link" flow.
 * `onConfirm(paymentMethod)` must return `{ payment, rintisan }` (see lib/api.js
 * createRenewalPayment / createEventPayment, or auth register()'s response shape).
 *
 * `pollStatus`, if given, is polled every 3s once a billing link/QR is shown:
 * `async (confirmResult) => ({ status: 'pending'|'success'|'failed', paidAt, paymentMethod })`,
 * where `confirmResult` is whatever `onConfirm` returned (typically used to
 * grab `confirmResult.payment.id` for `api.syncPayment(id)`, which actively
 * asks Rintisan for the latest status — not just a passive DB re-read — so
 * "lunas" is detected with no admin action even if Rintisan's webhook never
 * arrives.
 */
export default function PaymentMethodModal({ title, amount, note, onConfirm, onClose, onDone, pollStatus }) {
  const [methods, setMethods] = useState(FALLBACK_METHODS)
  const [method, setMethod] = useState('QRIS')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [finalStatus, setFinalStatus] = useState(null)
  const pollRef = useRef(null)

  useEffect(() => {
    api.getPaymentMethods().then((m) => { if (m?.length) setMethods(m) }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!result || !pollStatus || finalStatus) return
    pollRef.current = setInterval(async () => {
      try {
        const s = await pollStatus(result)
        if (s?.status === 'success' || s?.status === 'failed') {
          clearInterval(pollRef.current)
          setFinalStatus(s)
        }
      } catch {
        // transient network hiccup — keep polling
      }
    }, 3000)
    return () => clearInterval(pollRef.current)
  }, [result, pollStatus, finalStatus])

  useEffect(() => {
    if (finalStatus?.status === 'success') {
      const t = setTimeout(() => onDone?.({ ...result, ...finalStatus }), 1800)
      return () => clearTimeout(t)
    }
  }, [finalStatus, onDone, result])

  async function handleConfirm() {
    setLoading(true)
    setError('')
    try {
      const res = await onConfirm(method)
      setResult(res)
      // A Rp 0 payment (e.g. 100% scholarship) is applied as paid immediately
      // server-side, with no Rintisan billing to show — skip straight to the
      // success animation instead of a QR/link screen for nothing.
      if (res?.payment?.status === 'success') {
        setFinalStatus({ status: 'success', paidAt: res.payment.paidAt, paymentMethod: res.payment.paymentMethod })
      }
    } catch (err) {
      setError(err.message || 'Gagal membuat tagihan pembayaran')
    } finally {
      setLoading(false)
    }
  }

  async function handleCancel() {
    if (!result?.payment?.id) return
    setLoading(true)
    try {
      await api.cancelPayment(result.payment.id)
      onClose?.()
    } catch (err) {
      setError(err.message || 'Gagal membatalkan pembayaran')
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
            <CreditCard size={16} className="text-navy-700" />
            <h3 className="font-bold text-navy-900 text-sm">{title}</h3>
          </div>
          {!loading && (
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          )}
        </div>

        {amount != null && (
          <div className="bg-navy-50 rounded-2xl px-4 py-3 mb-4 text-center">
            <div className="text-xs text-gray-500">Total Tagihan</div>
            <div className="text-lg font-bold text-navy-900">{formatRupiah(amount)}</div>
          </div>
        )}

        {note && !result && !finalStatus && (
          <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-2.5 mb-4 text-xs font-medium">
            {note}
          </div>
        )}

        {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">{error}</div>}

        {finalStatus ? (
          <div className="text-center py-3">
            <PaymentStatusIcon status={finalStatus.status} />
            {finalStatus.status === 'success' ? (
              <>
                <div className="font-bold text-navy-900">Pembayaran Berhasil!</div>
                {finalStatus.paidAt && (
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(finalStatus.paidAt).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} WIB
                  </p>
                )}
              </>
            ) : (
              <>
                <div className="font-bold text-navy-900">Pembayaran Gagal</div>
                <p className="text-xs text-gray-400 mt-1">Silakan coba lagi atau gunakan metode pembayaran lain.</p>
                <button
                  onClick={() => { setResult(null); setFinalStatus(null) }}
                  className="mt-4 w-full flex items-center justify-center gap-2 bg-navy-900 hover:bg-navy-800 text-white font-semibold text-sm px-4 py-2.5 rounded-2xl"
                >
                  Coba Lagi
                </button>
              </>
            )}
          </div>
        ) : result ? (
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
            {pollStatus && (
              <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                <Loader2 size={12} className="animate-spin" /> Menunggu konfirmasi pembayaran otomatis...
              </div>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancel}
                disabled={loading}
                className="flex-1 text-sm font-semibold text-red-500 hover:text-red-600 py-2 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={() => onDone?.(result)}
                disabled={loading}
                className="flex-1 text-sm font-semibold text-gray-500 hover:text-navy-700 py-2 disabled:opacity-50"
              >
                Nanti Saja, Tutup
              </button>
            </div>
          </div>
        ) : amount === 0 ? (
          <>
            <p className="text-sm text-gray-500 text-center mb-4">Beasiswa 100% — tidak ada yang perlu dibayar.</p>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-navy-900 hover:bg-navy-800 text-white font-semibold text-sm px-4 py-3 rounded-2xl disabled:opacity-50"
            >
              {loading && <Loader2 size={15} className="animate-spin" />} Konfirmasi (Gratis)
            </button>
          </>
        ) : (
          <>
            <label className="block text-xs font-semibold text-gray-500 mb-2">Pilih Metode Pembayaran</label>
            <div className="space-y-2 mb-5 max-h-64 overflow-y-auto pr-1">
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
              className="w-full flex items-center justify-center gap-2 bg-navy-900 hover:bg-navy-800 text-white font-semibold text-sm px-4 py-3 rounded-2xl disabled:opacity-50"
            >
              {loading && <Loader2 size={15} className="animate-spin" />} Buat Tagihan
            </button>
          </>
        )}
      </div>
    </div>
  )
}
