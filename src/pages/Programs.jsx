import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle, Clock, ArrowRight, Users, Target, Zap, Brain, Swords, BarChart3 } from 'lucide-react'
import { programs as defaultPrograms } from '../data/mock'

const focusIcons = {
  'Basic Ball Control': Target,
  'Motor Coordination': Zap,
  'Fun Games': Brain,
  'Team Play Basics': Users,
  'Passing & Receiving': Target,
  'Dribbling Technique': Zap,
  'Positional Play': Brain,
  'Small-Sided Games': Swords,
  'Tactical Formation': BarChart3,
  'Match Analysis': Brain,
  'Set Pieces': Target,
  'Physical Conditioning': Zap,
}

const statusColors = {
  open: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
  limited: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
  closed: 'bg-rose-400/10 text-rose-400 border-rose-400/20',
}

export default function Programs() {
  const [programs, setPrograms] = useState(defaultPrograms)
  useEffect(() => {
    import('../api').then((api) =>
      api.getSiteContent('programs').then((d) => { if (d.data) setPrograms(d.data) }).catch(() => {})
    )
  }, [])
  return (
    <div className="py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <h1 className="font-heading text-3xl lg:text-4xl font-bold text-white mb-4">
            Program{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-400 to-gold-300">
              Pembinaan
            </span>
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            Kurikulum terstruktur untuk setiap kelompok usia, dirancang oleh pelatih profesional.
          </p>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {programs.map((prog) => (
            <div
              key={prog.id}
              className="group bg-navy-800/50 backdrop-blur-sm rounded-2xl border border-white/10 hover:border-gold-400/30 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-gold-500/5"
            >
              {/* Header */}
              <div className="p-6 lg:p-8 pb-4">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span className="text-gold-400 font-heading font-bold text-sm uppercase tracking-wider">
                      {prog.ageGroup}
                    </span>
                    <h3 className="font-heading text-xl font-bold text-white mt-1">{prog.title}</h3>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${statusColors[prog.status]}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${prog.status === 'open' ? 'bg-emerald-400' : prog.status === 'limited' ? 'bg-amber-400' : 'bg-rose-400'}`} />
                    {prog.statusText}
                  </span>
                </div>
                <p className="text-gray-400 text-sm leading-relaxed">{prog.description}</p>
              </div>

              {/* Focus Areas */}
              <div className="px-6 lg:px-8 pb-6">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" />
                  Fokus Latihan
                </p>
                <div className="space-y-2">
                  {prog.focus.map((item) => {
                    const Icon = focusIcons[item] || CheckCircle
                    return (
                      <div key={item} className="flex items-center gap-3 text-sm">
                        <Icon className="w-4 h-4 text-gold-400 shrink-0" />
                        <span className="text-gray-300">{item}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 lg:px-8 pb-6 lg:pb-8">
                <Link
                  to="/schedule"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-gold-400 hover:text-gold-300 transition-colors group/link"
                >
                  <Clock className="w-4 h-4" />
                  Lihat Jadwal
                  <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
