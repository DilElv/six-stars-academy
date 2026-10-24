'use client'

import { Home, ClipboardList, Users, Star, User, Trophy, Wallet, CalendarDays, Banknote, HeartPulse, CalendarCheck, Store, UserCheck, ReceiptText, ShoppingBag } from 'lucide-react'
import DashboardShell from '@/components/DashboardShell'

const navItems = [
  { href: '/head-coach', label: 'Dasbor', icon: Home },
  { href: '/head-coach/absensi', label: 'Absensi', icon: ClipboardList },
  { href: '/head-coach/absensi-coach', label: 'Absensi Coach', icon: CalendarCheck },
  { href: '/head-coach/penugasan', label: 'Penugasan Coach', icon: UserCheck },
  { href: '/head-coach/data-anak', label: 'Data Anak', icon: Users },
  { href: '/head-coach/jadwal', label: 'Jadwal', icon: CalendarDays },
  { href: '/head-coach/penilaian', label: 'Penilaian', icon: Star },
  { href: '/head-coach/event', label: 'Event', icon: Trophy },
  { href: '/head-coach/keuangan', label: 'Keuangan', icon: Wallet },
  { href: '/head-coach/tagihan', label: 'Tagihan Parent', icon: ReceiptText },
  { href: '/head-coach/payroll', label: 'Payroll', icon: Banknote },
  { href: '/head-coach/bpjs', label: 'BPJS', icon: HeartPulse },
  { href: '/head-coach/toko', label: 'Toko', icon: Store },
  { href: '/head-coach/pesanan', label: 'Pesanan Merch', icon: ShoppingBag },
  { href: '/head-coach/profil', label: 'Profil', icon: User },
]

export default function HeadCoachLayout({ children }) {
  return (
    <DashboardShell role="head_coach" title="Head Coach" navItems={navItems}>
      {children}
    </DashboardShell>
  )
}
