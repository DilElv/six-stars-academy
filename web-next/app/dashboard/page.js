'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Wallet, Calendar, FileText, ClipboardList, ChevronRight, Radar as RadarIcon, MapPin, Trophy, Check, AlertTriangle, RefreshCw } from 'lucide-react'
import * as api from '@/lib/api'
import OvrGauge from '@/components/charts/OvrGauge'
import SkillRadar from '@/components/charts/SkillRadar'
import OvrTrendChart from '@/components/charts/OvrTrendChart'
import RenewalModal from '@/components/RenewalModal'

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
  const [trainingSessions, setTrainingSessions] = useState([])
  const [myEvents, setMyEvents] = useState([])
  const [attendances, setAttendances] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showRenewal, setShowRenewal] = useState(false)

  function load() {
    Promise.all([api.getMyChild(), api.getMyPayments(), api.getMyReports(), api.getMyAttendance()])
      .then(([s, p, r, att]) => {
        setStudent(s)
        setPayments(p)
        setReports(r)
        setAttendances(att)
        if (s?.ageGroup && s?.branchId) {
          api.getTrainingSessions(s.ageGroup, s.branchId).then((sessions) => {
            setTrainingSessions(sessions)
          })
        }
        api.getMyEvents().then(setMyEvents)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const attendedDates = new Set(
    (attendances || [])
      .filter((a) => a.status === 'hadir')
      .map((a) => {
        const d = new Date(a.date)
        return d.toISOString().slice(0, 10)
      })
  )

  const todayKey = new Date().toISOString().slice(0, 10)
  const todaysSessions = (trainingSessions || []).filter((ts) => new Date(ts.date).toISOString().slice(0, 10) === todayKey)

  const forfeitedSessions = (trainingSessions || []).filter((ts) => {
    const sDate = new Date(ts.date)
    sDate.setHours(23, 59, 59, 999)
    return sDate < new Date() && !attendedDates.has(new Date(ts.date).toISOString().slice(0, 10))
  })

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

      {student.status === 'needs_renewal' && (
        <div className="flex items-center justify-between gap-3 flex-wrap rounded-3xl px-5 py-4 border bg-red-50 border-red-100">
          <div className="flex items-center gap-3">
            <AlertTriangle size={18} className="text-red-600 shrink-0" />
            <div className="text-sm text-red-800">
              Kuota {student.totalSessions} sesi latihan {student.fullName} sudah habis. Perpanjang paket agar bisa lanjut latihan.
            </div>
          </div>
          <button
            onClick={() => setShowRenewal(true)}
            className="flex items-center gap-1.5 bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold px-4 py-2 rounded-2xl shrink-0"
          >
            <RefreshCw size={14} /> Perpanjang Paket
          </button>
        </div>
      )}

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
            className="group flex flex-col items-center gap-2 glass-card rounded-3xl p-4 hover:border-gold-300 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-navy-600 to-navy-800 shadow-md shadow-navy-900/25 group-hover:shadow-gold-400/30 flex items-center justify-center transition-shadow duration-200">
              <a.icon size={18} className="text-gold-300 transition-colors duration-200" />
            </div>
            <span className="text-xs font-semibold text-navy-800">{a.label}</span>
          </Link>
        ))}
      </div>

      {/* Session counter */}
      {student.totalSessions > 0 && (
        <div className="glass-card rounded-3xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold text-navy-900">Sesi Latihan</div>
            <div className="text-xs font-semibold text-navy-700">
              {student.attendedSessions}/{student.totalSessions}
            </div>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-gold-400 to-gold-500 transition-all duration-500"
              style={{ width: `${Math.min(100, (student.attendedSessions / student.totalSessions) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Forfeit warnings */}
      {forfeitedSessions.length > 0 && (
        <div className="space-y-2">
          {forfeitedSessions.map((ts) => (
            <div key={ts.id} className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 text-sm flex items-center gap-2">
              <span className="font-semibold">Anda tidak hadir, sesi anda hangus</span>
              <span className="text-red-400">·</span>
              <span>{new Date(ts.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
            </div>
          ))}
        </div>
      )}

      {todaysSessions.length > 0 && (
        <div>
          <h2 className="font-semibold text-navy-900 text-sm mb-3 flex items-center gap-1.5">
            <Calendar size={15} className="text-gold-500" /> Topik Latihan Hari Ini
          </h2>
          <div className="space-y-2">
            {todaysSessions.map((s) => (
              <div key={s.id} className="rounded-2xl border-2 border-gold-300 bg-gold-50/50 p-3.5">
                <div className="font-bold text-navy-900 text-sm">{s.topicTitle}</div>
                {s.topicDescription && <p className="text-xs text-gray-500 mt-1">{s.topicDescription}</p>}
                {s.field?.name && <div className="text-xs text-gold-700 font-semibold mt-1 flex items-center gap-1"><MapPin size={11} /> {s.field.name}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {trainingSessions.length > 0 && (
        <div>
          <h2 className="font-semibold text-navy-900 text-sm mb-3 flex items-center gap-1.5">
            <Calendar size={15} /> Jadwal Latihan
          </h2>
          <div className="space-y-2">
            {trainingSessions.slice(0, 5).map((s) => (
              <div key={s.id} className="glass-card rounded-2xl p-3.5 flex items-center gap-3">
                <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center text-navy-900 font-bold text-xs">
                  {new Date(s.date).getDate()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-navy-900 text-sm truncate">{s.topicTitle}</div>
                  <div className="text-xs text-gray-400 flex items-center gap-1.5 flex-wrap">
                    <span>{new Date(s.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                    {s.field?.name && (
                      <>
                        <span>·</span>
                        <MapPin size={11} className="shrink-0" />
                        <span>{s.field.name}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {myEvents.length > 0 && (
        <div>
          <h2 className="font-semibold text-navy-900 text-sm mb-3 flex items-center gap-1.5">
            <Trophy size={15} className="text-gold-500" /> Event Saya
          </h2>
          <div className="space-y-2">
            {myEvents.slice(0, 5).map((p) => (
              <div key={p.id} className="glass-card rounded-2xl p-3.5 flex items-center gap-3">
                <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center text-navy-900 font-bold text-xs">
                  {new Date(p.event.date).getDate()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-navy-900 text-sm truncate">{p.event.title}</div>
                  <div className="text-xs text-gray-400 flex items-center gap-1.5 flex-wrap">
                    <span>{new Date(p.event.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                    <span>· {p.event.type}</span>
                    {p.event.location && (
                      <>
                        <span>·</span>
                        <MapPin size={11} className="shrink-0" />
                        <span>{p.event.location}</span>
                      </>
                    )}
                    <span>·</span>
                    {p.paymentStatus === 'paid' ? (
                      <span className="flex items-center gap-0.5 text-emerald-600 font-semibold"><Check size={11} /> Lunas</span>
                    ) : (
                      <span className="text-amber-600 font-semibold">Belum bayar</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="glass-card rounded-3xl p-3.5 sm:p-5 flex items-center gap-3 sm:gap-4">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-navy-600 to-navy-800 shadow-md shadow-navy-900/25 flex items-center justify-center shrink-0">
            <Wallet size={16} className="text-gold-300" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] sm:text-xs text-gray-400 mb-1">Status Bayar</div>
            {status ? (
              <span className={`text-[11px] sm:text-xs font-semibold px-2 py-0.5 rounded-full border ${status.color}`}>{status.label}</span>
            ) : (
              <span className="text-sm text-gray-400">Belum ada</span>
            )}
          </div>
        </div>

        <div className="glass-card rounded-3xl p-3.5 sm:p-5 flex items-center gap-3 sm:gap-4">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-md shadow-emerald-500/25 flex items-center justify-center shrink-0">
            <Calendar size={16} className="text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] sm:text-xs text-gray-400 mb-1">Paket Aktif Hingga</div>
            <div className="text-xs sm:text-sm font-semibold text-navy-900 truncate">
              {student.packageEndDate ? new Date(student.packageEndDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
              {remaining !== null && <span className="text-gray-400 font-normal block sm:inline"> · {remaining} hari lagi</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Latest report */}
      {latestReport?.assessment && (
        <Link
          href="/dashboard/rapor"
          className="group flex items-center gap-4 glass-card rounded-3xl p-5 hover:border-gold-300 hover:shadow-md transition-all duration-200"
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

      {/* Skill statistics */}
      {latestReport?.assessment && (
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="glass-card rounded-3xl p-5">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-navy-900 mb-2">
              <RadarIcon size={14} className="text-gold-500" /> Profil Skill Terbaru
            </div>
            <SkillRadar assessment={latestReport.assessment} height={220} />
          </div>
          <div className="glass-card rounded-3xl p-5">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-navy-900 mb-2">
              <ClipboardList size={14} className="text-gold-500" /> Tren OVR Bulanan
            </div>
            {reports.length > 1 ? (
              <OvrTrendChart
                data={[...reports]
                  .filter((r) => r.assessment)
                  .reverse()
                  .map((r) => ({ label: `${MONTHS[r.month]} '${String(r.year).slice(2)}`, ovr: r.assessment.overallAvg ?? 0 }))}
                height={220}
              />
            ) : (
              <div className="h-[220px] flex items-center justify-center text-center text-sm text-gray-400 px-6">
                Tren akan muncul setelah rapor bulan berikutnya terbit.
              </div>
            )}
          </div>
        </div>
      )}

      {showRenewal && (
        <RenewalModal
          onClose={() => setShowRenewal(false)}
          onDone={() => { setShowRenewal(false); load() }}
        />
      )}
    </div>
  )
}
