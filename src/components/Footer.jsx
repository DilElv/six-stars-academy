import { Link } from 'react-router-dom'
import { MapPin, Mail, Phone, Globe, Video, MessageSquareShare } from 'lucide-react'
import { navLinks } from '../data/mock'

export default function Footer() {
  return (
    <footer className="bg-navy-950 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center">
                <span className="text-navy-900 font-extrabold text-xs">S6</span>
              </div>
              <span className="font-heading font-bold text-lg text-white">
                SSB <span className="text-gold-400">Six Star</span>
              </span>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
              Akademi sepak bola profesional yang membentuk bintang masa depan Indonesia melalui pembinaan karakter, teknik, dan taktik modern.
            </p>
            <div className="flex gap-3 mt-5">
              {[Globe, Video, MessageSquareShare].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-9 h-9 rounded-lg bg-white/5 hover:bg-gold-400/20 flex items-center justify-center text-gray-400 hover:text-gold-400 transition-all duration-200"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-white text-sm uppercase tracking-wider mb-4">
              Navigasi
            </h4>
            <ul className="space-y-3">
              {navLinks.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-gray-400 hover:text-gold-400 text-sm transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-white text-sm uppercase tracking-wider mb-4">
              Program
            </h4>
            <ul className="space-y-3">
              <li><span className="text-gray-400 text-sm">U-10 Early Development</span></li>
              <li><span className="text-gray-400 text-sm">U-12 Pre-Academy</span></li>
              <li><span className="text-gray-400 text-sm">U-15 Youth Academy</span></li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-semibold text-white text-sm uppercase tracking-wider mb-4">
              Kontak
            </h4>
            <ul className="space-y-3">
              {[
                { icon: MapPin, text: 'Jl. Olahraga No. 15, Cimahi' },
                { icon: Phone, text: '+62 812-3456-7890' },
                { icon: Mail, text: 'info@ssbsixstar.id' },
              ].map(({ icon: Icon, text }, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <Icon className="w-4 h-4 text-gold-400 mt-0.5 shrink-0" />
                  <span className="text-gray-400 text-sm">{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-xs">
            &copy; {new Date().getFullYear()} SSB Six Star. All rights reserved.
          </p>
          <p className="text-gray-500 text-xs">
            Designed with passion for Indonesian football
          </p>
        </div>
      </div>
    </footer>
  )
}
