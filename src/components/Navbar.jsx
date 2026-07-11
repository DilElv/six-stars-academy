import { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { Menu, X, ChevronRight } from 'lucide-react'
import { navLinks } from '../data/mock'

export default function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-navy-900/80 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-lg shadow-gold-500/20">
              <span className="text-navy-900 font-extrabold text-sm">S6</span>
            </div>
            <span className="font-heading font-bold text-lg text-white tracking-tight">
              SSB <span className="text-gold-400">Six Star</span>
            </span>
          </Link>

          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'text-gold-400 bg-gold-400/10'
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-medium text-gray-300 hover:text-white transition-colors duration-200"
            >
              Masuk
            </Link>
            <Link
              to="/login?tab=daftar"
              className="inline-flex items-center gap-1.5 bg-gold-400 hover:bg-gold-500 text-navy-900 font-semibold text-sm px-5 py-2.5 rounded-xl transition-all duration-200 shadow-lg shadow-gold-500/25 hover:shadow-gold-500/40"
            >
              Daftar
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <button
            onClick={() => setOpen(!open)}
            className="lg:hidden p-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Toggle menu"
          >
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-white/10 bg-navy-900/95 backdrop-blur-xl">
          <div className="px-4 py-4 space-y-1">
            {navLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `block px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'text-gold-400 bg-gold-400/10'
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
            <hr className="border-white/10 my-3" />
            <Link
              to="/login"
              onClick={() => setOpen(false)}
              className="block px-4 py-3 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-all"
            >
              Masuk
            </Link>
            <Link
              to="/login?tab=daftar"
              onClick={() => setOpen(false)}
              className="block px-4 py-3 rounded-lg text-sm font-semibold text-navy-900 bg-gold-400 hover:bg-gold-500 text-center transition-all"
            >
              Daftar
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}
