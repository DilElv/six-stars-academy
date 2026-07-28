'use client'

import Link from 'next/link'
import { Sparkles, LayoutList, CalendarClock, Images, Handshake, Award, PackageSearch } from 'lucide-react'

const MENU = [
  { href: '/admin/cms/statistik', label: 'Statistik Beranda', desc: 'Angka-angka di bawah hero landing page (jumlah siswa, pelatih, dst).', icon: Sparkles },
  { href: '/admin/cms/program', label: 'Program Latihan', desc: 'Kartu program yang tampil di halaman /program.', icon: LayoutList },
  { href: '/admin/cms/jadwal', label: 'Jadwal Latihan', desc: 'Cuplikan jadwal mingguan di halaman /jadwal.', icon: CalendarClock },
  { href: '/admin/cms/galeri', label: 'Galeri Foto', desc: 'Foto-foto momen latihan di halaman /galeri.', icon: Images },
  { href: '/admin/cms/sponsor', label: 'Sponsor & Mitra', desc: 'Daftar nama mitra/sponsor di halaman /sponsor.', icon: Handshake },
  { href: '/admin/cms/manfaat', label: 'Manfaat Bergabung', desc: 'Daftar benefit yang tampil di halaman pendaftaran.', icon: Award },
  { href: '/admin/cms/paket-info', label: 'Deskripsi Paket', desc: 'Penjelasan tiap durasi paket di halaman pendaftaran.', icon: PackageSearch },
  { href: '/admin/cms/jadwal-daftar', label: 'Jadwal per Cabang (Daftar)', desc: 'Jadwal latihan per cabang di halaman pendaftaran.', icon: CalendarClock },
]

export default function AdminCmsMenuPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-navy-900 text-lg">CMS Landing Page</h1>
        <p className="text-sm text-gray-400 mt-0.5">Pilih bagian yang ingin diedit. Setiap halaman landing page kini terpisah, jadi lebih mudah dikelola.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        {MENU.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="group flex flex-col items-center text-center gap-2 glass-card rounded-3xl p-4 sm:p-5 hover:border-gold-300 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
          >
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-navy-600 to-navy-800 shadow-md shadow-navy-900/25 flex items-center justify-center shrink-0">
              <m.icon size={19} className="text-gold-300" />
            </div>
            <div className="font-semibold text-navy-900 text-sm">{m.label}</div>
            <div className="text-xs text-gray-400 hidden sm:block">{m.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
