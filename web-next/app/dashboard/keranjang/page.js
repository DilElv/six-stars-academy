'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ShoppingCart, Trash2, Loader2, Package, HeartPulse, Shirt, Plus, CheckCircle2, ArrowRight, ExternalLink, XCircle } from 'lucide-react'
import * as api from '@/lib/api'
import PaymentMethodModal from '@/components/PaymentMethodModal'
import RenewalModal from '@/components/RenewalModal'
import ParentBpjsCard from '@/components/ParentBpjsCard'

const CATEGORY_ICON = {
  'Perpanjangan Paket': Package,
  BPJS: HeartPulse,
  Merchandise: Shirt,
}

const CATEGORY_STYLE = {
  'Perpanjangan Paket': 'bg-navy-50 text-navy-700 border-navy-100',
  BPJS: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  Merchandise: 'bg-amber-50 text-amber-700 border-amber-100',
}

function formatRupiah(n) {
  return 'Rp' + (Number(n) || 0).toLocaleString('id-ID')
}

export default function KeranjangPage() {
  const [cart, setCart] = useState(null)
  const [child, setChild] = useState(null)
  const [error, setError] = useState('')
  const [removing, setRemoving] = useState('')
  const [showRenewal, setShowRenewal] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [paid, setPaid] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [bpjsKey, setBpjsKey] = useState(0)

  function load() {
    api.getMyCart().then(setCart).catch((err) => setError(err.message))
    api.getMyChild().then(setChild).catch(() => {})
  }

  useEffect(load, [])

  async function handleRemove(id) {
    setRemoving(id)
    setError('')
    try {
      await api.deleteCartItem(id)
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setRemoving('')
    }
  }

  // Batalkan checkout yang menggantung: item kembali ke keranjang, tidak nyangkut.
  async function handleCancelPending() {
    if (!cart?.pendingPayment || !confirm('Batalkan pembayaran yang sedang menunggu? Item akan kembali ke keranjang.')) return
    setCancelling(true)
    setError('')
    try {
      await api.cancelPayment(cart.pendingPayment.id)
      load()
      setBpjsKey((k) => k + 1)
    } catch (err) {
      setError(err.message)
    } finally {
      setCancelling(false)
    }
  }

  if (!cart) return null
  const items = cart.items || []
  const total = cart.total || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-bold text-navy-900 text-lg flex items-center gap-2"><ShoppingCart size={18} /> Keranjang</h1>
          <p className="text-sm text-gray-400 mt-0.5">Gabungkan perpanjangan paket, BPJS, dan merchandise dalam satu pembayaran.</p>
        </div>
        <button
          onClick={() => setShowRenewal(true)}
          className="flex items-center gap-1.5 bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold px-4 py-2 rounded-2xl"
        >
          <Plus size={14} /> Tambah Paket
        </button>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}

      {cart.pendingPayment && !paid && (
        <div className="glass-card rounded-3xl p-4 sm:p-5 border-l-4 border-amber-400">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="font-bold text-navy-900 text-sm">Pembayaran menunggu ({formatRupiah(cart.pendingPayment.totalAmount)})</div>
              <p className="text-xs text-gray-500 mt-0.5">
                {(cart.pendingPayment.items || []).map((i) => i.label).join(', ') || 'Tagihan keranjang'} sudah di-checkout tetapi belum dibayar.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {cart.pendingPayment.paymentLink && (
                <a
                  href={cart.pendingPayment.paymentLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 bg-gold-400 hover:bg-gold-500 text-navy-900 text-sm font-semibold px-4 py-2 rounded-2xl"
                >
                  <ExternalLink size={14} /> Lanjutkan Bayar
                </a>
              )}
              <button
                onClick={handleCancelPending}
                disabled={cancelling}
                className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-semibold px-4 py-2 rounded-2xl disabled:opacity-50"
              >
                {cancelling ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />} Batalkan
              </button>
            </div>
          </div>
        </div>
      )}

      <ParentBpjsCard key={bpjsKey} onChanged={load} />

      {paid ? (
        <div className="glass-card rounded-3xl p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 size={26} className="text-emerald-600" />
          </div>
          <h3 className="font-bold text-navy-900">Pembayaran Berhasil</h3>
          <p className="text-sm text-gray-500 mt-1">Terima kasih! Semua item di keranjang sudah dibayar dan langsung diterapkan.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mt-4">
            <Link href="/dashboard/pembayaran" className="flex items-center gap-1.5 bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold px-4 py-2.5 rounded-2xl">
              Lihat Riwayat <ArrowRight size={14} />
            </Link>
            <button onClick={() => setPaid(false)} className="text-sm font-semibold text-gray-500 hover:text-navy-700 px-4 py-2.5">Kembali ke Keranjang</button>
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="glass-card rounded-3xl p-10 text-center">
          <ShoppingCart size={28} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Keranjang masih kosong.</p>
          <p className="text-xs text-gray-400 mt-1">Tambahkan perpanjangan paket, atau tunggu admin menambahkan item (BPJS / merchandise) untuk {child?.fullName || 'anak Anda'}.</p>
          <button
            onClick={() => setShowRenewal(true)}
            className="mt-4 inline-flex items-center gap-1.5 bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold px-4 py-2.5 rounded-2xl"
          >
            <Plus size={14} /> Tambah Paket
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {items.map((item) => {
              const Icon = CATEGORY_ICON[item.category] || ShoppingCart
              const style = CATEGORY_STYLE[item.category] || 'bg-gray-50 text-gray-600 border-gray-100'
              return (
                <div key={item.id} className="glass-card rounded-3xl p-4 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-navy-600 to-navy-800 text-gold-300 shadow-md shadow-navy-900/25 flex items-center justify-center shrink-0">
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-navy-900 text-sm truncate">{item.label}</div>
                    <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                      <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full border ${style}`}>{item.category}</span>
                      {item.metadata?.note && <span className="text-[11px] text-gray-400 truncate">{item.metadata.note}</span>}
                      {item.addedBy && item.addedBy.role !== 'parent' && (
                        <span className="text-[11px] text-navy-500">dari {item.addedBy.role === 'admin' ? 'admin' : 'head coach'}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-navy-900 tabular-nums">{formatRupiah(item.amount)}</div>
                    <button
                      onClick={() => handleRemove(item.id)}
                      disabled={removing === item.id}
                      className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-600 disabled:opacity-50"
                    >
                      {removing === item.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Hapus
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="glass-card rounded-3xl p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Total ({items.length} item)</span>
              <span className="text-xl font-bold text-navy-900 tabular-nums">{formatRupiah(total)}</span>
            </div>
            <button
              onClick={() => setPayOpen(true)}
              className="mt-4 w-full flex items-center justify-center gap-2 bg-gold-400 hover:bg-gold-500 text-navy-900 font-semibold text-sm px-4 py-3 rounded-2xl"
            >
              Checkout & Bayar
            </button>
          </div>
        </>
      )}

      {showRenewal && (
        <RenewalModal onClose={() => setShowRenewal(false)} onDone={() => { setShowRenewal(false); load() }} />
      )}

      {payOpen && (
        <PaymentMethodModal
          title="Checkout Keranjang"
          amount={total}
          onConfirm={(paymentMethod) => api.checkoutCart(paymentMethod)}
          onClose={() => setPayOpen(false)}
          onDone={(result) => {
            setPayOpen(false)
            if (result?.status === 'success' || result?.payment?.status === 'success') setPaid(true)
            load()
          }}
          pollStatus={(res) => (res?.payment?.id ? api.syncPayment(res.payment.id) : { status: 'pending' })}
        />
      )}
    </div>
  )
}
