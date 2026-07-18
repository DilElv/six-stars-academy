import Link from 'next/link'
import { Check, QrCode, FileText, LayoutDashboard, ShieldCheck, MapPinned, BellRing, ClipboardList, CreditCard, PartyPopper } from 'lucide-react'
import PublicNav from '@/components/PublicNav'
import PublicFooter from '@/components/PublicFooter'
import PageHero from '@/components/landing/PageHero'
import Reveal from '@/components/Reveal'
import FaqAccordion from '@/components/landing/FaqAccordion'
import { getLandingData, formatRupiah } from '@/lib/landingData'

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
  { q: 'Apa saja yang didapat saat pendaftaran?', a: `Biaya pendaftaran sebesar ${formatRupiah(750000)} sudah termasuk 2 set jersey, kaos kaki, dan 1 bola — di luar biaya paket latihan bulanan.` },
]

export default async function PaketPage() {
  const { packages, settings } = await getLandingData()

  return (
    <>
      <PublicNav />
      <PageHero
        eyebrow="Bergabung"
        title="Pilih Paket Latihan"
        desc={`Harga belum termasuk biaya pendaftaran ${formatRupiah(settings?.registrationFee ?? 750000)} (sekali bayar: 2 set jersey, kaos kaki, 1 bola).`}
      />

      {/* PRICING */}
      <section className="relative py-20 sm:py-24 bg-navy-900 overflow-hidden">
        <div aria-hidden="true" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] rounded-full bg-gold-400/[0.05] blur-[110px]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {!packages ? (
            <p className="text-sm text-red-400 text-center">Paket belum tersedia, coba muat ulang halaman.</p>
          ) : (
            <div className="grid md:grid-cols-3 gap-6 items-start">
              {packages.map((p) => {
                const popular = p.durationMonths === 3
                return (
                  <Reveal key={p.name} className={popular ? 'md:-translate-y-3' : ''}>
                    <div
                      className={`relative rounded-3xl p-8 border overflow-hidden transition-all duration-300 hover:-translate-y-1 ${
                        popular
                          ? 'border-gold-400/60 shadow-[0_0_0_1px_rgba(212,168,67,0.3),0_20px_50px_-12px_rgba(212,168,67,0.35)] bg-navy-800 hover:shadow-[0_0_0_1px_rgba(212,168,67,0.4),0_24px_60px_-12px_rgba(212,168,67,0.45)]'
                          : 'border-white/10 shadow-sm bg-white/[0.06] backdrop-blur-xl hover:border-gold-400/20 hover:shadow-xl'
                      }`}
                    >
                      <div className={`absolute top-0 left-0 right-0 h-1 ${popular ? 'bg-gradient-to-r from-gold-300 via-gold-400 to-gold-500' : 'bg-white/10'}`} />
                      {popular && (
                        <div className="inline-flex items-center gap-1 text-gold-400 text-[11px] font-bold tracking-[0.15em] uppercase mb-3">
                          ⭐ Paling Populer
                        </div>
                      )}
                      <h3 className="font-heading font-bold text-xl mb-5 tracking-tight text-white">{p.name}</h3>
                      <div className="space-y-3 mb-8">
                        <div className="flex justify-between items-baseline">
                          <span className="text-sm text-gray-400">1 Sesi/Minggu</span>
                          <span className="font-bold tabular-nums text-white">{formatRupiah(p.price1)}</span>
                        </div>
                        <div className="h-px bg-white/10" />
                        <div className="flex justify-between items-baseline">
                          <span className="text-sm text-gray-400">2 Sesi/Minggu</span>
                          <span className="font-bold tabular-nums text-white">{formatRupiah(p.price2)}</span>
                        </div>
                      </div>
                      <Link
                        href={`/daftar?packageId=${p.id2}`}
                        className={`group flex items-center justify-center gap-1.5 w-full py-3 rounded-full font-semibold text-sm transition-all duration-200 ${
                          popular ? 'bg-gradient-to-r from-gold-400 to-gold-500 text-navy-900 hover:from-gold-300 hover:to-gold-400 shadow-[0_0_20px_rgba(212,175,55,0.3)]' : 'bg-white/10 text-white hover:bg-white/15'
                        }`}
                      >
                        <Check className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" /> Pilih Paket
                      </Link>
                    </div>
                  </Reveal>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* BENEFITS */}
      <section className="relative py-20 sm:py-24 bg-navy-900 overflow-hidden">
        <div aria-hidden="true" className="absolute -top-24 left-[-6rem] w-96 h-96 rounded-full bg-gold-400/[0.06] blur-[110px]" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="max-w-2xl mb-12">
            <span className="text-xs font-bold tracking-[0.2em] text-gold-400 uppercase">Termasuk di Setiap Paket</span>
            <h2 className="font-heading font-bold text-3xl mt-3 mb-3 text-white tracking-tight">Bukan Cuma Latihan</h2>
            <p className="text-gray-400">Semua paket latihan sudah termasuk akses penuh ke sistem digital SixStars Academy.</p>
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
