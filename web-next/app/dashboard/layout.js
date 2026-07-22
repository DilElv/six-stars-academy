'use client'

import { Home, User, Calendar, Wallet, FileText, Trophy } from 'lucide-react'
import DashboardShell from '@/components/DashboardShell'

const navItems = [
  { href: '/dashboard', label: 'Dasbor', icon: Home },
  { href: '/dashboard/profil', label: 'Profil Anak', icon: User },
  { href: '/dashboard/jadwal', label: 'Jadwal', icon: Calendar },
  { href: '/dashboard/pembayaran', label: 'Pembayaran', icon: Wallet },
  { href: '/dashboard/event', label: 'Event', icon: Trophy },
  { href: '/dashboard/rapor', label: 'Rapor', icon: FileText },
]

export default function ParentDashboardLayout({ children }) {
  return (
    <DashboardShell role="parent" title="Parent" navItems={navItems}>
      {children}
    </DashboardShell>
  )
}
