'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { HeartPulse, Loader2, Save, ReceiptText, Search, Users } from 'lucide-react'
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
  const [students, setStudents] = useState([])
  const [search, setSearch] = useState('')
  const [branchFilter, setBranchFilter] = useState('')
  const [onlyExempt, setOnlyExempt] = useState(false)
  const [savingStudents, setSavingStudents] = useState(false)

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

  const loadStudents = useCallback(() => {
    api.getBpjsStudents(month, year).then(setStudents).catch(() => setStudents([]))
  }, [month, year])

  useEffect(loadStudents, [loadStudents])

  const branchOptions = useMemo(() => {
    const map = new Map()
    students.forEach((s) => { if (s.branch) map.set(s.branch.id, `${s.branch.name} (${s.branch.code})`) })
    return Array.from(map, ([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label))
  }, [students])

  const visibleStudents = useMemo(() => {
    const q = search.trim().toLowerCase()
    return students.filter((s) => {
      if (branchFilter && s.branchId !== branchFilter) return false
      if (onlyExempt && !s.bpjsExempt) return false
      if (q && !s.fullName.toLowerCase().includes(q) && !(s.studentId || '').toLowerCase().includes(q)) return false
      return true
    })
  }, [students, search, branchFilter, onlyExempt])

  // Terapkan ke daftar anak yang sedang tampil (sudah terfilter).
  async function setExempt(rows, exempt) {
    const ids = rows.filter((s) => s.bpjsExempt !== exempt).map((s) => s.id)
    if (ids.length === 0) return
    setSavingStudents(true)
    try {
      const res = await api.updateBpjsStudents(exempt ? { exemptIds: ids } : { includeIds: ids })
      flash(exempt
        ? `${res.exempted} anak dikecualikan dari BPJS${res.cancelledItems ? `, ${res.cancelledItems} tagihan terbuka dibatalkan` : ''}`
        : `${res.included} anak ditagih BPJS lagi`)
      loadStudents()
      loadStatus()
    } catch (err) {
      flash(err.message)
    } finally {
      setSavingStudents(false)
    }
  }

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
    <div className="space-y-6 max-w-4xl">
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
            {status.exempt > 0 && <> · {status.exempt} anak dikecualikan</>}
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

      <div className="glass-card rounded-3xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-navy-700" />
          <h2 className="font-semibold text-navy-900 text-sm">Peserta BPJS</h2>
          <span className="text-xs text-gray-400">{students.filter((s) => !s.bpjsExempt && s.status !== 'inactive').length} ditagih · {students.filter((s) => s.bpjsExempt).length} dikecualikan</span>
        </div>
        <p className="text-xs text-gray-400">
          Centang = anak ditagih BPJS otomatis. Hilangkan centang untuk mengecualikan anak (tidak ikut tagihan otomatis maupun &ldquo;Tagih Sekarang&rdquo;; tagihan BPJS yang belum dibayar dibatalkan). Perubahan langsung tersimpan.
        </p>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama / ID anak..."
              className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-gold-300"
            />
          </div>
          <AppSelect
            value={branchFilter}
            onChange={setBranchFilter}
            allLabel="Semua Cabang"
            placeholder="Semua Cabang"
            className="min-w-[170px]"
            options={branchOptions}
          />
          <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
            <input type="checkbox" checked={onlyExempt} onChange={(e) => setOnlyExempt(e.target.checked)} />
            Hanya dikecualikan
          </label>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button disabled={savingStudents || visibleStudents.length === 0} onClick={() => setExempt(visibleStudents, false)} className="text-xs font-semibold text-emerald-700 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 rounded-2xl px-3 py-2 disabled:opacity-40">
            Tagih semua yang tampil ({visibleStudents.length})
          </button>
          <button disabled={savingStudents || visibleStudents.length === 0} onClick={() => { if (confirm(`Kecualikan ${visibleStudents.length} anak yang tampil dari tagihan BPJS?`)) setExempt(visibleStudents, true) }} className="text-xs font-semibold text-amber-700 border border-amber-200 bg-amber-50 hover:bg-amber-100 rounded-2xl px-3 py-2 disabled:opacity-40">
            Kecualikan semua yang tampil
          </button>
          {savingStudents && <Loader2 size={14} className="animate-spin text-gray-400" />}
        </div>

        {visibleStudents.length === 0 ? (
          <div className="text-sm text-gray-400 text-center py-6">Tidak ada anak yang cocok.</div>
        ) : (
          <div className="overflow-x-auto max-h-[28rem] overflow-y-auto rounded-2xl border border-gray-100">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="w-12 px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Tagih</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Anak</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Cabang</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Status</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Periode ini</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {visibleStudents.map((s) => (
                  <tr key={s.id} className={s.bpjsExempt ? 'bg-amber-50/40' : ''}>
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={!s.bpjsExempt}
                        disabled={savingStudents}
                        onChange={() => setExempt([s], !s.bpjsExempt)}
                        aria-label={`Tagih BPJS ${s.fullName}`}
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-navy-900">{s.fullName}</div>
                      <div className="text-[11px] text-gray-400">{s.studentId}{s.ageGroup ? ` · ${s.ageGroup}` : ''}</div>
                    </td>
                    <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{s.branch ? s.branch.code : '-'}</td>
                    <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{s.status === 'inactive' ? 'Nonaktif' : 'Aktif'}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs">
                      {s.bpjsExempt ? <span className="font-semibold text-amber-700">Dikecualikan</span>
                        : s.billedStatus === 'checked_out' ? <span className="font-semibold text-blue-600">Menunggu bayar</span>
                        : s.billedStatus === 'canceled' ? <span className="text-gray-400">Dibatalkan</span>
                        : s.billedStatus ? <span className="font-semibold text-emerald-600">Sudah ditagih</span>
                        : <span className="text-gray-400">Belum ditagih</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
