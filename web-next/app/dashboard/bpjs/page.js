'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  HeartPulse, Loader2, CheckCircle2, Clock, ShoppingCart, AlertTriangle, CalendarClock,
  Wallet, ArrowRight, ShieldCheck, Receipt,
} from 'lucide-react'
import * as api from '@/lib/api'

function formatRupiah(n) {
  return 'Rp' + (Number(n) || 0).toLocaleString('id-ID')
}

function formatDate(value, withTime = false) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  })
}

const STATE = {
  paid: { label: 'Lunas', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  pending: { label: 'Menunggu pembayaran', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  in_cart: { label: 'Ada di keranjang', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  overdue: { label: 'Belum dibayar', cls: 'bg-red-50 text-red-600 border-red-200' },
  none: { label: 'Belum ditagih', cls: 'bg-gray-50 text-gray-500 border-gray-200' },
  exempt: { label: 'Tidak dikenai BPJS', cls: 'bg-gray-50 text-gray-500 border-gray-200' },
}

function Badge({ state }) {
  const s = STATE[state] || STATE.none
  return <span className={`inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full border whitespace-nowrap ${s.cls}`}>{s.label}</span>
}

export default function ParentBpjsPage() {
  const router = useRouter()
  const [info, setInfo] = useState(null)
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)

  function load() {
    api.getMyBpjs().then(setInfo).catch((err) => setError(err.message))
  }

  useEffect(load, [])

  async function addToCart(goPay) {
    setAdding(true)
    setError('')
    try {
      await api.addMyBpjs()
      if (goPay) router.push('/dashboard/keranjang')
      else load()
    } catch (err) {
      setError(err.message)
    } finally {
      setAdding(false)
    }
  }

  if (error && !info) return <p className="text-sm text-red-500">{error}</p>
  if (!info) return null

  const overdue = info.history.filter((row) => row.state === 'overdue')

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-bold text-navy-900 text-lg flex items-center gap-2"><HeartPulse size={18} /> BPJS</h1>
        <p className="text-sm text-gray-400 mt-0.5">Iuran BPJS dibayar sekali tiap bulan. Pantau status bulan ini dan riwayat pembayaran di sini.</p>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}

      {!info.enabled && info.history.length === 0 ? (
        <div className="glass-card rounded-3xl p-8 text-center">
          <ShieldCheck size={28} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Iuran BPJS belum diaktifkan oleh akademi.</p>
        </div>
      ) : (
        <>
          {overdue.length > 0 && (
            <div className="flex items-start gap-3 rounded-3xl bg-red-50 border border-red-100 p-4">
              <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
              <div className="text-sm text-red-700">
                <b>{overdue.length} bulan belum dibayar:</b> {overdue.map((row) => row.label.replace('BPJS ', '')).join(', ')}.
                <Link href="/dashboard/keranjang" className="ml-1 font-semibold underline">Bayar di keranjang</Link>
              </div>
            </div>
          )}

          <div className="glass-card rounded-3xl p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="text-xs text-gray-400">Tagihan bulan ini</div>
                <div className="font-bold text-navy-900 text-lg">{info.label}</div>
              </div>
              <Badge state={info.state} />
            </div>
            <div className="mt-3 text-3xl font-extrabold text-navy-900 tabular-nums">{formatRupiah(info.amount)}</div>

            {info.state === 'paid' && (
              <p className="mt-2 text-sm text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 size={15} /> Sudah dibayar{info.paidAt ? ` pada ${formatDate(info.paidAt, true)} WIB` : ''}. Terima kasih!
              </p>
            )}
            {info.state === 'pending' && (
              <p className="mt-2 text-sm text-amber-700 flex items-center gap-1.5">
                <Clock size={15} /> Pembayaran sudah dibuat tetapi belum selesai. Selesaikan atau batalkan di keranjang.
              </p>
            )}
            {info.state === 'in_cart' && (
              <p className="mt-2 text-sm text-amber-700 flex items-center gap-1.5">
                <ShoppingCart size={15} /> Sudah ada di keranjang. Tinggal checkout untuk membayar.
              </p>
            )}
            {info.state === 'exempt' && (
              <p className="mt-2 text-sm text-gray-500">Anak Anda dikecualikan dari iuran BPJS, jadi tidak ada tagihan.</p>
            )}
            {info.state === 'none' && !info.billingStarted && info.enabled && (
              <p className="mt-2 text-sm text-gray-500 flex items-center gap-1.5">
                <CalendarClock size={15} /> Tagihan bulan ini bisa dibayar mulai tanggal {formatDate(info.dueDate)}.
              </p>
            )}

            <div className="mt-4 flex items-center gap-2 flex-wrap">
              {info.canAdd && (
                <>
                  <button
                    onClick={() => addToCart(true)}
                    disabled={adding}
                    className="flex items-center gap-1.5 bg-gold-400 hover:bg-gold-500 text-navy-900 text-sm font-semibold px-5 py-2.5 rounded-2xl disabled:opacity-50"
                  >
                    {adding ? <Loader2 size={14} className="animate-spin" /> : <ShoppingCart size={14} />} Tambah ke Keranjang & Bayar
                  </button>
                  <button
                    onClick={() => addToCart(false)}
                    disabled={adding}
                    className="text-sm font-semibold text-gray-500 hover:text-navy-700 px-3 py-2.5 disabled:opacity-50"
                  >
                    Tambah saja
                  </button>
                </>
              )}
              {(info.state === 'in_cart' || info.state === 'pending') && (
                <Link href="/dashboard/keranjang" className="flex items-center gap-1.5 bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold px-5 py-2.5 rounded-2xl">
                  Ke Keranjang <ArrowRight size={14} />
                </Link>
              )}
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div className="glass-card rounded-3xl p-4">
              <div className="text-[11px] text-gray-400 flex items-center gap-1.5"><CalendarClock size={12} /> Ditagih tiap bulan</div>
              <div className="mt-1 font-bold text-navy-900">Tanggal {info.billingDay}</div>
            </div>
            <div className="glass-card rounded-3xl p-4">
              <div className="text-[11px] text-gray-400 flex items-center gap-1.5"><Receipt size={12} /> Tagihan berikutnya</div>
              <div className="mt-1 font-bold text-navy-900">{info.nextBilling ? formatDate(info.nextBilling.date) : '-'}</div>
              {info.nextBilling && <div className="text-[11px] text-gray-400">{info.nextBilling.label}</div>}
            </div>
            <div className="glass-card rounded-3xl p-4">
              <div className="text-[11px] text-gray-400 flex items-center gap-1.5"><Wallet size={12} /> Total sudah dibayar</div>
              <div className="mt-1 font-bold text-navy-900">{formatRupiah(info.paidTotal)}</div>
              <div className="text-[11px] text-gray-400">{info.paidCount} bulan</div>
            </div>
          </div>

          <div className="glass-card rounded-3xl p-5">
            <h2 className="font-bold text-navy-900 text-sm mb-3">Cara membayar</h2>
            <ol className="space-y-2 text-sm text-gray-600 list-decimal pl-5">
              <li>Tekan <b>Tambah ke Keranjang & Bayar</b>. Satu tagihan per bulan, nominal sudah ditentukan akademi.</li>
              <li>Di keranjang, tekan <b>Checkout & Bayar</b> lalu bayar dengan QRIS.</li>
              <li>Setelah lunas, status berubah otomatis dan tercatat di riwayat di bawah.</li>
            </ol>
          </div>

          <div className="glass-card rounded-3xl overflow-hidden">
            <div className="px-5 pt-5 pb-3">
              <h2 className="font-bold text-navy-900 text-sm">Riwayat BPJS</h2>
            </div>
            {info.history.length === 0 ? (
              <p className="px-5 pb-6 text-sm text-gray-400">Belum ada riwayat tagihan BPJS.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {info.history.map((row) => (
                  <div key={row.id} className="px-5 py-3.5 flex items-center gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-navy-900 text-sm">{row.label}</div>
                      <div className="text-[11px] text-gray-400">
                        {row.state === 'paid'
                          ? `Dibayar ${formatDate(row.paidAt, true)} WIB${row.paymentMethod ? ` · ${row.paymentMethod}` : ''}`
                          : row.state === 'overdue' ? 'Sudah lewat bulannya, belum dibayar'
                          : row.state === 'pending' ? 'Menunggu pembayaran selesai'
                          : 'Belum dibayar'}
                      </div>
                    </div>
                    <div className="text-sm font-bold text-navy-900 tabular-nums">{formatRupiah(row.amount)}</div>
                    <Badge state={row.state} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
