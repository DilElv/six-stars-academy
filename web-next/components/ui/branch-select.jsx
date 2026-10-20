'use client'

import { useState } from 'react'
import { Loader2, Plus, X } from 'lucide-react'
import * as api from '@/lib/api'
import { AppSelect } from './app-select'

const NEW = '__new_branch__'

/**
 * AppSelect untuk cabang + opsi "ketik manual": mengetik nama cabang yang belum
 * ada membuat cabang sungguhan lewat API (kode otomatis), lalu langsung
 * dipilih. `options` = [{ value: branchId, label }] seperti AppSelect biasa;
 * `onCreated(branch)` opsional agar induk bisa menambahkan cabang baru ke
 * daftar miliknya.
 */
export function BranchSelect({ value, onChange, options, onCreated, allowCreate = true, ...rest }) {
  const [extra, setExtra] = useState([])
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const known = new Set(options.map((opt) => opt.value))
  const merged = [
    ...options,
    ...extra.filter((opt) => !known.has(opt.value)),
    ...(allowCreate ? [{ value: NEW, label: '+ Cabang baru (ketik manual)' }] : []),
  ]

  async function create() {
    setSaving(true)
    setError('')
    try {
      const branch = await api.quickCreateBranch(name)
      setExtra((prev) => [...prev, { value: branch.id, label: `${branch.name} (${branch.code})` }])
      onCreated?.(branch)
      onChange(branch.id)
      setAdding(false)
      setName('')
    } catch (err) {
      setError(err.message || 'Gagal menambah cabang')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-2">
      <AppSelect
        {...rest}
        value={value}
        options={merged}
        onChange={(v) => (v === NEW ? setAdding(true) : onChange(v))}
      />
      {adding && (
        <div className="rounded-xl border border-gold-300 bg-gold-50/50 p-2.5 space-y-2">
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (name.trim().length >= 2) create() } }}
              placeholder="Ketik nama cabang"
              className="flex-1 min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-gold-300"
            />
            <button type="button" onClick={create} disabled={saving || name.trim().length < 2} className="flex items-center gap-1 bg-navy-900 text-white text-xs font-semibold px-3 py-2 rounded-lg disabled:opacity-50">
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Tambah
            </button>
            <button type="button" onClick={() => { setAdding(false); setName(''); setError('') }} aria-label="Batal" className="p-2 text-gray-400 hover:text-gray-600"><X size={14} /></button>
          </div>
          {error && <p className="text-[11px] text-red-600">{error}</p>}
          <p className="text-[11px] text-gray-400">Cabang baru dibuat dan langsung dipilih. Atur paket &amp; harga cabang di menu Pengaturan.</p>
        </div>
      )}
    </div>
  )
}
