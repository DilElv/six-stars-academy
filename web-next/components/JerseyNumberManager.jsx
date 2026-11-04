'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { X, Loader2, Lock, Unlock, CheckCircle2, RefreshCw, UserCheck, Hash } from 'lucide-react'
import * as api from '@/lib/api'
import ModalPortal from '@/components/ui/modal-portal'
import { JERSEY_AGE_GROUPS, JERSEY_STATUS } from '@/lib/jerseyNumbers'

const SUMMARY = [
  ['available', 'Tersedia', 'text-emerald-600', 'bg-emerald-50 border-emerald-100'],
  ['blocked', 'Diblokir Manual', 'text-gray-600', 'bg-gray-50 border-gray-200'],
  ['reserved', 'Dipesan', 'text-amber-600', 'bg-amber-50 border-amber-100'],
  ['used', 'Terpakai', 'text-navy-900', 'bg-navy-50 border-navy-100'],
]

function parseNumbers(text) {
  return [...new Set(String(text || '').split(/[\s,;]+/).filter(Boolean).map((value) => Math.round(Number(value))))]
    .filter((number) => Number.isInteger(number) && number >= 1 && number <= 100)
}

// Pengaturan nomor punggung jersey per kategori usia untuk Admin/Head Coach.
export default function JerseyNumberManager({ product, onClose }) {
  const [ageGroup, setAgeGroup] = useState('U6')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [selected, setSelected] = useState(null)
  const [bulkMode, setBulkMode] = useState(false)
  const [multi, setMulti] = useState(() => new Set())
  const [bulkInput, setBulkInput] = useState('')
  const [usedForm, setUsedForm] = useState({ number: '', playerName: '', size: '' })

  const load = useCallback(() => {
    setLoading(true)
    api.getJerseyNumbers(product.id, ageGroup)
      .then((res) => { setData(res); setError('') })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [product.id, ageGroup])

  useEffect(() => {
    setSelected(null)
    setMulti(new Set())
    setData(null)
    load()
    const timer = setInterval(load, 25000)
    return () => clearInterval(timer)
  }, [load])

  const rows = data?.numbers || []
  const selectedRow = useMemo(() => rows.find((row) => row.number === selected) || null, [rows, selected])

  async function changeStatus(numbers, status) {
    if (!numbers.length) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const res = await api.setJerseyNumbers(product.id, { ageGroup, numbers, status })
      setData(res)
      setMulti(new Set())
      setBulkInput('')
      setMessage(`${numbers.length} nomor ${status === 'blocked' ? 'diblokir' : 'dibuka kembali'}.${res.locked?.length ? ` ${res.locked.length} nomor dilewati karena sedang dipesan/terpakai.` : ''}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function markUsed(e) {
    e.preventDefault()
    const number = Math.round(Number(usedForm.number))
    if (!Number.isInteger(number) || number < 1 || number > 100) return setError('Nomor harus 1–100')
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const res = await api.markJerseyNumberUsed(product.id, { ageGroup, number, playerName: usedForm.playerName, size: usedForm.size })
      setData(res)
      setUsedForm({ number: '', playerName: '', size: '' })
      setMessage(`Nomor ${number} ditandai terpakai.`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function release(row) {
    if (!confirm(`Lepas nomor ${row.number} dari status Terpakai? Nomor akan kembali tersedia.`)) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const res = await api.releaseJerseyNumber(product.id, { ageGroup, number: row.number })
      setData(res)
      setSelected(null)
      setMessage(`Nomor ${row.number} kembali tersedia.`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function pick(row) {
    if (bulkMode) {
      if (row.status === 'reserved' || row.status === 'used') return
      setMulti((current) => {
        const next = new Set(current)
        if (next.has(row.number)) next.delete(row.number)
        else next.add(row.number)
        return next
      })
      return
    }
    setSelected(row.number)
  }

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[210] flex items-center justify-center p-3 sm:p-4" onClick={onClose}>
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        <div className="relative bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto modal-scroll p-4 sm:p-5" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h3 className="font-bold text-navy-900 text-sm flex items-center gap-1.5"><Hash size={15} /> Nomor Punggung</h3>
              <p className="text-xs text-gray-400 mt-0.5">{product.name} · nomor 1–100 per kategori usia</p>
            </div>
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X size={18} /></button>
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 mb-3">
            {JERSEY_AGE_GROUPS.map((group) => (
              <button
                key={group}
                onClick={() => setAgeGroup(group)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 ${ageGroup === group ? 'bg-navy-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {group}
              </button>
            ))}
          </div>

          {error && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 mb-2">{error}</div>}
          {message && <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2 mb-2">{message}</div>}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            {SUMMARY.map(([key, label, tone, cls]) => (
              <div key={key} className={`rounded-xl border px-2.5 py-2 ${cls}`}>
                <div className={`text-lg font-extrabold tabular-nums ${tone}`}>{data?.summary?.[key] ?? 0}</div>
                <div className="text-[10px] text-gray-500">{label}</div>
              </div>
            ))}
          </div>

          {data?.conflicts?.length > 0 && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mb-3">
              <b>{data.conflicts.length} bentrok data lama:</b>{' '}
              {data.conflicts.slice(0, 4).map((row) => `${row.ageGroup} #${row.number} (${row.studentName || 'tanpa nama'})`).join(', ')}
              {data.conflicts.length > 4 ? ', ...' : ''}. Selesaikan dengan membatalkan pesanan ganda; data tidak ditimpa otomatis.
            </div>
          )}

          <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-3">
            <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
              <p className="text-xs font-semibold text-navy-800">Grid nomor {ageGroup}</p>
              <div className="flex items-center gap-1.5">
                <button onClick={() => { setBulkMode((v) => !v); setMulti(new Set()) }} className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border ${bulkMode ? 'bg-navy-900 text-white border-navy-900' : 'bg-white text-navy-700 border-gray-200'}`}>
                  {bulkMode ? 'Selesai pilih' : 'Pilih beberapa'}
                </button>
                <button onClick={load} className="p-1.5 rounded-lg text-gray-400 hover:text-navy-700 hover:bg-white" title="Muat ulang">
                  <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
              {rows.map((row) => {
                const status = JERSEY_STATUS[row.status] || JERSEY_STATUS.available
                const active = bulkMode ? multi.has(row.number) : selected === row.number
                return (
                  <button
                    key={row.number}
                    type="button"
                    onClick={() => pick(row)}
                    disabled={bulkMode && (row.status === 'reserved' || row.status === 'used')}
                    title={`${row.number} · ${status.label}${row.playerName ? ` · ${row.playerName}` : ''}`}
                    className={`h-9 rounded-lg border text-xs font-bold tabular-nums transition-colors ${status.cell} ${active ? 'ring-2 ring-offset-1 ring-gold-500' : ''}`}
                  >
                    {row.number}
                  </button>
                )
              })}
              {rows.length === 0 && <p className="col-span-full text-xs text-gray-400 py-4 text-center">Memuat nomor...</p>}
            </div>

            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[10px] text-gray-500">
              {Object.entries(JERSEY_STATUS).map(([key, status]) => (
                <span key={key} className="inline-flex items-center gap-1"><span className={`inline-block w-2.5 h-2.5 rounded-sm border ${status.cell}`} /> {status.label}</span>
              ))}
            </div>
          </div>

          {bulkMode ? (
            <div className="mt-3 rounded-2xl border border-gray-100 p-3 space-y-2">
              <p className="text-xs font-semibold text-gray-500">Aksi massal ({multi.size} dipilih)</p>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => changeStatus([...multi], 'blocked')} disabled={saving || multi.size === 0} className="flex items-center gap-1.5 text-xs font-semibold bg-gray-900 text-white px-3 py-2 rounded-xl disabled:opacity-50"><Lock size={12} /> Blokir terpilih</button>
                <button onClick={() => changeStatus([...multi], 'available')} disabled={saving || multi.size === 0} className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-500 text-white px-3 py-2 rounded-xl disabled:opacity-50"><Unlock size={12} /> Buka blokir</button>
              </div>
              <div className="flex gap-2">
                <input value={bulkInput} onChange={(e) => setBulkInput(e.target.value)} placeholder="Atau ketik nomor: 7, 9, 23" className="flex-1 min-w-0 rounded-xl border border-gray-200 bg-white px-2.5 py-2 text-sm tabular-nums" />
                <button onClick={() => changeStatus(parseNumbers(bulkInput), 'blocked')} disabled={saving || parseNumbers(bulkInput).length === 0} className="text-xs font-semibold px-3 rounded-xl bg-navy-900 text-white disabled:opacity-50">Blokir</button>
              </div>
              <p className="text-[10px] text-gray-400">Nomor yang sedang dipesan atau terpakai tidak bisa diblokir/dibuka.</p>
            </div>
          ) : selectedRow ? (
            <div className="mt-3 rounded-2xl border border-gray-100 p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-navy-900">Nomor {selectedRow.number} · {JERSEY_STATUS[selectedRow.status]?.label}</p>
                  <p className="text-[11px] text-gray-500">{selectedRow.playerName ? `Pemain: ${selectedRow.playerName}` : 'Belum ada pemain terkait.'}{selectedRow.note ? ` · ${selectedRow.note}` : ''}</p>
                </div>
                <button onClick={() => setSelected(null)} className="text-xs text-gray-400 hover:text-navy-700">Tutup</button>
              </div>
              <div className="flex gap-2 flex-wrap">
                {selectedRow.status === 'available' && <button onClick={() => changeStatus([selectedRow.number], 'blocked')} disabled={saving} className="flex items-center gap-1.5 text-xs font-semibold bg-gray-900 text-white px-3 py-2 rounded-xl disabled:opacity-50"><Lock size={12} /> Blokir nomor</button>}
                {selectedRow.status === 'blocked' && <button onClick={() => changeStatus([selectedRow.number], 'available')} disabled={saving} className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-500 text-white px-3 py-2 rounded-xl disabled:opacity-50"><Unlock size={12} /> Buka blokir</button>}
                {selectedRow.status === 'reserved' && <span className="text-[11px] text-amber-700 bg-amber-50 rounded-xl px-2.5 py-2">Nomor sedang dipesan. Menunggu pembayaran/pembatalan.</span>}
                {selectedRow.status === 'used' && selectedRow.cartItemId && <span className="text-[11px] text-navy-700 bg-navy-50 rounded-xl px-2.5 py-2">Nomor terpakai dari pesanan aktif. Tidak bisa dilepas manual.</span>}
                {selectedRow.status === 'used' && !selectedRow.cartItemId && <button onClick={() => release(selectedRow)} disabled={saving} className="flex items-center gap-1.5 text-xs font-semibold border border-gray-200 text-navy-700 px-3 py-2 rounded-xl disabled:opacity-50"><Unlock size={12} /> Lepas nomor manual</button>}
              </div>
            </div>
          ) : null}

          <form onSubmit={markUsed} className="mt-3 rounded-2xl border border-gray-100 p-3 space-y-2">
            <p className="text-xs font-semibold text-gray-500 flex items-center gap-1.5"><UserCheck size={12} /> Input nomor yang sudah dipakai sebelumnya</p>
            <div className="grid grid-cols-3 gap-2">
              <input type="number" min="1" max="100" value={usedForm.number} onChange={(e) => setUsedForm((f) => ({ ...f, number: e.target.value }))} placeholder="No." className="w-full rounded-xl border border-gray-200 bg-white px-2.5 py-2 text-sm tabular-nums" required />
              <input value={usedForm.playerName} onChange={(e) => setUsedForm((f) => ({ ...f, playerName: e.target.value }))} placeholder="Nama pemain" className="w-full rounded-xl border border-gray-200 bg-white px-2.5 py-2 text-sm" />
              <input value={usedForm.size} onChange={(e) => setUsedForm((f) => ({ ...f, size: e.target.value }))} placeholder="Ukuran" className="w-full rounded-xl border border-gray-200 bg-white px-2.5 py-2 text-sm" />
            </div>
            <button type="submit" disabled={saving || !usedForm.number} className="w-full flex items-center justify-center gap-1.5 bg-gold-400 hover:bg-gold-500 text-navy-900 text-xs font-bold px-3 py-2.5 rounded-xl disabled:opacity-50">
              {saving ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Tandai terpakai
            </button>
            <p className="text-[10px] text-gray-400">Tidak membuat pesanan/invoice baru. Hanya mengunci nomor di kategori {ageGroup}.</p>
          </form>
        </div>
      </div>
    </ModalPortal>
  )
}
