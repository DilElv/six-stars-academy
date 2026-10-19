'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  CalendarCheck, Loader2, RefreshCw, ChevronDown, ChevronRight, Clock, CheckCircle2,
  XCircle, FileSpreadsheet, FileText, MapPin, Plus, Pencil, Trash2, CalendarClock,
  Wand2, Trophy, Dumbbell, X,
} from 'lucide-react'
import * as api from '@/lib/api'
import { AppSelect } from '@/components/ui/app-select'
import ModalPortal from '@/components/ui/modal-portal'
import { exportCoachRecapToExcel, exportCoachRecapToPDF, exportCoachRecapDetailToExcel, exportCoachRecapDetailToPDF } from '@/lib/export'

const MONTHS = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const now = new Date()

function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: 'short' })
}

function formatTime(value) {
  if (!value) return '-'
  return new Date(value).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

function dateInput(value) {
  const d = value ? new Date(value) : new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function dateKey(value) {
  return dateInput(value)
}

function typeLabel(type) {
  if (type === 'training') return 'Latihan'
  if (type === 'tournament') return 'Tournament'
  return 'Event'
}

function TypeIcon({ type, size = 16, className = '' }) {
  if (type === 'training') return <Dumbbell size={size} className={className} />
  if (type === 'tournament') return <Trophy size={size} className={className} />
  return <CalendarClock size={size} className={className} />
}

function StatusPill({ status, type = 'in' }) {
  const map = {
    approved: { label: type === 'in' ? 'Hadir' : 'Pulang OK', cls: 'bg-emerald-50 text-emerald-700', Icon: CheckCircle2 },
    pending: { label: 'Pending', cls: 'bg-amber-50 text-amber-700', Icon: Clock },
    rejected: { label: 'Ditolak', cls: 'bg-red-50 text-red-600', Icon: XCircle },
  }
  const entry = map[status] || { label: '—', cls: 'bg-gray-100 text-gray-500', Icon: Clock }
  const { Icon } = entry
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${entry.cls}`}>
      <Icon size={11} /> {entry.label}
    </span>
  )
}

function PhotoThumb({ src, label }) {
  if (!src) return <span className="text-gray-300">-</span>
  return (
    <a href={src} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-navy-700 hover:text-gold-600">
      <img src={src} alt={label} className="w-7 h-7 rounded-lg object-cover border border-gray-200" />
      {label}
    </a>
  )
}

function Stat({ label, value, tone = 'gray' }) {
  const tones = { emerald: 'text-emerald-600', amber: 'text-amber-600', red: 'text-red-600', gray: 'text-navy-900' }
  return (
    <div className="min-w-[64px]">
      <div className={`font-bold tabular-nums ${tones[tone]}`}>{value}</div>
      <div className="text-[10px] text-gray-400">{label}</div>
    </div>
  )
}

function SummaryCard({ label, value, tone = 'gray' }) {
  const tones = { navy: 'text-navy-800', emerald: 'text-emerald-600', amber: 'text-amber-600', red: 'text-red-600', gray: 'text-navy-900' }
  return (
    <div className="glass-card rounded-2xl p-4">
      <div className={`text-xl font-bold tabular-nums ${tones[tone]}`}>{value}</div>
      <div className="text-xs text-gray-400 mt-0.5">{label}</div>
    </div>
  )
}

const emptyForm = {
  title: '',
  type: 'training',
  branchId: '',
  coachId: '',
  checkInOpen: '15:30',
  checkInClose: '16:00',
  checkOutClose: '23:59',
  note: '',
  status: 'active',
}

function SessionEditor({ initial, coaches, branches, onClose, onSaved }) {
  const editing = !!initial?.id
  const linked = !!(initial?.trainingSessionId || initial?.eventId)
  const [mode, setMode] = useState('manual')
  const [date, setDate] = useState(dateInput(initial?.date))
  const [form, setForm] = useState(() => editing ? {
    title: initial.title || '',
    type: initial.type || 'training',
    branchId: initial.branchId || '',
    coachId: initial.coachId || '',
    checkInOpen: initial.checkInOpen || '00:00',
    checkInClose: initial.checkInClose || '23:59',
    checkOutClose: initial.checkOutClose || '23:59',
    note: initial.note || '',
    status: initial.status || 'active',
  } : { ...emptyForm })
  const [sources, setSources] = useState({ trainings: [], events: [] })
  const [loadingSources, setLoadingSources] = useState(false)
  const [sourceId, setSourceId] = useState('')
  const [eventBranchId, setEventBranchId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  useEffect(() => {
    if (editing || mode === 'manual') return
    let cancelled = false
    setLoadingSources(true)
    setError('')
    api.getCoachAttendanceSessionSources(date)
      .then((data) => {
        if (cancelled) return
        setSources(data)
        setSourceId('')
        setEventBranchId('')
      })
      .catch((err) => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoadingSources(false) })
    return () => { cancelled = true }
  }, [mode, date, editing])

  const availableTrainings = useMemo(
    () => (sources.trainings || []).filter((row) => !row.hasSession),
    [sources],
  )
  const availableEvents = useMemo(
    () => (sources.events || []).filter((row) => !row.hasSession),
    [sources],
  )
  const selectedEvent = availableEvents.find((row) => row.id === sourceId) || null

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const times = {
        checkInOpen: form.checkInOpen,
        checkInClose: form.checkInClose,
        checkOutClose: form.checkOutClose,
        note: form.note || null,
      }
      let saved
      if (editing) {
        saved = await api.updateCoachAttendanceSession(initial.id, {
          ...times,
          coachId: form.coachId || null,
          ...(linked ? {} : { date, branchId: form.branchId || null, title: form.title }),
          status: form.status,
        })
      } else if (mode === 'training') {
        if (!sourceId) throw new Error('Pilih sesi latihan terlebih dahulu')
        saved = await api.createCoachAttendanceSession({ trainingSessionId: sourceId, ...times })
      } else if (mode === 'event') {
        if (!sourceId) throw new Error('Pilih event terlebih dahulu')
        saved = await api.createCoachAttendanceSession({
          eventId: sourceId,
          branchId: eventBranchId || undefined,
          ...times,
        })
      } else {
        if (!form.title.trim()) throw new Error('Nama/judul sesi wajib diisi')
        saved = await api.createCoachAttendanceSession({
          ...times,
          title: form.title.trim(),
          type: 'training',
          date,
          branchId: form.branchId || null,
          coachId: form.coachId || null,
          status: form.status,
        })
      }
      onSaved(saved)
    } catch (err) {
      setError(err.message || 'Gagal menyimpan jadwal')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/60" onClick={saving ? undefined : onClose} />
        <form onSubmit={handleSubmit} className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarClock size={18} className="text-navy-700" />
              <h3 className="font-bold text-navy-900">{editing ? 'Edit Jadwal Absensi' : 'Tambah Jadwal Absensi'}</h3>
            </div>
            {!saving && (
              <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X size={18} /></button>
            )}
          </div>

          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</div>}

          {!editing && (
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'manual', label: 'Manual' },
                { key: 'training', label: 'Sesi Latihan' },
                { key: 'event', label: 'Event' },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setMode(item.key)}
                  className={`text-xs font-semibold px-3 py-2 rounded-xl border ${mode === item.key ? 'bg-navy-900 text-white border-navy-900' : 'bg-white text-navy-700 border-gray-200 hover:border-gold-300'}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-gray-500">
              Tanggal
              <input
                type="date"
                value={date}
                disabled={editing && linked}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-navy-900 disabled:bg-gray-50"
              />
            </label>
            <div className="text-xs font-semibold text-gray-500">
              Tipe
              <div className="mt-1 rounded-xl bg-gray-50 border border-gray-100 px-3 py-2 text-sm text-navy-900">
                {typeLabel(editing ? initial.type : mode === 'training' ? 'training' : mode === 'event' ? 'event' : 'training')}
              </div>
            </div>
          </div>

          {mode === 'training' && !editing && (
            <div className="space-y-2">
              {loadingSources ? (
                <div className="text-sm text-gray-400 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Memuat sesi latihan...</div>
              ) : availableTrainings.length === 0 ? (
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                  Tidak ada sesi latihan yang belum memiliki jadwal absensi pada tanggal ini.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {availableTrainings.map((training) => (
                    <button
                      key={training.id}
                      type="button"
                      onClick={() => setSourceId(training.id)}
                      className={`w-full text-left rounded-xl border px-3 py-2 ${sourceId === training.id ? 'border-gold-400 bg-gold-50/60' : 'border-gray-200 hover:border-gold-300'}`}
                    >
                      <div className="text-sm font-semibold text-navy-900">{training.topicTitle || `Latihan ${training.ageGroup || ''}`}</div>
                      <div className="text-[11px] text-gray-400">
                        {training.ageGroup || '-'} · {training.coach?.name || 'tanpa coach'} · {training.branch?.name || 'semua cabang'}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {mode === 'event' && !editing && (
            <div className="space-y-2">
              {loadingSources ? (
                <div className="text-sm text-gray-400 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Memuat event...</div>
              ) : availableEvents.length === 0 ? (
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                  Tidak ada event/tournament yang belum memiliki jadwal absensi pada tanggal ini.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {availableEvents.map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => { setSourceId(event.id); setEventBranchId('') }}
                      className={`w-full text-left rounded-xl border px-3 py-2 ${sourceId === event.id ? 'border-gold-400 bg-gold-50/60' : 'border-gray-200 hover:border-gold-300'}`}
                    >
                      <div className="text-sm font-semibold text-navy-900">{event.title}</div>
                      <div className="text-[11px] text-gray-400">{typeLabel(event.type)} · {event.location || '-'}</div>
                    </button>
                  ))}
                </div>
              )}
              {selectedEvent && selectedEvent.branchDetails?.length > 0 && (
                <label className="block text-xs font-semibold text-gray-500">
                  Cabang event
                  {(() => {
                    const missing = selectedEvent.branchDetails.filter((branch) => !(selectedEvent.existingBranchIds || []).includes(branch.id))
                    if (missing.length === 0) {
                      return <div className="mt-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">Semua cabang event sudah punya jadwal.</div>
                    }
                    return (
                      <AppSelect
                        value={eventBranchId}
                        onChange={setEventBranchId}
                        placeholder="Pilih cabang"
                        options={missing.map((branch) => ({ value: branch.id, label: `${branch.name} (${branch.code})` }))}
                        className="mt-1 w-full"
                      />
                    )
                  })()}
                </label>
              )}
            </div>
          )}

          {(mode === 'manual' || editing) && (
            <label className="block text-xs font-semibold text-gray-500">
              Nama/Judul sesi
              <input
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
                disabled={editing && linked}
                placeholder="Contoh: Latihan U-12"
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-navy-900 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </label>
          )}

          {(mode === 'manual' || editing) && (
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-semibold text-gray-500">
                Cabang
                {editing && linked ? (
                  <div className="mt-1 rounded-xl bg-gray-50 border border-gray-100 px-3 py-2 text-sm text-gray-600">
                    {initial.branch ? `${initial.branch.name} (${initial.branch.code})` : 'Semua cabang'}
                  </div>
                ) : (
                  <AppSelect
                    value={form.branchId}
                    onChange={(v) => update('branchId', v)}
                    allLabel="Semua cabang"
                    placeholder="Semua cabang"
                    options={branches.map((b) => ({ value: b.id, label: `${b.name} (${b.code})` }))}
                    className="mt-1 w-full"
                  />
                )}
              </label>
              <label className="text-xs font-semibold text-gray-500">
                Coach
                <AppSelect
                  value={form.coachId}
                  onChange={(v) => update('coachId', v)}
                  allLabel="Semua coach"
                  placeholder="Semua coach"
                  options={coaches.map((c) => ({ value: c.id, label: c.name }))}
                  className="mt-1 w-full"
                />
              </label>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            {[
              { key: 'checkInOpen', label: 'Buka absen masuk' },
              { key: 'checkInClose', label: 'Tutup absen masuk' },
              { key: 'checkOutClose', label: 'Batas absen pulang' },
            ].map((field) => (
              <label key={field.key} className="text-xs font-semibold text-gray-500">
                {field.label}
                <input
                  type="time"
                  value={form[field.key]}
                  onChange={(e) => update(field.key, e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-2 py-2 text-sm text-navy-900"
                />
              </label>
            ))}
          </div>
          <p className="text-[11px] text-gray-400 -mt-1">
            Coach hanya bisa absen masuk di antara jam buka–tutup, dan absen pulang maksimal sampai batas yang diisi.
          </p>

          {editing && (
            <label className="block text-xs font-semibold text-gray-500">
              Status
              <AppSelect
                value={form.status}
                onChange={(v) => update('status', v)}
                options={[
                  { value: 'active', label: 'Aktif' },
                  { value: 'cancelled', label: 'Dibatalkan' },
                ]}
                className="mt-1 w-full"
              />
            </label>
          )}

          <label className="block text-xs font-semibold text-gray-500">
            Catatan (opsional)
            <input
              value={form.note}
              onChange={(e) => update('note', e.target.value)}
              placeholder="Contoh: latihan pagi di lapangan A"
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-navy-900"
            />
          </label>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} disabled={saving} className="text-sm font-semibold text-gray-500 px-4 py-2 rounded-2xl hover:bg-gray-100 disabled:opacity-50">
              Batal
            </button>
            <button type="submit" disabled={saving} className="flex items-center gap-1.5 bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold px-4 py-2 rounded-2xl disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Simpan
            </button>
          </div>
        </form>
      </div>
    </ModalPortal>
  )
}

export default function CoachAttendanceManager() {
  const [tab, setTab] = useState('schedule')
  const [branches, setBranches] = useState([])
  const [coaches, setCoaches] = useState([])
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [branchId, setBranchId] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState('')
  const [busy, setBusy] = useState('')
  const [sessions, setSessions] = useState([])
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [sessionsError, setSessionsError] = useState('')
  const [editor, setEditor] = useState(null)

  useEffect(() => {
    Promise.all([api.getMe(), api.getBranches(), api.getCoachAttendanceCoaches()])
      .then(([user, branchList, coachList]) => {
        const mine = (user.branches || []).map((b) => b.branch)
        setBranches(user.role === 'head_coach' ? mine : branchList)
        setCoaches(coachList)
      })
      .catch(() => {})
  }, [])

  function loadRecap() {
    setLoading(true)
    setError('')
    api.getCoachAttendanceRecap(month, year, branchId)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  function loadSessions() {
    setLoadingSessions(true)
    setSessionsError('')
    api.getCoachAttendanceSessions({ month, year, branchId })
      .then(setSessions)
      .catch((err) => setSessionsError(err.message))
      .finally(() => setLoadingSessions(false))
  }

  useEffect(loadRecap, [month, year, branchId])
  useEffect(loadSessions, [month, year, branchId])

  const periodLabel = `${MONTHS[month]} ${year}`
  const totals = data?.totals
  const exportDisabled = !data?.coaches?.length || !!busy

  async function runExport(key, fn) {
    setBusy(key)
    setError('')
    try {
      await fn()
    } catch (err) {
      setError(err.message || 'Gagal membuat berkas')
    } finally {
      setBusy('')
    }
  }

  async function handleGenerate() {
    if (!window.confirm(`Buat jadwal absensi untuk semua sesi latihan & event ${MONTHS[month]} ${year}? Jadwal yang sudah ada tidak diubah.`)) return
    setBusy('generate')
    setSessionsError('')
    try {
      const result = await api.generateCoachAttendanceSessions(month, year)
      window.alert(`${result.created} jadwal baru dibuat, ${result.existing} jadwal sudah ada.`)
      loadSessions()
    } catch (err) {
      setSessionsError(err.message)
    } finally {
      setBusy('')
    }
  }

  async function handleDelete(session) {
    if (!window.confirm(`Hapus jadwal "${session.title}"? Absensi yang sudah tercatat tetap tersimpan tanpa jadwal.`)) return
    setSessionsError('')
    try {
      await api.deleteCoachAttendanceSession(session.id)
      setSessions((prev) => prev.filter((row) => row.id !== session.id))
    } catch (err) {
      setSessionsError(err.message)
    }
  }

  function handleSaved() {
    setEditor(null)
    loadSessions()
  }

  const groupedSessions = useMemo(() => {
    const groups = new Map()
    for (const session of sessions) {
      const key = dateKey(session.date)
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(session)
    }
    return Array.from(groups.entries())
  }, [sessions])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-navy-600 to-navy-800 shadow-md shadow-navy-900/25 flex items-center justify-center shrink-0">
            <CalendarCheck size={18} className="text-gold-300" />
          </div>
          <div>
            <h1 className="font-bold text-navy-900 text-lg">Absensi Coach</h1>
            <p className="text-sm text-gray-400">Jadwal &amp; waktu absen serta rekap kehadiran coach</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <AppSelect
            value={String(month)}
            onChange={(v) => setMonth(Number(v))}
            options={MONTHS.slice(1).map((m, i) => ({ value: String(i + 1), label: m }))}
          />
          <AppSelect
            value={String(year)}
            onChange={(v) => setYear(Number(v))}
            options={[year - 1, year, year + 1].map((y) => ({ value: String(y), label: String(y) }))}
          />
          <AppSelect
            value={branchId}
            onChange={setBranchId}
            allLabel="Semua Cabang"
            placeholder="Semua Cabang"
            className="min-w-[150px]"
            options={branches.map((b) => ({ value: b.id, label: `${b.name} (${b.code})` }))}
          />
          <button
            onClick={() => (tab === 'schedule' ? loadSessions() : loadRecap())}
            className="flex items-center gap-1.5 bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold px-4 py-2 rounded-2xl"
          >
            <RefreshCw size={14} className={(tab === 'schedule' ? loadingSessions : loading) ? 'animate-spin' : ''} /> Muat Ulang
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-gray-100">
        {[
          { key: 'schedule', label: 'Jadwal & Waktu', icon: CalendarClock },
          { key: 'recap', label: 'Rekap Kehadiran', icon: CalendarCheck },
        ].map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-semibold border-b-2 -mb-px ${tab === item.key ? 'border-gold-400 text-navy-900' : 'border-transparent text-gray-400 hover:text-navy-700'}`}
            >
              <Icon size={15} /> {item.label}
            </button>
          )
        })}
      </div>

      {tab === 'schedule' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs text-gray-400 max-w-xl">
              Buat jadwal untuk sebulan ke depan agar coach bisa langsung absen sesuai jadwal. Jam buka/tutup absen bisa diubah kapan saja.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleGenerate}
                disabled={busy === 'generate'}
                className="flex items-center gap-1.5 text-xs font-semibold text-navy-700 border border-gray-200 hover:border-gold-300 rounded-2xl px-3 py-2 disabled:opacity-40"
              >
                {busy === 'generate' ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />} Generate Jadwal Bulan Ini
              </button>
              <button
                onClick={() => setEditor({ mode: 'create' })}
                className="flex items-center gap-1.5 bg-gold-400 hover:bg-gold-500 text-navy-900 text-xs font-semibold px-3 py-2 rounded-2xl"
              >
                <Plus size={13} /> Tambah Jadwal
              </button>
            </div>
          </div>

          {sessionsError && <div className="bg-red-50 border border-red-200 rounded-2xl p-3 text-sm text-red-600">{sessionsError}</div>}

          {loadingSessions && sessions.length === 0 ? (
            <div className="py-12 text-center"><Loader2 size={18} className="animate-spin text-navy-300 inline" /></div>
          ) : groupedSessions.length === 0 ? (
            <div className="glass-card rounded-3xl p-10 text-center space-y-2">
              <CalendarClock size={28} className="text-navy-200 mx-auto" />
              <div className="text-sm font-semibold text-navy-800">Belum ada jadwal absensi untuk {periodLabel}.</div>
              <div className="text-xs text-gray-400">Klik <b>Generate Jadwal Bulan Ini</b> untuk membuat jadwal dari sesi latihan &amp; event, lalu atur jam absennya.</div>
            </div>
          ) : (
            <div className="space-y-5">
              {groupedSessions.map(([key, rows]) => (
                <div key={key} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="text-xs font-bold uppercase tracking-wide text-navy-700">{formatDate(key)}</div>
                    <div className="flex-1 h-px bg-gray-100" />
                    <div className="text-[11px] text-gray-400">{rows.length} sesi</div>
                  </div>
                  {rows.map((session) => (
                    <div key={session.id} className={`glass-card rounded-2xl p-4 flex flex-wrap items-center gap-3 ${session.status === 'cancelled' ? 'opacity-60' : ''}`}>
                      <div className="w-10 h-10 rounded-2xl bg-navy-50 text-navy-700 flex items-center justify-center shrink-0">
                        <TypeIcon type={session.type} size={17} />
                      </div>
                      <div className="flex-1 min-w-[180px]">
                        <div className="font-semibold text-navy-900 text-sm flex items-center gap-2">
                          {session.title}
                          {session.status === 'cancelled' && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600">Dibatalkan</span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-gray-400 flex-wrap">
                          <span>{typeLabel(session.type)}</span>
                          <span className="text-gray-200">·</span>
                          <span>{session.branch ? `${session.branch.name} (${session.branch.code})` : 'Semua cabang'}</span>
                          <span className="text-gray-200">·</span>
                          <span>{session.coach?.name || 'Semua coach'}</span>
                          {session.trainingSession?.ageGroup ? <><span className="text-gray-200">·</span><span>{session.trainingSession.ageGroup}</span></> : null}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-navy-800 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 flex-wrap">
                        <Clock size={13} className="text-gold-500" />
                        Masuk <b>{session.checkInOpen}–{session.checkInClose}</b>
                        <span className="text-gray-300">·</span>
                        Pulang maks. <b>{session.checkOutClose}</b>
                      </div>
                      <div className="text-[11px] text-gray-400 min-w-[52px] text-center">
                        {session._count?.attendances || 0} absen
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditor({ mode: 'edit', session })}
                          title="Edit jam & jadwal"
                          className="p-2 rounded-xl text-navy-600 hover:bg-navy-50"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(session)}
                          title="Hapus jadwal"
                          className="p-2 rounded-xl text-red-500 hover:bg-red-50"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {error && <div className="bg-red-50 border border-red-200 rounded-2xl p-3 text-sm text-red-600">{error}</div>}

          {totals && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <SummaryCard label="Coach aktif" value={totals.coaches} />
              <SummaryCard label="Total hari hadir" value={totals.daysPresent} tone="emerald" />
              <SummaryCard label="Total absen" value={totals.totalRecords} tone="amber" />
              <SummaryCard label="Ditolak" value={totals.rejected} tone="red" />
            </div>
          )}

          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs text-gray-400">
              Absen coach &amp; head coach langsung tercatat tanpa verifikasi. Satu hari tetap dihitung 1 hari honor walau ada beberapa sesi.
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => runExport('xlsx', () => exportCoachRecapToExcel(data?.coaches || [], periodLabel))}
                disabled={exportDisabled}
                className="flex items-center gap-1.5 text-xs font-semibold text-navy-700 border border-gray-200 hover:border-gold-300 rounded-2xl px-3 py-2 disabled:opacity-40"
              >
                <FileSpreadsheet size={13} /> Excel Rekap
              </button>
              <button
                onClick={() => runExport('pdf', () => exportCoachRecapToPDF(data?.coaches || [], periodLabel))}
                disabled={exportDisabled}
                className="flex items-center gap-1.5 text-xs font-semibold text-navy-700 border border-gray-200 hover:border-gold-300 rounded-2xl px-3 py-2 disabled:opacity-40"
              >
                {busy === 'pdf' ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />} PDF Rekap
              </button>
              <button
                onClick={() => runExport('xlsx-detail', () => exportCoachRecapDetailToExcel(data?.coaches || [], periodLabel))}
                disabled={exportDisabled}
                className="flex items-center gap-1.5 text-xs font-semibold text-navy-700 border border-gray-200 hover:border-gold-300 rounded-2xl px-3 py-2 disabled:opacity-40"
              >
                {busy === 'xlsx-detail' ? <Loader2 size={13} className="animate-spin" /> : <FileSpreadsheet size={13} />} Excel Keterangan
              </button>
              <button
                onClick={() => runExport('pdf-detail', () => exportCoachRecapDetailToPDF(data?.coaches || [], periodLabel))}
                disabled={exportDisabled}
                title="Laporan PDF berisi kalimat keterangan absen masuk & keluar tiap coach"
                className="flex items-center gap-1.5 text-xs font-semibold text-navy-700 border border-gray-200 hover:border-gold-300 rounded-2xl px-3 py-2 disabled:opacity-40"
              >
                {busy === 'pdf-detail' ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />} PDF Keterangan
              </button>
            </div>
          </div>

          {loading && !data ? (
            <div className="py-12 text-center"><Loader2 size={18} className="animate-spin text-navy-300 inline" /></div>
          ) : !data?.coaches?.length ? (
            <div className="glass-card rounded-3xl p-10 text-center text-sm text-gray-400">Belum ada absensi coach pada periode ini.</div>
          ) : (
            <div className="space-y-3">
              {data.coaches.map((entry) => {
                const open = expanded === entry.coach.id
                return (
                  <div key={entry.coach.id} className="glass-card rounded-3xl overflow-hidden">
                    <button
                      onClick={() => setExpanded(open ? '' : entry.coach.id)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50"
                    >
                      <div className="w-9 h-9 rounded-full bg-navy-900 text-white text-[11px] font-bold flex items-center justify-center overflow-hidden shrink-0">
                        {entry.coach.photo ? <img src={entry.coach.photo} alt="" className="w-full h-full object-cover" /> : initials(entry.coach.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-navy-900 truncate">{entry.coach.name}</div>
                        <div className="text-[11px] text-gray-400">
                          {entry.coach.role === 'head_coach' ? 'Head Coach' : 'Coach'} · {entry.coach.branches?.map((b) => b.branch.code).join(', ') || 'tanpa cabang'}
                        </div>
                      </div>
                      <div className="hidden sm:flex items-center gap-4 text-center">
                        <Stat label="Hari hadir" value={entry.stats.daysPresent} tone="emerald" />
                        <Stat label="Pending" value={entry.stats.pending} tone="amber" />
                        <Stat label="Ditolak" value={entry.stats.rejected} tone="red" />
                        <Stat label="Tanpa pulang" value={entry.stats.missingCheckout} />
                      </div>
                      <div className="sm:hidden text-right">
                        <div className="font-bold text-navy-900 tabular-nums">{entry.stats.daysPresent}</div>
                        <div className="text-[10px] text-gray-400">hari hadir</div>
                      </div>
                      {open ? <ChevronDown size={16} className="text-gray-300" /> : <ChevronRight size={16} className="text-gray-300" />}
                    </button>

                    {open && (
                      <div className="border-t border-gray-100 overflow-x-auto modal-scroll">
                        <table className="w-full text-sm min-w-[720px]">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="text-left px-4 py-2 text-[11px] font-semibold text-gray-500">Tanggal</th>
                              <th className="text-left px-3 py-2 text-[11px] font-semibold text-gray-500">Sesi</th>
                              <th className="text-left px-3 py-2 text-[11px] font-semibold text-gray-500">Cabang</th>
                              <th className="text-left px-3 py-2 text-[11px] font-semibold text-gray-500">Masuk</th>
                              <th className="text-left px-3 py-2 text-[11px] font-semibold text-gray-500">Pulang</th>
                              <th className="text-left px-3 py-2 text-[11px] font-semibold text-gray-500">Foto</th>
                              <th className="text-left px-3 py-2 text-[11px] font-semibold text-gray-500">Lokasi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {entry.records.map((record) => (
                              <tr key={record.id}>
                                <td className="px-4 py-2.5 whitespace-nowrap text-gray-600">{formatDate(record.date)}</td>
                                <td className="px-3 py-2.5 text-gray-500 text-[11px] max-w-[160px]">
                                  {record.session ? (
                                    <>
                                      <div className="font-semibold text-navy-800 truncate">{record.session.title}</div>
                                      <div className="text-gray-400">{record.session.checkInOpen}–{record.session.checkInClose}</div>
                                    </>
                                  ) : '-'}
                                </td>
                                <td className="px-3 py-2.5 text-gray-500">{record.branch?.code || '-'}</td>
                                <td className="px-3 py-2.5">
                                  <div className="flex items-center gap-2">
                                    <span className="tabular-nums text-gray-600">{formatTime(record.checkInTime)}</span>
                                    <StatusPill status={record.verifyStatus} type="in" />
                                  </div>
                                  {record.rejectReason && <div className="text-[10px] text-red-500 mt-0.5">{record.rejectReason}</div>}
                                </td>
                                <td className="px-3 py-2.5">
                                  {record.checkOutTime ? (
                                    <>
                                      <div className="flex items-center gap-2">
                                        <span className="tabular-nums text-gray-600">{formatTime(record.checkOutTime)}</span>
                                        <StatusPill status={record.checkOutVerifyStatus} type="out" />
                                      </div>
                                      {record.checkOutRejectReason && <div className="text-[10px] text-red-500 mt-0.5">{record.checkOutRejectReason}</div>}
                                    </>
                                  ) : <span className="text-[11px] text-gray-400">belum absen pulang</span>}
                                </td>
                                <td className="px-3 py-2.5">
                                  <div className="flex items-center gap-2">
                                    <PhotoThumb src={record.photo} label="Masuk" />
                                    {record.checkOutPhoto && <PhotoThumb src={record.checkOutPhoto} label="Pulang" />}
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 text-[11px] text-gray-500 max-w-[200px]">
                                  {record.locationName ? (
                                    <span className="inline-flex items-start gap-1"><MapPin size={11} className="mt-0.5 shrink-0" /> {record.locationName}</span>
                                  ) : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          <p className="text-xs text-gray-400">
            Hari hadir dihitung dari absen masuk (beberapa sesi di hari yang sama tetap dihitung 1 hari). Angka ini menjadi dasar honor di menu Payroll.
          </p>
        </div>
      )}

      {editor && (
        <SessionEditor
          initial={editor.session || null}
          coaches={coaches}
          branches={branches}
          onClose={() => setEditor(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
