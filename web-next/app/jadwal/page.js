import Link from 'next/link'
import { ArrowRight, MapPin, ShieldCheck, QrCode, Info } from 'lucide-react'
import PublicNav from '@/components/PublicNav'
import PublicFooter from '@/components/PublicFooter'
import PageHero from '@/components/landing/PageHero'
import ScheduleCard from '@/components/landing/ScheduleCard'
import Reveal from '@/components/Reveal'
import { getLandingData } from '@/lib/landingData'

const INFO_CARDS = [
  {
    icon: MapPin,
    title: 'Lokasi Latihan',
    desc: 'Tersebar di beberapa cabang (BSD, Jakarta) — pilih cabang terdekat saat mendaftar.',
  },
  {
    icon: ShieldCheck,
    title: 'Perlengkapan Wajib',
    desc: 'Sepatu bola, kaos kaki panjang, shin guard, dan botol minum. Jersey latihan didapat saat pendaftaran.',
  },
  {
    icon: QrCode,
    title: 'Presensi Otomatis',
    desc: 'Setiap siswa punya kartu QR pribadi — cukup scan saat datang, orang tua bisa pantau kehadiran real-time.',
  },
]

export default async function JadwalPage() {
  const { schedulePreview, settings } = await getLandingData()

  return (
    <>
      <PublicNav />
      <PageHero
        eyebrow="Fixtures"
        title="Jadwal Latihan Mingguan"
        desc="Sesi latihan rutin untuk semua kelompok umur, dikelola langsung oleh tim pelatih bersertifikat di tiap cabang."
      />

      {/* SCHEDULE GRID */}
      <section className="relative py-20 sm:py-24 bg-navy-900 overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=1600&q=60"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-navy-900 via-navy-950/85 to-navy-900" />
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.4] [background-image:radial-gradient(circle_at_20%_20%,rgba(212,168,67,0.1),transparent_45%)]"
        />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="max-w-2xl mx-auto text-center mb-12">
            <p className="text-sm text-gray-400">
              Total <span className="text-gold-400 font-semibold">{schedulePreview.length} kelompok umur</span> berlatih tiap minggu. Jadwal bisa berubah menyesuaikan cabang — cek jadwal final setelah mendaftar.
            </p>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {schedulePreview.map((s, i) => (
              <ScheduleCard key={`${s.ageGroup}-${i}`} schedule={s} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* INFO PRAKTIS */}
      <section className="relative py-20 sm:py-24 bg-navy-900 overflow-hidden">
        <div aria-hidden="true" className="absolute -top-24 right-[-6rem] w-96 h-96 rounded-full bg-gold-400/[0.06] blur-[110px]" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="max-w-2xl mb-12">
            <span className="text-xs font-bold tracking-[0.2em] text-gold-400 uppercase">Info Praktis</span>
            <h2 className="font-heading font-bold text-3xl mt-3 mb-3 text-white tracking-tight">Sebelum Datang Latihan</h2>
            <p className="text-gray-400">Beberapa hal yang perlu disiapkan orang tua & siswa sebelum sesi pertama.</p>
          </Reveal>
          <div className="grid sm:grid-cols-3 gap-5">
            {INFO_CARDS.map((c) => (
              <Reveal key={c.title}>
                <div className="h-full bg-white/[0.05] backdrop-blur-xl border border-white/10 hover:border-gold-400/20 rounded-3xl p-6 transition-colors duration-300">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-navy-700 to-navy-800 border border-gold-400/20 flex items-center justify-center mb-4">
                    <c.icon size={18} className="text-gold-400" />
                  </div>
                  <div className="font-heading font-bold text-white text-lg mb-1.5">{c.title}</div>
                  <p className="text-sm text-gray-400 leading-relaxed">{c.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal>
            <div className="mt-6 flex items-start gap-3 bg-gold-400/[0.06] border border-gold-400/15 rounded-2xl p-4">
              <Info size={16} className="text-gold-400 shrink-0 mt-0.5" />
              <p className="text-sm text-gray-300">
                Sesi pertama boleh coba dulu tanpa perlengkapan lengkap — konsultasikan dengan pelatih di cabang pilihanmu saat pendaftaran.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-20 bg-navy-900 border-t border-white/5 overflow-hidden">
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Reveal>
            <h2 className="font-heading font-bold text-2xl sm:text-3xl text-white mb-4 tracking-tight">Jadwal cocok? Yuk gabung sekarang</h2>
            <p className="text-gray-400 mb-8">Kuota tiap kelompok umur terbatas per cabang — daftar lebih awal biar dapat slot latihan favorit.</p>
            <Link
              href="/daftar"
              className="group inline-flex items-center gap-2 bg-gradient-to-r from-gold-400 to-gold-500 hover:from-gold-300 hover:to-gold-400 text-navy-900 font-bold px-8 py-3.5 rounded-full transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              Daftar Sekarang
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          </Reveal>
        </div>
      </section>

      <PublicFooter settings={settings} />
    </>
  )
}
