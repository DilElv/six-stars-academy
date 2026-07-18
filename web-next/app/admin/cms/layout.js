'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, Sparkles, LayoutList, CalendarClock, Images, Handshake } from 'lucide-react'

const TABS = [
  { href: '/admin/cms', label: 'Menu', icon: LayoutGrid },
  { href: '/admin/cms/statistik', label: 'Statistik', icon: Sparkles },
  { href: '/admin/cms/program', label: 'Program', icon: LayoutList },
  { href: '/admin/cms/jadwal', label: 'Jadwal', icon: CalendarClock },
  { href: '/admin/cms/galeri', label: 'Galeri', icon: Images },
  { href: '/admin/cms/sponsor', label: 'Sponsor', icon: Handshake },
]

export default function CmsLayout({ children }) {
  const pathname = usePathname()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {TABS.map((t) => {
          const active = pathname === t.href
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex items-center gap-1.5 shrink-0 text-sm font-semibold px-4 py-2.5 rounded-2xl transition-colors duration-150 ${
                active ? 'bg-navy-900 text-white shadow-md' : 'bg-white/60 text-gray-500 hover:text-navy-800 hover:bg-white border border-gray-100'
              }`}
            >
              <t.icon size={15} />
              {t.label}
            </Link>
          )
        })}
      </div>
      {children}
    </div>
  )
}
