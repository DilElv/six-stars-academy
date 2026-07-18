'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Wallet, Calendar, FileText, ClipboardList, ChevronRight } from 'lucide-react'
import * as api from '@/lib/api'
import OvrGauge from '@/components/charts/OvrGauge'

const paymentStatusLabel = {
  success: { label: 'Lunas', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  pending: { label: 'Menunggu Verifikasi', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  failed: { label: 'Gagal', color: 'bg-red-50 text-red-700 border-red-200' },
}

const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

function daysLeft(dateStr) {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

export default function ParentDasborPage() {
  const [student, setStudent] = useState(null)
  const [payments, setPayments] = useState([])
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([api.getMyChild(), api.getMyPayments(), api.getMyReports()])
      .then(([s, p, r]) => { setStudent(s); setPayments(p); setReports(r) })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return null
  if (error) return <p className="text-sm text-red-500">{error}</p>

  const latestPayment = payments[0]
  const status = latestPayment ? paymentStatusLabel[latestPayment.status] : null
  const latestReport = reports[0]
  const remaining = daysLeft(student.packageEndDate)

  return (
    <div className="space-y-6">
      <h1 className="font-bold text-navy-900 text-lg">Dasbor</h1>

      {/* Player hero card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy-900 via-navy-900 to-navy-800 shadow-lg">
        <div aria-hidden="true" className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-gold-400/15 blur-[70px]" />
        <div
          aria-hidden="true"
          className="absolute right-2 top-1/2 -translate-y-1/2 font-extrabold text-[8rem] leading-none text-white/[0.04] select-none"
        >
          {student.position}
        </div>
        <div className="relative p-6 flex items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-white/10 border-2 border-gold-400/40 overflow-hidden shrink-0 flex items-center justify-center">
            {student.photo ? (
              <img src={student.photo} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white font-extrabold text-xl">{student.fullName?.[0]}</span>
            )}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-white text-xl truncate">{student.fullName}</div>
            <div className="text-sm text-gray-400 mt-0.5">{student.studentId}</div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gold-400/15 text-gold-300 border border-gold-400/25">{student.ageGroup}</span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/10 text-gray-300 border border-white/10">{student.position}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { href: '/dashboard/jadwal', label: 'Jadwal', icon: Calendar },
          { href: '/dashboard/pembayaran', label: 'Pembayaran', icon: Wallet },
          { href: '/dashboard/rapor', label: 'Rapor', icon: FileText },
        ].map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="group flex flex-col items-center gap-2 bg-white rounded-3xl border border-gray-100 shadow-sm p-4 hover:border-gold-300 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
          >
            <div className="w-10 h-10 rounded-2xl bg-navy-50 group-hover:bg-navy-900 flex items-center justify-center transition-colors duration-200">
              <a.icon size={18} className="text-navy-700 group-hover:text-gold-400 transition-colors duration-200" />
            </div>
            <span className="text-xs font-semibold text-navy-800">{a.label}</span>
          </Link>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-navy-50 flex items-center justify-center shrink-0">
            <Wallet size={18} className="text-navy-700" />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-gray-400 mb-1">Status Pembayaran</div>
            {status ? (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${status.color}`}>{status.label}</span>
            ) : (
              <span className="text-sm text-gray-400">Belum ada data</span>
            )}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-navy-50 flex items-center justify-center shrink-0">
            <Calendar size={18} className="text-navy-700" />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-gray-400 mb-1">Paket Aktif Hingga</div>
            <div className="text-sm font-semibold text-navy-900">
              {student.packageEndDate ? new Date(student.packageEndDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
              {remaining !== null && <span className="text-gray-400 font-normal"> · {remaining} hari lagi</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Latest report */}
      {latestReport?.assessment && (
        <Link
          href="/dashboard/rapor"
          className="group flex items-center gap-4 bg-white rounded-3xl border border-gray-100 shadow-sm p-5 hover:border-gold-300 hover:shadow-md transition-all duration-200"
        >
          <OvrGauge value={latestReport.assessment.overallAvg ?? 0} />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-gray-400 mb-0.5 flex items-center gap-1.5">
              <ClipboardList size={13} /> Rapor Terbaru
            </div>
            <div className="font-semibold text-navy-900">{MONTHS[latestReport.month]} {latestReport.year} · OVR {latestReport.assessment.overallAvg}</div>
          </div>
          <ChevronRight size={18} className="text-gray-300 group-hover:text-gold-500 group-hover:translate-x-1 transition-all duration-200 shrink-0" />
        </Link>
      )}
    </div>
  )
}
