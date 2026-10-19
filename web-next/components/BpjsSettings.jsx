'use client'

import { useCallback, useEffect, useState } from 'react'
import { HeartPulse, Loader2, Save, ReceiptText } from 'lucide-react'
import * as api from '@/lib/api'
import { RupiahInput } from '@/components/ui/rupiah-input'
import { AppSelect } from '@/components/ui/app-select'

// Menu BPJS (dipakai admin & head coach). Billing otomatis menagih nominal yang
// sama ke semua anak terdaftar (status bukan Nonaktif) untuk periode yang dipilih.
const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const now = new Date()

export default function BpjsSettings() {
  const [form, setForm] = useState({ enabled: false, amount: 0, day: 1 })
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState(false)
  const [message, setMessage] = useState('')

  function flash(msg) {
    setMessage(msg)
    setTimeout(() => setMessage(''), 3500)
  }

  useEffect(() => {
    api.getSettings()
      .then((s) => setForm({ enabled: !!s.bpjsEnabled, amount: s.bpjsAmount || 0, day: s.bpjsDay || 1 }))
      .finally(() => setLoading(false))
  }, [])

  const loadStatus = useCallback(() => {
    api.getBpjsStatus(month, year).then(setStatus).catch(() => setStatus(null))
  }, [month, year])

  useEffect(loadStatus, [loadStatus])

  async function handleSave() {
    setSaving(true)
    try {
      await api.updateBpjsSettings({ bpjsEnabled: form.enabled, bpjsAmount: form.amount, bpjsDay: form.day })
      flash('Pengaturan BPJS disimpan')
      loadStatus()
    } catch (err) {
      flash(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleRun() {
    setRunning(true)
    try {
      const res = await api.runBpjsBilling({ month, year })
      if (res.created > 0) flash(`${res.created} tagihan ${res.label} dibuat`)
      else if (res.reason === 'amount_not_set') flash('Isi nominal BPJS terlebih dahulu')
      else flash(`Semua anak sudah tertagih untuk ${res.label}`)
      loadStatus()
    } catch (err) {
      flash(err.message)
    } finally {
      setRunning(false)
    }
  }

  if (loading) return null

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-navy-600 to-navy-800 shadow-md shadow-navy-900/25 flex items-center justify-center shrink-0">
          <HeartPulse size={18} className="text-gold-300" />
        </div>
        <div>
          <h1 className="font-bold text-navy-900 text-lg">BPJS</h1>
          <p className="text-sm text-gray-400">Tagihan bulanan otomatis untuk semua anak terdaftar</p>
        </div>
      </div>

      {message && <div className="text-sm bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-2xl px-3 py-2">{message}</div>}

      <div className="glass-card rounded-3xl p-6 space-y-4">
        <h2 className="font-semibold text-navy-900 text-sm">Pengaturan</h2>
        <p className="text-xs text-gray-400">
          Nominal BPJS yang sama ditagih otomatis setiap bulan ke semua anak terdaftar (status bukan Nonaktif). Tagihan muncul sebagai tagihan belum dibayar di akun orang tua, dan baru dihitung sebagai pendapatan setelah dibayar.
        </p>

        <label className="flex items-center gap-2 text-sm text-navy-800">
          <input type="checkbox" checked={form.enabled} onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))} className="rounded" />
          Aktifkan penagihan BPJS otomatis
        </label>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Nominal per Bulan</label>
            <RupiahInput value={form.amount} onChange={(val) => setForm((f) => ({ ...f, amount: val }))} className="w-full" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Tanggal Penagihan (1-28)</label>
            <input type="number" min={1} max={28} value={form.day} onChange={(e) => setForm((f) => ({ ...f, day: e.target.value }))} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm" />
          </div>
        </div>

        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-navy-900 hover:bg-navy-800 text-white font-semibold text-sm px-4 py-2.5 rounded-2xl disabled:opacity-50">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Simpan Pengaturan
        </button>
      </div>

      <div className="glass-card rounded-3xl p-6 space-y-4">
        <h2 className="font-semibold text-navy-900 text-sm">Tagih &amp; Pantau Periode</h2>

        <div className="flex items-center gap-2 flex-wrap">
          <AppSelect
            value={String(month)}
            onChange={(v) => setMonth(Number(v))}
            options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))}
          />
          <AppSelect
            value={String(year)}
            onChange={(v) => setYear(Number(v))}
            options={years.map((y) => ({ value: String(y), label: String(y) }))}
          />
        </div>

        {status && (
          <div className="text-xs text-gray-500 bg-gray-50 rounded-2xl px-3 py-2">
            Periode <span className="font-semibold text-navy-800">{status.label}</span> · {status.billed} dari {status.eligible} anak sudah tertagih
          </div>
        )}

        <button onClick={handleRun} disabled={running} className="flex items-center gap-2 bg-gold-400 hover:bg-gold-500 text-navy-900 font-semibold text-sm px-4 py-2.5 rounded-2xl disabled:opacity-50">
          {running ? <Loader2 size={14} className="animate-spin" /> : <HeartPulse size={14} />} Tagih Sekarang
        </button>
        <p className="text-xs text-gray-400 flex items-start gap-1.5">
          <ReceiptText size={13} className="mt-0.5 shrink-0" />
          Aman diulang: anak yang sudah punya tagihan BPJS periode ini akan dilewati, jadi tidak ada tagihan ganda.
        </p>
      </div>
    </div>
  )
}
