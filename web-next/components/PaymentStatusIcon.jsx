// Animated success (check) / failure (X) icon, drawn with an SVG stroke
// animation (circle first, then the mark) — see .status-icon-* in globals.css.
export default function PaymentStatusIcon({ status, size = 72 }) {
  const isSuccess = status === 'success'
  const color = isSuccess ? '#10b981' : '#ef4444'

  return (
    <div className="status-icon-wrap mx-auto mb-3" style={{ width: size, height: size }}>
      <svg viewBox="0 0 52 52" width={size} height={size}>
        <circle
          className="status-icon-circle"
          cx="26" cy="26" r="24"
          fill="none"
          stroke={color}
          strokeWidth="3"
        />
        {isSuccess ? (
          <path
            className="status-icon-mark"
            fill="none"
            stroke={color}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.1 27.2l7.1 7.2 16.7-16.8"
          />
        ) : (
          <path
            className="status-icon-mark"
            fill="none"
            stroke={color}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17 17l18 18M35 17l-18 18"
          />
        )}
      </svg>
    </div>
  )
}
