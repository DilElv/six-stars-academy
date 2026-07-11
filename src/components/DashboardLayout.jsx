import { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  LogOut,
  LayoutDashboard,
  UserCircle,
  ClipboardList,
  DollarSign,
  Menu,
  ChevronDown,
  Star,
} from 'lucide-react'
import { getMe, logout as apiLogout } from '../api'

const navItems = [
  { label: 'Dasbor', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Profil Anak', icon: UserCircle, path: '/dashboard/profil' },
  { label: 'Jadwal', icon: ClipboardList, path: '/dashboard/jadwal' },
  { label: 'Pembayaran', icon: DollarSign, path: '/dashboard/pembayaran' },
]

function getSession() {
  try {
    const raw = localStorage.getItem('ssb_parent_session')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function DashboardNavbar({ session, onLogout }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden text-navy-700 hover:text-navy-900 transition-colors"
            >
              <Menu size={22} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-navy-800 to-navy-600 flex items-center justify-center">
                <Star size={16} className="text-gold-400" />
              </div>
              <span className="font-heading font-bold text-navy-900 text-sm hidden sm:block">
                SSB Six Star
              </span>
            </div>
            <div className="hidden lg:flex items-center gap-1 ml-8">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path
                return (
                  <button
                    key={item.label}
                    onClick={() => navigate(item.path)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-navy-50 text-navy-900'
                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <item.icon size={16} />
                    {item.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-1.5">
              <img
                src={session.avatar}
                alt={session.name}
                className="w-7 h-7 rounded-full"
              />
              <span className="text-sm font-medium text-navy-800">
                {session.name}
              </span>
              <ChevronDown size={14} className="text-gray-400" />
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <button
                key={item.label}
                onClick={() => { navigate(item.path); setMobileOpen(false) }}
                className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive ? 'bg-navy-50 text-navy-900' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <item.icon size={16} />
                {item.label}
              </button>
            )
          })}
          <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 border-t border-gray-100 pt-3 mt-2">
            <img
              src={session.avatar}
              alt={session.name}
              className="w-6 h-6 rounded-full"
            />
            {session.name}
          </div>
        </div>
      )}
    </nav>
  )
}

export default function DashboardLayout() {
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      const s = getSession()
      if (!s) { navigate('/login', { replace: true }); return }
      try {
        const profile = await getMe()
        setSession(profile)
        localStorage.setItem('ssb_parent_session', JSON.stringify(profile))
      } catch {
        const raw = localStorage.getItem('ssb_parent_session')
        setSession(raw ? JSON.parse(raw) : s)
      }
      setLoading(false)
    }
    init()
  }, [navigate])

  function handleLogout() {
    apiLogout()
    navigate('/login', { replace: true })
  }

  if (loading || !session) return null

  return (
    <div className="bg-gray-50 min-h-screen">
      {session && (
        <>
          <DashboardNavbar session={session} onLogout={handleLogout} />
          <Outlet context={{ session }} />
        </>
      )}
    </div>
  )
}
