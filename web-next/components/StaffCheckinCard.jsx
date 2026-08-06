'use client'

import { useEffect, useState } from 'react'
import { UserCheck, Clock3, CheckCircle2, XCircle, Camera, LogOut } from 'lucide-react'
import * as api from '@/lib/api'
import SelfieCheckinModal from './SelfieCheckinModal'

const VERIFY_ICON = { pending: Clock3, approved: CheckCircle2, rejected: XCircle }
const VERIFY_TEXT = {
  approved: { label: 'Absen Disetujui', color: 'text-emerald-800' },
  pending: { label: 'Menunggu Verifikasi Admin', color: 'text-amber-800' },
  rejected: { label: 'Absen Ditolak', color: 'text-red-800' },
}
const VERIFY_BG = {
  approved: 'bg-emerald-50 border-emerald-100',
  pending: 'bg-amber-50 border-amber-100',
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

/**
 * Self check-in/check-out widget for coach/head-coach, embedded on their
 * dashboard landing page. Both events reuse SelfieCheckinModal (live camera
 * + watermark + geolocation), parameterized by `type`, and are verified by
 * admin independently — see server-next/routes/staffAttendance.js.
 */
export default function StaffCheckinCard() {
  const [record, setRecord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [modalType, setModalType] = useState(null) // 'checkin' | 'checkout' | null

  function load() {
    api.getMyStaffAttendance().then(setRecord).finally(() => setLoading(false))
  }

  useEffect(load, [])

  function handleSuccess(newRecord) {
    setRecord(newRecord)
    setModalType(null)
  }

  if (loading) return null

  const needsCheckin = !record || (!record.checkInTime) || record.verifyStatus === 'rejected'
  const hasCheckedIn = !!record?.checkInTime
  const needsCheckout = hasCheckedIn && (!record.checkOutTime || record.checkOutVerifyStatus === 'rejected')

  return (
    <div className="space-y-3">
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
              {record?.verifyStatus === 'rejected' ? 'Absen masuk ditolak, silakan absen ulang.' : 'Anda belum absen masuk hari ini.'}
            </div>
          </div>
          <button
            onClick={() => setModalType('checkin')}
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
              {record?.checkOutVerifyStatus === 'rejected' ? 'Absen pulang ditolak, silakan absen ulang.' : 'Jangan lupa absen pulang sebelum meninggalkan lapangan.'}
            </div>
          </div>
          <button
            onClick={() => setModalType('checkout')}
            className="flex items-center gap-1.5 bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold px-4 py-2 rounded-2xl shrink-0"
          >
            <Camera size={14} /> Absen Pulang
          </button>
        </div>
      )}

      {modalType && (
        <SelfieCheckinModal type={modalType} onSuccess={handleSuccess} onClose={() => setModalType(null)} />
      )}
    </div>
  )
}
