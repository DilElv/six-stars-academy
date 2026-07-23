'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { LogOut, X, Grid2x2 } from 'lucide-react'
import * as api from '@/lib/api'
import NotificationBell from './NotificationBell'

const MAX_TABS = 4

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
  const [moreOpen, setMoreOpen] = useState(false)

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
        if (profile.access === 'payment-only' && pathname !== '/dashboard/pembayaran') {
          router.replace('/dashboard/pembayaran')
        }
      })
      .catch(() => router.replace('/login'))
  }, [role, router])

  useEffect(() => {
    setMoreOpen(false)
  }, [pathname])

  useEffect(() => {
    document.body.style.overflow = moreOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [moreOpen])

  function handleLogout() {
    api.logout()
    router.replace('/login')
  }

  if (loading || !user) return null

  const showMore = navItems.length > MAX_TABS
  const tabItems = showMore ? navItems.slice(0, MAX_TABS - 1) : navItems
  const moreItems = showMore ? navItems.slice(MAX_TABS - 1) : []

  return (
    <div className="min-h-screen dashboard-mesh-bg flex">
      <aside className="hidden lg:sticky lg:flex top-0 h-screen w-72 flex-shrink-0 z-50 overflow-hidden">
        <div className="relative h-full w-full bg-gradient-to-b from-navy-950 via-navy-900 to-navy-950 text-white flex flex-col">
          <div
            aria-hidden="true"
            className="absolute -top-16 -left-16 w-56 h-56 rounded-full bg-gold-400/10 blur-[90px]"
          />
          <div className="relative min-h-16 py-2 flex items-center px-5 border-b border-white/10 shrink-0">
            <Link href="/" className="flex items-center gap-2.5 min-w-0">
              <img src="/logo.png" alt="SixStars Academy" className="h-11 w-auto object-contain shrink-0" />
              <span className="font-bold text-sm tracking-tight truncate">{title}</span>
            </Link>
          </div>

          <nav className="relative flex-1 p-3 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const active = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
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
          <Link href="/" className="flex items-center gap-2 lg:hidden min-w-0">
            <img src="/logo.png" alt="SixStars Academy" className="h-9 w-auto object-contain shrink-0" />
            <span className="font-bold text-sm text-navy-900 truncate">{title}</span>
          </Link>
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
        <main className="relative flex-1 p-4 sm:p-6 lg:p-8 pb-28 lg:pb-8 overflow-hidden">
          <div aria-hidden="true" className="absolute -top-24 right-[-4rem] w-72 h-72 rounded-full bg-gold-400/20 blur-[100px] pointer-events-none" />
          <div aria-hidden="true" className="absolute top-[40%] -left-24 w-72 h-72 rounded-full bg-navy-700/15 blur-[100px] pointer-events-none" />
          <div aria-hidden="true" className="absolute bottom-[-6rem] right-[15%] w-72 h-72 rounded-full bg-emerald-400/15 blur-[100px] pointer-events-none" />
          <div key={pathname} className="relative page-fade-in">
            {children}
          </div>
        </main>
      </div>

      {/* Floating bottom nav (mobile only) */}
      <nav className="lg:hidden fixed bottom-4 left-4 right-4 z-40 bg-navy-950/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-black/30 border border-white/10 flex items-stretch">
        {tabItems.map((item) => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex-1 flex flex-col items-center justify-center gap-1 py-2.5 min-w-0"
            >
              {active && <span className="absolute top-1.5 w-1 h-1 rounded-full bg-gold-400" />}
              <item.icon size={19} className={active ? 'text-gold-400' : 'text-gray-400'} />
              <span className={`text-[10px] font-semibold truncate max-w-full px-1 ${active ? 'text-gold-300' : 'text-gray-400'}`}>
                {item.label}
              </span>
            </Link>
          )
        })}
        {showMore && (
          <button
            onClick={() => setMoreOpen(true)}
            className={`relative flex-1 flex flex-col items-center justify-center gap-1 py-2.5 min-w-0 ${
              moreOpen || moreItems.some((i) => i.href === pathname) ? 'text-gold-300' : 'text-gray-400'
            }`}
          >
            <Grid2x2 size={19} className={moreItems.some((i) => i.href === pathname) ? 'text-gold-400' : ''} />
            <span className="text-[10px] font-semibold">Lainnya</span>
          </button>
        )}
      </nav>

      {/* "Lainnya" bottom sheet (mobile only) */}
      {showMore && (
        <div
          className={`lg:hidden fixed inset-0 z-50 transition-opacity duration-300 ${
            moreOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
          role="dialog"
          aria-modal="true"
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMoreOpen(false)} />
          <div
            className={`absolute left-0 right-0 bottom-0 bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out ${
              moreOpen ? 'translate-y-0' : 'translate-y-full'
            }`}
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <span className="text-sm font-bold text-navy-900">Menu Lainnya</span>
              <button
                onClick={() => setMoreOpen(false)}
                className="text-gray-400 hover:text-navy-700 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Tutup"
              >
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3 px-5 pt-2 pb-8">
              {moreItems.map((item) => {
                const active = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex flex-col items-center justify-center gap-2 rounded-2xl py-4 px-2 text-center transition-colors ${
                      active ? 'bg-gold-400/10 ring-1 ring-gold-400/40' : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${active ? 'bg-gold-400 text-navy-900' : 'bg-white text-navy-700 shadow-sm'}`}>
                      <item.icon size={18} />
                    </div>
                    <span className={`text-[11px] font-semibold leading-tight ${active ? 'text-gold-700' : 'text-navy-800'}`}>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
