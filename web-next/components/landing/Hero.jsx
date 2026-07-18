import Link from 'next/link'
import { ChevronRight, Star } from 'lucide-react'

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-navy-950 via-navy-900 to-navy-800 min-h-[92vh] flex items-center">
      {/* Floodlight glows */}
      <div className="absolute -top-24 -left-16 w-[28rem] h-[28rem] rounded-full bg-gold-400/25 blur-[110px] animate-floodlight" />
      <div
        className="absolute -top-32 right-[-6rem] w-[32rem] h-[32rem] rounded-full bg-gold-300/20 blur-[120px] animate-floodlight"
        style={{ animationDelay: '2.4s' }}
      />

      {/* Ghost jersey numeral */}
      <div
        aria-hidden="true"
        className="pointer-events-none select-none absolute right-[-2rem] sm:right-4 lg:right-10 top-1/2 -translate-y-1/2 font-extrabold leading-none text-[16rem] sm:text-[22rem] lg:text-[28rem] text-white/[0.035]"
      >
        6
      </div>

      {/* Pitch watermark */}
      <svg
        aria-hidden="true"
        className="absolute bottom-0 left-0 w-full h-40 sm:h-56 opacity-[0.07] pointer-events-none"
        viewBox="0 0 1200 240"
        preserveAspectRatio="xMidYMax slice"
      >
        <line x1="0" y1="0" x2="1200" y2="0" stroke="white" strokeWidth="2" />
        <circle cx="600" cy="0" r="140" fill="none" stroke="white" strokeWidth="2" />
        <line x1="600" y1="0" x2="600" y2="240" stroke="white" strokeWidth="2" />
      </svg>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 w-full">
        <div className="max-w-3xl">
          <div className="animate-fade-up inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-gold-400/10 border border-gold-400/25 text-gold-300 text-xs sm:text-sm font-semibold tracking-wide mb-7">
            <span className="flex items-center gap-0.5" aria-hidden="true">
              {Array.from({ length: 6 }).map((_, i) => (
                <Star key={i} className="w-3 h-3 fill-gold-400 text-gold-400" />
              ))}
            </span>
            Akademi Sepak Bola Profesional
          </div>

          <h1 className="animate-fade-up [animation-delay:110ms] text-[2.75rem] leading-[1.05] sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white mb-7 text-balance">
            Cetak Bintang{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-300 via-gold-400 to-gold-500">
              Sepak Bola
            </span>{' '}
            Masa Depan
          </h1>

          <p className="animate-fade-up [animation-delay:220ms] text-lg sm:text-xl text-gray-300 max-w-2xl mb-10 text-balance">
            SixStars Academy membina teknik, taktik, fisik, dan mental pemain usia dini —
            dengan kurikulum terstruktur dan pelatih bersertifikat, dari lapangan latihan
            hingga jadi pemain matang.
          </p>

          <div className="animate-fade-up [animation-delay:330ms] flex flex-wrap gap-4">
            <Link
              href="/daftar"
              className="group inline-flex items-center gap-2 bg-gold-400 hover:bg-gold-300 text-navy-900 font-bold px-8 py-3.5 rounded-xl transition-all duration-200 shadow-[0_0_0_0_rgba(212,168,67,0.5)] hover:shadow-[0_0_32px_4px_rgba(212,168,67,0.35)]"
            >
              Daftar Sekarang
              <ChevronRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
            <Link
              href="#program"
              className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white font-semibold px-8 py-3.5 rounded-xl border border-white/15 transition-colors duration-200"
            >
              Lihat Program
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
