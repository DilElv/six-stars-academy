'use client'

import { Home, ClipboardList, BookOpen, User, Trophy } from 'lucide-react'
import DashboardShell from '@/components/DashboardShell'

const navItems = [
  { href: '/coach', label: 'Dasbor', icon: Home },
  { href: '/coach/absensi', label: 'Absensi', icon: ClipboardList },
  { href: '/coach/topik-latihan', label: 'Topik Latihan', icon: BookOpen },
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
