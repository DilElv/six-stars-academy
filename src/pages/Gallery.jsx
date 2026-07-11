import { useState, useEffect } from 'react'
import { Image, Camera, CalendarDays } from 'lucide-react'
import { gallery as defaultGallery } from '../data/mock'

const filters = [
  { id: 'all', label: 'Semua' },
  { id: 'Latihan', label: 'Latihan' },
  { id: 'Turnamen', label: 'Turnamen' },
  { id: 'Kegiatan', label: 'Kegiatan' },
]

export default function Gallery() {
  const [activeFilter, setActiveFilter] = useState('all')
  const [gallery, setGallery] = useState(defaultGallery)

  useEffect(() => {
    import('../api').then((api) =>
      api.getSiteContent('gallery').then((d) => { if (d.data) setGallery(d.data) }).catch(() => {})
    )
  }, [])

  const filtered =
    activeFilter === 'all' ? gallery : gallery.filter((item) => item.category === activeFilter)

  return (
    <div className="py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <h1 className="font-heading text-3xl lg:text-4xl font-bold text-white mb-4">
            Galeri{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-400 to-gold-300">
              Kegiatan
            </span>
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            Dokumentasi momen-momen terbaik perjalanan akademi SSB Six Star.
          </p>
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                activeFilter === f.id
                  ? 'bg-gold-400 text-navy-900 shadow-lg shadow-gold-500/20'
                  : 'bg-navy-800/50 text-gray-400 border border-white/10 hover:border-gold-400/30 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Masonry Grid */}
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
          {filtered.map((photo) => (
            <div
              key={photo.id}
              className="group break-inside-avoid relative overflow-hidden rounded-xl bg-navy-800/50 border border-white/10 hover:border-gold-400/30 transition-all duration-300"
            >
              <img
                src={photo.src}
                alt={photo.title}
                loading="lazy"
                className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy-950/80 via-navy-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="absolute bottom-0 left-0 right-0 p-5 translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                <div className="flex items-center gap-2 text-gold-400 text-xs mb-1.5">
                  <Camera className="w-3.5 h-3.5" />
                  <span>{photo.category}</span>
                </div>
                <h3 className="font-heading font-bold text-white text-sm">{photo.title}</h3>
                <div className="flex items-center gap-1.5 text-gray-300 text-xs mt-1">
                  <CalendarDays className="w-3 h-3" />
                  {photo.date}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20">
            <Image className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500">Tidak ada foto untuk kategori ini.</p>
          </div>
        )}
      </div>
    </div>
  )
}
