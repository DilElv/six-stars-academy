'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { HeartPulse, Loader2, CheckCircle2, ArrowRight } from 'lucide-react'
import * as api from '@/lib/api'

function formatRupiah(n) {
  return 'Rp' + (Number(n) || 0).toLocaleString('id-ID')
}

const STATE_TEXT = {
  paid: { text: 'Sudah dibayar', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  in_cart: { text: 'Ada di keranjang', style: 'bg-amber-50 text-amber-700 border-amber-200' },
  pending: { text: 'Menunggu pembayaran', style: 'bg-amber-50 text-amber-700 border-amber-200' },
  exempt: { text: 'Tidak dikenai BPJS', style: 'bg-gray-50 text-gray-500 border-gray-200' },
  none: { text: 'Belum ditagih', style: 'bg-gray-50 text-gray-500 border-gray-200' },
}

/** Status BPJS bulan berjalan untuk parent + tombol tambah ke keranjang. */
export default function ParentBpjsCard({ onChanged, showCartLink = true }) {
  const [info, setInfo] = useState(null)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  function load() {
    api.getMyBpjs().then(setInfo).catch(() => setInfo(null))
  }

  useEffect(load, [])

  async function handleAdd() {
    setAdding(true)
    setError('')
    try {
      await api.addMyBpjs()
      load()
      onChanged?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setAdding(false)
    }
  }

  // BPJS belum diaktifkan admin: tidak ada yang perlu ditampilkan.
  if (!info || (!info.enabled && info.state === 'none')) return null
  const badge = STATE_TEXT[info.state] || STATE_TEXT.none

  return (
    <div className="glass-card rounded-3xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4 flex-wrap">
      <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
        {info.state === 'paid' ? <CheckCircle2 size={20} /> : <HeartPulse size={20} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-navy-900 text-sm">{info.label}</div>
        <div className="mt-1 flex items-center gap-2 flex-wrap">
          <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full border ${badge.style}`}>{badge.text}</span>
          {info.amount > 0 && <span className="text-xs text-gray-400">{formatRupiah(info.amount)} / bulan</span>}
        </div>
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>
      {info.canAdd && (
        <button
          onClick={handleAdd}
          disabled={adding}
          className="flex items-center gap-1.5 bg-gold-400 hover:bg-gold-500 text-navy-900 text-sm font-semibold px-4 py-2 rounded-2xl disabled:opacity-50"
        >
          {adding && <Loader2 size={14} className="animate-spin" />} Tambah ke Keranjang
        </button>
      )}
      {showCartLink && info.state === 'in_cart' && (
        <Link href="/dashboard/keranjang" className="flex items-center gap-1.5 bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold px-4 py-2 rounded-2xl">
          Bayar <ArrowRight size={14} />
        </Link>
      )}
    </div>
  )
}
