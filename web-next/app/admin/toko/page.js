'use client'

import { useEffect, useState } from 'react'
import { Store, Plus, Pencil, Trash2, Loader2, ImagePlus, X, Package } from 'lucide-react'
import * as api from '@/lib/api'
import ModalPortal from '@/components/ui/modal-portal'
import { AppSelect } from '@/components/ui/app-select'
import { RupiahInput } from '@/components/ui/rupiah-input'

const CATEGORIES = [
  { value: 'Jersey', label: 'Jersey' },
  { value: 'Aksesori', label: 'Aksesori' },
  { value: 'Lainnya', label: 'Lainnya' },
]

function formatRupiah(n) {
  return 'Rp' + (Number(n) || 0).toLocaleString('id-ID')
}

function stockLabel(stock) {
  if (stock === null || stock === undefined) return 'Stok tak terbatas'
  if (stock <= 0) return 'Stok habis'
  return `Stok ${stock}`
}

export default function AdminTokoPage() {
  const [products, setProducts] = useState(null)
  const [editTarget, setEditTarget] = useState(null) // null | 'new' | product
  const [error, setError] = useState('')

  function load() {
    api.getAllProducts().then(setProducts).catch((err) => setError(err.message))
  }

  useEffect(load, [])

  async function handleDelete(product) {
    if (!confirm(`Hapus produk "${product.name}"?`)) return
    setError('')
    try {
      await api.deleteProduct(product.id)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  if (!products) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-navy-600 to-navy-800 shadow-md shadow-navy-900/25 flex items-center justify-center shrink-0">
            <Store size={18} className="text-gold-300" />
          </div>
          <div>
            <h1 className="font-bold text-navy-900 text-lg">Katalog Merchandise</h1>
            <p className="text-sm text-gray-400">{products.length} produk · tampil di halaman Toko parent</p>
          </div>
        </div>
        <button
          onClick={() => setEditTarget('new')}
          className="flex items-center gap-1.5 bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shrink-0"
        >
          <Plus size={15} /> Tambah Produk
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-2xl p-3 text-sm text-red-600">{error}</div>}

      {products.length === 0 ? (
        <div className="glass-card rounded-3xl p-10 text-center">
          <Package size={28} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Belum ada produk. Klik &quot;Tambah Produk&quot; untuk mulai mengisi katalog.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((p) => (
            <div key={p.id} className="glass-card rounded-3xl overflow-hidden flex flex-col">
              <div className="relative aspect-square bg-navy-50">
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImagePlus size={22} className="text-navy-200" />
                  </div>
                )}
                {!p.isActive && (
                  <span className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-black/60 text-white">
                    Nonaktif
                  </span>
                )}
                <div className="absolute top-2 right-2 flex gap-1">
                  <button onClick={() => setEditTarget(p)} className="p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/75">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => handleDelete(p)} className="p-1.5 rounded-lg bg-black/60 text-white hover:bg-red-600">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <div className="p-3 flex-1 flex flex-col">
                <div className="text-xs font-semibold text-gray-400">{p.category}</div>
                <div className="font-semibold text-navy-900 text-sm leading-snug mt-0.5 line-clamp-2">{p.name}</div>
                <div className="mt-auto pt-2 flex items-center justify-between gap-2">
                  <span className="font-bold text-navy-900 tabular-nums text-sm">{formatRupiah(p.price)}</span>
                  <span className="text-[11px] text-gray-400">{stockLabel(p.stock)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editTarget && (
        <ProductModal
          product={editTarget === 'new' ? null : editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => { setEditTarget(null); load() }}
        />
      )}
    </div>
  )
}

function ProductModal({ product, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: product?.name || '',
    category: product?.category || 'Jersey',
    price: product?.price || 0,
    stock: product?.stock ?? '',
    description: product?.description || '',
    imageUrl: product?.imageUrl || '',
    isActive: product ? product.isActive : true,
  })
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const categoryOptions = CATEGORIES.some((c) => c.value === form.category)
    ? CATEGORIES
    : [{ value: form.category, label: form.category }, ...CATEGORIES]

  async function handleUpload(file) {
    setUploading(true)
    setError('')
    try {
      const url = await api.uploadFile(file)
      setForm((f) => ({ ...f, imageUrl: url }))
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = {
        name: form.name,
        category: form.category,
        price: form.price,
        stock: form.stock === '' ? null : Number(form.stock),
        description: form.description,
        imageUrl: form.imageUrl,
        isActive: form.isActive,
      }
      if (product) await api.updateProduct(product.id, payload)
      else await api.createProduct(payload)
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[88vh] overflow-y-auto modal-scroll p-5" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-navy-900 text-sm">{product ? 'Edit Produk' : 'Tambah Produk'}</h3>
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X size={18} /></button>
          </div>

          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">{error}</div>}

          <form onSubmit={submit} className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-navy-50 shrink-0 flex items-center justify-center">
                {form.imageUrl ? (
                  <img src={form.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : uploading ? (
                  <Loader2 size={18} className="animate-spin text-navy-300" />
                ) : (
                  <ImagePlus size={18} className="text-navy-200" />
                )}
              </div>
              <div className="flex-1">
                <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold text-navy-700 border border-gray-200 hover:border-gold-300 rounded-xl px-3 py-2">
                  <ImagePlus size={13} /> {form.imageUrl ? 'Ganti Foto' : 'Unggah Foto'}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files[0] && handleUpload(e.target.files[0])} />
                </label>
                <p className="text-[11px] text-gray-400 mt-1">Opsional. JPG/PNG.</p>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">Nama Produk</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="mis. Jersey Home 2026"
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500">Kategori</label>
                <AppSelect value={form.category} onChange={(v) => setForm((f) => ({ ...f, category: v || 'Lainnya' }))} className="w-full" options={categoryOptions} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500">Harga (Rp)</label>
                <RupiahInput value={form.price} onChange={(v) => setForm((f) => ({ ...f, price: v }))} className="w-full" />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">Stok (kosongkan bila tak terbatas)</label>
              <input
                type="number"
                min="0"
                value={form.stock}
                onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                placeholder="Tak terbatas"
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">Deskripsi</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
                placeholder="Keterangan singkat (opsional)"
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm resize-none"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-navy-800">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} className="rounded" />
              Tampilkan di katalog parent
            </label>

            <button
              type="submit"
              disabled={saving || uploading || !form.name.trim()}
              className="w-full flex items-center justify-center gap-2 bg-navy-900 hover:bg-navy-800 text-white font-semibold text-sm px-4 py-2.5 rounded-2xl disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : null} {product ? 'Simpan Perubahan' : 'Tambah Produk'}
            </button>
          </form>
        </div>
      </div>
    </ModalPortal>
  )
}
