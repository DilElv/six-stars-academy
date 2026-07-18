/**
 * Curved seam between two sections of different background color, so the
 * layout never cuts abruptly from a dark navy block straight into flat
 * white (or vice-versa). `from`/`to` are hex/currentColor-safe fill values;
 * `flip` mirrors the curve vertically for use at the bottom of a section.
 */
export default function SectionWave({ fill = '#ffffff', flip = false, className = '' }) {
  return (
    <div className={`relative w-full overflow-hidden leading-none ${className}`} aria-hidden="true">
      <svg
        viewBox="0 0 1200 80"
        preserveAspectRatio="none"
        className={`w-full h-12 sm:h-20 ${flip ? 'rotate-180' : ''}`}
      >
        <path
          d="M0,32 C200,80 400,0 600,24 C800,48 1000,8 1200,40 L1200,80 L0,80 Z"
          fill={fill}
        />
      </svg>
    </div>
  )
}
