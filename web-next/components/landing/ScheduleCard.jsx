import { Clock, Users, MapPin, ExternalLink } from 'lucide-react'
import Reveal from '@/components/Reveal'

export default function ScheduleCard({ schedule, index }) {
  return (
    <Reveal className={index % 3 === 1 ? 'sm:translate-y-4' : ''}>
      <div className="group relative overflow-hidden rounded-3xl bg-white/[0.06] backdrop-blur-xl border border-white/10 p-6 hover:bg-white/[0.09] hover:border-gold-400/30 transition-all duration-300 hover:-translate-y-1">
        <div
          aria-hidden="true"
          className="absolute -bottom-6 -right-4 font-heading font-bold text-8xl text-white/[0.04] leading-none select-none group-hover:text-gold-400/10 transition-colors duration-300"
        >
          {schedule.ageGroup.replace(/U-/g, '')}
        </div>
        <div className="relative">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(212,175,55,0.35)]">
            <Users size={18} className="text-navy-900" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-navy-700/60 border border-white/10 text-[10px] font-semibold text-gold-400 tracking-wide uppercase mb-2">
            <MapPin size={10} />
            {schedule.branch}
          </div>
          <div className="font-heading font-bold text-white text-2xl tracking-tight mb-1">{schedule.ageGroup}</div>
          <div className="text-gray-300 text-sm font-medium mb-3">{schedule.day}</div>
          <div className="inline-flex flex-col gap-0.5 text-xs font-semibold text-gold-400 bg-gold-400/10 border border-gold-400/20 px-3 py-1.5 rounded-full mb-3">
            <div className="flex items-center gap-2">
              <Clock size={13} className="shrink-0" />
              <span className="tabular-nums">{schedule.time.split('·')[0].trim()}</span>
            </div>
            {schedule.time.includes('·') && (
              <div className="flex items-center gap-2 pl-[21px]">
                <span className="tabular-nums">{schedule.time.split('·')[1].trim()}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
            <MapPin size={12} className="shrink-0 text-gold-500" />
            <span>{schedule.location}</span>
          </div>
          <a
            href={schedule.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-gold-400 hover:text-gold-300 transition-colors"
          >
            <ExternalLink size={11} />
            Buka Maps
          </a>
        </div>
      </div>
    </Reveal>
  )
}
