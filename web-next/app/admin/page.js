'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, Shield, UserCog, ClipboardList, AlertCircle, FileWarning, TrendingUp } from 'lucide-react'
import * as api from '@/lib/api'
import { AGE_GROUPS } from '@/lib/ageGroups'
import AgeGroupBarChart from '@/components/charts/AgeGroupBarChart'
import PaymentStatusDonut from '@/components/charts/PaymentStatusDonut'
import RevenueAreaChart from '@/components/charts/RevenueAreaChart'

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
  navy: 'bg-gradient-to-br from-navy-600 to-navy-800 text-gold-300 shadow-md shadow-navy-900/25',
  emerald: 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-md shadow-emerald-500/25',
  amber: 'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-md shadow-amber-500/25',
}

export default function AdminDasborPage() {
  const [stats, setStats] = useState(null)
  const [byGroup, setByGroup] = useState(null)
  const [paymentCounts, setPaymentCounts] = useState(null)
  const [revenueTrend, setRevenueTrend] = useState(null)

  useEffect(() => {
    api.getAdminStats().then(setStats)
    api.getRevenueTrend().then(setRevenueTrend)
    Promise.all(AGE_GROUPS.map((ag) => api.getStudents(ag))).then((results) => {
      const map = {}
      AGE_GROUPS.forEach((ag, i) => { map[ag] = results[i].length })
      setByGroup(map)
    })
    api.getAllPayments().then((payments) => {
      const counts = { success: 0, pending: 0, failed: 0 }
      for (const p of payments) counts[p.status] = (counts[p.status] || 0) + 1
      setPaymentCounts(counts)
    })
  }, [])

  const chartData = AGE_GROUPS.map((ag) => ({ ageGroup: ag, count: byGroup?.[ag] ?? 0 }))

  return (
    <div className="space-y-6">
      <h1 className="font-bold text-navy-900 text-lg">Dasbor Admin</h1>

      {/* Revenue hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy-900 via-navy-900 to-navy-800 p-6">
        <div aria-hidden="true" className="absolute -top-10 -right-10 w-56 h-56 rounded-full bg-gold-400/15 blur-[80px] animate-floodlight" />
        <div className="relative flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gold-400/15 border border-gold-400/25 flex items-center justify-center shrink-0">
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

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {CARDS.map((c) => (
          <Link
            key={c.key}
            href={c.href}
            className="group flex items-center gap-3 sm:gap-4 glass-card rounded-3xl p-3.5 sm:p-5 hover:border-gold-300 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
          >
            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center shrink-0 ${TONE[c.tone]}`}>
              <c.icon size={16} />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] sm:text-xs text-gray-400 mb-0.5">{c.label}</div>
              <div className="text-lg sm:text-xl font-bold text-navy-900 tabular-nums">
                {stats ? stats[c.key] : '...'}
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="glass-card rounded-3xl p-6">
        <h2 className="text-sm font-semibold text-gray-500 mb-4">Tren Pendapatan 6 Bulan Terakhir</h2>
        {revenueTrend ? <RevenueAreaChart data={revenueTrend} /> : <div className="h-[220px]" />}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="glass-card rounded-3xl p-6">
          <h2 className="text-sm font-semibold text-gray-500 mb-4">Distribusi Siswa per Kelompok Umur</h2>
          {byGroup ? <AgeGroupBarChart data={chartData} /> : <div className="h-[220px]" />}
        </div>
        <div className="glass-card rounded-3xl p-6">
          <h2 className="text-sm font-semibold text-gray-500 mb-4">Status Pembayaran</h2>
          {paymentCounts ? <PaymentStatusDonut counts={paymentCounts} /> : <div className="h-[200px]" />}
        </div>
      </div>
    </div>
  )
}
