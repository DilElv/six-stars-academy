'use client'

import { Home, ClipboardList, CalendarDays, User, Trophy, FileBarChart, Banknote } from 'lucide-react'
import DashboardShell from '@/components/DashboardShell'

const navItems = [
  { href: '/coach', label: 'Dasbor', icon: Home },
  { href: '/coach/absensi', label: 'Absensi', icon: ClipboardList },
  { href: '/coach/laporan', label: 'Laporan', icon: FileBarChart },
  { href: '/coach/gaji', label: 'Gaji Saya', icon: Banknote },
  { href: '/coach/jadwal', label: 'Jadwal', icon: CalendarDays },
  { href: '/coach/event', label: 'Event', icon: Trophy },
  { href: '/coach/profil', label: 'Profil', icon: User },
]

export default function CoachLayout({ children }) {
  return (
    <DashboardShell role="coach" title="Coach" navItems={navItems}>
      {children}
    </DashboardShell>
  )
}
