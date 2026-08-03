import Link from 'next/link'
import { MapPin, Phone, Mail, Instagram, ChevronRight, ArrowRight } from 'lucide-react'
import { REGISTER_WHATSAPP_URL } from '@/lib/whatsapp'

const navLinks = [
  { href: '/program', label: 'Program' },
  { href: '/jadwal', label: 'Jadwal' },
  { href: '/galeri', label: 'Galeri' },
  { href: '/sponsor', label: 'Sponsor' },
  { href: '/paket', label: 'Paket' },
]

export default function PublicFooter({ settings }) {
  const name = settings?.ssbName || 'SixStars Academy Indonesia'
  return (
    <footer className="relative bg-navy-950 pt-16 pb-8 overflow-hidden">
      <div aria-hidden="true" className="absolute -top-32 right-[-6rem] w-96 h-96 rounded-full bg-gold-400/[0.07] blur-[110px]" />
      <div aria-hidden="true" className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-gold-400/[0.05] blur-[100px]" />
      <svg
        aria-hidden="true"
        className="absolute top-0 left-0 w-full h-32 opacity-[0.05] pointer-events-none"
        viewBox="0 0 1200 120"
        preserveAspectRatio="xMidYMin slice"
      >
        <line x1="0" y1="0" x2="1200" y2="0" stroke="white" strokeWidth="1.5" />
        <circle cx="600" cy="0" r="90" fill="none" stroke="white" strokeWidth="1.5" />
      </svg>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* CTA banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy-900 to-navy-800 border border-gold-400/20 px-6 sm:px-10 py-8 mb-16 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
          <div aria-hidden="true" className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-gold-400/10 blur-[60px]" />
          <div className="relative">
            <div className="font-heading font-bold text-white text-xl sm:text-2xl tracking-tight">Siap gabung SixStars Academy?</div>
            <p className="text-gray-400 text-sm mt-1">Daftarkan si kecil sekarang, kuota kelompok umur terbatas.</p>
          </div>
          <a
            href={REGISTER_WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="relative group inline-flex items-center gap-2 shrink-0 bg-gradient-to-r from-gold-400 to-gold-500 hover:from-gold-300 hover:to-gold-400 text-navy-900 font-bold px-6 py-3 rounded-full transition-all duration-200 shadow-[0_0_20px_rgba(212,175,55,0.25)] hover:shadow-[0_0_28px_rgba(212,175,55,0.4)] hover:-translate-y-0.5"
          >
            Daftar Sekarang
            <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
          </a>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 pb-10 border-b border-white/10">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5 mb-3">
              <img src="/logo.png" alt={name} className="h-11 w-auto object-contain shrink-0" />
              <span className="font-heading font-semibold text-white text-lg uppercase tracking-wide">{name}</span>
            </div>
            <p className="text-sm text-gray-400 max-w-sm leading-relaxed">
              Membentuk pemain sepak bola usia dini melalui teknik, taktik, fisik, dan mental yang terstruktur — dari lapangan latihan hingga jadi pemain matang.
            </p>
          </div>

          <div>
            <div className="text-xs font-bold tracking-[0.15em] text-gold-400 uppercase mb-4">Jelajahi</div>
            <div className="flex flex-col gap-2.5">
              {navLinks.map((l) => (
                <Link key={l.href} href={l.href} className="group inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors w-fit">
                  <ChevronRight size={13} className="text-gold-500/60 group-hover:translate-x-0.5 transition-transform duration-200" />
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-bold tracking-[0.15em] text-gold-400 uppercase mb-4">Kontak</div>
            <div className="space-y-2.5 text-sm text-gray-400">
              {settings?.ssbAddress && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gold-500 shrink-0 mt-0.5" /> {settings.ssbAddress}
                </div>
              )}
              {settings?.ssbPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gold-500 shrink-0" /> {settings.ssbPhone}
                </div>
              )}
              {settings?.ssbEmail && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gold-500 shrink-0" /> {settings.ssbEmail}
                </div>
              )}
              {settings?.ssbInstagram && (
                <a
                  href={`https://instagram.com/${settings.ssbInstagram.replace(/^@/, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-gold-400 transition-colors w-fit"
                >
                  <Instagram className="w-4 h-4 text-gold-500 shrink-0" /> {settings.ssbInstagram}
                </a>
              )}
              <div className="flex gap-5 pt-2">
                <Link href="/login" className="text-gray-400 hover:text-gold-400 transition-colors">Masuk</Link>
                <a href={REGISTER_WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gold-400 transition-colors">Daftar</a>
              </div>
            </div>
          </div>
        </div>
        <div className="pt-6 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} {name}. Semua hak dilindungi.
        </div>
      </div>
    </footer>
  )
}
