import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  User,
  Calendar,
  MapPin,
  Droplets,
  Phone,
  AlertCircle,
  Home,
  BookOpen,
  Ruler,
  Weight,
  MoveRight,
  Star,
} from 'lucide-react'

function DetailRow({ icon: Icon, label, value }) {
  if (!value) return null
  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
      <div className="w-9 h-9 rounded-lg bg-navy-50 flex items-center justify-center shrink-0">
        <Icon size={16} className="text-navy-600" />
      </div>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-medium text-navy-800">{value}</p>
      </div>
    </div>
  )
}

export default function DashboardProfile() {
  const { session } = useOutletContext()
  const [child, setChild] = useState(session?.child || null)

  useEffect(() => {
    import('../api').then((api) =>
      api.getMyChild().then((data) => {
        if (data && data.student) {
          const s = data.student
          setChild({
            name: s.name,
            studentId: s.id?.substring(0, 8) || '-',
            ageGroup: s.age_group_label || '-',
            avatar: s.avatar || '',
            position: s.position_singkatan || '',
            profile: {
              birthDate: s.date_of_birth,
              birthPlace: s.birth_place,
              bloodType: s.blood_type,
              height: s.height,
              weight: s.weight,
              preferredFoot: s.preferred_foot,
              school: s.school,
              parentName: s.parent_name,
              parentPhone: s.parent_phone,
              emergencyContact: s.emergency_contact,
              address: s.address,
              medicalHistory: s.medical_history,
              joinedDate: s.joined_date,
            },
          })
        }
      }).catch(() => {})
    )
  }, [])

  const p = child?.profile

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy-800 via-navy-900 to-navy-950 shadow-xl mb-6">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-gold-400/10 rounded-full blur-3xl" />
        </div>
        <div className="relative p-6 lg:p-8 flex items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 p-0.5 shrink-0">
            <div className="w-full h-full rounded-full bg-navy-800 flex items-center justify-center">
              <img
                src={child?.avatar}
                alt={child?.name}
                className="w-full h-full rounded-full"
              />
            </div>
          </div>
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur rounded-full px-3 py-1 mb-2">
              <Star size={12} className="text-gold-400" />
              <span className="text-white/70 text-xs font-medium">Profil Pemain</span>
            </div>
            <h1 className="font-heading text-2xl font-bold text-white">{child?.name}</h1>
            <p className="text-gold-400 text-sm font-medium">{child?.studentId} &middot; {child?.ageGroup}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Data Diri */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5">
          <h2 className="font-heading font-bold text-navy-900 mb-1">Data Diri</h2>
          <p className="text-xs text-gray-400 mb-3">Informasi personal pemain</p>
          <div className="divide-y divide-gray-50">
            <DetailRow icon={Calendar} label="Tanggal Lahir" value={p?.birthDate} />
            <DetailRow icon={MapPin} label="Tempat Lahir" value={p?.birthPlace} />
            <DetailRow icon={Droplets} label="Golongan Darah" value={p?.bloodType} />
            <DetailRow icon={Ruler} label="Tinggi Badan" value={p?.height} />
            <DetailRow icon={Weight} label="Berat Badan" value={p?.weight} />
            <DetailRow icon={MoveRight} label="Kaki Dominan" value={p?.preferredFoot} />
            <DetailRow icon={BookOpen} label="Sekolah" value={p?.school} />
          </div>
        </div>

        {/* Info Orang Tua & Medis */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5">
            <h2 className="font-heading font-bold text-navy-900 mb-1">Kontak Orang Tua</h2>
            <p className="text-xs text-gray-400 mb-3">Informasi wali pemain</p>
            <div className="divide-y divide-gray-50">
              <DetailRow icon={User} label="Nama Orang Tua" value={p?.parentName} />
              <DetailRow icon={Phone} label="No. Telepon" value={p?.parentPhone} />
              <DetailRow icon={AlertCircle} label="Kontak Darurat" value={p?.emergencyContact} />
              <DetailRow icon={Home} label="Alamat" value={p?.address} />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5">
            <h2 className="font-heading font-bold text-navy-900 mb-1">Riwayat Kesehatan</h2>
            <p className="text-xs text-gray-400 mb-3">Catatan medis pemain</p>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle size={18} className="text-blue-600 shrink-0 mt-0.5" />
                <p className="text-sm text-blue-800">{p?.medicalHistory || 'Tidak ada catatan medis.'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5">
            <h2 className="font-heading font-bold text-navy-900 mb-1">Info Akademi</h2>
            <p className="text-xs text-gray-400 mb-3">Keanggotaan akademi</p>
            <div className="divide-y divide-gray-50">
              <DetailRow icon={Calendar} label="Bergabung Sejak" value={p?.joinedDate} />
              <DetailRow icon={User} label="Kelompok Umur" value={child?.ageGroup} />
              <DetailRow icon={Star} label="Posisi" value={child?.position || '-'} />
              <DetailRow icon={Star} label="ID Siswa" value={child?.studentId} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
