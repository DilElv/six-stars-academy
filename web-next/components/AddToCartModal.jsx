'use client'

import { useEffect, useState } from 'react'
import { X, ShoppingCart, Loader2, Trash2, Plus, Pencil, Check, Banknote } from 'lucide-react'
import * as api from '@/lib/api'
import ModalPortal from '@/components/ui/modal-portal'
import { AppSelect } from '@/components/ui/app-select'
import { RupiahInput } from '@/components/ui/rupiah-input'
import MerchCustomForm, { missingRequired } from '@/components/MerchCustomForm'

const TYPES = [
  { value: 'package', label: 'Perpanjangan Paket' },
  { value: 'package_custom', label: 'Perpanjangan Paket (Harga Khusus)' },
  { value: 'bpjs', label: 'BPJS' },
  { value: 'merchandise', label: 'Merchandise' },
]

const MANUAL_METHODS = [
  { value: 'cash', label: 'Tunai (Cash)' },
  { value: 'transfer_manual', label: 'Transfer Manual' },
  { value: 'lainnya', label: 'Lainnya' },
]

function formatRupiah(n) {
  return 'Rp' + (Number(n) || 0).toLocaleString('id-ID')
}

// Admin/head_coach titip tagihan ke keranjang anak supaya parent tinggal
// checkout sekali (bisa beberapa item sekaligus; tiap item masuk kategori
// pemasukan tersendiri di Keuangan). Perpanjangan paket & merchandise dipilih
// dari katalog; BPJS dan "Harga Khusus" dicatat manual dengan keterangan.
export default function AddToCartModal({ student, packages = [], onClose, onSaved }) {
  const [cart, setCart] = useState(null)
  const [products, setProducts] = useState([])
  const [type, setType] = useState('package')
  const [packageId, setPackageId] = useState('')
  const [productId, setProductId] = useState('')
  const [customValues, setCustomValues] = useState({})
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState(0)
  const [note, setNote] = useState('')
  const [customName, setCustomName] = useState('')
  const [customSessions, setCustomSessions] = useState('1')
  const [customDuration, setCustomDuration] = useState('1')
  const [customPrice, setCustomPrice] = useState(0)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState('')
  const [error, setError] = useState('')
  const [selected, setSelected] = useState({})
  const [editItem, setEditItem] = useState(null)
  const [manualMethod, setManualMethod] = useState('cash')
  const [paying, setPaying] = useState(false)

  function load() {
    api.getStudentCart(student.id).then((res) => { setCart(res); setSelected(Object.fromEntries((res.items || []).map((i) => [i.id, true]))) }).catch((err) => setError(err.message))
  }

  useEffect(load, [student.id])
  useEffect(() => {
    // Public endpoint: active products only. AddToCartModal is also used by
    // head_coach, who cannot read the admin-only /products/all.
    api.getProducts().then((list) => setProducts(list)).catch(() => {})
  }, [])

  function resetForm() {
    setLabel('')
    setAmount(0)
    setNote('')
    setPackageId('')
    setProductId('')
    setCustomValues({})
    setCustomName('')
    setCustomSessions('1')
    setCustomDuration('1')
    setCustomPrice(0)
  }

  async function handleAdd(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      let payload
      if (type === 'package') payload = { studentId: student.id, type, packageId, note }
      else if (type === 'package_custom') {
        payload = {
          studentId: student.id,
          type: 'package',
          note,
          customPackage: { name: customName.trim(), sessionsPerWeek: Number(customSessions) || 1, durationMonths: Number(customDuration) || 1, price: Number(customPrice) || 0 },
        }
      } else if (type === 'merchandise') payload = { studentId: student.id, type, productId, note, custom: customValues }
      else payload = { studentId: student.id, type, label, amount, note }

      await api.addCartItem(payload)
      resetForm()
      load()
      onSaved?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove(id) {
    setRemoving(id)
    setError('')
    try {
      await api.deleteCartItem(id)
      load()
      onSaved?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setRemoving('')
    }
  }

  async function handleEditSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.updateCartItem(editItem.id, { label: editItem.label, amount: Number(editItem.amount) || 0, note: editItem.note })
      setEditItem(null)
      load()
      onSaved?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleMarkPaid() {
    const itemIds = items.filter((i) => selected[i.id]).map((i) => i.id)
    if (itemIds.length === 0) return setError('Pilih dulu tagihan yang sudah dibayar')
    setPaying(true)
    setError('')
    try {
      await api.markCartPaid({ studentId: student.id, itemIds, paymentMethod: manualMethod })
      load()
      onSaved?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setPaying(false)
    }
  }

  const items = cart?.items || []
  const total = cart?.total || 0
  const selectedProduct = products.find((p) => p.id === productId)
  const selectedCount = items.filter((i) => selected[i.id]).length
  const canSubmit = type === 'package' ? !!packageId
    : type === 'package_custom' ? !!customName.trim() && customPrice > 0
    : type === 'merchandise' ? !!productId && !missingRequired(selectedProduct, customValues)
    : !!label.trim()

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[210] flex items-center justify-center p-4" onClick={onClose}>
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[88vh] overflow-y-auto modal-scroll p-5" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <ShoppingCart size={16} className="text-navy-700" />
              <h3 className="font-bold text-navy-900 text-sm">Keranjang {student.fullName}</h3>
            </div>
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X size={18} /></button>
          </div>
          <p className="text-xs text-gray-400 mb-4">Item di sini belum dihitung sebagai pendapatan. Parent membayarnya lewat satu checkout.</p>

          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">{error}</div>}

          <div className="text-xs font-semibold text-gray-500 mb-1.5">Tagihan Belum Dibayar</div>
          {items.length === 0 ? (
            <div className="text-sm text-gray-400 bg-gray-50 rounded-2xl px-3.5 py-3">Belum ada tagihan.</div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="bg-gray-50 rounded-2xl px-3.5 py-2.5">
                  {editItem?.id === item.id ? (
                    <form onSubmit={handleEditSave} className="space-y-2">
                      <input value={editItem.label} onChange={(e) => setEditItem({ ...editItem, label: e.target.value })} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm" />
                      <div className="grid grid-cols-2 gap-2">
                        <RupiahInput value={editItem.amount} onChange={(n) => setEditItem({ ...editItem, amount: n })} className="w-full" />
                        <input value={editItem.note || ''} onChange={(e) => setEditItem({ ...editItem, note: e.target.value })} placeholder="Keterangan" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm" />
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-1.5 bg-navy-900 text-white text-xs font-semibold px-3 py-2 rounded-xl disabled:opacity-50">
                          {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Simpan
                        </button>
                        <button type="button" onClick={() => setEditItem(null)} className="flex-1 text-xs font-semibold text-gray-500 hover:text-navy-700 px-3 py-2">Batal</button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!selected[item.id]}
                        onChange={(e) => setSelected({ ...selected, [item.id]: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-navy-900 truncate">{item.label}</div>
                        <div className="text-[11px] text-gray-400 truncate">
                          {item.category}
                          {item.metadata?.note ? ` · ${item.metadata.note}` : ''}
                          {item.addedBy && item.addedBy.role !== 'parent' ? ` · ditambahkan ${item.addedBy.role === 'admin' ? 'admin' : 'head coach'}` : ''}
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-navy-900 tabular-nums shrink-0">{formatRupiah(item.amount)}</span>
                      <button onClick={() => setEditItem({ id: item.id, label: item.label, amount: item.amount, note: item.metadata?.note || '' })} className="p-1.5 text-gray-400 hover:text-navy-600 hover:bg-white rounded-lg">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => handleRemove(item.id)} disabled={removing === item.id} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50">
                        {removing === item.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                      </button>
                    </div>
                  )}
                </div>
              ))}
              <div className="flex justify-between px-1 pt-1 text-sm">
                <span className="text-gray-500">Total</span>
                <span className="font-bold text-navy-900 tabular-nums">{formatRupiah(total)}</span>
              </div>
              <div className="rounded-2xl border border-gray-200 p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500">
                  <Banknote size={12} /> Sudah dibayar tunai / transfer pribadi? Tandai lunas langsung
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <AppSelect value={manualMethod} onChange={setManualMethod} className="w-full" options={MANUAL_METHODS} />
                  <button
                    type="button"
                    onClick={handleMarkPaid}
                    disabled={paying || selectedCount === 0}
                    className="flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold px-3 py-2 rounded-xl disabled:opacity-50"
                  >
                    {paying ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Lunas ({selectedCount})
                  </button>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleAdd} className="mt-5 space-y-3 border-t border-gray-100 pt-4">
            <div className="text-xs font-semibold text-gray-500">Tambah Tagihan</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500">Jenis</label>
                <AppSelect value={type} onChange={(v) => setType(v || 'package')} className="w-full" options={TYPES} />
              </div>
              {type === 'package' && (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-500">Paket</label>
                  <AppSelect
                    value={packageId}
                    onChange={setPackageId}
                    placeholder="Pilih paket"
                    className="w-full"
                    options={packages.map((p) => ({ value: p.id, label: `${p.name} (${p.sessionsPerWeek}x)` }))}
                  />
                </div>
              )}
              {type === 'merchandise' && (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-500">Produk</label>
                  <AppSelect
                    value={productId}
                    onChange={(v) => { setProductId(v); setCustomValues({}) }}
                    placeholder="Pilih produk"
                    className="w-full"
                    options={products.map((p) => ({ value: p.id, label: `${p.name} · ${formatRupiah(p.price)}` }))}
                  />
                </div>
              )}
              {type === 'bpjs' && (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-500">Nominal (Rp)</label>
                  <RupiahInput value={amount} onChange={setAmount} className="w-full" />
                </div>
              )}
            </div>

            {type === 'merchandise' && selectedProduct?.customFields?.length > 0 && (
              <div className="rounded-2xl bg-gray-50 p-3">
                <div className="text-xs font-bold text-navy-800 mb-2">Detail pesanan {selectedProduct.name}</div>
                <MerchCustomForm product={selectedProduct} values={customValues} onChange={setCustomValues} />
              </div>
            )}

            {type === 'package_custom' && (
              <div className="space-y-3 rounded-2xl bg-gray-50 p-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-500">Nama Paket</label>
                  <input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="mis. Paket Lama 1x/minggu" className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2.5 text-sm" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-500">Sesi/mgg</label>
                    <input type="number" min={1} value={customSessions} onChange={(e) => setCustomSessions(e.target.value)} className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2.5 text-sm" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-500">Durasi</label>
                    <input type="number" min={1} value={customDuration} onChange={(e) => setCustomDuration(e.target.value)} className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2.5 text-sm" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-500">Harga</label>
                    <RupiahInput value={customPrice} onChange={setCustomPrice} className="w-full" />
                  </div>
                </div>
                <p className="text-[11px] text-gray-400">Harga khusus tersimpan untuk anak ini dan dipakai ulang pada perpanjangan berikutnya.</p>
              </div>
            )}

            {(type === 'bpjs' || type === 'package_custom' || type === 'package' || type === 'merchandise') && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500">Keterangan (opsional)</label>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="mis. Cash, Transfer Manual, Anak Berprestasi"
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm"
                />
              </div>
            )}

            {type === 'bpjs' && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500">Nama Item</label>
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="BPJS bulan Oktober"
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm"
                />
              </div>
            )}
            {type === 'merchandise' && products.length === 0 && (
              <p className="text-xs text-gray-400">Belum ada produk aktif di katalog. Tambahkan dulu di menu Toko.</p>
            )}
            <button
              type="submit"
              disabled={saving || !canSubmit}
              className="w-full flex items-center justify-center gap-2 bg-navy-900 hover:bg-navy-800 text-white font-semibold text-sm px-4 py-2.5 rounded-2xl disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Tambah ke Keranjang
            </button>
          </form>
        </div>
      </div>
    </ModalPortal>
  )
}
