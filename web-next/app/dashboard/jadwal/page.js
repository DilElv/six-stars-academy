'use client'

import { useEffect, useState } from 'react'
import { Clock, MapPin, User } from 'lucide-react'
import * as api from '@/lib/api'

export default function JadwalAnakPage() {
  const [student, setStudent] = useState(null)
  const [schedules, setSchedules] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    api.getMyChild()
      .then((s) => {
        setStudent(s)
        return api.getSchedules(s.ageGroup)
      })
      .then(setSchedules)
      .catch((err) => setError(err.message))
  }, [])

  if (error) return <p className="text-sm text-red-500">{error}</p>
  if (!student) return null

  return (
    <div className="space-y-6">
      <h1 className="font-bold text-navy-900 text-lg">Jadwal Latihan</h1>
      <p className="text-xs text-gray-400 -mt-4">Kelompok umur {student.ageGroup}</p>

      {schedules.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-10 text-center text-sm text-gray-400">
          Belum ada jadwal untuk kelompok umur ini.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {schedules.map((s) => (
            <div key={s.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
              <div className="font-bold text-navy-900 mb-3">{s.day}</div>
              <div className="space-y-2 text-sm text-gray-500">
                <div className="flex items-center gap-2"><Clock size={14} /> {s.startTime} - {s.endTime} WIB</div>
                <div className="flex items-center gap-2"><MapPin size={14} /> {s.location}</div>
                {s.coach?.name && <div className="flex items-center gap-2"><User size={14} /> {s.coach.name}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
