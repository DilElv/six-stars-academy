export default function PageHero({ eyebrow, title, desc }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-navy-950 via-navy-900 to-navy-900 py-20 sm:py-24">
      <div aria-hidden="true" className="absolute -top-16 -left-16 w-72 h-72 rounded-full bg-gold-400/20 blur-[100px]" />
      <div aria-hidden="true" className="absolute -bottom-20 right-[-4rem] w-80 h-80 rounded-full bg-gold-300/15 blur-[110px]" />
      <svg
        aria-hidden="true"
        className="absolute bottom-0 left-0 w-full h-24 opacity-[0.07] pointer-events-none"
        viewBox="0 0 1200 120"
        preserveAspectRatio="xMidYMax slice"
      >
        <line x1="0" y1="0" x2="1200" y2="0" stroke="white" strokeWidth="2" />
        <circle cx="600" cy="0" r="90" fill="none" stroke="white" strokeWidth="2" />
      </svg>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <span className="text-xs font-bold tracking-[0.2em] text-gold-400 uppercase">{eyebrow}</span>
        <h1 className="font-heading font-bold text-3xl sm:text-5xl text-white mt-3 mb-4 text-balance tracking-tight">{title}</h1>
        {desc && <p className="text-gray-300 text-lg max-w-2xl mx-auto text-balance">{desc}</p>}
      </div>
    </section>
  )
}
