'use client'

import { usePathname } from 'next/navigation'
import { MessageCircle } from 'lucide-react'

const ADMIN_WHATSAPP = '6285215021228'
const DEFAULT_MESSAGE = 'Halo min, saya ingin tanya-tanya seputar SixStars Academy Indonesia (program latihan, paket, jadwal, dll). Boleh dibantu?'

const HIDDEN_PREFIXES = ['/dashboard', '/admin', '/coach', '/head-coach']

export default function WhatsAppFloatingButton() {
  const pathname = usePathname()
  if (HIDDEN_PREFIXES.some((p) => pathname?.startsWith(p))) return null

  const href = `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(DEFAULT_MESSAGE)}`

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Konsultasi via WhatsApp"
      className="fixed bottom-5 right-5 z-50 group flex items-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white pl-3.5 pr-4 py-3.5 sm:pr-5 rounded-full shadow-[0_6px_20px_rgba(37,211,102,0.45)] hover:shadow-[0_8px_26px_rgba(37,211,102,0.55)] transition-all duration-200 hover:-translate-y-0.5"
    >
      <MessageCircle size={24} className="shrink-0 fill-white text-[#25D366]" />
      <span className="hidden sm:inline text-sm font-semibold whitespace-nowrap">Konsultasi via WhatsApp</span>
    </a>
  )
}
