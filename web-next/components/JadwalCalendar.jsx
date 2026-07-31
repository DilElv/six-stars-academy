'use client'

import { useMemo, useState } from 'react'
import { Clock, MapPin, CalendarDays, Info, Plus, Trash2, Loader2, Users, Trophy, Wallet } from 'lucide-react'
import * as api from '@/lib/api'
import { Calendar } from '@/components/ui/calendar'
import { AppSelect } from '@/components/ui/app-select'
import { MultiSelectCheckbox } from '@/components/ui/multi-select-checkbox'
import { AGE_GROUPS } from '@/lib/ageGroups'
import { WEEKDAYS, weekdayForDate } from '@/lib/weekdays'
import { id as localeId } from 'date-fns/locale'
import { format } from 'date-fns'

function dateKey(d) {
  return format(d, 'yyyy-MM-dd')
}

const emptyTopicForm = { topicTitle: '', ageGroups: [], topicDescription: '', objective: '', duration: '', equipment: '', fieldId: '' }

/**
 * Shared calendar + selected-date detail panel for jadwal latihan, reused by
 * coach, head-coach, and the student's read-only view — keeps the three
 * "samain persis" per the product ask instead of drifting apart over time.
 */
export default function JadwalCalendar({
  schedules,
  sessions,
  events = [],
  fields = [],
  canAddTopic = false,
  onChanged,
  ageGroupFilter,
  attendanceByDate,
  attendanceLegend,
  renderDateBadge,
}) {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showTopicForm, setShowTopicForm] = useState(false)
  const [topicForm, setTopicForm] = useState(emptyTopicForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const scheduleByWeekday = useMemo(() => {
    const map = {}
    for (const s of schedules) {
      if (!map[s.day]) map[s.day] = []
      map[s.day].push(s)
    }
    return map
  }, [schedules])

  const scheduleWeekdays = useMemo(
    () => Object.keys(scheduleByWeekday).map((day) => WEEKDAYS.find((w) => w.value === day)?.jsDay).filter((n) => n !== undefined),
    [scheduleByWeekday]
  )

  const filteredSessions = useMemo(() => {
    if (!ageGroupFilter) return sessions
    return sessions.filter((s) => (s.ageGroup || '').split(',').includes(ageGroupFilter))
  }, [sessions, ageGroupFilter])

  const sessionsByDate = useMemo(() => {
    const map = {}
    for (const s of filteredSessions) {
      const key = dateKey(new Date(s.date))
      if (!map[key]) map[key] = []
      map[key].push(s)
    }
    return map
  }, [filteredSessions])

  const eventsByDate = useMemo(() => {
    const map = {}
    for (const e of events) {
      const key = dateKey(new Date(e.date))
      if (!map[key]) map[key] = []
      map[key].push(e)
    }
    return map
  }, [events])

  const selectedWeekday = selectedDate ? weekdayForDate(selectedDate) : null
  const selectedDaySchedules = selectedWeekday ? scheduleByWeekday[selectedWeekday] || [] : []
  const selectedDaySessions = selectedDate ? sessionsByDate[dateKey(selectedDate)] || [] : []
  const selectedDayEvents = selectedDate ? eventsByDate[dateKey(selectedDate)] || [] : []
  const hasSchedule = selectedDaySchedules.length > 0
  const selectedAttendance = attendanceByDate && selectedDate ? attendanceByDate[dateKey(selectedDate)] : null

  function openTopicForm() {
    setTopicForm(emptyTopicForm)
    setShowTopicForm(true)
    setError('')
  }

  async function handleSubmitTopic(e) {
    e.preventDefault()
    if (topicForm.ageGroups.length === 0) { setError('Pilih minimal satu kelompok umur'); return }
    setSaving(true)
    setError('')
    try {
      await api.createTrainingSession({
        ...topicForm,
        date: dateKey(selectedDate),
        fieldId: topicForm.fieldId || undefined,
      })
      setShowTopicForm(false)
      onChanged?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteTopic(id) {
    if (!confirm('Hapus topik latihan ini?')) return
    await api.deleteTrainingSession(id)
    onChanged?.()
  }

  return (
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
            schedule: (date) => scheduleWeekdays.includes(date.getDay()),
            hasTopic: (date) => !!sessionsByDate[dateKey(date)],
            event: (date) => !!eventsByDate[dateKey(date)],
          }}
          modifiersClassNames={{
            schedule: 'bg-gold-400/15 text-gold-700 font-bold text-lg ring-1 ring-inset ring-gold-400/50 rounded-xl',
            hasTopic: "relative after:content-[''] after:absolute after:bottom-1.5 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:rounded-full after:bg-emerald-500",
            event: 'bg-blue-400/15 text-blue-700 font-bold ring-1 ring-inset ring-blue-400/50 rounded-xl',
          }}
        />
        <div className="flex flex-col gap-1.5 pt-4 text-xs text-gray-400 self-start">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-md bg-gold-400/25 ring-1 ring-gold-400 shrink-0" />
            Tanggal emas = ada jadwal latihan
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            Titik hijau = topik sudah diisi
          </div>
          {events.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-md bg-blue-400/25 ring-1 ring-blue-400 shrink-0" />
              Tanggal biru = ada event
            </div>
          )}
          {attendanceLegend}
        </div>
      </div>

      <div className="space-y-5">
        <div className="glass-card rounded-3xl p-5 min-h-[160px]">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="text-[11px] font-semibold text-gold-600 uppercase tracking-wide">
              {format(selectedDate, 'EEEE, d MMM yyyy', { locale: localeId })}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {renderDateBadge?.(selectedDate, selectedAttendance)}
              {canAddTopic && hasSchedule && (
                <button onClick={openTopicForm} className="flex items-center gap-1.5 bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold px-3 py-1.5 rounded-xl">
                  <Plus size={13} /> Tambah Topik Latihan
                </button>
              )}
            </div>
          </div>

          {selectedDayEvents.length > 0 && (
            <div className="space-y-2 mb-4">
              {selectedDayEvents.map((e) => (
                <div key={e.id} className="rounded-2xl border border-blue-100 bg-blue-50/50 p-3.5">
                  <div className="flex items-center gap-1.5 text-blue-700 font-bold text-sm">
                    <Trophy size={14} /> {e.title}
                  </div>
                  <div className="flex flex-wrap gap-3 text-[11px] text-blue-600 mt-1.5">
                    {e.location && <span className="flex items-center gap-1"><MapPin size={11} /> {e.location}</span>}
                    {e.fee > 0 && <span className="flex items-center gap-1"><Wallet size={11} /> Rp{e.fee.toLocaleString('id-ID')}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!hasSchedule ? (
            selectedDayEvents.length === 0 && (
              <div className="flex flex-col items-center justify-center text-center gap-2 py-8">
                <Info size={18} className="text-gray-300" />
                <div className="text-xs text-gray-400">Tidak ada jadwal latihan pada tanggal ini.</div>
              </div>
            )
          ) : (
            <div className="space-y-4">
              {selectedDaySchedules.map((s) => (
                <div key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600 bg-gray-50 rounded-2xl px-3 py-2.5">
                  <span className="flex items-center gap-1.5"><Clock size={12} className="text-gold-600" /> {s.startTime} - {s.endTime} WIB</span>
                  <span className="flex items-center gap-1.5"><MapPin size={12} className="text-gold-600" /> {s.location}</span>
                  {s.ageGroup && <span className="flex items-center gap-1.5"><Users size={12} className="text-gold-600" /> {s.ageGroup.split(',').join(', ')}</span>}
                </div>
              ))}

              {selectedDaySessions.length === 0 ? (
                <p className="text-xs text-gray-400">Belum ada topik latihan yang diisi untuk hari ini.</p>
              ) : (
                <div className="space-y-3">
                  {selectedDaySessions.map((s) => (
                    <div key={s.id} className="rounded-2xl border border-gray-100 p-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-navy-900 text-sm">{s.topicTitle}</div>
                          <div className="text-[11px] text-gold-600 font-semibold">{s.ageGroup?.split(',').join(', ')}</div>
                        </div>
                        {canAddTopic && (
                          <button onClick={() => handleDeleteTopic(s.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg shrink-0">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                      {s.topicDescription && <p className="text-xs text-gray-500 mt-1.5">{s.topicDescription}</p>}
                      <div className="flex flex-wrap gap-3 text-[11px] text-gray-400 mt-1.5">
                        {s.field?.name && <span>📍 {s.field.name}</span>}
                        {s.objective && <span>Tujuan: {s.objective}</span>}
                        {s.duration && <span>Durasi: {s.duration}</span>}
                        {s.equipment && <span>Peralatan: {s.equipment}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showTopicForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setShowTopicForm(false)}>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[85vh] overflow-y-auto modal-scroll" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-bold text-navy-900">Tambah Topik Latihan</h3>
              <p className="text-xs text-gray-400 mt-0.5">{format(selectedDate, 'EEEE, d MMM yyyy', { locale: localeId })}</p>
            </div>
            <form onSubmit={handleSubmitTopic} className="p-5 space-y-3">
              {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Judul Topik</label>
                <input required value={topicForm.topicTitle} onChange={(e) => setTopicForm((f) => ({ ...f, topicTitle: e.target.value }))} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Kelompok Umur</label>
                <MultiSelectCheckbox
                  options={AGE_GROUPS.map((ag) => ({ value: ag, label: ag }))}
                  values={topicForm.ageGroups}
                  onChange={(vals) => setTopicForm((f) => ({ ...f, ageGroups: vals }))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Keterangan</label>
                <textarea value={topicForm.topicDescription} onChange={(e) => setTopicForm((f) => ({ ...f, topicDescription: e.target.value }))} rows={3} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Lapangan (opsional)</label>
                <AppSelect
                  value={topicForm.fieldId}
                  onChange={(v) => setTopicForm((f) => ({ ...f, fieldId: v }))}
                  className="w-full"
                  allLabel="- Pilih Lapangan -"
                  placeholder="- Pilih Lapangan -"
                  options={fields.map((f) => ({ value: f.id, label: f.name }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Durasi (opsional)</label>
                  <input placeholder="mis. 90 menit" value={topicForm.duration} onChange={(e) => setTopicForm((f) => ({ ...f, duration: e.target.value }))} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Peralatan (opsional)</label>
                  <input placeholder="mis. Cone, bola" value={topicForm.equipment} onChange={(e) => setTopicForm((f) => ({ ...f, equipment: e.target.value }))} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Tujuan Latihan (opsional)</label>
                <input value={topicForm.objective} onChange={(e) => setTopicForm((f) => ({ ...f, objective: e.target.value }))} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm" />
              </div>
              <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 bg-navy-900 hover:bg-navy-800 text-white font-semibold py-2.5 rounded-2xl disabled:opacity-50">
                {saving && <Loader2 size={14} className="animate-spin" />} Simpan Topik
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
