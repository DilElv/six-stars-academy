import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Users, Award, MapPin, Calendar, Target, Eye, Shield } from 'lucide-react'
import * as api from '../api'

const iconMap = { Users, Award, MapPin, Calendar }

const defaultStats = [
  { label: 'Siswa Aktif', value: '500+', icon: 'Users' },
  { label: 'Pelatih Bersertifikat', value: '15+', icon: 'Award' },
  { label: 'Lapangan Latihan', value: '5+', icon: 'MapPin' },
  { label: 'Tahun Berdiri', value: 'Sejak 2015', icon: 'Calendar' },
]

const defaultAbout = {
  mission: 'Menciptakan ekosistem pembinaan sepak bola usia dini yang profesional.',
  vision: 'Menjadi akademi sepak bola terdepan di Indonesia.',
  values: [
    { title: 'Disiplin', desc: 'Membentuk karakter melalui latihan yang konsisten dan terstruktur.' },
    { title: 'Integritas', desc: 'Menjunjung tinggi nilai sportivitas dan kejujuran.' },
    { title: 'Inovasi', desc: 'Mengadopsi metodologi pelatihan modern berbasis data.' },
  ],
}

export default function Home() {
  const [stats, setStats] = useState(defaultStats)
  const [about, setAbout] = useState(defaultAbout)

  useEffect(() => {
    Promise.all([
      api.getSiteContent('quickStats').catch(() => ({ data: defaultStats })),
      api.getSiteContent('aboutContent').catch(() => ({ data: defaultAbout })),
    ]).then(([s, a]) => {
      if (s.data) setStats(s.data)
      if (a.data) setAbout(a.data)
    })
  }, [])

  return (
    <>
      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1920&q=80"
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-navy-950/95 via-navy-900/85 to-navy-900/60" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold-400/10 border border-gold-400/20 text-gold-400 text-sm font-medium mb-6">
              <Shield className="w-4 h-4" />
              Akademi Sepak Bola Profesional
            </div>
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold leading-tight text-white mb-6">
              Membentuk Bintang{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-400 to-gold-300">
                Sepak Bola
              </span>{' '}
              Masa Depan
            </h1>
            <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mb-8 leading-relaxed">
              Bergabunglah dengan akademi sepak bola terkemuka yang menggabungkan teknik modern, 
              pembinaan karakter, dan pengalaman kompetitif untuk melahirkan pemain terbaik Indonesia.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/login?tab=daftar"
                className="inline-flex items-center gap-2 bg-gold-400 hover:bg-gold-500 text-navy-900 font-bold text-base px-8 py-3.5 rounded-xl transition-all duration-200 shadow-xl shadow-gold-500/30 hover:shadow-gold-500/50"
              >
                Daftar Sekarang
                <ChevronRight className="w-5 h-5" />
              </Link>
              <Link
                to="/programs"
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white font-semibold text-base px-8 py-3.5 rounded-xl border border-white/20 transition-all duration-200"
              >
                Lihat Program
              </Link>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-navy-900 to-transparent" />
      </section>

      {/* Stats */}
      <section className="relative -mt-16 z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = iconMap[stat.icon]
            return (
              <div
                key={stat.label}
                className="bg-navy-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/10 hover:border-gold-400/30 transition-all duration-300 group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gold-400/10 flex items-center justify-center group-hover:bg-gold-400/20 transition-colors">
                    <Icon className="w-5 h-5 text-gold-400" />
                  </div>
                </div>
                <p className="font-heading text-2xl lg:text-3xl font-bold text-white">{stat.value}</p>
                <p className="text-gray-400 text-sm mt-1">{stat.label}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* About */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-heading text-3xl lg:text-4xl font-bold text-white mb-4">
              Tentang{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-400 to-gold-300">
                SSB Six Star
              </span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              Akademi sepak bola yang berdiri sejak 2015, berkomitmen mencetak generasi emas sepak bola Indonesia.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 mb-12">
            <div className="bg-navy-800/50 backdrop-blur-sm rounded-2xl p-8 border border-white/5">
              <div className="w-12 h-12 rounded-xl bg-gold-400/10 flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-gold-400" />
              </div>
              <h3 className="font-heading text-xl font-bold text-white mb-3">Misi Kami</h3>
              <p className="text-gray-400 leading-relaxed">{about.mission}</p>
            </div>
            <div className="bg-navy-800/50 backdrop-blur-sm rounded-2xl p-8 border border-white/5">
              <div className="w-12 h-12 rounded-xl bg-gold-400/10 flex items-center justify-center mb-4">
                <Eye className="w-6 h-6 text-gold-400" />
              </div>
              <h3 className="font-heading text-xl font-bold text-white mb-3">Visi Kami</h3>
              <p className="text-gray-400 leading-relaxed">{about.vision}</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {about.values.map((val) => (
              <div
                key={val.title}
                className="bg-navy-800/30 rounded-xl p-6 text-center border border-white/5 hover:border-gold-400/20 transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-full bg-gold-400/10 flex items-center justify-center mx-auto mb-3">
                  <Shield className="w-5 h-5 text-gold-400" />
                </div>
                <h4 className="font-heading font-bold text-white mb-2">{val.title}</h4>
                <p className="text-gray-400 text-sm">{val.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-gradient-to-br from-navy-800 to-navy-900 rounded-3xl p-10 lg:p-16 border border-gold-400/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gold-400/5 rounded-full blur-3xl" />
            <div className="relative">
              <h2 className="font-heading text-3xl lg:text-4xl font-bold text-white mb-4">
                Siap Menjadi Bintang Berikutnya?
              </h2>
              <p className="text-gray-300 text-lg mb-8 max-w-xl mx-auto">
                Daftarkan putra Anda sekarang dan mulailah perjalanan menuju karir sepak bola profesional.
              </p>
              <Link
                to="/login?tab=daftar"
                className="inline-flex items-center gap-2 bg-gold-400 hover:bg-gold-500 text-navy-900 font-bold text-base px-8 py-3.5 rounded-xl transition-all duration-200 shadow-xl shadow-gold-500/30"
              >
                Daftar Sekarang
                <ChevronRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
