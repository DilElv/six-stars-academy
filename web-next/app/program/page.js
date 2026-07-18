import Link from 'next/link'
import { ArrowRight, Zap, Target, Dumbbell, Brain } from 'lucide-react'
import PublicNav from '@/components/PublicNav'
import PublicFooter from '@/components/PublicFooter'
import PageHero from '@/components/landing/PageHero'
import ProgramDetailCard from '@/components/landing/ProgramDetailCard'
import Reveal from '@/components/Reveal'
import { getLandingData, programDetails } from '@/lib/landingData'
import { AGE_GROUPS } from '@/lib/ageGroups'

const AGE_GROUP_INFO = {
  'U-8': 'Pengenalan bola & koordinasi dasar',
  'U-10': 'Teknik individu & permainan kecil',
  'U-12': 'Dasar taktik & kerja sama tim',
  'U-14': 'Taktik menyerang & bertahan',
  'U-16': 'Fisik & mental level kompetitif',
  'U-18': 'Persiapan seleksi & jenjang klub',
}

const METHOD_PILLARS = [
  { icon: Zap, key: 'Teknik', desc: 'Passing, control, dribbling, shooting hingga 1v1 — dinilai rutin tiap bulan.' },
  { icon: Target, key: 'Taktik', desc: 'Prinsip menyerang & bertahan, transisi, dan pengambilan keputusan di lapangan.' },
  { icon: Dumbbell, key: 'Fisik', desc: 'Kekuatan, kecepatan, daya tahan, dan reaksi sesuai tahap perkembangan usia.' },
  { icon: Brain, key: 'Mental', desc: 'Percaya diri, kepemimpinan, disiplin, dan komunikasi di dalam tim.' },
]

export default async function ProgramPage() {
  const { programs, settings } = await getLandingData()

  return (
    <>
      <PublicNav />
      <PageHero
        eyebrow="Kurikulum"
        title="Program Latihan Berjenjang"
        desc="Setiap kelompok umur punya kurikulum sendiri, dirancang bertahap dari dasar hingga siap kompetisi — dievaluasi lewat sistem penilaian 4 pilar yang sama yang dipakai pelatih kami setiap bulan."
      />

      {/* PROGRAM TIERS */}
      <section className="relative py-20 sm:py-24 bg-navy-900 overflow-hidden">
        <div aria-hidden="true" className="absolute -top-24 right-[-6rem] w-96 h-96 rounded-full bg-gold-400/[0.06] blur-[110px]" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          {programs.map((p, i) => (
            <ProgramDetailCard key={p.title} program={p} index={i} detail={programDetails[i % programDetails.length]} />
          ))}
        </div>
      </section>

      {/* METODOLOGI 4 PILAR */}
      <section className="relative py-20 sm:py-24 bg-navy-900 overflow-hidden">
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal className="max-w-2xl mb-12">
            <span className="text-xs font-bold tracking-[0.2em] text-gold-400 uppercase">Metodologi</span>
            <h2 className="font-heading font-bold text-3xl mt-3 mb-3 text-white tracking-tight">4 Pilar Penilaian Pemain</h2>
            <p className="text-gray-400">Sistem yang sama dipakai pelatih untuk menilai perkembangan siswa tiap bulan, hasilnya bisa dipantau langsung oleh orang tua lewat rapor digital.</p>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {METHOD_PILLARS.map((m) => (
              <Reveal key={m.key}>
                <div className="group h-full bg-white/[0.05] backdrop-blur-xl border border-white/10 hover:border-gold-400/20 rounded-3xl p-6 transition-colors duration-300">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(212,175,55,0.25)]">
                    <m.icon size={18} className="text-navy-900" />
                  </div>
                  <div className="font-heading font-bold text-white text-lg mb-1.5">{m.key}</div>
                  <p className="text-sm text-gray-400 leading-relaxed">{m.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* KELOMPOK UMUR */}
      <section className="relative py-20 sm:py-24 bg-navy-900 overflow-hidden">
        <div aria-hidden="true" className="absolute -bottom-24 left-[-6rem] w-96 h-96 rounded-full bg-gold-400/[0.05] blur-[110px]" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-12">
            <Reveal className="max-w-2xl">
              <span className="text-xs font-bold tracking-[0.2em] text-gold-400 uppercase">Semua Kelompok Umur</span>
              <h2 className="font-heading font-bold text-3xl mt-3 mb-3 text-white tracking-tight">Dari U-8 Hingga U-18</h2>
              <p className="text-gray-400">Setiap kelompok umur punya jadwal dan penekanan kurikulum masing-masing.</p>
            </Reveal>
            <Reveal>
              <Link href="/jadwal" className="group inline-flex items-center gap-1.5 font-semibold text-sm shrink-0 text-gold-400 hover:text-gold-300 transition-colors duration-200">
                Lihat Jadwal Lengkap
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
            </Reveal>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {AGE_GROUPS.map((ag) => (
              <Reveal key={ag}>
                <div className="group relative overflow-hidden bg-white/[0.05] backdrop-blur-xl border border-white/10 hover:border-gold-400/30 rounded-2xl p-5 text-center transition-colors duration-300">
                  <div
                    aria-hidden="true"
                    className="absolute -bottom-3 -right-1 font-heading font-bold text-6xl text-white/[0.04] leading-none select-none group-hover:text-gold-400/10 transition-colors duration-300"
                  >
                    {ag.replace('U-', '')}
                  </div>
                  <div className="relative font-heading font-bold text-white text-xl mb-1.5">{ag}</div>
                  <p className="relative text-xs text-gray-400 leading-snug">{AGE_GROUP_INFO[ag]}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-20 bg-navy-900 border-t border-white/5 overflow-hidden">
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Reveal>
            <h2 className="font-heading font-bold text-2xl sm:text-3xl text-white mb-4 tracking-tight">Siap tentukan kelompok umur yang tepat?</h2>
            <p className="text-gray-400 mb-8">Daftar sekarang, sistem kami otomatis menempatkan si kecil ke kelompok umur sesuai tanggal lahirnya.</p>
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
