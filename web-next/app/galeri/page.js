import PublicNav from '@/components/PublicNav'
import PublicFooter from '@/components/PublicFooter'
import PageHero from '@/components/landing/PageHero'
import GaleriGrid from '@/components/GaleriGrid'
import { getLandingData, galleryFallbackPhotos } from '@/lib/landingData'

export default async function GaleriPage() {
  const { gallery, settings } = await getLandingData()
  const items = gallery && gallery.length
    ? gallery.map((g) => ({
        images: Array.isArray(g.images) ? g.images : [g.image || g.url].filter(Boolean),
        caption: g.caption || '',
      })).filter((g) => g.images.length > 0)
    : galleryFallbackPhotos.map((src) => ({ images: [src], caption: '' }))

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
          <GaleriGrid items={items} />
        </div>
      </section>
      <PublicFooter settings={settings} />
    </>
  )
}
