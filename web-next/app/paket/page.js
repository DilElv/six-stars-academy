import Link from 'next/link'
import { QrCode, FileText, LayoutDashboard, ShieldCheck, MapPinned, BellRing, ClipboardList, CreditCard, PartyPopper } from 'lucide-react'
import PublicNav from '@/components/PublicNav'
import PublicFooter from '@/components/PublicFooter'
import PageHero from '@/components/landing/PageHero'
import Reveal from '@/components/Reveal'
import FaqAccordion from '@/components/landing/FaqAccordion'
import { getLandingData } from '@/lib/landingData'

const BENEFITS = [
  { icon: QrCode, title: 'Kartu Siswa QR', desc: 'Presensi otomatis tiap sesi latihan, tinggal scan di lokasi.' },
  { icon: FileText, title: 'Rapor Digital Bulanan', desc: 'Penilaian 4 pilar (teknik, taktik, fisik, mental) dari pelatih, siap diunduh PDF.' },
  { icon: LayoutDashboard, title: 'Dashboard Orang Tua', desc: 'Pantau kehadiran, progres, dan jadwal anak kapan saja secara real-time.' },
  { icon: ShieldCheck, title: 'Pelatih Bersertifikat', desc: 'Dibimbing pelatih berlisensi dengan kurikulum terstruktur per usia.' },
  { icon: MapPinned, title: 'Multi Cabang', desc: 'Pilih cabang terdekat, bisa disesuaikan lagi lewat profil kapan saja.' },
  { icon: BellRing, title: 'Notifikasi Otomatis', desc: 'Info pembayaran, absensi, dan rapor baru langsung masuk ke akun.' },
]

const STEPS = [
  { icon: ClipboardList, title: 'Isi Data Pendaftaran', desc: 'Data anak, orang tua, dan pilih cabang lewat form online singkat.' },
  { icon: CreditCard, title: 'Pilih Paket & Bayar', desc: 'Pilih paket latihan, transfer sesuai instruksi, lalu unggah bukti bayar.' },
  { icon: ShieldCheck, title: 'Verifikasi Admin', desc: 'Tim kami verifikasi pembayaran dan aktivasi akun dalam 1x24 jam.' },
  { icon: PartyPopper, title: 'Mulai Latihan', desc: 'Kartu siswa QR aktif, jadwal muncul di dashboard — siap latihan pertama!' },
]

const FAQ = [
  { q: 'Bagaimana proses pendaftarannya?', a: 'Isi form pendaftaran online (data anak, orang tua, pilih paket & cabang), lakukan pembayaran, lalu tunggu verifikasi admin. Setelah aktif, akun orang tua dan kartu siswa QR langsung bisa dipakai.' },
  { q: 'Bagaimana cara memantau perkembangan anak?', a: 'Login ke dashboard orang tua untuk melihat riwayat kehadiran, jadwal latihan, dan rapor bulanan yang berisi penilaian teknik, taktik, fisik, serta mental dari pelatih.' },
  { q: 'Apakah bisa pindah cabang latihan?', a: 'Bisa. Cabang latihan dapat diubah kapan saja melalui halaman profil siswa di dashboard orang tua.' },
  { q: 'Bagaimana sistem pembayarannya?', a: 'Pembayaran dilakukan via transfer, lalu bukti bayar diverifikasi oleh admin. Status pembayaran (menunggu verifikasi / lunas) selalu bisa dicek di dashboard.' },
  { q: 'Apa saja yang didapat saat pendaftaran?', a: '2 set jersey, kaos kaki, 1 bola, kartu QR presensi, dan akses dashboard orang tua (pantau jadwal, rapor bulanan, kehadiran) — aktivasi maksimal 1x24 jam setelah verifikasi.' },
]

export default async function PaketPage() {
  const { packages, settings } = await getLandingData()

  return (
    <>
      <PublicNav />
      <PageHero
        eyebrow="Informasi"
        title="Kenapa SixStars?"
        desc="SixStars Academy membina teknik, taktik, fisik, dan mental pemain usia dini — dari grassroots hingga elite."
      />

      {/* BENEFITS */}
      <section className="relative py-20 sm:py-24 bg-navy-900 overflow-hidden">
        <div aria-hidden="true" className="absolute -top-24 left-[-6rem] w-96 h-96 rounded-full bg-gold-400/[0.06] blur-[110px]" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="max-w-2xl mb-12">
            <span className="text-xs font-bold tracking-[0.2em] text-gold-400 uppercase">Akses Penuh</span>
            <h2 className="font-heading font-bold text-3xl mt-3 mb-3 text-white tracking-tight">Lebih dari Sekadar Latihan</h2>
            <p className="text-gray-400">Semua siswa mendapatkan akses penuh ke ekosistem digital SixStars untuk memantau perkembangan secara real-time.</p>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {BENEFITS.map((b) => (
              <Reveal key={b.title}>
                <div className="h-full bg-white/[0.05] backdrop-blur-xl border border-white/10 hover:border-gold-400/20 rounded-3xl p-6 transition-colors duration-300">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(212,175,55,0.25)]">
                    <b.icon size={18} className="text-navy-900" />
                  </div>
                  <div className="font-heading font-bold text-white text-base mb-1.5">{b.title}</div>
                  <p className="text-sm text-gray-400 leading-relaxed">{b.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CARA BERGABUNG */}
      <section className="relative py-20 sm:py-24 bg-navy-900 overflow-hidden">
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="max-w-2xl mb-12">
            <span className="text-xs font-bold tracking-[0.2em] text-gold-400 uppercase">Proses Mudah</span>
            <h2 className="font-heading font-bold text-3xl mt-3 mb-3 text-white tracking-tight">Cara Bergabung</h2>
            <p className="text-gray-400">4 langkah sederhana dari daftar sampai latihan pertama.</p>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {STEPS.map((s, i) => (
              <Reveal key={s.title}>
                <div className="relative h-full bg-white/[0.05] backdrop-blur-xl border border-white/10 rounded-3xl p-6">
                  <div
                    aria-hidden="true"
                    className="absolute -top-3 -right-2 font-heading font-bold text-6xl text-white/[0.05] leading-none select-none"
                  >
                    {i + 1}
                  </div>
                  <div className="relative w-11 h-11 rounded-2xl bg-navy-800 border border-gold-400/20 flex items-center justify-center mb-4">
                    <s.icon size={18} className="text-gold-400" />
                  </div>
                  <div className="relative font-heading font-bold text-white text-base mb-1.5">{s.title}</div>
                  <p className="relative text-sm text-gray-400 leading-relaxed">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="relative py-20 sm:py-24 bg-navy-900 border-t border-white/5 overflow-hidden">
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="max-w-2xl mx-auto text-center mb-12">
            <span className="text-xs font-bold tracking-[0.2em] text-gold-400 uppercase">FAQ</span>
            <h2 className="font-heading font-bold text-3xl mt-3 mb-3 text-white tracking-tight">Pertanyaan Umum</h2>
            <p className="text-gray-400">Masih ragu? Ini beberapa hal yang paling sering ditanyakan.</p>
          </Reveal>
          <FaqAccordion items={FAQ} />
        </div>
      </section>

      <PublicFooter settings={settings} />
    </>
  )
}
