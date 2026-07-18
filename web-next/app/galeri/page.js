import PublicNav from '@/components/PublicNav'
import PublicFooter from '@/components/PublicFooter'
import PageHero from '@/components/landing/PageHero'
import Reveal from '@/components/Reveal'
import { getLandingData, galleryFallbackPhotos } from '@/lib/landingData'
import { ZoomIn } from 'lucide-react'

export default async function GaleriPage() {
  const { gallery, settings } = await getLandingData()
  const items = gallery && gallery.length ? gallery.map((g) => g.image || g.url) : galleryFallbackPhotos

  return (
    <>
      <PublicNav />
      <PageHero
        eyebrow="Momen"
        title="Dari Lapangan Latihan"
        desc="Potret keseharian, kompetisi, dan perkembangan siswa SixStars Academy."
      />
      <section className="relative py-20 sm:py-24 bg-navy-900 overflow-hidden">
        <div aria-hidden="true" className="absolute -top-24 left-[-6rem] w-96 h-96 rounded-full bg-gold-400/[0.06] blur-[110px]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5">
            {items.map((src, i) => (
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
      <PublicFooter settings={settings} />
    </>
  )
}
