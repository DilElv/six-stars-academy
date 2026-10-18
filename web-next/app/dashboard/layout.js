'use client'

import { Home, User, Calendar, Wallet, FileText, Trophy } from 'lucide-react'
import DashboardShell from '@/components/DashboardShell'

// Menu Keranjang & Toko sengaja belum ditampilkan (rilis berikutnya). Mekanisme
// tagihannya tetap jalan di belakang layar: parent melihat & membayar tagihan
// dari admin lewat menu Perpanjang Paket di Dasbor / Pembayaran.
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
