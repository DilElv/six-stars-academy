'use client'

import { useEffect, useState } from 'react'
import { Loader2, Save } from 'lucide-react'
import * as api from '@/lib/api'
import { AppSelect } from '@/components/ui/app-select'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/lib/ledgerCategories'

export default function LedgerEntryModal({ type, entry, onClose, onSaved }) {
  const isEdit = !!entry
  const presetCategories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  const entryIsCustomCategory = entry?.category && !presetCategories.includes(entry.category)
  const [branches, setBranches] = useState([])
  const [form, setForm] = useState({
    category: entryIsCustomCategory ? 'Lainnya' : (entry?.category || ''),
    customCategory: entryIsCustomCategory ? entry.category : '',
    description: entry?.description || '',
    amount: entry?.amount ? String(entry.amount) : '',
    branchId: entry?.branchId || '',
    date: entry?.date ? new Date(entry.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { api.getBranches().then(setBranches).catch(() => {}) }, [])

  const categoryOptions = presetCategories.map((c) => ({ value: c, label: c }))

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const resolvedCategory = form.category === 'Lainnya' ? (form.customCategory.trim() || 'Lainnya') : form.category
      const payload = { type, category: resolvedCategory || null, description: form.description, amount: Number(form.amount), branchId: form.branchId || null, date: form.date }
      if (isEdit) {
        await api.updateLedgerEntry(entry.id, payload)
      } else {
        await api.createLedgerEntry(payload)
      }
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const isIncome = type === 'income'

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className={`p-5 rounded-t-3xl ${isIncome ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' : 'bg-gradient-to-br from-red-500 to-red-600'}`}>
          <h3 className="font-bold text-white">
            {isEdit ? 'Edit ' : 'Tambah '}
            {isIncome ? 'Pemasukan Manual' : 'Pengeluaran'}
          </h3>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Kategori</label>
            <AppSelect value={form.category} onChange={(v) => setForm((f) => ({ ...f, category: v }))} className="w-full" allLabel="- Pilih Kategori -" placeholder="- Pilih Kategori -" options={categoryOptions} />
            {form.category === 'Lainnya' && (
              <input
                required
                value={form.customCategory}
                onChange={(e) => setForm((f) => ({ ...f, customCategory: e.target.value }))}
                placeholder="Ketik nama kategori..."
                className="w-full mt-2 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm"
              />
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Deskripsi</label>
            <input required value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder={isIncome ? 'mis. Sponsor lokal' : 'mis. Beli minum & obat latihan'} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Nominal (Rp)</label>
            <input required type="number" min={1} value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Tanggal</label>
            <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Cabang (opsional)</label>
            <AppSelect value={form.branchId} onChange={(v) => setForm((f) => ({ ...f, branchId: v }))} className="w-full" allLabel="- Semua Cabang -" placeholder="- Semua Cabang -" options={branches.map((b) => ({ value: b.id, label: `${b.name} (${b.code})` }))} />
          </div>
          <button type="submit" disabled={saving} className={`w-full flex items-center justify-center gap-2 text-white font-bold py-2.5 rounded-2xl disabled:opacity-50 ${isIncome ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'}`}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Simpan
          </button>
        </form>
      </div>
    </div>
  )
}
