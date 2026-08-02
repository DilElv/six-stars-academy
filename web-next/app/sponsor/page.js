import PublicNav from '@/components/PublicNav'
import PublicFooter from '@/components/PublicFooter'
import PageHero from '@/components/landing/PageHero'
import Reveal from '@/components/Reveal'
import { Handshake } from 'lucide-react'
import { getLandingData } from '@/lib/landingData'

export default async function SponsorPage() {
  const { sponsors, settings } = await getLandingData()
  const list = sponsors && sponsors.length ? sponsors : []

  return (
    <>
      <PublicNav />
      <PageHero
        eyebrow="Mitra Resmi"
        title="Didukung Oleh"
        desc="Perusahaan dan komunitas yang percaya pada pengembangan sepak bola usia dini bersama kami."
      />
      <section className="relative py-20 sm:py-24 bg-navy-900 overflow-hidden">
        <div aria-hidden="true" className="absolute -bottom-24 right-[-6rem] w-96 h-96 rounded-full bg-gold-400/[0.06] blur-[110px]" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {list.length === 0 ? (
            <div className="text-center text-gray-400 py-10">Belum ada mitra yang ditampilkan.</div>
          ) : (
            <Reveal group className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
              {list.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center justify-center text-center bg-white/[0.06] backdrop-blur-xl rounded-3xl border border-white/10 hover:border-gold-400/30 shadow-sm hover:shadow-lg transition-all duration-300 p-8 aspect-[4/3]"
                >
                  {s.image ? (
                    <img src={s.image} alt="Sponsor" className="max-w-full max-h-full object-contain" />
                  ) : (
                    <Handshake className="w-8 h-8 text-gray-500" />
                  )}
                </div>
              ))}
            </Reveal>
          )}
        </div>
      </section>
      <PublicFooter settings={settings} />
    </>
  )
}
