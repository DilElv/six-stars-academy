'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, Shield, UserCog, ClipboardList, AlertCircle, FileWarning, TrendingUp } from 'lucide-react'
import * as api from '@/lib/api'

function formatRupiah(n) {
  return 'Rp' + (n || 0).toLocaleString('id-ID')
}

const CARDS = [
  { key: 'totalAnak', label: 'Total Anak Aktif', icon: Users, href: '/admin/data-anak', tone: 'navy' },
  { key: 'totalHeadCoach', label: 'Total Head Coach', icon: Shield, href: '/admin/head-coach', tone: 'navy' },
  { key: 'totalCoach', label: 'Total Coach', icon: UserCog, href: '/admin/coach', tone: 'navy' },
  { key: 'absensiHariIni', label: 'Absensi Hari Ini', icon: ClipboardList, href: '/admin/absensi', tone: 'emerald' },
  { key: 'pembayaranPending', label: 'Pembayaran Pending', icon: AlertCircle, href: '/admin/pembayaran', tone: 'amber' },
  { key: 'raporBelumDibuat', label: 'Rapor Belum Dibuat', icon: FileWarning, href: '/admin/data-anak', tone: 'amber' },
]

const TONE = {
  navy: 'bg-navy-50 text-navy-700',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
}

export default function AdminDasborPage() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    api.getAdminStats().then(setStats)
  }, [])

  return (
    <div className="space-y-6">
      <h1 className="font-bold text-navy-900 text-lg">Dasbor Admin</h1>

      {/* Revenue hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-navy-900 via-navy-900 to-navy-800 p-6">
        <div aria-hidden="true" className="absolute -top-10 -right-10 w-56 h-56 rounded-full bg-gold-400/15 blur-[80px] animate-floodlight" />
        <div className="relative flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gold-400/15 border border-gold-400/25 flex items-center justify-center shrink-0">
            <TrendingUp size={20} className="text-gold-400" />
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">Pendapatan Bulan Ini</div>
            <div className="text-3xl font-extrabold text-white tabular-nums">
              {stats ? formatRupiah(stats.pendapatanBulanIni) : '...'}
            </div>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CARDS.map((c) => (
          <Link
            key={c.key}
            href={c.href}
            className="group flex items-center gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-gold-300 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${TONE[c.tone]}`}>
              <c.icon size={18} />
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-0.5">{c.label}</div>
              <div className="text-xl font-bold text-navy-900 tabular-nums">
                {stats ? stats[c.key] : '...'}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
