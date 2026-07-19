import Link from 'next/link'
import { Home } from 'lucide-react'

export default function AuthBackground({ children, className = '' }) {
  return (
    <div className={`relative min-h-screen overflow-hidden bg-gradient-to-b from-navy-950 via-navy-900 to-navy-950 ${className}`}>
      <Link
        href="/"
        className="fixed top-4 left-4 sm:top-6 sm:left-6 z-20 inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/15 backdrop-blur-sm text-white text-xs font-semibold px-3.5 py-2 rounded-full border border-white/15 transition-colors duration-150"
      >
        <Home size={14} />
        Beranda
      </Link>

      {/* Floodlight glows */}
      <div aria-hidden="true" className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-gold-400/15 blur-[110px] animate-floodlight" />
      <div
        aria-hidden="true"
        className="absolute -bottom-24 -right-24 w-[28rem] h-[28rem] rounded-full bg-gold-300/10 blur-[120px] animate-floodlight"
        style={{ animationDelay: '2.4s' }}
      />

      {/* Ghost jersey numeral */}
      <div
        aria-hidden="true"
        className="pointer-events-none select-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-extrabold leading-none text-[26rem] text-white/[0.025]"
      >
        6
      </div>

      {/* Pitch watermark */}
      <svg
        aria-hidden="true"
        className="absolute bottom-0 left-0 w-full h-40 sm:h-56 opacity-[0.06] pointer-events-none"
        viewBox="0 0 1200 240"
        preserveAspectRatio="xMidYMax slice"
      >
        <line x1="0" y1="0" x2="1200" y2="0" stroke="white" strokeWidth="2" />
        <circle cx="600" cy="0" r="140" fill="none" stroke="white" strokeWidth="2" />
        <line x1="600" y1="0" x2="600" y2="240" stroke="white" strokeWidth="2" />
      </svg>
      <svg
        aria-hidden="true"
        className="absolute top-0 left-0 w-full h-24 opacity-[0.05] pointer-events-none rotate-180"
        viewBox="0 0 1200 240"
        preserveAspectRatio="xMidYMax slice"
      >
        <line x1="0" y1="0" x2="1200" y2="0" stroke="white" strokeWidth="2" />
        <circle cx="150" cy="0" r="90" fill="none" stroke="white" strokeWidth="2" />
      </svg>

      <div className="relative">{children}</div>
    </div>
  )
}
