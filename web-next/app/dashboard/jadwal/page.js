'use client'

import { useEffect, useMemo, useState } from 'react'
import { Clock, MapPin, User, CalendarDays, Info } from 'lucide-react'
import * as api from '@/lib/api'
import { Calendar } from '@/components/ui/calendar'
import { id as localeId } from 'date-fns/locale'
import { format } from 'date-fns'

const DAY_MAP = { minggu: 0, senin: 1, selasa: 2, rabu: 3, kamis: 4, jumat: 5, sabtu: 6 }

const ATTENDANCE_DOT = {
  hadir: 'after:bg-emerald-500',
  izin: 'after:bg-amber-500',
  sakit: 'after:bg-blue-500',
  alfa: 'after:bg-red-500',
}
const ATTENDANCE_LABEL = { hadir: 'Hadir', izin: 'Izin', sakit: 'Sakit', alfa: 'Alfa' }
const ATTENDANCE_BADGE = {
  hadir: 'bg-emerald-50 text-emerald-700',
  izin: 'bg-amber-50 text-amber-700',
  sakit: 'bg-blue-50 text-blue-700',
  alfa: 'bg-red-50 text-red-700',
}

function parseWeekdays(dayStr = '') {
  return dayStr
    .split(/[&,]/)
    .map((s) => s.trim().toLowerCase())
    .map((s) => DAY_MAP[s])
    .filter((n) => n !== undefined)
}

function dateKey(d) {
  return format(d, 'yyyy-MM-dd')
}

export default function JadwalAnakPage() {
  const [student, setStudent] = useState(null)
  const [schedules, setSchedules] = useState([])
  const [attendance, setAttendance] = useState([])
  const [error, setError] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date())

  useEffect(() => {
    api.getMyChild()
      .then((s) => {
        setStudent(s)
        return Promise.all([api.getSchedules(s.ageGroup), api.getMyAttendance()])
      })
      .then(([sched, att]) => { setSchedules(sched); setAttendance(att) })
      .catch((err) => setError(err.message))
  }, [])

  const scheduleByWeekday = useMemo(() => {
    const map = {}
    for (const s of schedules) {
      for (const wd of parseWeekdays(s.day)) map[wd] = s
    }
    return map
  }, [schedules])

  const trainingWeekdays = useMemo(() => Object.keys(scheduleByWeekday).map(Number), [scheduleByWeekday])

  const attendanceByDate = useMemo(() => {
    const map = {}
    for (const a of attendance) map[dateKey(new Date(a.date))] = a.status
    return map
  }, [attendance])

  if (error) return <p className="text-sm text-red-500">{error}</p>
  if (!student) return null

  const selectedSchedule = selectedDate ? scheduleByWeekday[selectedDate.getDay()] : null
  const selectedAttendance = selectedDate ? attendanceByDate[dateKey(selectedDate)] : null

  return (
    <div className="space-y-6">
      <h1 className="font-bold text-navy-900 text-lg">Jadwal Latihan</h1>
      <p className="text-xs text-gray-400 -mt-4">Kelompok umur {student.ageGroup}</p>

      {schedules.length === 0 ? (
        <div className="glass-card rounded-3xl p-10 text-center text-sm text-gray-400">
          Belum ada jadwal untuk kelompok umur ini.
        </div>
      ) : (
        <>
          <div className="grid lg:grid-cols-[auto_1fr] gap-5 items-start">
            <div className="glass-card rounded-3xl p-3 sm:p-5 lg:p-7 flex flex-col items-center w-full lg:w-auto overflow-x-auto">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-navy-900 mb-4 self-start">
                <CalendarDays size={15} className="text-gold-500" /> Kalender Latihan
              </div>
              <Calendar
                mode="single"
                locale={localeId}
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="[--cell-size:2.5rem] sm:[--cell-size:3.25rem] lg:[--cell-size:4.5rem] [--cell-font-size:0.875rem] sm:[--cell-font-size:1.0625rem] lg:[--cell-font-size:1.375rem]"
                modifiers={{
                  training: (date) => trainingWeekdays.includes(date.getDay()),
                  ...Object.fromEntries(
                    Object.keys(ATTENDANCE_DOT).map((status) => [
                      status,
                      (date) => attendanceByDate[dateKey(date)] === status,
                    ])
                  ),
                }}
                modifiersClassNames={{
                  training: 'bg-gold-400/15 text-gold-700 font-bold text-lg ring-1 ring-inset ring-gold-400/50 rounded-xl',
                  ...Object.fromEntries(
                    Object.entries(ATTENDANCE_DOT).map(([status, dotClass]) => [
                      status,
                      `relative after:content-[''] after:absolute after:bottom-1.5 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:rounded-full ${dotClass}`,
                    ])
                  ),
                }}
              />
              <div className="flex flex-col gap-1.5 pt-4 text-xs text-gray-400 self-start">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-md bg-gold-400/25 ring-1 ring-gold-400 shrink-0" />
                  Tanggal emas = ada latihan
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  {Object.entries(ATTENDANCE_LABEL).map(([status, label]) => (
                    <div key={status} className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${ATTENDANCE_DOT[status].replace('after:', '')}`} />
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="glass-card rounded-3xl p-4 min-h-[160px]">
                {selectedSchedule ? (
                  <>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <div className="text-[11px] font-semibold text-gold-600 uppercase tracking-wide">
                          {format(selectedDate, 'EEEE, d MMM yyyy', { locale: localeId })}
                        </div>
                        <div className="font-bold text-navy-900 text-sm">Latihan {student.ageGroup}</div>
                      </div>
                      {selectedAttendance && (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${ATTENDANCE_BADGE[selectedAttendance]}`}>
                          {ATTENDANCE_LABEL[selectedAttendance]}
                        </span>
                      )}
                    </div>
                    <div className="space-y-2 text-xs text-gray-600">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-gold-400/10 flex items-center justify-center shrink-0">
                          <Clock size={12} className="text-gold-600" />
                        </div>
                        {selectedSchedule.startTime} - {selectedSchedule.endTime} WIB
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-gold-400/10 flex items-center justify-center shrink-0">
                          <MapPin size={12} className="text-gold-600" />
                        </div>
                        {selectedSchedule.location}
                      </div>
                      {selectedSchedule.coach?.name && (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-gold-400/10 flex items-center justify-center shrink-0">
                            <User size={12} className="text-gold-600" />
                          </div>
                          {selectedSchedule.coach.name}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center gap-2 py-8">
                    <Info size={18} className="text-gray-300" />
                    <div className="text-xs text-gray-400 max-w-xs">
                      {selectedAttendance ? (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ATTENDANCE_BADGE[selectedAttendance]}`}>
                          {ATTENDANCE_LABEL[selectedAttendance]}
                        </span>
                      ) : (
                        'Tidak ada latihan pada tanggal ini.'
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <h2 className="text-sm font-semibold text-gray-500 mb-3">Ringkasan Mingguan</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {schedules.map((s) => (
                    <div key={s.id} className="glass-card rounded-3xl p-5">
                      <div className="font-bold text-navy-900 mb-3">{s.day}</div>
                      <div className="space-y-2 text-sm text-gray-500">
                        <div className="flex items-center gap-2"><Clock size={14} /> {s.startTime} - {s.endTime} WIB</div>
                        <div className="flex items-center gap-2"><MapPin size={14} /> {s.location}</div>
                        {s.coach?.name && <div className="flex items-center gap-2"><User size={14} /> {s.coach.name}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
