'use client'

import { useEffect, useState } from 'react'
import { Check, Loader2, Wallet, TrendingUp, TrendingDown, Clock, Plus, Trash2, Save, Scale } from 'lucide-react'
import * as api from '@/lib/api'
import { AppSelect } from '@/components/ui/app-select'

const MONTH_LABELS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

function formatRupiah(n) {
  return 'Rp' + (n || 0).toLocaleString('id-ID')
}

function useMonthFilter() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  return { month, setMonth, year, setYear }
}

function MonthFilter({ month, setMonth, year, setYear }) {
  const thisYear = new Date().getFullYear()
  return (
    <div className="flex items-center gap-2">
      <AppSelect value={month} onChange={(v) => setMonth(Number(v))} className="w-40" options={MONTH_LABELS.map((m, i) => ({ value: i + 1, label: m }))} />
      <AppSelect value={year} onChange={(v) => setYear(Number(v))} className="w-28" options={[thisYear - 1, thisYear, thisYear + 1].map((y) => ({ value: y, label: String(y) }))} />
    </div>
  )
}

export default function AdminPembayaranPage() {
  const [tab, setTab] = useState('pemasukan')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1 bg-gray-100 rounded-2xl p-1 w-fit flex-wrap">
        <button onClick={() => setTab('pemasukan')} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === 'pemasukan' ? 'bg-white shadow-sm text-navy-900' : 'text-gray-500 hover:text-navy-700'}`}>Pemasukan</button>
        <button onClick={() => setTab('pengeluaran')} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === 'pengeluaran' ? 'bg-white shadow-sm text-navy-900' : 'text-gray-500 hover:text-navy-700'}`}>Pengeluaran</button>
        <button onClick={() => setTab('laba')} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === 'laba' ? 'bg-white shadow-sm text-navy-900' : 'text-gray-500 hover:text-navy-700'}`}>Laba & Overview</button>
        <button onClick={() => setTab('promo')} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === 'promo' ? 'bg-white shadow-sm text-navy-900' : 'text-gray-500 hover:text-navy-700'}`}>Kode Promo</button>
      </div>

      {tab === 'pemasukan' && <PemasukanTab />}
      {tab === 'pengeluaran' && <PengeluaranTab />}
      {tab === 'laba' && <LabaTab />}
      {tab === 'promo' && <PromoTab />}
    </div>
  )
}

function PemasukanTab() {
  const { month, setMonth, year, setYear } = useMonthFilter()
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  const [pendingPayments, setPendingPayments] = useState([])
  const [verifying, setVerifying] = useState('')

  function load() {
    setLoading(true)
    api.getPemasukan({ month, year }).then((res) => { setItems(res.items); setTotal(res.total) }).finally(() => setLoading(false))
    api.getAllPayments('pending').then(setPendingPayments).catch(() => {})
  }

  useEffect(load, [month, year])

  async function handleVerify(id) {
    setVerifying(id)
    try {
      await api.updatePayment(id, { status: 'success', paymentMethod: 'transfer' })
      load()
    } finally {
      setVerifying('')
    }
  }

  return (
    <>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-bold text-navy-900 text-lg">Pemasukan</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <MonthFilter month={month} setMonth={setMonth} year={year} setYear={setYear} />
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 bg-gold-400 hover:bg-gold-500 text-navy-900 text-xs font-semibold px-3 py-2 rounded-xl"><Plus size={14} /> Tambah Manual</button>
        </div>
      </div>

      <div className="glass-card rounded-3xl p-4 sm:p-5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-md shadow-emerald-500/25 flex items-center justify-center shrink-0"><TrendingUp size={16} /></div>
        <div>
          <div className="text-xs text-gray-400 mb-0.5">Total Pemasukan — {MONTH_LABELS[month - 1]} {year}</div>
          <div className="text-lg font-bold text-navy-900">{formatRupiah(total)}</div>
        </div>
      </div>

      {pendingPayments.length > 0 && (
        <div className="glass-card rounded-3xl p-4 space-y-2">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-amber-700"><Clock size={14} /> Menunggu Verifikasi ({pendingPayments.length})</div>
          {pendingPayments.map((p) => (
            <div key={p.id} className="flex items-center gap-3 bg-amber-50 rounded-2xl p-3">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-navy-900 text-sm truncate">{p.student?.fullName}</div>
                <div className="text-xs text-gray-500">{formatRupiah(p.totalAmount)} · {p.package?.name || '-'}</div>
              </div>
              <button onClick={() => handleVerify(p.id)} disabled={verifying === p.id} className="shrink-0 flex items-center gap-1 text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2 rounded-xl disabled:opacity-50">
                {verifying === p.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Verifikasi
              </button>
            </div>
          ))}
        </div>
      )}

      {loading ? null : items.length === 0 ? (
        <div className="glass-card rounded-3xl p-10 text-center text-sm text-gray-400">Tidak ada pemasukan bulan ini.</div>
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => (
            <div key={`${item.source}-${item.id}`} className="flex items-center gap-4 glass-card rounded-3xl p-4">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${item.source === 'payment' ? 'bg-navy-50 text-navy-700' : 'bg-emerald-50 text-emerald-700'}`}>
                <Wallet size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-navy-900 text-sm truncate">{item.description}</div>
                <div className="text-xs text-gray-400">{new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} · {item.source === 'payment' ? 'Otomatis' : `Manual${item.createdBy ? ` · ${item.createdBy}` : ''}`}{item.branch ? ` · ${item.branch.code}` : ''}</div>
              </div>
              <div className="font-bold text-navy-900 shrink-0">{formatRupiah(item.amount)}</div>
            </div>
          ))}
        </div>
      )}

      {showAdd && <AddLedgerModal type="income" onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load() }} />}
    </>
  )
}

function PengeluaranTab() {
  const { month, setMonth, year, setYear } = useMonthFilter()
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  function load() {
    setLoading(true)
    api.getPengeluaran({ month, year }).then((res) => { setItems(res.items); setTotal(res.total) }).finally(() => setLoading(false))
  }

  useEffect(load, [month, year])

  async function handleDelete(id) {
    if (!confirm('Hapus catatan pengeluaran ini?')) return
    await api.deleteLedgerEntry(id)
    load()
  }

  return (
    <>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-bold text-navy-900 text-lg">Pengeluaran</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <MonthFilter month={month} setMonth={setMonth} year={year} setYear={setYear} />
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 bg-gold-400 hover:bg-gold-500 text-navy-900 text-xs font-semibold px-3 py-2 rounded-xl"><Plus size={14} /> Tambah Pengeluaran</button>
        </div>
      </div>

      <div className="glass-card rounded-3xl p-4 sm:p-5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-400 to-red-600 text-white shadow-md shadow-red-500/25 flex items-center justify-center shrink-0"><TrendingDown size={16} /></div>
        <div>
          <div className="text-xs text-gray-400 mb-0.5">Total Pengeluaran — {MONTH_LABELS[month - 1]} {year}</div>
          <div className="text-lg font-bold text-navy-900">{formatRupiah(total)}</div>
        </div>
      </div>

      {loading ? null : items.length === 0 ? (
        <div className="glass-card rounded-3xl p-10 text-center text-sm text-gray-400">Tidak ada pengeluaran bulan ini.</div>
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-4 glass-card rounded-3xl p-4">
              <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0"><TrendingDown size={14} /></div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-navy-900 text-sm truncate">{item.description}</div>
                <div className="text-xs text-gray-400">{new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}{item.createdBy ? ` · ${item.createdBy.name}` : ''}{item.branch ? ` · ${item.branch.code}` : ''}</div>
              </div>
              <div className="font-bold text-navy-900 shrink-0">{formatRupiah(item.amount)}</div>
              <button onClick={() => handleDelete(item.id)} className="shrink-0 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}

      {showAdd && <AddLedgerModal type="expense" onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load() }} />}
    </>
  )
}

function LabaTab() {
  const { month, setMonth, year, setYear } = useMonthFilter()
  const [data, setData] = useState({ income: 0, expense: 0, laba: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.getLaba({ month, year }).then(setData).finally(() => setLoading(false))
  }, [month, year])

  return (
    <>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-bold text-navy-900 text-lg">Laba & Overview</h1>
        <MonthFilter month={month} setMonth={setMonth} year={year} setYear={setYear} />
      </div>

      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-card rounded-3xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-md shadow-emerald-500/25 flex items-center justify-center shrink-0"><TrendingUp size={16} /></div>
            <div>
              <div className="text-xs text-gray-400 mb-0.5">Pemasukan</div>
              <div className="text-lg font-bold text-navy-900">{formatRupiah(data.income)}</div>
            </div>
          </div>
          <div className="glass-card rounded-3xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-400 to-red-600 text-white shadow-md shadow-red-500/25 flex items-center justify-center shrink-0"><TrendingDown size={16} /></div>
            <div>
              <div className="text-xs text-gray-400 mb-0.5">Pengeluaran</div>
              <div className="text-lg font-bold text-navy-900">{formatRupiah(data.expense)}</div>
            </div>
          </div>
          <div className="glass-card rounded-3xl p-5 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${data.laba >= 0 ? 'from-navy-600 to-navy-800 text-gold-300' : 'from-red-500 to-red-700 text-white'} shadow-md flex items-center justify-center shrink-0`}><Scale size={16} /></div>
            <div>
              <div className="text-xs text-gray-400 mb-0.5">{data.laba >= 0 ? 'Laba Bersih' : 'Rugi Bersih'}</div>
              <div className={`text-lg font-bold ${data.laba >= 0 ? 'text-navy-900' : 'text-red-600'}`}>{formatRupiah(Math.abs(data.laba))}</div>
            </div>
          </div>
        </div>
      )}

      <div className="glass-card rounded-3xl p-5 text-sm text-gray-500">
        Pemasukan mencakup seluruh pembayaran lunas (pendaftaran, perpanjangan, event) ditambah pemasukan manual. Pengeluaran hanya mencakup catatan manual. Laba dihitung otomatis secara real-time dari kedua data tersebut untuk periode {MONTH_LABELS[month - 1]} {year}.
      </div>
    </>
  )
}

function AddLedgerModal({ type, onClose, onSaved }) {
  const [branches, setBranches] = useState([])
  const [form, setForm] = useState({ description: '', amount: '', branchId: '', date: new Date().toISOString().slice(0, 10) })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { api.getBranches().then(setBranches).catch(() => {}) }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.createLedgerEntry({ type, description: form.description, amount: Number(form.amount), branchId: form.branchId || null, date: form.date })
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-bold text-navy-900">{type === 'income' ? 'Tambah Pemasukan Manual' : 'Tambah Pengeluaran'}</h3>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Deskripsi</label>
            <input required value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder={type === 'income' ? 'mis. Sponsor lokal' : 'mis. Beli minum & obat latihan'} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm" />
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
          <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 bg-gold-400 hover:bg-gold-500 text-navy-900 font-bold py-2.5 rounded-2xl disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Simpan
          </button>
        </form>
      </div>
    </div>
  )
}

function PromoTab() {
  const [promoCodes, setPromoCodes] = useState([])
  const [promosLoading, setPromosLoading] = useState(false)
  const [packages, setPackages] = useState([])
  const [showPromoModal, setShowPromoModal] = useState(false)
  const [editPromo, setEditPromo] = useState(null)
  const [promoForm, setPromoForm] = useState({ code: '', discountPercent: 25, maxUses: 1, allPackages: false, appliesToRegistrationFee: false, packageIds: [], expiresAt: '', status: 'active' })
  const [savingPromo, setSavingPromo] = useState(false)

  function loadPromos() {
    setPromosLoading(true)
    Promise.all([
      api.getPromoCodes(),
      api.getAllPackages(),
    ]).then(([promos, pkg]) => {
      setPromoCodes(promos)
      setPackages(pkg)
    }).finally(() => setPromosLoading(false))
  }

  useEffect(loadPromos, [])

  function openPromoForm(promo) {
    if (promo) {
      setEditPromo(promo)
      setPromoForm({
        code: promo.code,
        discountPercent: promo.discountPercent,
        maxUses: promo.maxUses,
        allPackages: promo.allPackages,
        appliesToRegistrationFee: promo.appliesToRegistrationFee || false,
        packageIds: promo.packages?.map((p) => p.packageId) || [],
        expiresAt: promo.expiresAt ? promo.expiresAt.slice(0, 10) : '',
        status: promo.status,
      })
    } else {
      setEditPromo(null)
      setPromoForm({ code: '', discountPercent: 25, maxUses: 1, allPackages: false, appliesToRegistrationFee: false, packageIds: [], expiresAt: '', status: 'active' })
    }
    setShowPromoModal(true)
  }

  async function handleSavePromo(e) {
    e.preventDefault()
    if (!promoForm.code) return
    setSavingPromo(true)
    try {
      if (editPromo) {
        await api.updatePromoCode(editPromo.id, promoForm)
      } else {
        await api.createPromoCode(promoForm)
      }
      setShowPromoModal(false)
      loadPromos()
    } catch (err) {
      alert(err.message)
    } finally {
      setSavingPromo(false)
    }
  }

  async function handleDeletePromo(id) {
    if (!confirm('Hapus kode promo ini?')) return
    try {
      await api.deletePromoCode(id)
      loadPromos()
    } catch (err) {
      alert(err.message)
    }
  }

  const DISCOUNT_OPTIONS = [25, 50, 75, 100]

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-navy-900 text-lg">Kode Promo</h1>
        <button onClick={() => openPromoForm(null)} className="flex items-center gap-1.5 bg-gold-400 hover:bg-gold-500 text-navy-900 text-sm font-semibold px-4 py-2 rounded-2xl"><Plus size={16} /> Buat Kode Promo</button>
      </div>

      {promosLoading ? null : promoCodes.length === 0 ? (
        <div className="glass-card rounded-3xl p-10 text-center text-sm text-gray-400">Belum ada kode promo.</div>
      ) : (
        <div className="space-y-3">
          {promoCodes.map((p) => (
            <div key={p.id} className="glass-card rounded-3xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 text-navy-900 flex items-center justify-center shrink-0 font-bold text-sm">{p.discountPercent}%</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-navy-900 text-sm tracking-wider">{p.code}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${p.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{p.status === 'active' ? 'Aktif' : 'Nonaktif'}</span>
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  Dipakai {p._count?.usages || p.usedCount || 0}/{p.maxUses} ·
                  Berlaku untuk: {p.allPackages ? 'Semua Paket' : (p.packages?.map((pp) => pp.package?.name).join(', ') || '-')}
                  {p.appliesToRegistrationFee && <> + Biaya Pendaftaran</>}
                  {p.expiresAt && <> · Kadaluarsa: {new Date(p.expiresAt).toLocaleDateString('id-ID')}</>}
                </div>
              </div>
              <button onClick={() => openPromoForm(p)} className="p-1.5 text-gray-400 hover:text-navy-600 hover:bg-gray-100 rounded-lg"><Save size={14} /></button>
              <button onClick={() => handleDeletePromo(p.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}

      {showPromoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowPromoModal(false)}>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-bold text-navy-900">{editPromo ? 'Edit Kode Promo' : 'Buat Kode Promo'}</h3>
            </div>
            <form onSubmit={handleSavePromo} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Kode Promo</label>
                <input required value={promoForm.code} onChange={(e) => setPromoForm((f) => ({ ...f, code: e.target.value }))} placeholder="mis. DISKON25" className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm uppercase" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Diskon</label>
                <div className="flex gap-2">
                  {DISCOUNT_OPTIONS.map((d) => (
                    <button key={d} type="button" onClick={() => setPromoForm((f) => ({ ...f, discountPercent: d }))} className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all ${promoForm.discountPercent === d ? 'bg-navy-900 text-white border-navy-900' : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300'}`}>{d}%</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Maksimal Pemakaian</label>
                <input type="number" value={promoForm.maxUses} onChange={(e) => setPromoForm((f) => ({ ...f, maxUses: Number(e.target.value) }))} min={1} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Berlaku untuk Paket</label>
                <label className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                  <input type="checkbox" checked={promoForm.allPackages} onChange={(e) => setPromoForm((f) => ({ ...f, allPackages: e.target.checked }))} className="rounded" />
                  Semua Paket (All Branches)
                </label>
                {!promoForm.allPackages && (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {packages.map((pkg) => (
                      <label key={pkg.id} className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={promoForm.packageIds.includes(pkg.id)}
                          onChange={(e) => setPromoForm((f) => ({
                            ...f,
                            packageIds: e.target.checked ? [...f.packageIds, pkg.id] : f.packageIds.filter((id) => id !== pkg.id),
                          }))}
                          className="rounded"
                        />
                        {pkg.name} ({pkg.sessionsPerWeek}x/mgg)
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={promoForm.appliesToRegistrationFee}
                    onChange={(e) => setPromoForm((f) => ({ ...f, appliesToRegistrationFee: e.target.checked }))}
                    className="rounded"
                  />
                  Berlaku juga untuk Biaya Pendaftaran
                </label>
                <p className="text-[11px] text-gray-400 mt-1">Kalau dicentang, diskon juga memotong biaya pendaftaran (bukan cuma harga paket).</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Tanggal Kadaluarsa (opsional)</label>
                <input type="date" value={promoForm.expiresAt} onChange={(e) => setPromoForm((f) => ({ ...f, expiresAt: e.target.value }))} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Status</label>
                <AppSelect
                  value={promoForm.status}
                  onChange={(v) => setPromoForm((f) => ({ ...f, status: v }))}
                  className="w-full"
                  options={[{ value: 'active', label: 'Aktif' }, { value: 'inactive', label: 'Nonaktif' }]}
                />
              </div>
              <button type="submit" disabled={savingPromo} className="w-full flex items-center justify-center gap-2 bg-navy-900 hover:bg-navy-800 text-white font-semibold py-2.5 rounded-2xl disabled:opacity-50">
                {savingPromo ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Simpan
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
