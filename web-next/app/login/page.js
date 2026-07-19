'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogIn, Loader2 } from 'lucide-react'
import * as api from '@/lib/api'
import AuthBackground from '@/components/AuthBackground'

const roleRedirect = {
  admin: '/admin',
  head_coach: '/head-coach',
  coach: '/coach',
  parent: '/dashboard',
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const profile = await api.login(email, password)
      router.push(roleRedirect[profile.role] || '/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthBackground className="flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8">
        <div className="text-center mb-6">
          <img src="/logo.png" alt="SixStars Academy" className="h-20 w-auto object-contain mx-auto mb-3" />
          <h1 className="font-bold text-navy-900 text-lg">Masuk ke SixStars Academy</h1>
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-gold-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-gold-400"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-navy-900 hover:bg-navy-800 text-white font-semibold py-2.5 rounded-2xl disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            Masuk
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Belum punya akun? <Link href="/daftar" className="text-gold-500 font-semibold">Daftar</Link>
        </p>

        <div className="mt-6 pt-4 border-t border-gray-100 text-[11px] text-gray-400 space-y-0.5">
          <div>Demo: admin@ssb.com / admin123</div>
          <div>Demo: headcoach@ssb.com / headcoach123</div>
          <div>Demo: coach@ssb.com / coach123</div>
          <div>Demo: parent@ssb.com / parent123</div>
        </div>
      </div>
    </AuthBackground>
  )
}
