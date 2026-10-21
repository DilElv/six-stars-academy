'use client'

import { useEffect, useState } from 'react'
import { UserCheck, Clock3, CheckCircle2, XCircle, Camera, LogOut, MapPin, CalendarClock } from 'lucide-react'
import * as api from '@/lib/api'
import SelfieCheckinModal from './SelfieCheckinModal'

const VERIFY_ICON = { pending: Clock3, approved: CheckCircle2, rejected: XCircle }
// Verifikasi admin sudah dihapus — absen yang tersimpan (approved, atau
// 'pending' dari data lama) sama-sama sah dan tampil sebagai "Absen Tercatat".
const VERIFY_TEXT = {
  approved: { label: 'Absen Tercatat', color: 'text-emerald-800' },
  pending: { label: 'Absen Tercatat', color: 'text-emerald-800' },
  rejected: { label: 'Absen Ditolak', color: 'text-red-800' },
}
const VERIFY_BG = {
  approved: 'bg-emerald-50 border-emerald-100',
  pending: 'bg-emerald-50 border-emerald-100',
  rejected: 'bg-red-50 border-red-100',
}

function EventStatus({ label, time, photo, verifyStatus, rejectReason }) {
  const VerifyIcon = VERIFY_ICON[verifyStatus] || Clock3
  const text = VERIFY_TEXT[verifyStatus] || VERIFY_TEXT.pending
  return (
    <div className={`flex items-center gap-3 rounded-3xl px-5 py-4 border ${VERIFY_BG[verifyStatus] || VERIFY_BG.pending}`}>
      {photo && <img src={photo} alt="Selfie absen" className="w-11 h-11 rounded-2xl object-cover shrink-0" />}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-sm font-semibold">
          <VerifyIcon size={16} className={`shrink-0 ${text.color.replace('800', '600')}`} />
          <span className={text.color}>{label}: {text.label}</span>
        </div>
        <div className="text-xs text-gray-500 mt-0.5">
          Pukul <b>{new Date(time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</b>
          {verifyStatus === 'rejected' && rejectReason && (
            <span className="block text-red-600 mt-0.5">Alasan: {rejectReason}</span>
          )}
        </div>
      </div>
    </div>
  )
}

function WindowInfo({ windowInfo, fallback }) {
  if (!windowInfo) {
    return fallback ? (
      <div className="flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
        <CalendarClock size={12} className="shrink-0" /> {fallback}
      </div>
    ) : null
  }
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
      <CalendarClock size={12} className="text-gold-500 shrink-0" />
      Absen masuk <b className="text-navy-800">{windowInfo.checkInOpen}–{windowInfo.checkInClose}</b>
      <span className="text-gray-300">·</span>
      Absen pulang maks. <b className="text-navy-800">{windowInfo.checkOutClose}</b>
    </div>
  )
}

// Satu sesi latihan milik coach: kartu masuk/pulang dengan jam buka-tutup.
function SessionAttendance({ session, onOpenModal }) {
  const record = session.attendance
  const windowInfo = session.window
  const hasCheckedIn = !!record?.checkInTime
  const needsCheckin = !hasCheckedIn || record.verifyStatus === 'rejected'
  const needsCheckout = hasCheckedIn && (!record.checkOutTime || record.checkOutVerifyStatus === 'rejected')
  const cancelled = session.status === 'cancelled'
  const checkInBlocked = cancelled || !windowInfo?.canCheckIn
  const checkOutBlocked = cancelled || !windowInfo?.canCheckOut

  let checkInHint = null
  if (cancelled) checkInHint = 'Sesi absensi dibatalkan admin/head coach.'
  else if (!hasCheckedIn && windowInfo?.beforeOpen) checkInHint = `Absen masuk dibuka pukul ${windowInfo.checkInOpen}.`
  else if (!hasCheckedIn && windowInfo?.afterCheckInClose) checkInHint = `Batas absen masuk sudah lewat (ditutup pukul ${windowInfo.checkInClose}).`

  return (
    <div className={`rounded-3xl border p-4 space-y-3 ${cancelled ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-100 shadow-sm'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold text-navy-900 text-sm truncate">{session.title}</div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-gray-500">
            <MapPin size={11} className="text-gold-500 shrink-0" />
            {session.branch ? `${session.branch.name} (${session.branch.code})` : 'Semua cabang'}
            {session.trainingSession?.ageGroup ? ` · ${session.trainingSession.ageGroup}` : ''}
          </div>
        </div>
        {!cancelled && (
          <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-navy-50 text-navy-700">
            {session.type === 'training' ? 'Latihan' : session.type === 'tournament' ? 'Tournament' : 'Event'}
          </span>
        )}
      </div>

      {session.schedule?.coachNote && !cancelled && (
        <div className="rounded-2xl bg-amber-50 border border-amber-100 text-amber-800 text-[11px] px-3 py-2 whitespace-pre-line">
          <b>Catatan head coach:</b> {session.schedule.coachNote}
        </div>
      )}

      <WindowInfo windowInfo={windowInfo} fallback={cancelled ? null : 'Menunggu jadwal absensi dibuat admin/head coach.'} />

      {hasCheckedIn && (
        <EventStatus
          label="Absen Masuk"
          time={record.checkInTime}
          photo={record.photo}
          verifyStatus={record.verifyStatus}
          rejectReason={record.rejectReason}
        />
      )}

      {needsCheckin && !cancelled && (
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-gray-500">
            {checkInHint || 'Absen masuk sesuai jadwal sesi ini.'}
          </div>
          <button
            onClick={() => onOpenModal('checkin')}
            disabled={checkInBlocked}
            className="flex items-center gap-1.5 bg-gold-400 hover:bg-gold-500 text-navy-900 text-sm font-semibold px-4 py-2 rounded-2xl shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Camera size={14} /> Absen Masuk
          </button>
        </div>
      )}

      {record?.checkOutTime && (
        <EventStatus
          label="Absen Pulang"
          time={record.checkOutTime}
          photo={record.checkOutPhoto}
          verifyStatus={record.checkOutVerifyStatus}
          rejectReason={record.checkOutRejectReason}
        />
      )}

      {needsCheckout && !cancelled && (
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-gray-500">
            {checkOutBlocked
              ? `Batas absen pulang sudah lewat (pukul ${windowInfo?.checkOutClose || '-'}).`
              : 'Jangan lupa absen pulang sebelum batas waktu.'}
          </div>
          <button
            onClick={() => onOpenModal('checkout')}
            disabled={checkOutBlocked}
            className="flex items-center gap-1.5 bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold px-4 py-2 rounded-2xl shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <LogOut size={14} /> Absen Pulang
          </button>
        </div>
      )}
    </div>
  )
}

// One branch's masuk/pulang pair for head coach (legacy free attendance).
function BranchAttendance({ branchLabel, record, onOpenModal, windowInfo, requireWindow = false, windowFallback }) {
  const hasCheckedIn = !!record?.checkInTime
  const needsCheckin = !record || !hasCheckedIn || record.verifyStatus === 'rejected'
  const needsCheckout = hasCheckedIn && (!record.checkOutTime || record.checkOutVerifyStatus === 'rejected')
  const checkInBlocked = requireWindow && !windowInfo?.canCheckIn
  const checkOutBlocked = requireWindow && !windowInfo?.canCheckOut

  return (
    <div className="space-y-2.5">
      {branchLabel && (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
          <MapPin size={12} className="text-gold-500 shrink-0" /> {branchLabel}
        </div>
      )}

      <WindowInfo windowInfo={windowInfo} fallback={requireWindow ? windowFallback : null} />

      {hasCheckedIn && (
        <EventStatus
          label="Absen Masuk"
          time={record.checkInTime}
          photo={record.photo}
          verifyStatus={record.verifyStatus}
          rejectReason={record.rejectReason}
        />
      )}

      {needsCheckin && (
        <div className="flex items-center justify-between gap-3 bg-white border border-gray-100 shadow-sm rounded-3xl px-5 py-4">
          <div className="flex items-center gap-3">
            <UserCheck size={20} className="text-navy-700 shrink-0" />
            <div className="text-sm text-navy-800">
              {record?.verifyStatus === 'rejected' ? 'Absen masuk ditolak, silakan absen ulang.' : 'Belum absen masuk.'}
            </div>
          </div>
          <button
            onClick={() => onOpenModal('checkin')}
            disabled={checkInBlocked}
            className="flex items-center gap-1.5 bg-gold-400 hover:bg-gold-500 text-navy-900 text-sm font-semibold px-4 py-2 rounded-2xl shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Camera size={14} /> Absen Masuk
          </button>
        </div>
      )}

      {record?.checkOutTime && (
        <EventStatus
          label="Absen Pulang"
          time={record.checkOutTime}
          photo={record.checkOutPhoto}
          verifyStatus={record.checkOutVerifyStatus}
          rejectReason={record.checkOutRejectReason}
        />
      )}

      {needsCheckout && (
        <div className="flex items-center justify-between gap-3 bg-white border border-gray-100 shadow-sm rounded-3xl px-5 py-4">
          <div className="flex items-center gap-3">
            <LogOut size={20} className="text-navy-700 shrink-0" />
            <div className="text-sm text-navy-800">
              {record?.checkOutVerifyStatus === 'rejected' ? 'Absen pulang ditolak, silakan absen ulang.' : 'Jangan lupa absen pulang.'}
            </div>
          </div>
          <button
            onClick={() => onOpenModal('checkout')}
            disabled={checkOutBlocked}
            className="flex items-center gap-1.5 bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold px-4 py-2 rounded-2xl shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Camera size={14} /> Absen Pulang
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * Self check-in/check-out widget for coach/head-coach.
 *
 * Coach: absensi mengikuti jadwal sesi (latihan/event) yang dibuat admin/head
 * coach. Jam buka-tutup masuk dan batas pulang diatur per sesi; coach tidak
 * bisa absen di luar jendela itu (lihat server-next/routes/staffAttendance.js).
 *
 * Head coach: tetap memakai absen harian bebas per cabang (legacy).
 * Event/tournament tetap memakai absensi event dengan jendela dari jadwal event.
 */
export default function StaffCheckinCard() {
  const [me, setMe] = useState(null)
  const [branches, setBranches] = useState([])
  const [records, setRecords] = useState([])
  const [sessions, setSessions] = useState([])
  const [eventRows, setEventRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // { type, branchId, branchLabel, sessionId, eventId } | null

  function load() {
    Promise.all([
      api.getMe(),
      api.getMyStaffAttendance().catch(() => []),
      api.getTodayEventStaffAttendance().catch(() => []),
      api.getTodayCoachSessions().catch(() => []),
    ])
      .then(([user, recs, events, coachSessions]) => {
        setMe(user)
        setBranches((user.branches || []).map((b) => b.branch))
        setRecords(recs)
        setEventRows(events)
        setSessions(coachSessions)
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  function handleSuccess(newRecord) {
    if (newRecord.eventId) {
      setEventRows((prev) => prev.map((event) => event.id === newRecord.eventId ? { ...event, myAttendance: newRecord } : event))
      setModal(null)
      return
    }
    if (newRecord.sessionId) {
      setSessions((prev) => prev.map((session) => session.id === newRecord.sessionId ? { ...session, attendance: newRecord } : session))
      setModal(null)
      return
    }
    setRecords((prev) => {
      const others = prev.filter((r) => r.id !== newRecord.id)
      return [...others, newRecord]
    })
    setModal(null)
  }

  if (loading) return null

  const isCoach = me?.role === 'coach'
  const sections = branches.length > 0
    ? branches.map((b) => ({
        branchId: b.id,
        branchLabel: `${b.name} (${b.code})`,
        record: records.find((r) => r.branchId === b.id) || null,
      }))
    : [{ branchId: null, branchLabel: null, record: records.find((r) => !r.branchId) || null }]

  return (
    <div className="space-y-4">
      {isCoach ? (
        sessions.length === 0 ? (
          <div className="flex items-start gap-3 rounded-3xl border border-amber-100 bg-amber-50/60 px-5 py-4">
            <CalendarClock size={20} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <div className="font-semibold">Belum ada jadwal absensi hari ini.</div>
              <div className="text-xs mt-0.5">Absensi coach mengikuti jadwal sesi latihan/event. Hubungi admin atau head coach bila jadwal belum dibuat.</div>
            </div>
          </div>
        ) : (
          sessions.map((session) => (
            <SessionAttendance
              key={session.id}
              session={session}
              onOpenModal={(type) => setModal({
                type,
                sessionId: session.id,
                branchId: session.branchId,
                branchLabel: session.title,
              })}
            />
          ))
        )
      ) : (
        sections.map((s) => (
          <BranchAttendance
            key={s.branchId || 'no-branch'}
            branchLabel={sections.length > 1 ? s.branchLabel : null}
            record={s.record}
            onOpenModal={(type) => setModal({ type, branchId: s.branchId, branchLabel: s.branchLabel })}
          />
        ))
      )}

      {eventRows.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="text-xs font-bold uppercase tracking-wide text-navy-700">Absensi Event Hari Ini</div>
          {eventRows.map((event) => {
            const allowed = event.branches?.map((row) => row.branch) || []
            const selectedBranch = allowed.find((branch) => branches.some((mine) => mine.id === branch.id)) || branches[0]
            return (
              <div key={event.id} className="rounded-3xl border border-gold-100 bg-gold-50/40 p-4">
                <div className="font-semibold text-navy-900 text-sm mb-3">
                  {event.title} <span className="text-xs font-normal text-gray-400">· {event.type}</span>
                </div>
                <BranchAttendance
                  branchLabel={selectedBranch ? `${selectedBranch.name} (${selectedBranch.code})` : event.location}
                  record={event.myAttendance}
                  requireWindow
                  windowInfo={event.window}
                  windowFallback="Jadwal absensi event belum dibuat admin/head coach."
                  onOpenModal={(type) => setModal({ type, eventId: event.id, branchId: selectedBranch?.id, branchLabel: event.title })}
                />
              </div>
            )
          })}
        </div>
      )}

      {modal && (
        <SelfieCheckinModal
          type={modal.type}
          branchId={modal.branchId}
          branchLabel={modal.branchLabel}
          sessionId={modal.sessionId}
          eventId={modal.eventId}
          onSuccess={handleSuccess}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
