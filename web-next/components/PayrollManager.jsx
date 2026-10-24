'use client'

import { useEffect, useMemo, useState } from 'react'
import { Banknote, Loader2, RefreshCw, Pencil, Trash2, CheckCircle2, Clock, Save, X, CalendarCheck, Users } from 'lucide-react'
import * as api from '@/lib/api'
import { AppSelect } from '@/components/ui/app-select'

const MONTHS = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const now = new Date()

function formatRupiah(n) {
  return 'Rp' + (Number(n) || 0).toLocaleString('id-ID')
}

function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

export default function PayrollManager() {
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [flash, setFlash] = useState('')
  const [editEntry, setEditEntry] = useState(null)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [currentRole, setCurrentRole] = useState('')

  function load() {
    setLoading(true)
    setError('')
    api.getPayroll(month, year)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [month, year])
  useEffect(() => { api.getMe().then((u) => setCurrentRole(u.role)).catch(() => {}) }, [])

  async function handleGenerate() {
    setBusy('generate')
    setError('')
    setFlash('')
    try {
      const res = await api.generatePayroll(month, year)
      setFlash(`Slip dihitung: ${res.created} baru, ${res.updated} diperbarui${res.skipped ? `, ${res.skipped} sudah dibayar dilewati` : ''}.`)
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  async function handlePay(entry) {
    if (!confirm(`Tandai honor ${entry.coach.name} sebesar ${formatRupiah(entry.payroll.total)} sudah dibayar?`)) return
    setBusy(entry.payroll.id)
    try {
      await api.payPayroll(entry.payroll.id)
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  async function handleDelete(entry) {
    if (!confirm(`Hapus slip honor ${entry.coach.name} periode ini?`)) return
    setBusy(entry.payroll.id)
    try {
      await api.deletePayroll(entry.payroll.id)
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy('')
    }
  }

  const summary = useMemo(() => {
    if (!data) return null
    const withPayroll = data.entries.filter((e) => e.payroll)
    return {
      coaches: data.entries.length,
      days: data.entries.reduce((sum, e) => sum + e.stats.daysPresent, 0),
      total: withPayroll.reduce((sum, e) => sum + e.payroll.total, 0),
      paid: withPayroll.filter((e) => e.payroll.status === 'paid').reduce((sum, e) => sum + e.payroll.total, 0),
      draft: withPayroll.filter((e) => e.payroll.status !== 'paid').length,
      generated: withPayroll.length,
    }
  }, [data])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-navy-600 to-navy-800 shadow-md shadow-navy-900/25 flex items-center justify-center shrink-0">
            <Banknote size={18} className="text-gold-300" />
          </div>
          <div>
            <h1 className="font-bold text-navy-900 text-lg">Payroll Coach</h1>
            <p className="text-sm text-gray-400">Honor harian × hari hadir + bonus/potongan</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AppSelect
            value={String(month)}
            onChange={(v) => setMonth(Number(v))}
            options={MONTHS.slice(1).map((m, i) => ({ value: String(i + 1), label: m }))}
          />
          <AppSelect
            value={String(year)}
            onChange={(v) => setYear(Number(v))}
            options={[year - 1, year, year + 1].map((y) => ({ value: String(y), label: String(y) }))}
          />
          <button
            onClick={() => setBulkOpen(true)}
            className="flex items-center gap-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-navy-700 text-sm font-semibold px-4 py-2 rounded-2xl"
          >
            <Users size={14} /> Atur Honor Massal
          </button>
          <button
            onClick={handleGenerate}
            disabled={busy === 'generate'}
            className="flex items-center gap-1.5 bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold px-4 py-2 rounded-2xl disabled:opacity-50"
          >
            {busy === 'generate' ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Hitung Otomatis
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-2xl p-3 text-sm text-red-600">{error}</div>}
      {flash && <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-sm text-emerald-700">{flash}</div>}

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCard label="Coach aktif" value={summary.coaches} />
          <SummaryCard label="Total hari hadir" value={summary.days} />
          <SummaryCard label="Total honor" value={formatRupiah(summary.total)} tone="navy" />
          <SummaryCard label="Sudah dibayar" value={formatRupiah(summary.paid)} tone="emerald" />
        </div>
      )}

      <div className="glass-card rounded-3xl overflow-hidden">
        <div className="overflow-x-auto modal-scroll">
          <table className="w-full text-sm min-w-[860px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Coach</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500">Cabang</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500">Honor/hari</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500">Hari hadir</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500">Bonus</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500">Potongan</th>
                <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500">Total</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && (
                <tr><td colSpan={9} className="py-10 text-center"><Loader2 size={18} className="animate-spin text-navy-300 inline" /></td></tr>
              )}
              {!loading && data?.entries.length === 0 && (
                <tr><td colSpan={9} className="py-10 text-center text-sm text-gray-400">Belum ada coach/head coach terdaftar.</td></tr>
              )}
              {!loading && data?.entries.map((entry) => {
                const { coach, stats, payroll } = entry
                const paid = payroll?.status === 'paid'
                return (
                  <tr key={coach.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-navy-900 text-white text-[10px] font-bold flex items-center justify-center overflow-hidden shrink-0">
                          {coach.photo ? <img src={coach.photo} alt="" className="w-full h-full object-cover" /> : initials(coach.name)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-navy-900 truncate">{coach.name}</div>
                          <div className="text-[11px] text-gray-400">{coach.role === 'head_coach' ? 'Head Coach' : 'Coach'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-gray-500 text-xs">{coach.branches?.map((b) => b.branch.code).join(', ') || '-'}</td>
                    <td className="px-3 py-3 text-right">
                      <RateCell
                        value={payroll?.dailyRate ?? coach.dailyRate}
                        locked={paid || (currentRole === 'head_coach' && coach.role === 'head_coach')}
                        onSave={async (v) => {
                          await api.setCoachDailyRate(coach.id, v, month, year)
                          load()
                        }}
                      />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <div className="font-semibold text-navy-900 tabular-nums">{stats.daysPresent}</div>
                      {stats.eventDays > 0 && <div className="text-[10px] text-emerald-600 mt-0.5">termasuk {stats.eventDays} hari event</div>}
                      {(stats.pending > 0 || stats.rejected > 0 || stats.missingCheckout > 0) && (
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          {stats.pending > 0 && `${stats.pending} pending`}
                          {stats.rejected > 0 && `${stats.pending > 0 ? ' · ' : ''}${stats.rejected} ditolak`}
                          {stats.missingCheckout > 0 && `${stats.pending + stats.rejected > 0 ? ' · ' : ''}${stats.missingCheckout} tanpa pulang`}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-gray-600">{payroll ? formatRupiah(payroll.bonus) : '—'}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-gray-600">{payroll ? formatRupiah(payroll.deduction) : '—'}</td>
                    <td className="px-3 py-3 text-right tabular-nums font-semibold text-navy-900">{formatRupiah(entry.estimate)}</td>
                    <td className="px-3 py-3 text-center">
                      {!payroll ? (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Belum dihitung</span>
                      ) : paid ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700"><CheckCircle2 size={11} /> Dibayar</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700"><Clock size={11} /> Draft</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {payroll && (
                          <>
                            <button onClick={() => setEditEntry(entry)} disabled={paid} title="Edit slip" className="p-1.5 text-gray-400 hover:text-navy-600 hover:bg-gray-100 rounded-lg disabled:opacity-30"><Pencil size={14} /></button>
                            {!paid && (
                              <button onClick={() => handlePay(entry)} disabled={busy === payroll.id} title="Tandai dibayar" className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg disabled:opacity-30"><Banknote size={14} /></button>
                            )}
                            <button onClick={() => handleDelete(entry)} disabled={busy === payroll.id} title="Hapus slip" className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-30"><Trash2 size={14} /></button>
                          </>
                        )}
                        {!payroll && (
                          <button onClick={handleGenerate} className="text-xs font-semibold text-navy-700 border border-gray-200 hover:border-gold-300 rounded-xl px-3 py-1.5">Hitung</button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-gray-400 flex items-start gap-1.5">
        <CalendarCheck size={13} className="mt-0.5 shrink-0" />
        Total honor = honor per hari × hari hadir (absen latihan dan absen event, 1 hari dihitung sekali) + bonus − potongan. Klik nominal honor per hari untuk mengubahnya; total langsung dihitung otomatis.
      </p>

      {bulkOpen && (
        <BulkRateModal
          month={month}
          year={year}
          isAdmin={currentRole === 'admin'}
          onClose={() => setBulkOpen(false)}
          onSaved={(n) => { setBulkOpen(false); setFlash(`Honor harian diperbarui untuk ${n} akun.`); load() }}
        />
      )}

      {editEntry && (
        <EditPayrollModal
          entry={editEntry}
          onClose={() => setEditEntry(null)}
          onSaved={() => { setEditEntry(null); load() }}
        />
      )}
    </div>
  )
}

function SummaryCard({ label, value, tone = 'gray' }) {
  const tones = { navy: 'text-navy-800', emerald: 'text-emerald-600', gray: 'text-navy-900' }
  return (
    <div className="glass-card rounded-2xl p-4">
      <div className={`text-xl font-bold tabular-nums ${tones[tone]}`}>{value}</div>
      <div className="text-xs text-gray-400 mt-0.5">{label}</div>
    </div>
  )
}

function EditPayrollModal({ entry, onClose, onSaved }) {
  const { coach, payroll } = entry
  const [form, setForm] = useState({
    dailyRate: String(payroll.dailyRate),
    daysPresent: String(payroll.daysPresent),
    bonus: String(payroll.bonus),
    deduction: String(payroll.deduction),
    note: payroll.note || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const total = Math.max(0, (Number(form.dailyRate) || 0) * (Number(form.daysPresent) || 0) + (Number(form.bonus) || 0) - (Number(form.deduction) || 0))

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.updatePayroll(payroll.id, {
        dailyRate: Number(form.dailyRate) || 0,
        daysPresent: Number(form.daysPresent) || 0,
        bonus: Number(form.bonus) || 0,
        deduction: Number(form.deduction) || 0,
        note: form.note,
      })
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const fields = [
    ['dailyRate', 'Honor per hari (Rp)'],
    ['daysPresent', 'Hari hadir'],
    ['bonus', 'Bonus (Rp)'],
    ['deduction', 'Potongan (Rp)'],
  ]

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full max-h-[85vh] overflow-y-auto modal-scroll" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-navy-900">Slip Honor</h3>
            <p className="text-xs text-gray-400">{coach.name} · {MONTHS[payroll.month]} {payroll.year}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            {fields.map(([key, label]) => (
              <div key={key}>
                <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
                <input
                  type="number"
                  min="0"
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm tabular-nums"
                />
              </div>
            ))}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Catatan</label>
            <textarea
              rows={2}
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm"
            />
          </div>
          <div className="flex items-center justify-between bg-navy-50 rounded-2xl px-4 py-3">
            <span className="text-xs font-semibold text-navy-700">Total honor</span>
            <span className="font-bold text-navy-900 tabular-nums">{formatRupiah(total)}</span>
          </div>
          <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 bg-navy-900 hover:bg-navy-800 text-white font-semibold py-2.5 rounded-2xl disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Simpan
          </button>
        </form>
      </div>
    </div>
  )
}

function RateCell({ value, locked, onSave }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function commit() {
    const next = Number(draft)
    if (!Number.isFinite(next) || next < 0 || draft === '') { setEditing(false); return }
    if (next === Number(value)) { setEditing(false); return }
    setSaving(true)
    setError('')
    try {
      await onSave(Math.round(next))
      setEditing(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <div className="flex flex-col items-end">
        <input
          autoFocus
          type="number"
          min="0"
          value={draft}
          disabled={saving}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') setEditing(false) }}
          className="w-28 px-2 py-1 text-right tabular-nums text-sm bg-white border border-gold-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-200"
        />
        {error && <span className="text-[10px] text-red-500 mt-0.5">{error}</span>}
      </div>
    )
  }
  if (locked) return <span className="tabular-nums text-gray-600">{formatRupiah(value)}</span>
  return (
    <button
      type="button"
      onClick={() => { setDraft(String(value || 0)); setEditing(true) }}
      title="Klik untuk ubah honor per hari"
      className="tabular-nums text-navy-800 font-medium border-b border-dashed border-gray-300 hover:border-gold-400 hover:text-navy-900"
    >
      {formatRupiah(value)}
    </button>
  )
}

function BulkRateModal({ month, year, isAdmin, onClose, onSaved }) {
  const [coachRate, setCoachRate] = useState('')
  const [headRate, setHeadRate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const rates = {}
      if (coachRate !== '') rates.coachRate = Number(coachRate)
      if (isAdmin && headRate !== '') rates.headCoachRate = Number(headRate)
      const res = await api.setBulkDailyRate(rates, month, year)
      onSaved(res.updated)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm tabular-nums'

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-navy-900">Atur Honor Massal</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          {error && <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Honor per hari — Coach (Rp)</label>
            <input type="number" min="0" value={coachRate} onChange={(e) => setCoachRate(e.target.value)} placeholder="mis. 150000" className={inputCls} />
          </div>
          {isAdmin && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Honor per hari — Head Coach (Rp)</label>
              <input type="number" min="0" value={headRate} onChange={(e) => setHeadRate(e.target.value)} placeholder="mis. 250000" className={inputCls} />
            </div>
          )}
          <p className="text-[11px] text-gray-400">Kosongkan kolom yang tidak ingin diubah. Berlaku untuk semua akun aktif di peran itu dan menghitung ulang slip draft periode ini. Slip yang sudah dibayar tidak berubah. Honor tiap orang tetap bisa disesuaikan satu per satu.</p>
          <button type="submit" disabled={saving || (coachRate === '' && headRate === '')} className="w-full flex items-center justify-center gap-2 bg-navy-900 hover:bg-navy-800 text-white font-semibold py-2.5 rounded-2xl disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Terapkan
          </button>
        </form>
      </div>
    </div>
  )
}
