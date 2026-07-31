'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * Renders children directly under document.body instead of wherever the
 * component tree happens to be nested. Fixes modals visually sitting behind
 * the sticky header / bottom nav bar on mobile — those use backdrop-blur,
 * which gets its own compositing layer and doesn't reliably respect
 * z-index against a modal nested deep in an unrelated ancestor chain.
 */
export default function ModalPortal({ children }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null
  return createPortal(children, document.body)
}
