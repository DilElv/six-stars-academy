export default function Field({ label, value, onChange, placeholder, textarea }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className="w-full px-3 py-2.5 bg-white/70 border border-gray-200 rounded-2xl text-sm"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2.5 bg-white/70 border border-gray-200 rounded-2xl text-sm"
        />
      )}
    </div>
  )
}
