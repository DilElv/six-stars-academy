'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, ChevronRight } from 'lucide-react'

const navLinks = [
  { href: '/', label: 'Beranda' },
  { href: '/program', label: 'Program' },
  { href: '/jadwal', label: 'Jadwal' },
  { href: '/galeri', label: 'Galeri' },
  { href: '/sponsor', label: 'Sponsor' },
  { href: '/paket', label: 'Paket' },
]

function LogoMark({ className }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f0d078" />
          <stop offset="100%" stopColor="#a8812a" />
        </linearGradient>
      </defs>
      <path
        d="M20 2 L36 8 V19 C36 28.5 29.5 35.5 20 38 C10.5 35.5 4 28.5 4 19 V8 Z"
        fill="url(#logoGrad)"
      />
      <path
        d="M20 2 L36 8 V19 C36 28.5 29.5 35.5 20 38 C10.5 35.5 4 28.5 4 19 V8 Z"
        fill="none"
        stroke="#0a1628"
        strokeOpacity="0.15"
        strokeWidth="1"
      />
      <text x="20" y="25" textAnchor="middle" fontSize="15" fontWeight="700" fill="#0a1628" fontFamily="var(--font-oswald), sans-serif">6</text>
    </svg>
  )
}

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

  return (
    <nav
      className={`sticky top-0 z-40 transition-all duration-300 bg-navy-950 ${
        scrolled ? 'shadow-lg shadow-black/40 border-b border-white/10' : 'border-b border-transparent'
      }`}
    >
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between transition-all duration-300 ${scrolled ? 'h-16' : 'h-20'}`}>
        <Link href="/" className="flex items-center gap-2.5 group shrink-0">
          <LogoMark className="w-9 h-9 transition-transform duration-300 group-hover:scale-105" />
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
          <Link
            href="/daftar"
            className="group inline-flex items-center gap-1 text-sm font-semibold bg-gradient-to-r from-gold-400 to-gold-500 hover:from-gold-300 hover:to-gold-400 text-navy-900 px-4 py-2.5 rounded-full transition-all duration-200 shadow-[0_0_0_0_rgba(212,175,55,0.5)] hover:shadow-[0_0_24px_2px_rgba(212,175,55,0.4)]"
          >
            Daftar
            <ChevronRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </div>

        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="lg:hidden text-white p-2 -mr-2"
          aria-label="Menu"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <div
        className={`lg:hidden overflow-hidden transition-all duration-300 ${mobileOpen ? 'max-h-[26rem]' : 'max-h-0'}`}
      >
        <div className="px-4 sm:px-6 pb-5 pt-1 flex flex-col gap-1 bg-navy-950 border-b border-white/10">
          {navLinks.map((l) => {
            const active = pathname === l.href
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-3 rounded-xl text-sm font-semibold transition-colors ${active ? 'bg-gold-400/10 text-gold-400' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
              >
                {l.label}
              </Link>
            )
          })}
          <div className="flex items-center gap-3 mt-2 pt-3 border-t border-white/10">
            <Link href="/login" className="flex-1 text-center text-sm font-semibold text-white bg-white/5 hover:bg-white/10 px-4 py-2.5 rounded-xl transition-colors">
              Masuk
            </Link>
            <Link href="/daftar" className="flex-1 text-center text-sm font-semibold bg-gold-400 hover:bg-gold-300 text-navy-900 px-4 py-2.5 rounded-xl transition-colors">
              Daftar
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
