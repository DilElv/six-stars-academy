'use client'

import { useEffect, useState } from 'react'
import { Loader2, Plus, Save, Tag, Trash2, TrendingUp, TrendingDown, Scale } from 'lucide-react'
import * as api from '@/lib/api'
import { AppSelect } from '@/components/ui/app-select'
import PemasukanTab from '@/components/finance/PemasukanTab'
import PengeluaranTab from '@/components/finance/PengeluaranTab'
import LabaTab from '@/components/finance/LabaTab'

const TABS = [
  { key: 'pemasukan', label: 'Pemasukan', icon: TrendingUp },
  { key: 'pengeluaran', label: 'Pengeluaran', icon: TrendingDown },
  { key: 'laba', label: 'Laba & Overview', icon: Scale },
  { key: 'promo', label: 'Kode Promo', icon: Tag },
]

export default function AdminPembayaranPage() {
  const [tab, setTab] = useState('pemasukan')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-navy-900 text-xl">Keuangan</h1>
        <p className="text-sm text-gray-400 mt-0.5">Pembukuan pemasukan, pengeluaran, dan laba rugi SixStars Academy — sinkron real-time.</p>
      </div>

      <div className="flex items-center gap-1 bg-gray-100 rounded-2xl p-1 w-fit flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${tab === t.key ? 'bg-white shadow-sm text-navy-900' : 'text-gray-500 hover:text-navy-700'}`}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'pemasukan' && <PemasukanTab canVerifyPayments />}
      {tab === 'pengeluaran' && <PengeluaranTab />}
      {tab === 'laba' && <LabaTab />}
      {tab === 'promo' && <PromoTab />}
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setShowPromoModal(false)}>
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
