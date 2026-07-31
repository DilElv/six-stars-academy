'use client'

import { useEffect, useState } from 'react'
import { Loader2, Download, QrCode as QrCodeIcon } from 'lucide-react'
import * as api from '@/lib/api'
import { PAYMENT_METHOD_LOGOS } from '@/lib/paymentMethodLogos'
import { downloadStudentCard } from '@/lib/studentCard'

function Row({ label, value }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-50 last:border-0 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-navy-900 text-right">{value || '-'}</span>
    </div>
  )
}

const PAYMENT_STATUS_LABEL = { success: 'Lunas', pending: 'Menunggu', failed: 'Gagal' }

export default function StudentDetailModal({ student: initialStudent, onClose }) {
  const [student, setStudent] = useState(initialStudent)
  const [loading, setLoading] = useState(true)
  const [qrUrl, setQrUrl] = useState('')
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    api.getStudent(initialStudent.id).then(setStudent).catch(() => {}).finally(() => setLoading(false))
    api.getStudentQrCodeUrl(initialStudent.id).then(setQrUrl).catch(() => {})
  }, [initialStudent.id])

  const latestPayment = student.payments?.[0]
  const sessionPct = student.totalSessions > 0
    ? Math.min(100, ((student.attendedSessions || 0) / student.totalSessions) * 100)
    : 0

  async function handleDownload() {
    setDownloading(true)
    try {
      await downloadStudentCard(student, qrUrl)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[85vh] overflow-y-auto modal-scroll" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-br from-navy-800 to-navy-900 p-5 text-center">
          <div className="w-16 h-16 rounded-full bg-white/10 mx-auto mb-2 overflow-hidden">
            {student.photo && <img src={student.photo} alt="" className="w-full h-full object-cover" />}
          </div>
          <h3 className="font-heading font-bold text-white">{student.fullName}</h3>
          <p className="text-xs text-gray-300">{student.studentId}</p>
        </div>
        <div className="p-5">
          <Row label="Tanggal Lahir" value={new Date(student.dateOfBirth).toLocaleDateString('id-ID')} />
          <Row label="Posisi" value={student.position} />
          <Row label="Kelompok Umur" value={student.ageGroup} />
          <Row label="Cabang" value={student.branch?.name} />
          <Row label="Nama Orang Tua" value={student.parentName} />
          <Row label="Telepon" value={student.parentPhone} />
          <Row label="Alamat" value={student.address} />
          <Row label="Paket" value={student.package?.name} />
          <Row label="Status" value={student.status} />

          {loading ? (
            <div className="py-6 text-center text-sm text-gray-400 flex items-center justify-center gap-2">
              <Loader2 size={14} className="animate-spin" /> Memuat detail...
            </div>
          ) : (
            <>
              {student.totalSessions > 0 && (
                <div className="mt-4 bg-gray-50 rounded-2xl p-3.5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-semibold text-navy-900">Sesi Latihan</div>
                    <div className="text-xs font-semibold text-navy-700">
                      {student.attendedSessions}/{student.totalSessions}
                    </div>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-gold-400 to-gold-500 transition-all duration-500"
                      style={{ width: `${sessionPct}%` }}
                    />
                  </div>
                </div>
              )}

              {student.attendanceSummary && (
                <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                  <div className="bg-emerald-50 rounded-xl py-2">
                    <div className="text-sm font-bold text-emerald-700">{student.attendanceSummary.hadir}</div>
                    <div className="text-[10px] text-emerald-600">Hadir</div>
                  </div>
                  <div className="bg-blue-50 rounded-xl py-2">
                    <div className="text-sm font-bold text-blue-700">{student.attendanceSummary.izin}</div>
                    <div className="text-[10px] text-blue-600">Izin</div>
                  </div>
                  <div className="bg-amber-50 rounded-xl py-2">
                    <div className="text-sm font-bold text-amber-700">{student.attendanceSummary.sakit}</div>
                    <div className="text-[10px] text-amber-600">Sakit</div>
                  </div>
                  <div className="bg-red-50 rounded-xl py-2">
                    <div className="text-sm font-bold text-red-700">{student.attendanceSummary.alfa}</div>
                    <div className="text-[10px] text-red-600">Alfa</div>
                  </div>
                </div>
              )}

              <div className="mt-4">
                <div className="text-xs font-semibold text-gray-500 mb-1.5">Metode Pembayaran Terakhir</div>
                {latestPayment ? (
                  <div className="flex items-center gap-2.5 bg-gray-50 rounded-2xl px-3.5 py-2.5">
                    {PAYMENT_METHOD_LOGOS[latestPayment.paymentMethod] && (
                      <img src={PAYMENT_METHOD_LOGOS[latestPayment.paymentMethod]} alt="" className="h-5 w-8 object-contain shrink-0" />
                    )}
                    <span className="text-sm font-medium text-navy-900 flex-1">{latestPayment.paymentMethod || '-'}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      latestPayment.status === 'success' ? 'bg-emerald-100 text-emerald-700'
                        : latestPayment.status === 'pending' ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {PAYMENT_STATUS_LABEL[latestPayment.status] || latestPayment.status}
                    </span>
                  </div>
                ) : (
                  <div className="text-sm text-gray-400 bg-gray-50 rounded-2xl px-3.5 py-2.5">Belum ada pembayaran</div>
                )}
              </div>

              <div className="mt-4 bg-gray-50 rounded-2xl p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2.5">
                  <QrCodeIcon size={14} className="text-navy-700" />
                  <span className="text-xs font-semibold text-navy-900">Kartu QR Absensi</span>
                </div>
                {qrUrl ? (
                  <>
                    <img src={qrUrl} alt="QR Kartu Siswa" className="w-32 h-32 mx-auto mb-3 rounded-xl border border-gray-200" />
                    <button
                      onClick={handleDownload}
                      disabled={downloading}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold bg-navy-900 hover:bg-navy-800 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                    >
                      {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} Unduh Kartu
                    </button>
                  </>
                ) : (
                  <p className="text-xs text-gray-400">Memuat QR code...</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
