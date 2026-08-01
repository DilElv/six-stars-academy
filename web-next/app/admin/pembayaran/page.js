'use client'

import { useState } from 'react'
import { TrendingUp, TrendingDown, Scale } from 'lucide-react'
import PemasukanTab from '@/components/finance/PemasukanTab'
import PengeluaranTab from '@/components/finance/PengeluaranTab'
import LabaTab from '@/components/finance/LabaTab'

const TABS = [
  { key: 'pemasukan', label: 'Pemasukan', icon: TrendingUp },
  { key: 'pengeluaran', label: 'Pengeluaran', icon: TrendingDown },
  { key: 'laba', label: 'Laba & Overview', icon: Scale },
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
    </div>
  )
}
