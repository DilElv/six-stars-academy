'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Lock, Loader2, CheckCircle, XCircle } from 'lucide-react'
import * as api from '@/lib/api'
import AuthBackground from '@/components/AuthBackground'

function ResetForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [valid, setValid] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) {
      setError('Token tidak valid')
      setChecking(false)
      return
    }
    api.checkResetToken(token)
      .then(() => { setValid(true); setChecking(false) })
      .catch((err) => { setError(err.message); setChecking(false) })
  }, [token])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('Konfirmasi password tidak cocok')
      return
    }
    if (password.length < 6) {
      setError('Password minimal 6 karakter')
      return
    }
    setLoading(true)
    try {
      await api.resetPassword(token, password)
      setDone(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="text-center py-8">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-gold-500" />
      </div>
    )
  }

  if (error && !valid) {
    return (
      <div className="text-center space-y-4">
        <XCircle className="w-12 h-12 text-red-400 mx-auto" />
        <p className="text-sm text-red-600">{error}</p>
        <Link href="/lupa-password" className="block text-sm text-gold-500 font-semibold hover:underline">Ajukan Ulang</Link>
      </div>
    )
  }

  if (done) {
    return (
      <div className="text-center space-y-4">
        <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
        <p className="text-sm text-gray-600">Password berhasil diubah! Silakan login dengan password baru.</p>
        <Link href="/login" className="block text-sm text-gold-500 font-semibold hover:underline">Login Sekarang</Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}

      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">Password Baru</label>
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Minimal 6 karakter"
          className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-gold-400"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">Konfirmasi Password Baru</label>
        <input
          type="password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Ulangi password baru"
          className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-gold-400"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-navy-900 hover:bg-navy-800 text-white font-semibold py-2.5 rounded-2xl disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
        Ubah Password
      </button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <AuthBackground className="flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8">
        <div className="text-center mb-6">
          <img src="/logo.png" alt="SixStars Academy" className="h-20 w-auto object-contain mx-auto mb-3" />
          <h1 className="font-bold text-navy-900 text-lg">Reset Password</h1>
        </div>
        <Suspense fallback={<div className="text-center py-8"><Loader2 className="w-8 h-8 animate-spin mx-auto text-gold-500" /></div>}>
          <ResetForm />
        </Suspense>
      </div>
    </AuthBackground>
  )
}
