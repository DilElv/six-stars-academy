import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Target,
  Star,
  ChevronRight,
} from 'lucide-react'

const dayColors = {
  Senin: 'from-blue-500 to-blue-600',
  Selasa: 'from-emerald-500 to-emerald-600',
  Rabu: 'from-purple-500 to-purple-600',
  Kamis: 'from-amber-500 to-amber-600',
  Jumat: 'from-rose-500 to-rose-600',
  Sabtu: 'from-cyan-500 to-cyan-600',
  Minggu: 'from-orange-500 to-orange-600',
}

export default function DashboardSchedule() {
  const { session } = useOutletContext()
  const [schedules, setSchedules] = useState(session?.child?.schedules || [])
  const [childName, setChildName] = useState(session?.child?.name || '')
  const [childGroup, setChildGroup] = useState(session?.child?.ageGroup || '')

  useEffect(() => {
    if (session?.id) {
      import('../api').then((api) => {
        api.getMyChild().then((data) => {
          if (data.schedules) setSchedules(data.schedules)
          if (data.student?.name) setChildName(data.student.name)
          if (data.student?.age_group_label) setChildGroup(data.student.age_group_label)
        }).catch(() => {})
      })
    }
  }, [session])

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy-800 via-navy-900 to-navy-950 shadow-xl mb-6">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-gold-400/10 rounded-full blur-3xl" />
        </div>
        <div className="relative p-6 lg:p-8 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center shrink-0">
            <Calendar size={28} className="text-gold-400" />
          </div>
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur rounded-full px-3 py-1 mb-1.5">
              <Star size={12} className="text-gold-400" />
              <span className="text-white/70 text-xs font-medium">Jadwal Latihan</span>
            </div>
            <h1 className="font-heading text-2xl font-bold text-white">{childName}</h1>
            <p className="text-white/60 text-sm">{childGroup}</p>
          </div>
        </div>
      </div>

      {schedules.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-10 text-center">
          <Calendar size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Belum ada jadwal latihan</p>
          <p className="text-gray-400 text-sm mt-1">Jadwal akan muncul setelah pendaftaran program selesai.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {schedules.map((s, i) => {
            const gradient = dayColors[s.day] || 'from-gray-500 to-gray-600'
            return (
              <div
                key={i}
                className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5"
              >
                <div className="flex flex-col sm:flex-row">
                  <div className={`bg-gradient-to-br ${gradient} p-4 sm:w-28 flex sm:flex-col items-center sm:items-start justify-center sm:justify-center gap-1 text-white`}>
                    <span className="text-lg font-bold font-heading">{s.day.substring(0, 3)}</span>
                    <span className="text-xs text-white/70">{s.day}</span>
                  </div>
                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Target size={15} className="text-navy-500 shrink-0" />
                          <span className="font-semibold text-navy-900 text-sm">{s.focus}</span>
                        </div>
                        <div className="flex flex-wrap gap-x-5 gap-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <Clock size={13} className="text-gray-400" />
                            <span className="text-xs text-gray-500">{s.time}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <MapPin size={13} className="text-gray-400" />
                            <span className="text-xs text-gray-500">{s.venue || 'Six Star Arena'}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <User size={13} className="text-gray-400" />
                            <span className="text-xs text-gray-500">{s.coach}</span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-gray-300 shrink-0 mt-1" />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Info Tambahan */}
      <div className="bg-navy-50 border border-navy-100 rounded-2xl p-5 mt-6">
        <div className="flex items-start gap-3">
          <MapPin size={20} className="text-navy-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-navy-800 text-sm">Lokasi Latihan</h3>
            <p className="text-navy-600 text-xs mt-1">
              <strong>Six Star Arena:</strong> Jl. Olahraga No. 15, Cimahi<br />
              <strong>Training Center:</strong> Jl. Latihan No. 8, Cimahi
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
