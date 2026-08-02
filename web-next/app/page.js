import Link from 'next/link'
import { ArrowRight, ZoomIn } from 'lucide-react'
import PublicNav from '@/components/PublicNav'
import PublicFooter from '@/components/PublicFooter'
import Reveal from '@/components/Reveal'
import Hero from '@/components/landing/Hero'
import ScoreboardTicker from '@/components/landing/ScoreboardTicker'
import FootballIcon from '@/components/landing/FootballIcon'
import ProgramCard from '@/components/landing/ProgramCard'
import ScheduleCard from '@/components/landing/ScheduleCard'
import { getLandingData, galleryFallbackPhotos } from '@/lib/landingData'

function SectionTeaserHeader({ eyebrow, title, desc, href, cta }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-14">
      <Reveal className="max-w-2xl">
        <span className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.2em] text-gold-400 uppercase">
          <FootballIcon className="w-3.5 h-3.5" />
          {eyebrow}
        </span>
        <h2 className="font-heading font-bold text-3xl sm:text-4xl mt-3 mb-3 text-balance tracking-tight text-white">{title}</h2>
        <p className="text-lg text-gray-400">{desc}</p>
      </Reveal>
      <Reveal>
        <Link
          href={href}
          className="group inline-flex items-center gap-1.5 font-semibold text-sm shrink-0 transition-colors duration-200 text-gold-400 hover:text-gold-300"
        >
          {cta}
          <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
        </Link>
      </Reveal>
    </div>
  )
}

export default async function Home() {
  const { stats, programs, schedulePreview, gallery, sponsors, settings } = await getLandingData()

  return (
    <>
      <PublicNav />
      <Hero />
      <ScoreboardTicker stats={stats} />

      {/* PROGRAM (teaser) */}
      <section className="relative py-24 sm:py-28 bg-navy-900 overflow-hidden">
        <div aria-hidden="true" className="absolute -top-24 right-[-6rem] w-96 h-96 rounded-full bg-gold-400/[0.06] blur-[110px]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionTeaserHeader
            eyebrow="Kurikulum"
            title="Program Latihan Berjenjang"
            desc="Setiap kelompok umur punya kurikulum sendiri, dirancang bertahap dari dasar hingga siap kompetisi."
            href="/program"
            cta="Lihat Semua Program"
          />
          <div className="grid md:grid-cols-3 gap-6">
            {programs.slice(0, 3).map((p, i) => (
              <ProgramCard key={p.title} program={p} index={i} delayed={i === 1} />
            ))}
          </div>
        </div>
      </section>

      {/* JADWAL (teaser) */}
      <section className="relative py-24 sm:py-28 bg-navy-900 overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=1600&q=60"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-navy-900 via-navy-950/85 to-navy-900" />
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.4] [background-image:radial-gradient(circle_at_20%_20%,rgba(212,168,67,0.1),transparent_45%)]"
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionTeaserHeader
            eyebrow="Fixtures"
            title="Jadwal Latihan Mingguan"
            desc="Tersebar di beberapa cabang (BSD, Jakarta) — pilih cabang terdekat saat mendaftar."
            href="/jadwal"
            cta="Lihat Semua Jadwal"
          />
          <div className="grid sm:grid-cols-3 gap-5">
            {schedulePreview.slice(0, 3).map((s, i) => (
              <ScheduleCard key={`${s.ageGroup}-${i}`} schedule={s} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* GALERI (teaser) */}
      <section className="relative py-24 sm:py-28 bg-navy-900 overflow-hidden">
        <div aria-hidden="true" className="absolute -bottom-24 left-[-6rem] w-96 h-96 rounded-full bg-gold-400/[0.05] blur-[110px]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionTeaserHeader
            eyebrow="Momen"
            title="Dari Lapangan Latihan"
            desc="Potret keseharian, kompetisi, dan perkembangan siswa SixStars Academy."
            href="/galeri"
            cta="Lihat Galeri Lengkap"
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
            {(gallery && gallery.length ? gallery.slice(0, 4).map((g) => g.image || g.url) : galleryFallbackPhotos.slice(0, 4)).map((src, i) => (
              <Reveal key={i} className={i % 2 === 1 ? 'sm:translate-y-8' : ''}>
                <div className="group relative aspect-square rounded-3xl overflow-hidden shadow-md ring-1 ring-white/10 hover:ring-gold-400/30 transition-all duration-300">
                  <div
                    className="absolute inset-0 bg-cover bg-center bg-navy-800 transition-transform duration-500 group-hover:scale-110"
                    style={{ backgroundImage: `url(${src})` }}
                  />
                  <div className="absolute inset-0 bg-navy-950/0 group-hover:bg-navy-950/40 transition-colors duration-300 flex items-center justify-center">
                    <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* SPONSOR (teaser) */}
      <section className="relative py-20 bg-navy-900 border-y border-white/5 overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="text-center mb-12">
            <span className="text-xs font-bold tracking-[0.2em] text-gold-400 uppercase">Mitra Resmi</span>
            <h2 className="font-heading font-bold text-2xl sm:text-3xl text-white mt-3 tracking-tight">Didukung Oleh</h2>
          </Reveal>
          <Reveal group className="flex flex-wrap items-center justify-center gap-x-12 gap-y-8 mb-10">
            {(sponsors && sponsors.length ? sponsors.slice(0, 6) : []).map((s, i) => (
              s.image && (
                <img
                  key={i}
                  src={s.image}
                  alt="Sponsor"
                  className="h-8 sm:h-10 w-auto object-contain grayscale hover:grayscale-0 opacity-70 hover:opacity-100 transition-all duration-300"
                />
              )
            ))}
          </Reveal>
          <Reveal className="text-center">
            <Link href="/sponsor" className="group inline-flex items-center gap-1.5 font-semibold text-sm text-gold-400 hover:text-gold-300 transition-colors duration-200">
              Lihat Semua Mitra
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          </Reveal>
        </div>
      </section>

      <PublicFooter settings={settings} />
    </>
  )
}
