'use client'

import { useEffect, useState } from 'react'
import { UserCheck, Clock3, CheckCircle2, XCircle, Camera } from 'lucide-react'
import * as api from '@/lib/api'
import SelfieCheckinModal from './SelfieCheckinModal'

export default function StaffCheckinCard() {
  const [record, setRecord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  function load() {
    api.getMyStaffAttendance().then(setRecord).finally(() => setLoading(false))
  }

  useEffect(load, [])

  function handleSuccess(newRecord) {
    setRecord(newRecord)
    setShowModal(false)
  }

  if (loading) return null

  const needsCheckin = !record || record.verifyStatus === 'rejected'

  return (
    <>
      {record && (
        <div
          className={`flex items-center gap-3 rounded-3xl px-5 py-4 border ${
            record.verifyStatus === 'approved'
              ? 'bg-emerald-50 border-emerald-100'
              : record.verifyStatus === 'rejected'
              ? 'bg-red-50 border-red-100'
              : 'bg-amber-50 border-amber-100'
          }`}
        >
          {record.photo && (
            <img src={record.photo} alt="Selfie absen" className="w-11 h-11 rounded-2xl object-cover shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-sm font-semibold">
              {record.verifyStatus === 'approved' && (
                <>
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span className="text-emerald-800">Absen Disetujui</span>
                </>
              )}
              {record.verifyStatus === 'pending' && (
                <>
                  <Clock3 size={16} className="text-amber-600 shrink-0" />
                  <span className="text-amber-800">Menunggu Verifikasi Admin</span>
                </>
              )}
              {record.verifyStatus === 'rejected' && (
                <>
                  <XCircle size={16} className="text-red-600 shrink-0" />
                  <span className="text-red-800">Absen Ditolak</span>
                </>
              )}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              Check-in pukul <b>{new Date(record.checkInTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</b>
              {record.verifyStatus === 'rejected' && record.rejectReason && (
                <span className="block text-red-600 mt-0.5">Alasan: {record.rejectReason}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {needsCheckin && (
        <div className={`flex items-center justify-between gap-3 bg-white border border-gray-100 shadow-sm rounded-3xl px-5 py-4 ${record ? 'mt-3' : ''}`}>
          <div className="flex items-center gap-3">
            <UserCheck size={20} className="text-navy-700 shrink-0" />
            <div className="text-sm text-navy-800">
              {record?.verifyStatus === 'rejected' ? 'Absen ditolak, silakan absen ulang.' : 'Anda belum absen hari ini.'}
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 bg-gold-400 hover:bg-gold-500 text-navy-900 text-sm font-semibold px-4 py-2 rounded-2xl shrink-0"
          >
            <Camera size={14} /> Absen Sekarang
          </button>
        </div>
      )}

      {showModal && <SelfieCheckinModal onSuccess={handleSuccess} onClose={() => setShowModal(false)} />}
    </>
  )
}
