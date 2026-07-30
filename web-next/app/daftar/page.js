import { redirect } from 'next/navigation'
import { REGISTER_WHATSAPP_URL } from '@/lib/whatsapp'

// Self-service registration was replaced with a WhatsApp-first flow: prospects
// chat with admin directly, and once a deal is made, admin/head_coach creates
// the account for them (see admin/head-coach "Tambah Anak"). Anyone still
// landing on this URL (old bookmarks, search results) gets sent to WhatsApp.
export default function DaftarPage() {
  redirect(REGISTER_WHATSAPP_URL)
}
