import Reveal from '@/components/Reveal'

export default function PitchDivider({ tone = 'light' }) {
  const stroke = tone === 'light' ? '#0f1f3a' : '#d4a843'
  return (
    <Reveal as="div" className="bg-inherit">
      <svg
        viewBox="0 0 1200 60"
        className="w-full h-10 sm:h-14"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <line x1="0" y1="30" x2="1200" y2="30" stroke={stroke} strokeOpacity="0.15" strokeWidth="1.5" />
        <circle cx="600" cy="30" r="26" fill="none" stroke={stroke} strokeOpacity="0.35" strokeWidth="1.5" className="pitch-line-draw" />
        <circle cx="600" cy="30" r="2.5" fill={stroke} fillOpacity="0.35" />
      </svg>
    </Reveal>
  )
}
