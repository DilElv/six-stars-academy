'use client'

import { useEffect, useState } from 'react'
import { QrCode, Printer } from 'lucide-react'
import * as api from '@/lib/api'

function Row({ label, value }) {
  return (
    <div className="flex justify-between py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-navy-900 text-right">{value || '-'}</span>
    </div>
  )
}

export default function ProfilAnakPage() {
  const [student, setStudent] = useState(null)
  const [error, setError] = useState('')
  const [qrUrl, setQrUrl] = useState('')

  useEffect(() => {
    api.getMyChild().then(setStudent).catch((err) => setError(err.message))
    api.getMyChildQrCodeUrl().then(setQrUrl).catch(() => {})
  }, [])

  if (error) return <p className="text-sm text-red-500">{error}</p>
  if (!student) return null

  const age = Math.floor((Date.now() - new Date(student.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))

  return (
    <div className="space-y-6">
      <h1 className="font-bold text-navy-900 text-lg">Profil Anak</h1>
      <p className="text-xs text-gray-400 -mt-4">Data ini hanya bisa diubah oleh Head Coach.</p>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 rounded-full bg-gray-100 overflow-hidden shrink-0">
            {student.photo && <img src={student.photo} alt="" className="w-full h-full object-cover" />}
          </div>
          <div>
            <div className="font-bold text-navy-900 text-lg">{student.fullName}</div>
            <div className="text-sm text-gray-400">{student.studentId}</div>
          </div>
        </div>

        <Row label="Tanggal Lahir" value={new Date(student.dateOfBirth).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} />
        <Row label="Umur" value={`${age} tahun`} />
        <Row label="Posisi" value={student.position} />
        <Row label="Kelompok Umur" value={student.ageGroup} />
        <Row label="Paket" value={student.package ? `${student.package.name} · ${student.package.sessionsPerWeek}x/minggu` : '-'} />
        <Row label="Nama Orang Tua" value={student.parentName} />
        <Row label="Telepon Orang Tua" value={student.parentPhone} />
        <Row label="Alamat" value={student.address} />
        <Row label="Status" value={student.status} />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <QrCode size={16} className="text-navy-700" />
          <h2 className="font-semibold text-navy-900 text-sm">Kartu Siswa (untuk Absensi QR)</h2>
        </div>
        {qrUrl ? (
          <>
            <img src={qrUrl} alt="QR Kartu Siswa" className="w-40 h-40 mx-auto mb-3" />
            <div className="font-bold text-navy-900">{student.studentId}</div>
            <p className="text-xs text-gray-400 mb-4">Tunjukkan kode ini ke Coach untuk absen scan QR.</p>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-navy-900 hover:bg-navy-800 text-white px-4 py-2 rounded-lg"
            >
              <Printer size={14} /> Cetak Kartu
            </button>
          </>
        ) : (
          <p className="text-sm text-gray-400">Memuat QR code...</p>
        )}
      </div>
    </div>
  )
}
