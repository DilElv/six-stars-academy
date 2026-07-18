'use client'

import { Home, Users, Shield, UserCog, Wallet, ClipboardList, Calendar, Globe, Settings } from 'lucide-react'
import DashboardShell from '@/components/DashboardShell'

const navItems = [
  { href: '/admin', label: 'Dasbor', icon: Home },
  { href: '/admin/data-anak', label: 'Data Anak', icon: Users },
  { href: '/admin/head-coach', label: 'Data Head Coach', icon: Shield },
  { href: '/admin/coach', label: 'Data Coach', icon: UserCog },
  { href: '/admin/pembayaran', label: 'Pembayaran', icon: Wallet },
  { href: '/admin/absensi', label: 'Absensi', icon: ClipboardList },
  { href: '/admin/jadwal', label: 'Jadwal Latihan', icon: Calendar },
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
