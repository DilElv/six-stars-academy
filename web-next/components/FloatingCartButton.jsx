'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ShoppingCart } from 'lucide-react'
import * as api from '@/lib/api'

// Tombol keranjang mengambang untuk parent. Badge menampilkan jumlah item di
// keranjang; diperbarui saat pindah halaman, saat keranjang berubah (event
// `cart-changed` dari lib/api), dan berkala tiap 30 detik.
export default function FloatingCartButton({ positionClass = 'bottom-40 lg:bottom-24 right-4 lg:right-6' }) {
  const pathname = usePathname()
  const [count, setCount] = useState(0)
  const [bump, setBump] = useState(false)
  const prev = useRef(0)

  const refresh = useCallback(() => {
    api.getMyCart().then((res) => setCount(res?.items?.length || 0)).catch(() => {})
  }, [])

  useEffect(() => { refresh() }, [pathname, refresh])
  useEffect(() => {
    const timer = setInterval(refresh, 30000)
    window.addEventListener('cart-changed', refresh)
    window.addEventListener('focus', refresh)
    return () => {
      clearInterval(timer)
      window.removeEventListener('cart-changed', refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [refresh])

  useEffect(() => {
    if (count > prev.current) {
      setBump(true)
      const t = setTimeout(() => setBump(false), 600)
      prev.current = count
      return () => clearTimeout(t)
    }
    prev.current = count
  }, [count])

  if (pathname?.startsWith('/dashboard/keranjang')) return null

  return (
    <Link
      href="/dashboard/keranjang"
      aria-label={`Keranjang${count ? `, ${count} item` : ''}`}
      className={`fixed ${positionClass} z-50 flex items-center justify-center w-14 h-14 rounded-full bg-navy-900 text-gold-300 shadow-[0_6px_20px_rgba(10,22,40,0.35)] hover:bg-navy-800 hover:-translate-y-0.5 transition-all duration-200 ${bump ? 'scale-110' : ''}`}
    >
      <ShoppingCart size={22} />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1.5 rounded-full bg-gold-400 text-navy-900 text-[11px] font-extrabold flex items-center justify-center border-2 border-white tabular-nums">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}
