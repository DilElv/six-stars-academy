import { Construction } from 'lucide-react'

export default function Placeholder({ title }) {
  return (
    <div className="glass-card rounded-3xl p-10 text-center">
      <Construction className="w-8 h-8 text-gold-400 mx-auto mb-3" />
      <h2 className="font-bold text-navy-900 mb-1">{title}</h2>
      <p className="text-sm text-gray-400">Fitur ini akan dibangun di fase berikutnya.</p>
    </div>
  )
}
