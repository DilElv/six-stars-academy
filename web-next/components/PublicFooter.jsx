import Link from 'next/link'
import { MapPin, Phone, Mail } from 'lucide-react'

export default function PublicFooter({ settings }) {
  const name = settings?.ssbName || 'SixStars Academy Indonesia'
  return (
    <footer className="relative bg-navy-950 pt-16 pb-8 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-400/50 to-transparent" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-8 pb-10 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold-400 to-gold-600" />
              <span className="font-bold text-white text-lg">{name}</span>
            </div>
            <p className="text-sm text-gray-400 max-w-sm">
              Membentuk pemain sepak bola usia dini melalui teknik, taktik, fisik, dan mental yang terstruktur.
            </p>
          </div>
          {(settings?.ssbAddress || settings?.ssbPhone || settings?.ssbEmail) && (
            <div className="space-y-2 text-sm text-gray-400">
              {settings?.ssbAddress && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gold-500 shrink-0" /> {settings.ssbAddress}
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
            </div>
          )}
          <div className="flex gap-6 text-sm">
            <Link href="/login" className="text-gray-400 hover:text-gold-400 transition-colors">Masuk</Link>
            <Link href="/daftar" className="text-gray-400 hover:text-gold-400 transition-colors">Daftar</Link>
          </div>
        </div>
        <div className="pt-6 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} {name}. Semua hak dilindungi.
        </div>
      </div>
    </footer>
  )
}
