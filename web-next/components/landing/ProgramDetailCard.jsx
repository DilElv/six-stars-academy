import { Check, Calendar } from 'lucide-react'
import Reveal from '@/components/Reveal'
import FootballIcon from './FootballIcon'

const PROGRAM_PHOTOS = [
  'https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?auto=format&fit=crop&w=900&q=75',
  'https://images.unsplash.com/photo-1543326727-cf6c39e8f84c?auto=format&fit=crop&w=900&q=75',
  'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?auto=format&fit=crop&w=900&q=75',
]

const FOCUS_LABEL = { teknik: 'Teknik', taktik: 'Taktik', fisik: 'Fisik', mental: 'Mental' }
const FOCUS_COLOR = { teknik: 'bg-gold-400', taktik: 'bg-emerald-400', fisik: 'bg-blue-400', mental: 'bg-rose-400' }

export default function ProgramDetailCard({ program, index, detail }) {
  const photo = program.photo || PROGRAM_PHOTOS[index % PROGRAM_PHOTOS.length]
  const cleanTitle = program.title.replace(/\s*\(.*?\)\s*/, ' ').trim()

  return (
    <Reveal>
      <div className="grid lg:grid-cols-[0.85fr_1.15fr] gap-0 rounded-3xl overflow-hidden bg-white/[0.05] backdrop-blur-xl border border-white/10 hover:border-gold-400/20 transition-colors duration-300">
        <div className="relative min-h-[220px] lg:min-h-full">
          <img src={photo} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/10 to-transparent lg:bg-gradient-to-r lg:from-navy-950/40 lg:via-transparent lg:to-transparent" />
          <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-semibold">
            <FootballIcon className="w-3 h-3" />
            {detail?.sessionsPerWeek || 'Latihan Rutin'}
          </div>
          <div className="absolute bottom-4 left-4 right-4">
            <h3 className="font-heading font-bold text-white text-2xl tracking-tight">{cleanTitle}</h3>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <p className="text-sm text-gray-400 leading-relaxed mb-5">{program.desc}</p>

          {detail && (
            <>
              <div className="flex items-center gap-2 flex-wrap mb-6">
                {detail.ageGroups.map((ag) => (
                  <span key={ag} className="text-xs font-bold px-2.5 py-1 rounded-full bg-gold-400/10 border border-gold-400/25 text-gold-400">
                    {ag}
                  </span>
                ))}
              </div>

              <div className="mb-6">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Fokus Kurikulum</div>
                <div className="h-2.5 rounded-full overflow-hidden flex w-full bg-white/5">
                  {Object.entries(detail.focus).map(([key, pct]) => (
                    <div key={key} className={FOCUS_COLOR[key]} style={{ width: `${pct}%` }} title={`${FOCUS_LABEL[key]} ${pct}%`} />
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                  {Object.entries(detail.focus).map(([key, pct]) => (
                    <div key={key} className="flex items-center gap-1.5 text-xs text-gray-400">
                      <span className={`w-2 h-2 rounded-full ${FOCUS_COLOR[key]}`} />
                      {FOCUS_LABEL[key]} <span className="text-gray-500">{pct}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2.5 mb-6">
                {detail.highlights.map((h) => (
                  <div key={h} className="flex items-start gap-2.5 text-sm text-gray-300">
                    <Check size={15} className="text-gold-400 shrink-0 mt-0.5" />
                    {h}
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500 pt-4 border-t border-white/10">
                <Calendar size={13} className="text-gold-500" />
                Jadwal disesuaikan per kelompok umur — lihat halaman Jadwal
              </div>
            </>
          )}
        </div>
      </div>
    </Reveal>
  )
}
