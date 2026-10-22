'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { BellRing, ChevronDown, CheckCircle2, MessageCircle, RefreshCw, Trash2, Search, Users, Wallet, AlertTriangle } from 'lucide-react'
import * as api from '@/lib/api'
import { AppSelect } from '@/components/ui/app-select'
import { formatRupiah } from '@/components/finance/shared'

// Pantau parent yang masih punya tagihan belum lunas (admin & head coach).
// Data langsung dari server (tagihan open / menunggu bayar), diperbarui otomatis
// tiap 30 detik dan saat tab dibuka lagi. Tombol WhatsApp membuka chat dengan
// pesan siap kirim, lalu mencatat waktu pengingat agar tidak dobel.
const MONTHS = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const POLL_MS = 30000

function timeAgo(iso) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'baru saja'
  if (mins < 60) return `${mins} menit lalu`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} jam lalu`
  return `${Math.floor(hrs / 24)} hari lalu`
}

function buildMessage(p) {
  const lines = p.items.map((i) => `• ${i.studentName} — ${i.label} (${formatRupiah(i.amount)})${i.overdue ? ` — jatuh tempo ${MONTHS[i.dueMonth]} ${i.dueYear}` : ''}`)
  return [
    `Halo Bapak/Ibu ${p.parentName || ''}, kami dari SixStars Academy.`,
    '',
    'Kami ingin mengingatkan bahwa masih ada tagihan yang belum dibayar:',
    ...lines,
    '',
    `Total: ${formatRupiah(p.total)}`,
    '',
    'Pembayaran bisa dilakukan lewat menu Perpanjang Paket / Keranjang di aplikasi SixStars. Jika sudah membayar, abaikan pesan ini. Terima kasih.',
  ].join('\n')
}

export default function UnpaidMonitor() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [branchFilter, setBranchFilter] = useState('')
  const [branches, setBranches] = useState([])
  const [open, setOpen] = useState({})
  const [deleting, setDeleting] = useState(false)

  const load = useCallback((silent = false) => {
    if (!silent) setRefreshing(true)
    return api.getUnpaidParents({ branchId: branchFilter || undefined })
      .then((res) => { setData(res); setError('') })
      .catch((err) => setError(err.message))
      .finally(() => setRefreshing(false))
  }, [branchFilter])

  useEffect(() => { api.getBranches().then(setBranches).catch(() => {}) }, [])
  useEffect(() => {
    load(true)
    const timer = setInterval(() => load(true), POLL_MS)
    const onFocus = () => load(true)
    window.addEventListener('focus', onFocus)
    return () => { clearInterval(timer); window.removeEventListener('focus', onFocus) }
  }, [load])

  const parents = useMemo(() => {
    if (!data) return []
    const q = search.trim().toLowerCase()
    return data.parents.filter((p) => {
      if (statusFilter === 'overdue' && !p.overdue) return false
      if (statusFilter === 'current' && p.overdue) return false
      if (!q) return true
      return (p.parentName || '').toLowerCase().includes(q) || (p.parentPhone || '').includes(q) || p.students.some((s) => s.fullName.toLowerCase().includes(q))
    })
  }, [data, search, statusFilter])

  async function remind(p) {
    if (p.lastReminder && Date.now() - new Date(p.lastReminder.at).getTime() < 24 * 3600 * 1000) {
      if (!confirm(`Parent ini sudah diingatkan ${timeAgo(p.lastReminder.at)}${p.lastReminder.by ? ` oleh ${p.lastReminder.by}` : ''}. Kirim lagi?`)) return
    }
    window.open(`https://wa.me/${p.whatsapp}?text=${encodeURIComponent(buildMessage(p))}`, '_blank', 'noopener,noreferrer')
    try { await api.logPaymentReminder(p.students.map((s) => s.id), p.total) } catch {}
    load(true)
  }

  async function removeItems(itemIds, message) {
    if (itemIds.length === 0 || !confirm(message)) return
    setDeleting(true)
    try {
      const res = await api.deleteUnpaidItems(itemIds)
      if (res.skipped) alert(`${res.deleted} tagihan dihapus. ${res.skipped} dilewati karena sudah lunas atau sudah berubah.`)
      await load(true)
    } catch (err) {
      alert(err.message)
    } finally {
      setDeleting(false)
    }
  }

  const removeOne = (i) => removeItems([i.id], `Hapus tagihan "${i.label}" (${i.studentName}, ${formatRupiah(i.amount)})? Tagihan hilang dari daftar parent dan tidak dibuat ulang otomatis.`)
  const removeParent = (p) => removeItems(p.items.map((i) => i.id), `Hapus semua ${p.items.length} tagihan ${p.parentName || 'parent ini'} (${formatRupiah(p.total)})?`)
  const removeAllShown = () => {
    const ids = parents.flatMap((p) => p.items.map((i) => i.id))
    const total = parents.reduce((s, p) => s + p.total, 0)
    removeItems(ids, `Hapus SEMUA ${ids.length} tagihan dari ${parents.length} parent yang tampil (${formatRupiah(total)})? Tagihan hilang dari daftar parent dan tidak dibuat ulang otomatis.`)
  }

  if (!data && !error) return <div className="text-sm text-gray-400">Memuat...</div>

  const summary = data?.summary
  const periodLabel = data ? `${MONTHS[data.period.month]} ${data.period.year}` : ''
  const tabs = [
    { key: 'all', label: 'Semua', count: summary?.parents },
    { key: 'current', label: 'Bulan ini', count: summary?.currentParents },
    { key: 'overdue', label: 'Menunggak', count: summary?.overdueParents },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-bold text-navy-900 text-lg">Tagihan Parent</h1>
          <p className="text-xs text-gray-500">Parent yang masih punya tagihan belum lunas · {periodLabel}</p>
        </div>
        <div className="flex items-center gap-2">
        {parents.length > 0 && (
          <button onClick={removeAllShown} disabled={deleting} className="flex items-center gap-1.5 bg-white border border-red-200 hover:bg-red-50 text-red-600 text-xs font-semibold px-3 py-2 rounded-xl disabled:opacity-60">
            <Trash2 size={13} /> Hapus semua{statusFilter !== 'all' || search || branchFilter ? ' (sesuai filter)' : ''}
          </button>
        )}
        <button onClick={() => load()} disabled={refreshing} className="flex items-center gap-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-navy-700 text-xs font-semibold px-3 py-2 rounded-xl disabled:opacity-60">
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> Perbarui
        </button>
        </div>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 rounded-2xl px-4 py-3">{error}</div>}

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="glass-card rounded-3xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-navy-50 text-navy-700 flex items-center justify-center"><Users size={18} /></div>
            <div><div className="text-xs text-gray-500">Parent belum bayar</div><div className="text-xl font-extrabold text-navy-900">{summary.parents}</div></div>
          </div>
          <div className="glass-card rounded-3xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center"><Wallet size={18} /></div>
            <div><div className="text-xs text-gray-500">Total tagihan</div><div className="text-xl font-extrabold text-rose-600">{formatRupiah(summary.total)}</div></div>
          </div>
          <div className="glass-card rounded-3xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center"><AlertTriangle size={18} /></div>
            <div><div className="text-xs text-gray-500">Menunggak (bulan lalu)</div><div className="text-xl font-extrabold text-amber-600">{summary.overdueParents}</div></div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex bg-gray-100 rounded-2xl p-1">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setStatusFilter(t.key)} className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors ${statusFilter === t.key ? 'bg-white text-navy-900 shadow-sm' : 'text-gray-500 hover:text-navy-700'}`}>
              {t.label}{t.count !== undefined ? ` (${t.count})` : ''}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[180px]">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama parent, anak, atau no. HP..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-100" />
        </div>
        <AppSelect value={branchFilter} onChange={setBranchFilter} allLabel="Semua Cabang" placeholder="Semua Cabang" className="min-w-[160px]" options={branches.map((b) => ({ value: b.id, label: b.name }))} />
      </div>

      {parents.length === 0 ? (
        <div className="glass-card rounded-3xl p-10 text-center text-sm text-gray-500 flex flex-col items-center gap-2">
          <CheckCircle2 size={28} className="text-emerald-500" />
          {summary?.parents === 0 ? 'Semua parent sudah membayar. Tidak ada tagihan tertunda.' : 'Tidak ada hasil yang cocok.'}
        </div>
      ) : (
        <div className="space-y-3">
          {parents.map((p) => {
            const isOpen = !!open[p.key]
            return (
              <div key={p.key} className="glass-card rounded-3xl overflow-hidden">
                <div className="p-4 flex items-center gap-3 flex-wrap">
                  <button onClick={() => setOpen((o) => ({ ...o, [p.key]: !isOpen }))} className="flex-1 min-w-[200px] text-left">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-navy-900">{p.parentName || '-'}</span>
                      {p.overdue
                        ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Menunggak</span>
                        : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Bulan ini</span>}
                      <ChevronDown size={14} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {p.students.map((s) => `${s.fullName}${s.branch?.code ? ` (${s.branch.code})` : ''}`).join(', ')}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">
                      {p.parentPhone || 'No. HP belum ada'}
                      {p.lastReminder ? ` · diingatkan ${timeAgo(p.lastReminder.at)}${p.lastReminder.by ? ` oleh ${p.lastReminder.by}` : ''}` : ' · belum pernah diingatkan'}
                    </div>
                  </button>
                  <div className="text-right">
                    <div className="text-base font-extrabold text-rose-600 tabular-nums">{formatRupiah(p.total)}</div>
                    <div className="text-[11px] text-gray-400">{p.items.length} tagihan</div>
                  </div>
                  <button
                    onClick={() => remind(p)}
                    disabled={!p.whatsapp}
                    title={p.whatsapp ? 'Kirim pengingat lewat WhatsApp' : 'Nomor HP parent belum diisi'}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    {p.lastReminder ? <BellRing size={14} /> : <MessageCircle size={14} />} {p.lastReminder ? 'Ingatkan lagi' : 'WhatsApp'}
                  </button>
                  <button onClick={() => removeParent(p)} disabled={deleting} title="Hapus semua tagihan parent ini" className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl disabled:opacity-50"><Trash2 size={15} /></button>
                </div>
                {isOpen && (
                  <ul className="border-t border-gray-100 divide-y divide-gray-50 bg-gray-50/50">
                    {p.items.map((i) => (
                      <li key={i.id} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-navy-900 truncate">{i.label}</div>
                          <div className="text-[11px] text-gray-500">
                            {i.studentName} · jatuh tempo {MONTHS[i.dueMonth]} {i.dueYear}
                            {i.awaitingPayment ? ' · menunggu pembayaran (sudah di-checkout)' : ''}
                          </div>
                        </div>
                        <div className="font-bold text-navy-900 tabular-nums whitespace-nowrap">{formatRupiah(i.amount)}</div>
                        <button onClick={() => removeOne(i)} disabled={deleting} title="Hapus tagihan ini" className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"><Trash2 size={14} /></button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
