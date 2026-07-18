export default function FootballIcon({ className }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" aria-hidden="true">
      <circle cx="50" cy="50" r="47" stroke="currentColor" strokeWidth="2.5" />
      <g stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round">
        <path d="M50 28 L61 36 L57 49 L43 49 L39 36 Z" />
        <path d="M50 28 L50 8" />
        <path d="M61 36 L79 30" />
        <path d="M57 49 L68 63" />
        <path d="M43 49 L32 63" />
        <path d="M39 36 L21 30" />
        <path d="M50 8 C68 8 79 30 79 30" />
        <path d="M50 8 C32 8 21 30 21 30" />
        <path d="M68 63 C60 82 40 82 32 63" />
        <path d="M79 30 C93 42 93 60 79 71 C74 75 68 63 68 63" />
        <path d="M21 30 C7 42 7 60 21 71 C26 75 32 63 32 63" />
        <path d="M79 71 C68 82 68 82 68 82" />
        <path d="M21 71 C32 82 32 82 32 82" />
      </g>
    </svg>
  )
}
