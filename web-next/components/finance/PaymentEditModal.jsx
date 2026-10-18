'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import * as api from '@/lib/api'
import ModalPortal from '@/components/ui/modal-portal'
import { AppSelect } from '@/components/ui/app-select'
import { RupiahInput } from '@/components/ui/rupiah-input'

export default function PaymentEditModal({ payment, onClose, onSaved }) {
  const [form, setForm] = useState({
    paymentType: payment.paymentType || 'renewal',
    status: payment.status || 'success',
    paymentMethod: payment.paymentMethod || '',
    amount: payment.baseAmount ?? payment.amount ?? 0,
    registrationFee: payment.registrationFee ?? 0,
    totalAmount: payment.totalAmount ?? payment.amount ?? 0,
    paidAt: payment.paidAt ? new Date(payment.paidAt).toISOString().slice(0, 10) : '',
    note: payment.note || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.updatePayment(payment.id, {
        ...form,
        amount: Number(form.amount) || 0,
        registrationFee: Number(form.registrationFee) || 0,
        totalAmount: Number(form.totalAmount) || 0,
      })
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[220] flex items-center justify-center p-4" onClick={onClose}>
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="relative w-full max-w-md space-y-4 rounded-3xl bg-white p-5 shadow-2xl">
          <div>
            <h3 className="font-bold text-navy-900">Edit Pembayaran</h3>
            <p className="text-xs text-gray-400">{payment.studentName || payment.description}</p>
          </div>
          {error && <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">Jenis</label>
              <AppSelect disabled value={form.paymentType} onChange={(v) => setForm((f) => ({ ...f, paymentType: v }))} className="w-full" options={[{ value: 'registration', label: 'Pendaftaran' }, { value: 'renewal', label: 'Perpanjangan' }, { value: 'event', label: 'Event' }, { value: 'cart', label: 'Tagihan' }]} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-500">Status</label>
              <AppSelect value={form.status} onChange={(v) => setForm((f) => ({ ...f, status: v }))} className="w-full" options={[{ value: 'success', label: 'Lunas' }, { value: 'pending', label: 'Pending' }, { value: 'failed', label: 'Gagal' }]} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="mb-1 block text-xs font-semibold text-gray-500">Harga (Rp)</label><RupiahInput value={form.amount} onChange={(v) => setForm((f) => ({ ...f, amount: v }))} className="w-full" /></div>
            <div><label className="mb-1 block text-xs font-semibold text-gray-500">Biaya Daftar (Rp)</label><RupiahInput value={form.registrationFee} onChange={(v) => setForm((f) => ({ ...f, registrationFee: v }))} className="w-full" /></div>
          </div>
          <div><label className="mb-1 block text-xs font-semibold text-gray-500">Total Pemasukan (Rp)</label><RupiahInput value={form.totalAmount} onChange={(v) => setForm((f) => ({ ...f, totalAmount: v }))} className="w-full" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="mb-1 block text-xs font-semibold text-gray-500">Metode</label><input value={form.paymentMethod} onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm" placeholder="transfer/cash" /></div>
            <div><label className="mb-1 block text-xs font-semibold text-gray-500">Tanggal Lunas</label><input type="date" value={form.paidAt} onChange={(e) => setForm((f) => ({ ...f, paidAt: e.target.value }))} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm" /></div>
          </div>
          <div><label className="mb-1 block text-xs font-semibold text-gray-500">Keterangan</label><input value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm" placeholder="mis. Cash, Transfer Manual, Anak Berprestasi" /></div>
          <p className="text-[11px] text-amber-700">Mengubah atau menghapus transaksi lunas tidak membatalkan paket/sesi yang sebelumnya sudah diterapkan.</p>
          <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-semibold text-gray-500">Batal</button><button disabled={saving} className="flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving && <Loader2 size={14} className="animate-spin" />} Simpan</button></div>
        </form>
      </div>
    </ModalPortal>
  )
}
