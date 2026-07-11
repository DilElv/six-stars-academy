import { useState, useEffect } from 'react'
import { Medal, Handshake, Wifi, ExternalLink } from 'lucide-react'
import { sponsors as defaultSponsors } from '../data/mock'

const tiers = [
  {
    key: 'platinum',
    title: 'Platinum Sponsors',
    icon: Medal,
    desc: 'Mitra utama yang mendukung penuh operasional dan pengembangan akademi',
    cardClass: 'border-gold-400/40 bg-gradient-to-b from-navy-800 to-navy-800/50 shadow-lg shadow-gold-500/5',
    badge: 'Platinum',
    badgeClass: 'bg-gold-400 text-navy-900',
  },
  {
    key: 'official',
    title: 'Official Partners',
    icon: Handshake,
    desc: 'Mitra resmi dalam penyelenggaraan program dan kompetisi',
    cardClass: 'border-white/10 bg-navy-800/50',
    badge: null,
    badgeClass: '',
  },
  {
    key: 'media',
    title: 'Media & Technical Partners',
    icon: Wifi,
    desc: 'Mitra media dan teknologi yang mendukung operasional digital akademi',
    cardClass: 'border-white/10 bg-navy-800/30',
    badge: null,
    badgeClass: '',
  },
]

export default function Sponsors() {
  const [sponsors, setSponsors] = useState(defaultSponsors)

  useEffect(() => {
    import('../api').then((api) =>
      api.getSiteContent('sponsors').then((d) => { if (d.data) setSponsors(d.data) }).catch(() => {})
    )
  }, [])

  return (
    <div className="py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <h1 className="font-heading text-3xl lg:text-4xl font-bold text-white mb-4">
            Sponsor &{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-400 to-gold-300">
              Mitra
            </span>
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            Dukungan dari mitra dan sponsor terpercaya yang memungkinkan kami terus berkembang.
          </p>
        </div>

        <div className="space-y-16">
          {tiers.map((tier) => {
            const Icon = tier.icon
            const items = sponsors[tier.key]
            return (
              <div key={tier.key}>
                <div className="flex items-center gap-3 mb-2">
                  <Icon className="w-5 h-5 text-gold-400" />
                  <h2 className="font-heading text-xl lg:text-2xl font-bold text-white">
                    {tier.title}
                  </h2>
                </div>
                <p className="text-gray-400 text-sm mb-6">{tier.desc}</p>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {items.map((partner) => (
                    <div
                      key={partner.name}
                      className={`group rounded-2xl p-6 border ${tier.cardClass} hover:border-gold-400/30 transition-all duration-300`}
                    >
                      {/* Logo area */}
                      <div className="h-16 flex items-center mb-4">
                        <img
                          src={partner.logo}
                          alt={partner.name}
                          onError={(e) => {
                            e.target.onerror = null
                            e.target.style.display = 'none'
                          }}
                          className="h-10 max-w-[140px] object-contain brightness-0 invert opacity-60 group-hover:opacity-90 transition-all duration-300"
                        />
                      </div>

                      <div>
                        <h3 className="font-heading font-bold text-white text-sm">{partner.name}</h3>
                        <p className="text-gray-400 text-xs mt-1">{partner.type}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer CTA */}
        <div className="mt-20 text-center p-10 lg:p-14 rounded-3xl bg-navy-800/30 border border-white/5">
          <Medal className="w-10 h-10 text-gold-400 mx-auto mb-4" />
          <h2 className="font-heading text-2xl lg:text-3xl font-bold text-white mb-3">
            Tertarik Menjadi Mitra?
          </h2>
          <p className="text-gray-400 max-w-lg mx-auto mb-6">
            Kami terbuka untuk kolaborasi dengan brand dan institusi yang memiliki visi yang sama 
            dalam memajukan sepak bola usia dini di Indonesia.
          </p>
          <a
            href="mailto:partnership@ssbsixstar.id"
            className="inline-flex items-center gap-2 bg-gold-400 hover:bg-gold-500 text-navy-900 font-bold text-sm px-7 py-3 rounded-xl transition-all duration-200 shadow-lg shadow-gold-500/25"
          >
            Hubungi Tim Partnership
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  )
}
