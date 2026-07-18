'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { LogOut, Menu, X } from 'lucide-react'
import * as api from '@/lib/api'
import NotificationBell from './NotificationBell'

const ROLE_LABEL = {
  admin: 'Admin',
  head_coach: 'Head Coach',
  coach: 'Coach',
  parent: 'Parent',
}

function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

export default function DashboardShell({ role, title, navItems, children }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    api
      .getMe()
      .then((profile) => {
        if (profile.role !== role) {
          router.replace('/login')
          return
        }
        setUser(profile)
        setLoading(false)
      })
      .catch(() => router.replace('/login'))
  }, [role, router])

  function handleLogout() {
    api.logout()
    router.replace('/login')
  }

  if (loading || !user) return null

  return (
    <div className="min-h-screen dashboard-mesh-bg flex">
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={`fixed lg:sticky top-0 h-screen w-72 flex-shrink-0 z-50 transform transition-transform duration-300 lg:translate-x-0 overflow-hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="relative h-full bg-gradient-to-b from-navy-950 via-navy-900 to-navy-950 text-white flex flex-col">
          <div
            aria-hidden="true"
            className="absolute -top-16 -left-16 w-56 h-56 rounded-full bg-gold-400/10 blur-[90px]"
          />
          <div className="relative h-16 flex items-center justify-between px-5 border-b border-white/10 shrink-0">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold-400 to-gold-600 shadow-[0_0_16px_rgba(212,168,67,0.35)]" />
              <span className="font-bold text-sm tracking-tight">{title}</span>
            </Link>
            <button className="lg:hidden text-gray-400 hover:text-white" onClick={() => setMobileOpen(false)}>
              <X size={18} />
            </button>
          </div>

          <nav className="relative flex-1 p-3 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const active = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`relative flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-2xl text-sm font-medium transition-all duration-200 ${
                    active
                      ? 'bg-gold-400/10 text-gold-300'
                      : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                  }`}
                >
                  {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-gold-400" />}
                  <item.icon size={17} className={active ? 'text-gold-400' : ''} />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="relative p-3 border-t border-white/10 shrink-0">
            <div className="flex items-center gap-3 px-2 py-2 rounded-2xl bg-white/5">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center text-navy-900 font-bold text-xs shrink-0">
                {initials(user.name)}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white truncate">{user.name}</div>
                <div className="text-[11px] text-gray-400">{ROLE_LABEL[role]}</div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white/60 backdrop-blur-xl border-b border-white/50 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 shadow-sm shadow-gray-100/50">
          <button className="lg:hidden text-navy-700" onClick={() => setMobileOpen(true)}>
            <Menu size={20} />
          </button>
          <div className="hidden lg:block text-sm text-gray-400">
            Halo, <span className="font-semibold text-navy-800">{user.name.split(' ')[0]}</span> 👋
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3">
            <NotificationBell />
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut size={16} /> <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </header>
        <main className="relative flex-1 p-4 sm:p-6 lg:p-8 overflow-hidden">
          <div aria-hidden="true" className="absolute -top-24 right-[-4rem] w-72 h-72 rounded-full bg-gold-400/20 blur-[100px] pointer-events-none" />
          <div aria-hidden="true" className="absolute top-[40%] -left-24 w-72 h-72 rounded-full bg-navy-700/15 blur-[100px] pointer-events-none" />
          <div aria-hidden="true" className="absolute bottom-[-6rem] right-[15%] w-72 h-72 rounded-full bg-emerald-400/15 blur-[100px] pointer-events-none" />
          <div key={pathname} className="relative page-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
