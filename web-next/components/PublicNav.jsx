'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Menu, X, ChevronRight, Home, Dumbbell, CalendarDays,
  Image as ImageIcon, Award, Info, LogIn, UserPlus,
} from 'lucide-react'
import { REGISTER_WHATSAPP_URL } from '@/lib/whatsapp'

const navLinks = [
  { href: '/', label: 'Beranda', icon: Home },
  { href: '/program', label: 'Program', icon: Dumbbell },
  { href: '/jadwal', label: 'Jadwal', icon: CalendarDays },
  { href: '/galeri', label: 'Galeri', icon: ImageIcon },
  { href: '/sponsor', label: 'Sponsor', icon: Award },
  { href: '/paket', label: 'Informasi', icon: Info },
]

export default function PublicNav() {
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 12)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  return (
    <nav
      className={`sticky top-0 z-40 transition-all duration-300 bg-navy-950 ${
        scrolled ? 'shadow-lg shadow-black/40 border-b border-white/10' : 'border-b border-transparent'
      }`}
    >
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between transition-all duration-300 ${scrolled ? 'h-16' : 'h-20'}`}>
        <Link href="/" className="flex items-center gap-2.5 group shrink-0">
          <img
            src="/logo.png"
            alt="SixStars Academy Indonesia"
            className="h-12 sm:h-14 w-auto object-contain transition-transform duration-300 group-hover:scale-105 shrink-0"
          />
          <div className="leading-none">
            <div className="font-heading font-semibold text-white text-[15px] sm:text-base tracking-wide uppercase">SixStars Academy</div>
            <div className="text-[10px] text-gold-400/80 tracking-[0.25em] uppercase">Indonesia</div>
          </div>
        </Link>

        <div className="hidden lg:flex items-center gap-7">
          {navLinks.map((l) => {
            const active = pathname === l.href
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`relative text-sm font-medium transition-colors group py-1 ${active ? 'text-gold-400' : 'text-gray-300 hover:text-white'}`}
              >
                {l.label}
                <span className={`absolute -bottom-1 left-0 h-px bg-gold-400 transition-all duration-300 ${active ? 'w-full' : 'w-0 group-hover:w-full'}`} />
              </Link>
            )
          })}
        </div>

        <div className="hidden lg:flex items-center gap-3 shrink-0">
          <Link href="/login" className="text-sm font-semibold text-white hover:text-gold-400 transition-colors">
            Masuk
          </Link>
          <a
            href={REGISTER_WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-1 text-sm font-semibold bg-gradient-to-r from-gold-400 to-gold-500 hover:from-gold-300 hover:to-gold-400 text-navy-900 px-4 py-2.5 rounded-full transition-all duration-200 shadow-[0_0_0_0_rgba(212,175,55,0.5)] hover:shadow-[0_0_24px_2px_rgba(212,175,55,0.4)]"
          >
            Daftar
            <ChevronRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5" />
          </a>
        </div>

        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="lg:hidden text-white p-2 -mr-2"
          aria-label="Menu"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile fullscreen menu */}
      <div
        className={`lg:hidden fixed inset-0 z-50 transition-opacity duration-300 ${
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        role="dialog"
        aria-modal="true"
      >
        <div className="absolute inset-0 bg-navy-950/98 backdrop-blur-xl" onClick={() => setMobileOpen(false)} />
        <div aria-hidden="true" className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-gold-400/15 blur-[100px]" />
        <div aria-hidden="true" className="absolute -bottom-28 -left-24 w-72 h-72 rounded-full bg-gold-300/10 blur-[100px]" />
        <div
          aria-hidden="true"
          className="pointer-events-none select-none absolute right-[-2rem] top-1/3 -translate-y-1/2 font-extrabold leading-none text-[14rem] text-white/[0.03]"
        >
          6
        </div>

        <div className="relative h-full flex flex-col">
          <div className="flex items-center justify-between px-4 sm:px-6 h-20 shrink-0">
            <Link href="/" className="flex items-center gap-2.5" onClick={() => setMobileOpen(false)}>
              <img src="/logo.png" alt="SixStars Academy Indonesia" className="h-12 w-auto object-contain" />
            </Link>
            <button
              onClick={() => setMobileOpen(false)}
              className="text-white p-2 -mr-2 rounded-full hover:bg-white/10 transition-colors"
              aria-label="Tutup menu"
            >
              <X size={22} />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 sm:px-6 py-2 flex flex-col gap-2">
            {navLinks.map((l, i) => {
              const active = pathname === l.href
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMobileOpen(false)}
                  style={{ transitionDelay: mobileOpen ? `${90 + i * 55}ms` : '0ms' }}
                  className={`group flex items-center gap-4 px-3.5 py-3.5 rounded-2xl transition-all duration-300 ease-out ${
                    mobileOpen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-6'
                  } ${active ? 'bg-gold-400/10 ring-1 ring-gold-400/30' : 'hover:bg-white/5'}`}
                >
                  <span
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      active ? 'bg-gold-400 text-navy-900' : 'bg-white/5 text-gold-400 group-hover:bg-white/10'
                    }`}
                  >
                    <l.icon size={18} />
                  </span>
                  <span className={`text-lg font-semibold tracking-tight ${active ? 'text-gold-300' : 'text-white'}`}>{l.label}</span>
                  <ChevronRight
                    size={16}
                    className={`ml-auto transition-transform duration-200 ${active ? 'text-gold-400' : 'text-gray-500 group-hover:translate-x-1'}`}
                  />
                </Link>
              )
            })}
          </nav>

          <div
            className={`px-4 sm:px-6 pb-8 pt-4 border-t border-white/10 flex items-center gap-3 shrink-0 transition-all duration-300 ${
              mobileOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ transitionDelay: mobileOpen ? '420ms' : '0ms' }}
          >
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-white bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-3 rounded-2xl transition-colors"
            >
              <LogIn size={15} /> Masuk
            </Link>
            <a
              href={REGISTER_WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileOpen(false)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-bold bg-gradient-to-r from-gold-400 to-gold-500 hover:from-gold-300 hover:to-gold-400 text-navy-900 px-4 py-3 rounded-2xl shadow-[0_0_24px_2px_rgba(212,175,55,0.35)] transition-colors"
            >
              <UserPlus size={15} /> Daftar
            </a>
          </div>
        </div>
      </div>
    </nav>
  )
}
