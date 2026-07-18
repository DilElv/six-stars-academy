import Link from 'next/link'
import { Check, Clock } from 'lucide-react'
import PublicNav from '@/components/PublicNav'
import PublicFooter from '@/components/PublicFooter'
import Reveal from '@/components/Reveal'
import Hero from '@/components/landing/Hero'
import ScoreboardTicker from '@/components/landing/ScoreboardTicker'
import PitchDivider from '@/components/landing/PitchDivider'

const API_URL = 'http://localhost:3002/api'

const defaultStats = [
  { label: 'Siswa Aktif', value: '500+', icon: 'Users' },
  { label: 'Pelatih Bersertifikat', value: '15+', icon: 'Award' },
  { label: 'Lapangan Latihan', value: '5+', icon: 'MapPin' },
  { label: 'Tahun Berdiri', value: 'Sejak 2015', icon: 'Calendar' },
]

const defaultPrograms = [
  { title: 'Grassroots (U-8 - U-12)', desc: 'Pengenalan dasar teknik, koordinasi, dan kecintaan pada sepak bola.' },
  { title: 'Development (U-14 - U-16)', desc: 'Penguatan taktik, fisik, dan mental bertanding.' },
  { title: 'Elite (U-18)', desc: 'Persiapan jenjang kompetitif dan seleksi klub.' },
]

const defaultSchedule = [
  { ageGroup: 'U-10', day: 'Selasa & Kamis', time: '16.00 - 18.00 WIB' },
  { ageGroup: 'U-12', day: 'Senin & Rabu', time: '16.00 - 18.00 WIB' },
  { ageGroup: 'U-14', day: 'Jumat & Sabtu', time: '15.30 - 17.30 WIB' },
]

function formatRupiah(n) {
  return 'Rp' + (n || 0).toLocaleString('id-ID')
}

async function safeFetch(url) {
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

function groupPackages(packages) {
  const byName = {}
  for (const p of packages) {
    if (!byName[p.name]) byName[p.name] = { name: p.name, durationMonths: p.durationMonths }
    if (p.sessionsPerWeek === 1) { byName[p.name].id1 = p.id; byName[p.name].price1 = p.price }
    if (p.sessionsPerWeek === 2) { byName[p.name].id2 = p.id; byName[p.name].price2 = p.price }
  }
  return Object.values(byName).sort((a, b) => a.durationMonths - b.durationMonths)
}

function jerseyNumber(title) {
  const match = title.match(/U-?(\d+)/i)
  return match ? match[1] : null
}

export default async function Home() {
  const [cms, packagesRaw, settings] = await Promise.all([
    safeFetch(`${API_URL}/cms/public`),
    safeFetch(`${API_URL}/packages`),
    safeFetch(`${API_URL}/settings`),
  ])

  const stats = cms?.quickStats?.length ? cms.quickStats : defaultStats
  const programs = cms?.programs?.length ? cms.programs : defaultPrograms
  const schedulePreview = cms?.schedulePreview?.length ? cms.schedulePreview : defaultSchedule
  const gallery = cms?.gallery?.length ? cms.gallery : null
  const sponsors = cms?.sponsors?.length ? cms.sponsors : null
  const packages = packagesRaw?.length ? groupPackages(packagesRaw) : null

  return (
    <>
      <PublicNav />
      <Hero />
      <ScoreboardTicker stats={stats} />

      {/* PROGRAM */}
      <section id="program" className="py-24 sm:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="max-w-2xl mb-14">
          <span className="text-xs font-bold tracking-[0.2em] text-gold-500 uppercase">Kurikulum</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-navy-900 mt-3 mb-3 text-balance">Program Latihan Berjenjang</h2>
          <p className="text-gray-500 text-lg">Setiap kelompok umur punya kurikulum sendiri, dirancang bertahap dari dasar hingga siap kompetisi.</p>
        </Reveal>
        <div className="grid md:grid-cols-3 gap-6">
          {programs.map((p, i) => {
            const num = jerseyNumber(p.title)
            return (
              <Reveal key={p.title} className={i === 1 ? 'md:translate-y-6' : ''}>
                <div className="group relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-8 h-full shadow-sm hover:shadow-xl hover:border-gold-300 transition-all duration-300 hover:-translate-y-1">
                  {num && (
                    <span
                      aria-hidden="true"
                      className="absolute -top-4 -right-2 font-extrabold text-8xl text-navy-900/[0.05] leading-none select-none group-hover:text-gold-400/10 transition-colors duration-300"
                    >
                      {num}
                    </span>
                  )}
                  <div className="relative">
                    <div className="w-10 h-10 rounded-lg bg-navy-900 flex items-center justify-center mb-5">
                      <span className="w-2 h-2 rounded-full bg-gold-400" />
                    </div>
                    <h3 className="font-bold text-navy-900 text-lg mb-2">{p.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{p.desc}</p>
                  </div>
                </div>
              </Reveal>
            )
          })}
        </div>
      </section>

      <PitchDivider tone="light" />

      {/* JADWAL */}
      <section id="jadwal" className="py-24 sm:py-28 bg-navy-950 relative overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.4] [background-image:radial-gradient(circle_at_20%_20%,rgba(212,168,67,0.08),transparent_45%)]"
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="max-w-2xl mb-14">
            <span className="text-xs font-bold tracking-[0.2em] text-gold-500 uppercase">Fixtures</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-3 mb-3 text-balance">Jadwal Latihan Mingguan</h2>
            <p className="text-gray-400 text-lg">Sesi latihan rutin per kelompok umur, dikelola langsung oleh tim pelatih.</p>
          </Reveal>
          <Reveal group className="divide-y divide-white/10 border-y border-white/10">
            {schedulePreview.map((s) => (
              <div key={s.ageGroup} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 py-5">
                <div className="sm:w-32 shrink-0">
                  <span className="inline-flex items-center justify-center px-3 py-1 rounded-md bg-gold-400/10 border border-gold-400/25 text-gold-400 font-bold text-sm tracking-wide">
                    {s.ageGroup}
                  </span>
                </div>
                <div className="flex-1 text-white font-semibold">{s.day}</div>
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <Clock className="w-4 h-4 text-gold-500/70" />
                  <span className="tabular-nums">{s.time}</span>
                </div>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* GALERI */}
      <section id="galeri" className="py-24 sm:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="max-w-2xl mb-14">
          <span className="text-xs font-bold tracking-[0.2em] text-gold-500 uppercase">Momen</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-navy-900 mt-3 mb-3 text-balance">Dari Lapangan Latihan</h2>
          <p className="text-gray-500 text-lg">Potret keseharian, kompetisi, dan perkembangan siswa SixStars Academy.</p>
        </Reveal>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
          {gallery
            ? gallery.map((g, i) => (
                <Reveal key={i} className={i % 2 === 1 ? 'sm:translate-y-8' : ''}>
                  <div
                    className="aspect-square rounded-3xl bg-cover bg-center bg-navy-800 shadow-md hover:shadow-xl transition-shadow duration-300"
                    style={{ backgroundImage: `url(${g.image || g.url})` }}
                  />
                </Reveal>
              ))
            : [0, 1, 2, 3].map((i) => (
                <Reveal key={i} className={i % 2 === 1 ? 'sm:translate-y-8' : ''}>
                  <div className="group aspect-square rounded-3xl bg-gradient-to-br from-navy-800 to-navy-600 shadow-md hover:shadow-xl transition-shadow duration-300 flex items-center justify-center overflow-hidden">
                    <svg className="w-10 h-10 text-white/10 group-hover:text-gold-400/30 transition-colors duration-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M6 6l2 2M16 16l2 2M18 6l-2 2M8 16l-2 2" />
                    </svg>
                  </div>
                </Reveal>
              ))}
        </div>
      </section>

      {/* SPONSOR */}
      <section id="sponsor" className="py-20 bg-gray-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center mb-12">
            <span className="text-xs font-bold tracking-[0.2em] text-gold-600 uppercase">Mitra Resmi</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-navy-900 mt-3">Didukung Oleh</h2>
          </Reveal>
          <Reveal group className="flex flex-wrap items-center justify-center gap-x-12 gap-y-8">
            {(sponsors && sponsors.length ? sponsors : [1, 2, 3, 4]).map((s, i) => (
              <div
                key={i}
                className="text-gray-400 hover:text-navy-800 font-extrabold text-lg sm:text-xl tracking-tight grayscale hover:grayscale-0 opacity-60 hover:opacity-100 transition-all duration-300"
              >
                {typeof s === 'string' ? s : s.name || 'SPONSOR'}
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* PAKET */}
      <section id="paket" className="py-24 sm:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="max-w-2xl mb-14">
          <span className="text-xs font-bold tracking-[0.2em] text-gold-500 uppercase">Bergabung</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-navy-900 mt-3 mb-3 text-balance">Pilih Paket Latihan</h2>
          <p className="text-gray-500 text-lg">
            Harga belum termasuk biaya pendaftaran {formatRupiah(settings?.registrationFee ?? 750000)} (sekali bayar: 2 set jersey, kaos kaki, 1 bola).
          </p>
        </Reveal>
        {!packages ? (
          <p className="text-sm text-red-500">Paket belum tersedia, coba muat ulang halaman.</p>
        ) : (
          <div className="grid md:grid-cols-3 gap-6 items-start">
            {packages.map((p) => {
              const popular = p.durationMonths === 3
              return (
                <Reveal key={p.name} className={popular ? 'md:-translate-y-3' : ''}>
                  <div
                    className={`relative rounded-3xl p-8 border overflow-hidden ${
                      popular
                        ? 'border-gold-400/60 shadow-[0_0_0_1px_rgba(212,168,67,0.3),0_20px_50px_-12px_rgba(212,168,67,0.35)] bg-navy-900'
                        : 'border-gray-100 shadow-sm bg-white'
                    }`}
                  >
                    <div className={`absolute top-0 left-0 right-0 h-1 ${popular ? 'bg-gradient-to-r from-gold-300 via-gold-400 to-gold-500' : 'bg-gray-100'}`} />
                    {popular && (
                      <div className="inline-flex items-center gap-1 text-gold-400 text-[11px] font-bold tracking-[0.15em] uppercase mb-3">
                        ⭐ Paling Populer
                      </div>
                    )}
                    <h3 className={`font-extrabold text-xl mb-5 ${popular ? 'text-white' : 'text-navy-900'}`}>{p.name}</h3>
                    <div className="space-y-3 mb-8">
                      <div className="flex justify-between items-baseline">
                        <span className={`text-sm ${popular ? 'text-gray-400' : 'text-gray-500'}`}>1 Sesi/Minggu</span>
                        <span className={`font-bold tabular-nums ${popular ? 'text-white' : 'text-navy-900'}`}>{formatRupiah(p.price1)}</span>
                      </div>
                      <div className={`h-px ${popular ? 'bg-white/10' : 'bg-gray-100'}`} />
                      <div className="flex justify-between items-baseline">
                        <span className={`text-sm ${popular ? 'text-gray-400' : 'text-gray-500'}`}>2 Sesi/Minggu</span>
                        <span className={`font-bold tabular-nums ${popular ? 'text-white' : 'text-navy-900'}`}>{formatRupiah(p.price2)}</span>
                      </div>
                    </div>
                    <Link
                      href={`/daftar?packageId=${p.id2}`}
                      className={`flex items-center justify-center gap-1.5 w-full py-3 rounded-2xl font-semibold text-sm transition-colors duration-200 ${
                        popular ? 'bg-gold-400 text-navy-900 hover:bg-gold-300' : 'bg-navy-900 text-white hover:bg-navy-800'
                      }`}
                    >
                      <Check className="w-4 h-4" /> Pilih Paket
                    </Link>
                  </div>
                </Reveal>
              )
            })}
          </div>
        )}
      </section>

      <PublicFooter settings={settings} />
    </>
  )
}
