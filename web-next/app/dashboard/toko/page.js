'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Store, ShoppingCart, Loader2, Check, Package, ImagePlus } from 'lucide-react'
import * as api from '@/lib/api'
import ModalPortal from '@/components/ui/modal-portal'
import MerchCustomForm, { missingRequired } from '@/components/MerchCustomForm'

function formatRupiah(n) {
  return 'Rp' + (Number(n) || 0).toLocaleString('id-ID')
}

export default function TokoPage() {
  const [products, setProducts] = useState(null)
  const [adding, setAdding] = useState('')
  const [added, setAdded] = useState('')
  const [error, setError] = useState('')
  const [customTarget, setCustomTarget] = useState(null)
  const [customValues, setCustomValues] = useState({})
  const [modalError, setModalError] = useState('')

  useEffect(() => {
    api.getProducts().then(setProducts).catch((err) => setError(err.message))
  }, [])

  function startAdd(product) {
    if (product.customFields?.length) {
      setCustomValues({})
      setModalError('')
      setCustomTarget(product)
    } else {
      handleAdd(product)
    }
  }

  async function handleAdd(product, custom) {
    setAdding(product.id)
    setError('')
    setModalError('')
    try {
      await api.addCartItem({ type: 'merchandise', productId: product.id, custom })
      setAdded(product.id)
      setCustomTarget(null)
      setTimeout(() => setAdded((cur) => (cur === product.id ? '' : cur)), 2500)
    } catch (err) {
      if (custom) setModalError(err.message)
      else setError(err.message)
    } finally {
      setAdding('')
    }
  }

  if (!products) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-bold text-navy-900 text-lg flex items-center gap-2"><Store size={18} /> Toko Merchandise</h1>
          <p className="text-sm text-gray-400 mt-0.5">Pilih merchandise, lalu checkout bersama perpanjangan paket dalam satu pembayaran.</p>
        </div>
        <Link
          href="/dashboard/keranjang"
          className="flex items-center gap-1.5 bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold px-4 py-2 rounded-2xl"
        >
          <ShoppingCart size={14} /> Keranjang
        </Link>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}

      {products.length === 0 ? (
        <div className="glass-card rounded-3xl p-10 text-center">
          <Package size={28} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Katalog merchandise belum tersedia.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {products.map((p) => {
            const soldOut = p.stock !== null && p.stock !== undefined && p.stock <= 0
            const isAdded = added === p.id
            return (
              <div key={p.id} className="glass-card rounded-3xl overflow-hidden flex flex-col">
                <div className="relative aspect-square bg-navy-50">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImagePlus size={22} className="text-navy-200" />
                    </div>
                  )}
                  {soldOut && (
                    <span className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-black/60 text-white">
                      Stok habis
                    </span>
                  )}
                </div>
                <div className="p-3 flex-1 flex flex-col">
                  <div className="text-xs font-semibold text-gray-400">{p.category}</div>
                  <div className="font-semibold text-navy-900 text-sm leading-snug mt-0.5 line-clamp-2">{p.name}</div>
                  {p.description && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{p.description}</p>}
                  <div className="mt-auto pt-3">
                    <div className="font-bold text-navy-900 tabular-nums mb-2">{formatRupiah(p.price)}</div>
                    <button
                      onClick={() => startAdd(p)}
                      disabled={soldOut || adding === p.id || isAdded}
                      className={`w-full flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2.5 rounded-2xl transition-colors ${
                        soldOut
                          ? 'bg-gray-100 text-gray-400'
                          : isAdded
                          ? 'bg-emerald-500 text-white'
                          : 'bg-gold-400 hover:bg-gold-500 text-navy-900'
                      } disabled:opacity-100`}
                    >
                      {adding === p.id ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : isAdded ? (
                        <Check size={13} />
                      ) : (
                        <ShoppingCart size={13} />
                      )}
                      {soldOut ? 'Stok Habis' : isAdded ? 'Masuk Keranjang' : p.customFields?.length ? 'Pilih & Pesan' : 'Tambah ke Keranjang'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {customTarget && (
        <ModalPortal>
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={() => setCustomTarget(null)}>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[88vh] overflow-y-auto modal-scroll p-5" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-bold text-navy-900 text-sm">{customTarget.name}</h3>
              <p className="text-xs text-gray-400 mb-4">{formatRupiah(customTarget.price)} · isi detail pesanan di bawah</p>
              {modalError && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">{modalError}</div>}
              <MerchCustomForm product={customTarget} values={customValues} onChange={setCustomValues} />
              <div className="flex gap-2 mt-5">
                <button onClick={() => setCustomTarget(null)} className="flex-1 border border-gray-200 text-navy-700 text-sm font-semibold py-2.5 rounded-2xl">Batal</button>
                <button
                  onClick={() => handleAdd(customTarget, customValues)}
                  disabled={adding === customTarget.id || !!missingRequired(customTarget, customValues)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-gold-400 hover:bg-gold-500 text-navy-900 text-sm font-semibold py-2.5 rounded-2xl disabled:opacity-50"
                >
                  {adding === customTarget.id ? <Loader2 size={14} className="animate-spin" /> : <ShoppingCart size={14} />} Masukkan Keranjang
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  )
}
