import Reveal from '@/components/Reveal'
import FootballIcon from './FootballIcon'

const PROGRAM_PHOTOS = [
  'https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?auto=format&fit=crop&w=800&q=75',
  'https://images.unsplash.com/photo-1543326727-cf6c39e8f84c?auto=format&fit=crop&w=800&q=75',
  'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?auto=format&fit=crop&w=800&q=75',
]

function jerseyNumber(title) {
  const match = title.match(/U-?(\d+)/i)
  return match ? match[1] : null
}

export default function ProgramCard({ program, index, delayed }) {
  const num = jerseyNumber(program.title)
  const photo = program.photo || PROGRAM_PHOTOS[index % PROGRAM_PHOTOS.length]

  return (
    <Reveal className={delayed ? 'md:translate-y-6' : ''}>
      <div className="group relative overflow-hidden rounded-3xl bg-white/[0.06] backdrop-blur-xl shadow-sm hover:shadow-2xl ring-1 ring-white/10 hover:ring-gold-400/30 transition-all duration-300 hover:-translate-y-1.5 h-full flex flex-col">
        <div className="relative h-44 overflow-hidden">
          <img
            src={photo}
            alt=""
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/20 to-transparent" />
          {num && (
            <span
              aria-hidden="true"
              className="absolute -bottom-3 right-2 font-heading font-bold text-7xl text-white/15 leading-none select-none"
            >
              {num}
            </span>
          )}
          <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-semibold">
            <FootballIcon className="w-3 h-3" />
            {program.title.match(/U-?\d+(\s*-\s*U-?\d+)?/i)?.[0] || 'Program'}
          </div>
        </div>
        <div className="relative p-6 flex-1 flex flex-col">
          <h3 className="font-heading font-bold text-white text-lg mb-2 tracking-tight">{program.title.replace(/\s*\(.*?\)\s*/, ' ')}</h3>
          <p className="text-sm text-gray-400 leading-relaxed flex-1">{program.desc}</p>
          <div className="mt-4 h-1 w-10 rounded-full bg-gradient-to-r from-gold-400 to-gold-500 group-hover:w-16 transition-all duration-300" />
        </div>
      </div>
    </Reveal>
  )
}
