import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { LogIn, UserPlus, Mail, Lock, Eye, EyeOff, ShieldAlert, CheckCircle, User, Phone, Calendar, MapPin } from 'lucide-react'
import { login, register } from '../api'

export default function Auth() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialTab = searchParams.get('tab') === 'daftar' ? 'daftar' : 'masuk'
  const [tab, setTab] = useState(initialTab)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [registerName, setRegisterName] = useState('')
  const [registerEmail, setRegisterEmail] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [registerConfirm, setRegisterConfirm] = useState('')
  const [childName, setChildName] = useState('')
  const [childPhone, setChildPhone] = useState('')
  const [childDob, setChildDob] = useState('')
  const [childAddress, setChildAddress] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      const profile = await login(email, password)

      if (profile.role === 'admin') {
        localStorage.setItem('ssb_admin_session', JSON.stringify(profile))
        navigate('/admin', { replace: true })
      } else if (profile.role === 'coach') {
        localStorage.setItem('ssb_coach_session', JSON.stringify(profile))
        navigate('/coach', { replace: true })
      } else {
        localStorage.setItem('ssb_parent_session', JSON.stringify(profile))
        navigate('/dashboard', { replace: true })
      }
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleRegister(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!registerName.trim()) { setError('Nama lengkap harus diisi.'); return }
    if (!registerEmail.includes('@')) { setError('Email tidak valid.'); return }
    if (registerPassword.length < 6) { setError('Password minimal 6 karakter.'); return }
    if (registerPassword !== registerConfirm) { setError('Konfirmasi password tidak cocok.'); return }

    try {
      await register(registerEmail, registerPassword, registerName, 'parent', { childName, childPhone, childDob, childAddress })
      setSuccess('Pendaftaran berhasil! Silakan login.')
      setTab('masuk')
      setRegisterName('')
      setRegisterEmail('')
      setRegisterPassword('')
      setRegisterConfirm('')
      setChildName('')
      setChildPhone('')
      setChildDob('')
      setChildAddress('')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 py-12 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-heading text-3xl font-bold text-white">
            {tab === 'masuk' ? 'Masuk ke Akun Anda' : 'Daftar Akun Baru'}
          </h1>
          <p className="text-white/60 text-sm mt-2">
            Portal orang tua SSB Six Star
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Tab */}
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => { setTab('masuk'); setError(''); setSuccess('') }}
              className={`flex-1 py-4 text-sm font-semibold transition-all duration-200 relative ${
                tab === 'masuk' ? 'text-navy-900' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <LogIn size={16} />
                Masuk
              </div>
              {tab === 'masuk' && (
                <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-gold-400 rounded-full" />
              )}
            </button>
            <button
              onClick={() => { setTab('daftar'); setError(''); setSuccess('') }}
              className={`flex-1 py-4 text-sm font-semibold transition-all duration-200 relative ${
                tab === 'daftar' ? 'text-navy-900' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <UserPlus size={16} />
                Daftar
              </div>
              {tab === 'daftar' && (
                <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-gold-400 rounded-full" />
              )}
            </button>
          </div>

          <div className="p-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2 mb-4">
                <ShieldAlert size={18} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-start gap-2 mb-4">
                <CheckCircle size={18} className="text-green-500 shrink-0 mt-0.5" />
                <p className="text-green-700 text-sm">{success}</p>
              </div>
            )}

            {tab === 'masuk' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                    Email
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="parent@email.com"
                      required
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-navy-900 placeholder:text-gray-400 focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-navy-900 placeholder:text-gray-400 focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-navy-800 to-navy-700 hover:from-navy-700 hover:to-navy-600 text-white font-bold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <LogIn size={18} />
                  Masuk
                </button>

                <p className="text-xs text-gray-400 text-center">
                  Akun demo:{' '}
                  <span className="font-mono text-navy-600">parent@ssb.com</span> /{' '}
                  <span className="font-mono text-navy-600">sixstar123</span>
                </p>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    placeholder="Bapak/Ibu"
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-navy-900 placeholder:text-gray-400 focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                    Email
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      placeholder="parent@email.com"
                      required
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-navy-900 placeholder:text-gray-400 focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      placeholder="Min. 6 karakter"
                      required
                      minLength={6}
                      className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-navy-900 placeholder:text-gray-400 focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                    Konfirmasi Password
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="password"
                      value={registerConfirm}
                      onChange={(e) => setRegisterConfirm(e.target.value)}
                      placeholder="Ulangi password"
                      required
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-navy-900 placeholder:text-gray-400 focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20 transition-all"
                    />
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4 mt-2">
                  <p className="text-xs font-semibold text-navy-700 mb-3 flex items-center gap-1.5">
                    <User size={14} className="text-gold-400" />
                    Data Anak Pemain
                  </p>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5">Nama Anak</label>
                      <input
                        type="text"
                        value={childName}
                        onChange={(e) => setChildName(e.target.value)}
                        placeholder="Nama lengkap anak"
                        required
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-navy-900 placeholder:text-gray-400 focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20 transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">No. Telepon</label>
                        <div className="relative">
                          <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="tel"
                            value={childPhone}
                            onChange={(e) => setChildPhone(e.target.value)}
                            placeholder="+62 8xx-xxxx"
                            className="w-full pl-9 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-navy-900 placeholder:text-gray-400 focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20 transition-all"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1.5">Tanggal Lahir</label>
                        <input
                          type="date"
                          value={childDob}
                          onChange={(e) => setChildDob(e.target.value)}
                          className="w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-navy-900 focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20 transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5">Alamat</label>
                      <input
                        type="text"
                        value={childAddress}
                        onChange={(e) => setChildAddress(e.target.value)}
                        placeholder="Alamat rumah"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-navy-900 placeholder:text-gray-400 focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-gold-400 to-gold-500 hover:from-gold-500 hover:to-gold-600 text-navy-900 font-bold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <UserPlus size={18} />
                  Daftar
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
