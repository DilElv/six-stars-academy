'use client'

import { Home, Users, Shield, UserCog, Wallet, ClipboardList, Calendar, Trophy, Globe, Settings, ShieldCheck, Store, Banknote, UserCheck, HeartPulse, ReceiptText } from 'lucide-react'
import DashboardShell from '@/components/DashboardShell'

const navItems = [
  { href: '/admin', label: 'Dasbor', icon: Home },
  { href: '/admin/data-anak', label: 'Data Anak', icon: Users },
  { href: '/admin/head-coach', label: 'Data Head Coach', icon: Shield },
  { href: '/admin/coach', label: 'Data Coach', icon: UserCog },
  { href: '/admin/data-admin', label: 'Data Admin', icon: ShieldCheck },
  { href: '/admin/toko', label: 'Toko', icon: Store },
  { href: '/admin/pembayaran', label: 'Keuangan', icon: Wallet },
  { href: '/admin/tagihan', label: 'Tagihan Parent', icon: ReceiptText },
  { href: '/admin/payroll', label: 'Payroll', icon: Banknote },
  { href: '/admin/bpjs', label: 'BPJS', icon: HeartPulse },
  { href: '/admin/absensi', label: 'Absensi', icon: ClipboardList },
  { href: '/admin/absensi-coach', label: 'Absensi Coach', icon: UserCheck },
  { href: '/admin/jadwal', label: 'Jadwal Latihan', icon: Calendar },
  { href: '/admin/event', label: 'Event', icon: Trophy },
  { href: '/admin/cms', label: 'CMS Landing Page', icon: Globe },
  { href: '/admin/pengaturan', label: 'Pengaturan', icon: Settings },
]

export default function AdminLayout({ children }) {
  return (
    <DashboardShell role="admin" title="Admin" navItems={navItems}>
      {children}
    </DashboardShell>
  )
}
