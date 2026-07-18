import Link from 'next/link'

const navLinks = [
  { href: '/', label: 'Beranda' },
  { href: '/#program', label: 'Program' },
  { href: '/#jadwal', label: 'Jadwal' },
  { href: '/#galeri', label: 'Galeri' },
  { href: '/#sponsor', label: 'Sponsor' },
]

export default function PublicNav() {
  return (
    <nav className="sticky top-0 z-40 bg-navy-950/95 backdrop-blur border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold-400 to-gold-600" />
          <span className="font-bold text-white">SSB SixStar</span>
        </Link>
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="relative text-sm text-gray-300 hover:text-white font-medium transition-colors group"
            >
              {l.label}
              <span className="absolute -bottom-1.5 left-0 w-0 h-px bg-gold-400 transition-all duration-300 group-hover:w-full" />
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-semibold text-white hover:text-gold-400 transition-colors">
            Masuk
          </Link>
          <Link
            href="/daftar"
            className="text-sm font-semibold bg-gold-400 hover:bg-gold-300 text-navy-900 px-4 py-2 rounded-lg transition-all duration-200 hover:shadow-[0_0_20px_2px_rgba(212,168,67,0.4)]"
          >
            Daftar
          </Link>
        </div>
      </div>
    </nav>
  )
}
