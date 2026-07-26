'use client'

import { useEffect, useState } from 'react'
import { Check, Loader2, Wallet, CheckCircle2, Clock, FileSpreadsheet, FileText, Tag, Plus, Trash2, Save, RefreshCw } from 'lucide-react'
import * as api from '@/lib/api'
import { AppSelect } from '@/components/ui/app-select'
import { exportPaymentsToExcel, exportPaymentsToPDF } from '@/lib/export'

const statusMap = {
  success: { label: 'Lunas', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  pending: { label: 'Menunggu Verifikasi', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  failed: { label: 'Gagal', color: 'bg-red-50 text-red-700 border-red-200' },
}

function formatRupiah(n) {
  return 'Rp' + (n || 0).toLocaleString('id-ID')
}

export default function AdminPembayaranPage() {
  const [tab, setTab] = useState('pembayaran')
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [verifying, setVerifying] = useState('')

  const [promoCodes, setPromoCodes] = useState([])
  const [promosLoading, setPromosLoading] = useState(false)
  const [packages, setPackages] = useState([])
  const [showPromoModal, setShowPromoModal] = useState(false)
  const [editPromo, setEditPromo] = useState(null)
  const [promoForm, setPromoForm] = useState({ code: '', discountPercent: 25, maxUses: 1, allPackages: false, packageIds: [], expiresAt: '', status: 'active' })
  const [savingPromo, setSavingPromo] = useState(false)

  function load() {
    setLoading(true)
    api.getAllPayments(filterStatus || undefined).then(setPayments).finally(() => setLoading(false))
  }

  useEffect(load, [filterStatus])

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

  useEffect(() => { if (tab === 'promo') loadPromos() }, [tab])

  async function handleVerify(id) {
    setVerifying(id)
    try {
      await api.updatePayment(id, { status: 'success', paymentMethod: 'transfer' })
      load()
    } finally {
      setVerifying('')
    }
  }

  function openPromoForm(promo) {
    if (promo) {
      setEditPromo(promo)
      setPromoForm({
        code: promo.code,
        discountPercent: promo.discountPercent,
        maxUses: promo.maxUses,
        allPackages: promo.allPackages,
        packageIds: promo.packages?.map((p) => p.packageId) || [],
        expiresAt: promo.expiresAt ? promo.expiresAt.slice(0, 10) : '',
        status: promo.status,
      })
    } else {
      setEditPromo(null)
      setPromoForm({ code: '', discountPercent: 25, maxUses: 1, allPackages: false, packageIds: [], expiresAt: '', status: 'active' })
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
    <div className="space-y-6">
      <div className="flex items-center gap-1 bg-gray-100 rounded-2xl p-1 w-fit">
        <button onClick={() => setTab('pembayaran')} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === 'pembayaran' ? 'bg-white shadow-sm text-navy-900' : 'text-gray-500 hover:text-navy-700'}`}>Pembayaran</button>
        <button onClick={() => setTab('promo')} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === 'promo' ? 'bg-white shadow-sm text-navy-900' : 'text-gray-500 hover:text-navy-700'}`}>Kode Promo</button>
      </div>

      {tab === 'pembayaran' ? (
        <>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h1 className="font-bold text-navy-900 text-lg">Pembayaran</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <AppSelect
                value={filterStatus}
                onChange={setFilterStatus}
                allLabel="Semua Status"
                placeholder="Semua Status"
                options={[
                  { value: 'pending', label: 'Menunggu Verifikasi' },
                  { value: 'success', label: 'Lunas' },
                  { value: 'failed', label: 'Gagal' },
                ]}
              />
              <button onClick={() => exportPaymentsToExcel(payments)} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-xl"><FileSpreadsheet size={14} /> Excel</button>
              <button onClick={() => exportPaymentsToPDF(payments)} className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-2 rounded-xl"><FileText size={14} /> PDF</button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <div className="glass-card rounded-3xl p-3 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-navy-600 to-navy-800 text-gold-300 shadow-md shadow-navy-900/25 flex items-center justify-center shrink-0"><Wallet size={15} /></div>
              <div className="min-w-0">
                <div className="text-[10px] sm:text-xs text-gray-400 mb-0.5">Pendapatan Lunas</div>
                <div className="text-xs sm:text-lg font-bold text-navy-900 leading-tight break-all sm:break-normal">{formatRupiah(payments.filter((p) => p.status === 'success').reduce((sum, p) => sum + p.totalAmount, 0))}</div>
              </div>
            </div>
            <div className="glass-card rounded-3xl p-3 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-md shadow-emerald-500/25 flex items-center justify-center shrink-0"><CheckCircle2 size={15} /></div>
              <div className="min-w-0">
                <div className="text-[10px] sm:text-xs text-gray-400 mb-0.5">Transaksi Lunas</div>
                <div className="text-sm sm:text-lg font-bold text-navy-900">{payments.filter((p) => p.status === 'success').length}</div>
              </div>
            </div>
            <div className="glass-card rounded-3xl p-3 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-md shadow-amber-500/25 flex items-center justify-center shrink-0"><Clock size={15} /></div>
              <div className="min-w-0">
                <div className="text-[10px] sm:text-xs text-gray-400 mb-0.5">Pending</div>
                <div className="text-sm sm:text-lg font-bold text-navy-900">{payments.filter((p) => p.status === 'pending').length}</div>
              </div>
            </div>
          </div>

          {loading ? null : payments.length === 0 ? (
            <div className="glass-card rounded-3xl p-10 text-center text-sm text-gray-400">Tidak ada transaksi.</div>
          ) : (
            <div className="space-y-3">
              {payments.map((p) => {
                const s = statusMap[p.status] || statusMap.pending
                return (
                  <div key={p.id} className="flex items-center gap-4 glass-card rounded-3xl p-4 hover:border-gold-200 transition-colors duration-200">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-navy-900 truncate">{p.student?.fullName}</div>
                      <div className="text-xs text-gray-400">{p.student?.studentId} · {p.student?.parentName}</div>
                      <div className="text-xs text-gray-400">{p.package?.name || '-'} · {new Date(p.paidAt || p.createdAt).toLocaleDateString('id-ID')}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-navy-900">{formatRupiah(p.totalAmount)}</div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${s.color}`}>{s.label}</span>
                    </div>
                    {p.status === 'pending' && (
                      <button
                        onClick={() => handleVerify(p.id)}
                        disabled={verifying === p.id}
                        className="shrink-0 flex items-center gap-1 text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2 rounded-xl disabled:opacity-50"
                      >
                        {verifying === p.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Verifikasi
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      ) : (
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
                      {p.expiresAt && <> · Kadaluarsa: {new Date(p.expiresAt).toLocaleDateString('id-ID')}</>}
                    </div>
                  </div>
                  <button onClick={() => openPromoForm(p)} className="p-1.5 text-gray-400 hover:text-navy-600 hover:bg-gray-100 rounded-lg"><Save size={14} /></button>
                  <button onClick={() => handleDeletePromo(p.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          )}
        </>
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
                        {pkg.name} ({pkg.sessionsPerWeek}x/mgg · {formatRupiah(pkg.price)})
                      </label>
                    ))}
                  </div>
                )}
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
    </div>
  )
}
