'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'
import * as api from '@/lib/api'
import ModalPortal from '@/components/ui/modal-portal'

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'baru saja'
  if (mins < 60) return `${mins} menit lalu`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} jam lalu`
  return `${Math.floor(hours / 24)} hari lalu`
}

export default function NotificationBell() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const containerRef = useRef(null)
  const panelRef = useRef(null)

  function load() {
    api.getMyNotifications().then((data) => {
      setNotifications(data.notifications)
      setUnreadCount(data.unreadCount)
    }).catch(() => {})
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target) && !panelRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleOpen() {
    setOpen((v) => !v)
  }

  async function handleClickNotification(n) {
    if (!n.read) {
      await api.markNotificationRead(n.id)
      setNotifications((list) => list.map((x) => (x.id === n.id ? { ...x, read: true } : x)))
      setUnreadCount((c) => Math.max(0, c - 1))
    }
    setOpen(false)
    if (n.link) router.push(n.link)
  }

  async function handleMarkAllRead() {
    await api.markAllNotificationsRead()
    setNotifications((list) => list.map((x) => ({ ...x, read: true })))
    setUnreadCount(0)
  }

  return (
    <div className="relative" ref={containerRef}>
      <button onClick={handleOpen} className="relative p-2 text-navy-700 hover:bg-gray-100 rounded-lg">
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 flex items-center justify-center text-[10px] font-bold bg-red-500 text-white rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <ModalPortal>
        <div ref={panelRef} className="fixed top-20 right-3 w-80 max-w-[calc(100vw-1.5rem)] max-h-[calc(100dvh-7rem)] flex flex-col bg-white rounded-3xl shadow-2xl border border-gray-100 z-[250] overflow-hidden" role="dialog" aria-label="Notifikasi">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-semibold text-sm text-navy-900">Notifikasi</span>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="text-xs font-semibold text-gold-600">
                Tandai semua dibaca
              </button>
            )}
          </div>
          <div className="min-h-0 overflow-y-auto overscroll-contain">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-400">Belum ada notifikasi.</div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClickNotification(n)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 ${!n.read ? 'bg-navy-50/50' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-gold-400 mt-1.5 shrink-0" />}
                    <div className={`min-w-0 break-words ${!n.read ? '' : 'pl-3.5'}`}>
                      <div className="text-sm font-semibold text-navy-900">{n.title}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{n.message}</div>
                      <div className="text-[10px] text-gray-400 mt-1">{timeAgo(n.createdAt)}</div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  )
}
