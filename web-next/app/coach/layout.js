'use client'

import { Home, ClipboardList, CalendarDays, User, Trophy } from 'lucide-react'
import DashboardShell from '@/components/DashboardShell'

// Menu Laporan coach (isi rapor & penilaian read-only) disembunyikan sampai
// rilis berikutnya — halaman /coach/laporan tetap ada di kode.
const navItems = [
  { href: '/coach', label: 'Dasbor', icon: Home },
  { href: '/coach/absensi', label: 'Absensi', icon: ClipboardList },
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
