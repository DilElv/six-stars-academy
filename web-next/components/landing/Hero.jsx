'use client'

import Link from 'next/link'
import { ChevronRight, ChevronDown, Star } from 'lucide-react'
import { useEffect, useState } from 'react'

const HERO_PHOTOS = [
  { src: 'https://images.unsplash.com/photo-1543326727-cf6c39e8f84c?auto=format&fit=crop&w=900&q=80', alt: 'Pemain muda beraksi merebut bola saat pertandingan sepak bola' },
  { src: 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?auto=format&fit=crop&w=900&q=80', alt: 'Pemain muda berlatih menggiring bola di lapangan' },
  { src: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=900&q=80', alt: 'Tim sepak bola muda berlatih bersama' },
  { src: 'https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=900&q=80', alt: 'Pemain sepak bola muda menendang bola' },
]

function HeroPhotoSlideshow() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % HERO_PHOTOS.length)
    }, 4500)
    return () => clearInterval(timer)
  }, [])

  return (
    <>
      {HERO_PHOTOS.map((photo, i) => (
        <img
          key={photo.src}
          src={photo.src}
          alt={photo.alt}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[1400ms] ease-in-out ${
            i === index ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}
    </>
  )
}

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-navy-950 via-navy-900 to-navy-900 min-h-[92vh] flex items-center">
      {/* Floodlight glows */}
      <div className="absolute -top-24 -left-16 w-[28rem] h-[28rem] rounded-full bg-gold-400/25 blur-[110px] animate-floodlight" />
      <div
        className="absolute -top-32 right-[-6rem] w-[32rem] h-[32rem] rounded-full bg-gold-300/20 blur-[120px] animate-floodlight"
        style={{ animationDelay: '2.4s' }}
      />

      {/* Ghost jersey numeral */}
      <div
        aria-hidden="true"
        className="pointer-events-none select-none absolute left-[-3rem] lg:left-[-1rem] top-1/2 -translate-y-1/2 font-extrabold leading-none text-[16rem] sm:text-[20rem] text-white/[0.035] hidden lg:block"
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
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-8 items-center">
          <div className="max-w-3xl">
            <div className="animate-fade-up inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-gold-400/10 border border-gold-400/25 text-gold-300 text-xs sm:text-sm font-semibold tracking-wide mb-7">
              <span className="flex items-center gap-0.5" aria-hidden="true">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Star key={i} className="w-3 h-3 fill-gold-400 text-gold-400" />
                ))}
              </span>
              Akademi Sepak Bola Profesional
            </div>

            <h1 className="animate-fade-up [animation-delay:110ms] font-heading text-[2.75rem] leading-[1.05] sm:text-6xl lg:text-6xl font-bold tracking-tight text-white mb-7 text-balance">
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
                className="group inline-flex items-center gap-2 bg-gradient-to-r from-gold-300 to-gold-500 hover:from-gold-200 hover:to-gold-400 text-navy-900 font-bold px-8 py-3.5 rounded-full transition-all duration-200 shadow-[0_0_0_0_rgba(212,168,67,0.5)] hover:shadow-[0_0_32px_4px_rgba(212,168,67,0.35)] hover:-translate-y-0.5"
              >
                Daftar Sekarang
                <ChevronRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
              <Link
                href="/program"
                className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white font-semibold px-8 py-3.5 rounded-full border border-white/15 hover:border-white/30 transition-all duration-200"
              >
                Lihat Program
              </Link>
            </div>
          </div>

          {/* Action photo panel */}
          <div className="animate-fade-up [animation-delay:180ms] relative hidden lg:block">
            <div className="relative rounded-[2rem] overflow-hidden aspect-[4/5] shadow-2xl ring-1 ring-white/10">
              <HeroPhotoSlideshow />
              <div className="absolute inset-0 bg-gradient-to-t from-navy-950/80 via-navy-950/10 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-br from-gold-400/10 via-transparent to-navy-950/30 mix-blend-overlay" />
            </div>

          </div>
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 hidden sm:flex flex-col items-center gap-1.5 text-gray-400/70 animate-bounce">
        <span className="text-[10px] tracking-[0.2em] uppercase">Scroll</span>
        <ChevronDown className="w-4 h-4" />
      </div>
    </section>
  )
}
