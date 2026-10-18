'use client'

import { useEffect, useState } from 'react'
import { UserCheck, Clock3, CheckCircle2, XCircle, Camera, LogOut, MapPin } from 'lucide-react'
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

// One branch's masuk/pulang pair. A coach/head-coach assigned to several
// branches gets one of these per branch (see StaffCheckinCard below) since
// each branch is its own independent check-in/check-out session.
function BranchAttendance({ branchLabel, record, onOpenModal }) {
  const hasCheckedIn = !!record?.checkInTime
  const needsCheckin = !record || !hasCheckedIn || record.verifyStatus === 'rejected'
  const needsCheckout = hasCheckedIn && (!record.checkOutTime || record.checkOutVerifyStatus === 'rejected')

  return (
    <div className="space-y-2.5">
      {branchLabel && (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
          <MapPin size={12} className="text-gold-500 shrink-0" /> {branchLabel}
        </div>
      )}

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
            className="flex items-center gap-1.5 bg-gold-400 hover:bg-gold-500 text-navy-900 text-sm font-semibold px-4 py-2 rounded-2xl shrink-0"
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
            className="flex items-center gap-1.5 bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold px-4 py-2 rounded-2xl shrink-0"
          >
            <Camera size={14} /> Absen Pulang
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * Self check-in/check-out widget for coach/head-coach, embedded on their
 * dashboard landing page. A coach/head-coach assigned to multiple branches
 * checks in/out separately at each one (e.g. branch A in the morning,
 * branch B in the afternoon) — this renders one independent masuk/pulang
 * section per assigned branch. Someone with no branch assigned yet falls
 * back to a single plain section (matches server-next's no-branch path).
 * Both events reuse SelfieCheckinModal (live camera + watermark +
 * geolocation). Verifikasi admin sudah dihapus: absen langsung tercatat
 * (foto + timestamp) di laporan dan payroll — see
 * server-next/routes/staffAttendance.js.
 */
export default function StaffCheckinCard() {
  const [branches, setBranches] = useState([])
  const [records, setRecords] = useState([])
  const [eventRows, setEventRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // { type, branchId, branchLabel } | null

  function load() {
    Promise.all([api.getMe(), api.getMyStaffAttendance(), api.getTodayEventStaffAttendance()])
      .then(([me, recs, events]) => {
        setBranches((me.branches || []).map((b) => b.branch))
        setRecords(recs)
        setEventRows(events)
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
    setRecords((prev) => {
      const others = prev.filter((r) => r.id !== newRecord.id)
      return [...others, newRecord]
    })
    setModal(null)
  }

  if (loading) return null

  const sections = branches.length > 0
    ? branches.map((b) => ({
        branchId: b.id,
        branchLabel: `${b.name} (${b.code})`,
        record: records.find((r) => r.branchId === b.id) || null,
      }))
    : [{ branchId: null, branchLabel: null, record: records.find((r) => !r.branchId) || null }]

  return (
    <div className="space-y-4">
      {sections.map((s) => (
        <BranchAttendance
          key={s.branchId || 'no-branch'}
          branchLabel={sections.length > 1 ? s.branchLabel : null}
          record={s.record}
          onOpenModal={(type) => setModal({ type, branchId: s.branchId, branchLabel: s.branchLabel })}
        />
      ))}

      {eventRows.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="text-xs font-bold uppercase tracking-wide text-navy-700">Absensi Event Hari Ini</div>
          {eventRows.map((event) => {
            const allowed = event.branches?.map((row) => row.branch) || []
            const selectedBranch = allowed.find((branch) => branches.some((mine) => mine.id === branch.id)) || branches[0]
            return (
              <div key={event.id} className="rounded-3xl border border-gold-100 bg-gold-50/40 p-4">
                <div className="font-semibold text-navy-900 text-sm mb-3">{event.title} <span className="text-xs font-normal text-gray-400">· {event.type}</span></div>
                <BranchAttendance
                  branchLabel={selectedBranch ? `${selectedBranch.name} (${selectedBranch.code})` : event.location}
                  record={event.myAttendance}
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
          eventId={modal.eventId}
          onSuccess={handleSuccess}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
