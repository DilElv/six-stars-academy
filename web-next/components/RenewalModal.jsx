'use client'

import { useEffect, useState } from 'react'
import { X, RefreshCw, Loader2, ReceiptText, Check, CreditCard } from 'lucide-react'
import * as api from '@/lib/api'
import ModalPortal from '@/components/ui/modal-portal'
import PaymentMethodModal from '@/components/PaymentMethodModal'

function formatRupiah(n) {
  return 'Rp' + (Number(n) || 0).toLocaleString('id-ID')
}

// Parent memperpanjang paket anaknya DAN langsung membayarnya di sini.
//
// Dua kondisi:
//  - Ada tagihan dari admin/head coach yang belum dibayar: yang ditampilkan
//    adalah tagihan itu beserta nominal yang sudah ditetapkan admin — parent
//    tidak membuat tagihan kedua, hanya membayar tagihan yang sama.
//  - Belum ada tagihan: parent memilih paket sendiri, tagihannya langsung
//    dibuat lalu dibayar di layar yang sama.
//
// Begitu gateway mengonfirmasi, pembayaran berstatus lunas, paket/sesi otomatis
// diperpanjang, dan langsung tercatat di laporan Keuangan admin — tanpa langkah
// verifikasi admin.
export default function RenewalModal({ onClose, onDone }) {
  const [loading, setLoading] = useState(true)
  const [packages, setPackages] = useState([])
  const [selectedPackage, setSelectedPackage] = useState(null)
  const [scholarshipPercent, setScholarshipPercent] = useState(0)
  const [openItems, setOpenItems] = useState([])
  const [pendingPayment, setPendingPayment] = useState(null)
  const [payOpen, setPayOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState('')
  const openTotal = openItems.reduce((sum, i) => sum + i.amount, 0)
  const hasOpenPackage = openItems.some((i) => i.type === 'package')

  function load() {
    setError('')
    return Promise.all([
      api.getMyCart().catch(() => ({ items: [] })),
      api.getMyChild().catch(() => null),
      api.getMyPayments().catch(() => []),
    ]).then(([cart, child, payments]) => {
      // Semua item yang belum dibayar (tagihan dari admin/head coach, termasuk
      // keterangan & nominal yang mereka tetapkan) ditampilkan apa adanya.
      setOpenItems(cart?.items || [])
      setPendingPayment((payments || []).find((p) => p.status === 'pending' && p.paymentType === 'cart') || null)
      setScholarshipPercent(child?.sppScholarshipPercent || 0)
      // "Anak lama" dengan paket custom (Package.isCustom) tidak pernah memilih
      // dari katalog standar — hanya paket miliknya sendiri yang ditawarkan.
      if (child?.customPackage) return setPackages([child.customPackage])
      return api.getPackages(child?.branchId).then(setPackages).catch(() => setPackages([]))
    }).catch((err) => setError(err.message))
  }

  useEffect(() => {
    setLoading(true)
    load().finally(() => setLoading(false))
  }, [])

  // Harga khusus (paket custom) adalah harga final; paket katalog dapat
  // dipotong beasiswa SPP — sama persis dengan perhitungan server.
  function priceFor(pkg) {
    if (pkg.isCustom) return { final: pkg.price, discount: 0 }
    const discount = scholarshipPercent > 0 ? Math.round(pkg.price * scholarshipPercent / 100) : 0
    return { final: pkg.price - discount, discount }
  }

  // Membuat tagihannya lebih dulu supaya nominal yang ditampilkan pada layar
  // pembayaran persis angka yang dihitung server (bukan tebakan frontend).
  async function startSelfService() {
    if (!selectedPackage) return
    setBusy(true)
    setError('')
    try {
      await api.addCartItem({ type: 'package', packageId: selectedPackage.id })
      const cart = await api.getMyCart()
      setOpenItems(cart?.items || [])
      setPayOpen(true)
    } catch (err) {
      setError(err.message || 'Gagal membuat tagihan perpanjangan')
    } finally {
      setBusy(false)
    }
  }

  async function checkPendingStatus() {
    if (!pendingPayment) return
    setSyncing(true)
    setError('')
    try {
      const res = await api.syncPayment(pendingPayment.id)
      if (res?.status === 'success') return onDone?.()
      setError('Pembayaran belum terkonfirmasi. Kalau sudah membayar, tunggu sebentar lalu cek lagi.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSyncing(false)
    }
  }

  async function cancelPending() {
    if (!pendingPayment) return
    setBusy(true)
    setError('')
    try {
      await api.cancelPayment(pendingPayment.id)
      setPendingPayment(null)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (payOpen) {
    return (
      <PaymentMethodModal
        title="Pembayaran Tagihan"
        amount={openTotal}
        note="Setelah pembayaran berhasil, paket otomatis diperpanjang dan tercatat di laporan Keuangan."
        onConfirm={(paymentMethod) => api.checkoutCart(paymentMethod)}
        pollStatus={(res) => (res?.payment?.id ? api.syncPayment(res.payment.id) : { status: 'pending' })}
        onClose={() => { setPayOpen(false); load() }}
        onDone={() => { setPayOpen(false); onDone?.() }}
      />
    )
  }

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/60" onClick={onClose} />
        <div className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full max-h-[85vh] overflow-y-auto p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <RefreshCw size={16} className="text-navy-700" />
              <h3 className="font-bold text-navy-900 text-sm">Perpanjang Paket</h3>
            </div>
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>

          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">{error}</div>}

          {loading ? (
            <div className="text-sm text-gray-400 py-8 text-center flex items-center justify-center gap-2">
              <Loader2 size={15} className="animate-spin" /> Memuat...
            </div>
          ) : pendingPayment ? (
            <div className="text-center py-2">
              <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-3">
                <CreditCard size={24} className="text-amber-600" />
              </div>
              <h4 className="font-bold text-navy-900">Pembayaran Belum Selesai</h4>
              <p className="text-sm text-gray-500 mt-1">
                {formatRupiah(pendingPayment.totalAmount)} — menunggu konfirmasi gateway.
              </p>
              <p className="text-xs text-gray-400 mt-1">Selesaikan atau batalkan dulu sebelum membuat tagihan baru.</p>
              {(pendingPayment.paymentLink || pendingPayment.qrString) && (
                <a
                  href={pendingPayment.paymentLink || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 w-full flex items-center justify-center gap-2 bg-navy-900 hover:bg-navy-800 text-white font-semibold text-sm px-4 py-2.5 rounded-2xl"
                >
                  Buka Halaman Pembayaran
                </a>
              )}
              <button
                onClick={checkPendingStatus}
                disabled={syncing || busy}
                className="mt-2 w-full flex items-center justify-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-navy-700 font-semibold text-sm px-4 py-2.5 rounded-2xl disabled:opacity-50"
              >
                {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Cek Status Pembayaran
              </button>
              <button
                onClick={cancelPending}
                disabled={busy || syncing}
                className="mt-2 w-full text-sm font-semibold text-red-600 hover:text-red-700 py-2 disabled:opacity-50"
              >
                Batalkan Pembayaran
              </button>
            </div>
          ) : (
            <>
              {openItems.length > 0 && (
                <div className="rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3 mb-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-700">
                      <ReceiptText size={12} /> Tagihan Belum Dibayar
                    </div>
                    <div className="text-sm font-bold text-navy-900 tabular-nums">{formatRupiah(openTotal)}</div>
                  </div>
                  <div className="mt-2 space-y-2">
                    {openItems.map((it) => (
                      <div key={it.id} className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-navy-900 text-sm">{it.label}</div>
                          {it.metadata?.note && (
                            <div className="text-xs text-gray-500 mt-0.5">Keterangan: {it.metadata.note}</div>
                          )}
                        </div>
                        <div className="font-semibold text-navy-900 text-sm tabular-nums shrink-0">{formatRupiah(it.amount)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {hasOpenPackage ? (
                <p className="text-xs text-gray-400 mb-4">
                  Perpanjangan paket sudah ada di tagihan di atas. Selesaikan pembayarannya dulu sebelum mengajukan perpanjangan baru.
                </p>
              ) : (
                <>
                  <label className="block text-xs font-semibold text-gray-500 mb-2">
                    {openItems.length > 0 ? 'Tambah Perpanjangan Paket (opsional)' : 'Pilih Paket'}
                  </label>
                  <div className="space-y-2 mb-5 max-h-72 overflow-y-auto pr-1">
                    {packages.length === 0 && <div className="text-sm text-gray-400 py-4 text-center">Belum ada paket tersedia.</div>}
                    {packages.map((pkg) => {
                      const { final, discount } = priceFor(pkg)
                      const active = selectedPackage?.id === pkg.id
                      return (
                        <button
                          key={pkg.id}
                          onClick={() => setSelectedPackage(active ? null : pkg)}
                          className={`w-full text-left px-4 py-3 rounded-2xl border transition-colors duration-150 ${
                            active ? 'border-gold-400 bg-gold-50' : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="font-semibold text-navy-900 text-sm flex items-center gap-1.5">
                            {pkg.name}{active && <Check size={13} className="text-gold-500" />}
                          </div>
                          {discount > 0 ? (
                            <div className="text-xs mt-0.5">
                              <span className="text-gray-400">{pkg.sessionsPerWeek}x/minggu &middot; </span>
                              <span className="text-gray-400 line-through">{formatRupiah(pkg.price)}</span>{' '}
                              <span className="text-emerald-600 font-semibold">{formatRupiah(final)}</span>
                              <div className="text-emerald-600">Beasiswa {scholarshipPercent}% — Hemat {formatRupiah(discount)}</div>
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400">{pkg.sessionsPerWeek}x/minggu &middot; {formatRupiah(final)}</div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}

              <p className="text-[11px] text-gray-400 mb-3">
                Setelah pembayaran berhasil, paket otomatis diperpanjang dan tercatat langsung di laporan Keuangan.
              </p>
              <button
                onClick={selectedPackage ? startSelfService : () => setPayOpen(true)}
                disabled={busy || (!selectedPackage && openItems.length === 0)}
                className="w-full flex items-center justify-center gap-2 bg-navy-900 hover:bg-navy-800 text-white font-semibold text-sm px-4 py-3 rounded-2xl disabled:opacity-50"
              >
                {busy ? <Loader2 size={15} className="animate-spin" /> : <CreditCard size={15} />}
                {selectedPackage ? 'Bayar Sekarang' : `Bayar Tagihan${openTotal > 0 ? ` (${formatRupiah(openTotal)})` : ''}`}
              </button>
            </>
          )}
        </div>
      </div>
    </ModalPortal>
  )
}
