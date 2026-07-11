import { useState, useEffect } from 'react'
import { Calendar, Clock, MapPin, User, ExternalLink, Trophy, ChevronRight } from 'lucide-react'
import { schedules as defaultSchedules, venues as defaultVenues } from '../data/mock'

const ageGroups = [
  { id: 'u10', label: 'U-10', desc: 'Early Development' },
  { id: 'u12', label: 'U-12', desc: 'Pre-Academy' },
  { id: 'u15', label: 'U-15', desc: 'Youth Academy' },
]

export default function Schedule() {
  const [activeTab, setActiveTab] = useState('u10')
  const [schedules, setSchedules] = useState(defaultSchedules)
  const [venues, setVenues] = useState(defaultVenues)

  useEffect(() => {
    import('../api').then((api) =>
      api.getAllSiteContent().then((d) => {
        if (d.schedules) setSchedules(d.schedules)
        if (d.venues) setVenues(d.venues)
      }).catch(() => {})
    )
  }, [])

  const currentSchedule = schedules[activeTab]
  const activeGroup = ageGroups.find((g) => g.id === activeTab)

  return (
    <div className="py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <h1 className="font-heading text-3xl lg:text-4xl font-bold text-white mb-4">
            Jadwal &{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-400 to-gold-300">
              Venue
            </span>
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            Jadwal latihan rutin dan informasi lokasi untuk setiap kelompok usia.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex bg-navy-800/50 backdrop-blur-sm rounded-xl p-1.5 border border-white/10">
            {ageGroups.map((group) => (
              <button
                key={group.id}
                onClick={() => setActiveTab(group.id)}
                className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  activeTab === group.id
                    ? 'bg-gold-400 text-navy-900 shadow-lg shadow-gold-500/20'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {group.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Schedule List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-5 h-5 text-gold-400" />
              <h2 className="font-heading text-xl font-bold text-white">
                Jadwal Latihan {activeGroup?.label} — {activeGroup?.desc}
              </h2>
            </div>

            {currentSchedule.map((session, idx) => (
              <div
                key={idx}
                className="bg-navy-800/50 backdrop-blur-sm rounded-xl border border-white/10 hover:border-gold-400/20 p-6 transition-all duration-300"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                  <div className="flex items-center gap-3 sm:min-w-[160px]">
                    <div className="w-12 h-12 rounded-xl bg-gold-400/10 flex items-center justify-center shrink-0">
                      <Clock className="w-5 h-5 text-gold-400" />
                    </div>
                    <div>
                      <p className="font-heading font-bold text-white">{session.day}</p>
                      <p className="text-sm text-gray-400">{session.time}</p>
                    </div>
                  </div>
                  <div className="hidden sm:block w-px h-10 bg-white/10" />
                  <div className="flex-1">
                    <p className="font-semibold text-white">{session.focus}</p>
                    <div className="flex items-center gap-1.5 text-sm text-gray-400 mt-1">
                      <User className="w-3.5 h-3.5" />
                      {session.coach}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Venue Info */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <MapPin className="w-5 h-5 text-gold-400" />
              <h2 className="font-heading text-xl font-bold text-white">Lokasi</h2>
            </div>

            {[venues.main, venues.secondary].map((venue, i) => (
              <div
                key={i}
                className="bg-navy-800/50 backdrop-blur-sm rounded-xl border border-white/10 hover:border-gold-400/20 p-6 transition-all duration-300"
              >
                <div className="flex items-start gap-3 mb-3">
                  <MapPin className="w-5 h-5 text-gold-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-heading font-bold text-white text-sm">{venue.name}</h3>
                    <p className="text-gray-400 text-xs mt-1">{venue.address}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {venue.facilities.map((fac) => (
                    <span
                      key={fac}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-white/5 text-gray-400 text-xs border border-white/5"
                    >
                      <Trophy className="w-3 h-3 mr-1 text-gold-400" />
                      {fac}
                    </span>
                  ))}
                </div>

                <a
                  href={venue.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-gold-400 hover:text-gold-300 transition-colors group"
                >
                  <MapPin className="w-4 h-4" />
                  Lihat Lokasi (Google Maps)
                  <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
