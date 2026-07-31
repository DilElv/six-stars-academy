'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Calendar, Clock, MapPin, Users, Wallet, Plus, Trash2, Loader2, Search } from 'lucide-react'
import * as api from '@/lib/api'
import { AGE_GROUPS } from '@/lib/ageGroups'
import { AppSelect } from '@/components/ui/app-select'
import { PAYMENT_STATUS_BADGE } from '@/lib/sessionInfo'

function formatRupiah(n) {
  return 'Rp' + (n || 0).toLocaleString('id-ID')
}

export default function HeadCoachEventDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [event, setEvent] = useState(null)
  const [error, setError] = useState('')
  const [allBranches, setAllBranches] = useState([])

  const [students, setStudents] = useState([])
  const [branchFilter, setBranchFilter] = useState('')
  const [ageFilter, setAgeFilter] = useState('')
  const [search, setSearch] = useState('')
  const [addingId, setAddingId] = useState('')

  const [payingParticipant, setPayingParticipant] = useState(null)
  const [payMethod, setPayMethod] = useState('cash')
  const [payingStatus, setPayingStatus] = useState(false)

  function load() {
    api.getEvent(id).then(setEvent).catch((err) => setError(err.message))
  }

  useEffect(() => { load() }, [id])
  useEffect(() => { api.getBranches().then(setAllBranches) }, [])

  const eventBranchIds = useMemo(() => event?.branches?.map((b) => b.branchId) || [], [event])

  useEffect(() => {
    if (!event) return
    api.getStudents(ageFilter || undefined, branchFilter || undefined).then(setStudents)
  }, [event, ageFilter, branchFilter])

  const alreadyIn = new Set(event?.participants?.map((p) => p.student.id) || [])
  const filteredStudents = students.filter((s) => {
    if (alreadyIn.has(s.id)) return false
    if (eventBranchIds.length > 0 && !eventBranchIds.includes(s.branchId)) return false
    if (search.trim() && !s.fullName.toLowerCase().includes(search.trim().toLowerCase())) return false
    return true
  })

  async function handleAdd(studentId) {
    setAddingId(studentId)
    setError('')
    try {
      await api.addEventParticipant(id, studentId)
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setAddingId('')
    }
  }

  async function handleRemove(studentId) {
    if (!confirm('Hapus peserta ini?')) return
    await api.removeEventParticipant(id, studentId)
    load()
  }

  async function handleTogglePaid(participant) {
    if (participant.paymentStatus === 'paid') {
      await api.updateEventParticipant(id, participant.student.id, { paymentStatus: 'unpaid' })
      load()
    } else {
      setPayingParticipant(participant)
      setPayMethod('cash')
    }
  }

  async function confirmManualPayment() {
    if (!payingParticipant) return
    setPayingStatus(true)
    setError('')
    try {
      await api.updateEventParticipant(id, payingParticipant.student.id, { paymentStatus: 'paid', paymentMethod: payMethod })
      setPayingParticipant(null)
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setPayingStatus(false)
    }
  }

  if (!event) return error ? <p className="text-sm text-red-500">{error}</p> : null

  return (
    <div className="space-y-6">
      <button onClick={() => router.push('/head-coach/event')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-navy-700">
        <ArrowLeft size={15} /> Kembali
      </button>

      <div className="glass-card rounded-3xl p-5 space-y-3">
        <h1 className="font-bold text-navy-900 text-lg">{event.title}</h1>
        <div className="grid sm:grid-cols-2 gap-2 text-sm">
          <InfoRow icon={Calendar} label="Tanggal" value={new Date(event.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} />
          {event.registrationDeadline && <InfoRow icon={Clock} label="Deadline" value={new Date(event.registrationDeadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} />}
          {event.location && <InfoRow icon={MapPin} label="Lokasi" value={event.location} />}
          {event.fee > 0 && <InfoRow icon={Wallet} label="Biaya" value={formatRupiah(event.fee)} />}
          <InfoRow icon={Users} label="Cabang" value={event.branches?.length ? event.branches.map((b) => b.branch.name).join(', ') : 'Semua Cabang'} />
        </div>
        {event.description && <p className="text-sm text-gray-500">{event.description}</p>}
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}

      <div className="glass-card rounded-3xl p-5 space-y-3">
        <h2 className="font-semibold text-navy-900 text-sm flex items-center gap-1.5"><Users size={15} /> Peserta ({event.participants?.length || 0})</h2>
        {event.participants?.length === 0 ? (
          <div className="text-sm text-gray-400 text-center py-4">Belum ada peserta.</div>
        ) : (
          <div className="space-y-2">
            {event.participants.map((p) => (
              <div key={p.id} className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-2.5">
                <div>
                  <div className="text-sm font-semibold text-navy-900">{p.student.fullName}</div>
                  <div className="text-xs text-gray-400">{p.student.studentId} · {p.student.ageGroup} · {p.student.position}</div>
                  {p.payment?.paymentMethod && <div className="text-[11px] text-gray-400 mt-0.5">via {p.payment.paymentMethod}</div>}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTogglePaid(p)}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${p.paymentStatus === 'paid' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-amber-700 bg-amber-50 border-amber-200'}`}
                  >
                    {p.paymentStatus === 'paid' ? 'Lunas' : 'Belum Lunas'}
                  </button>
                  <button onClick={() => handleRemove(p.student.id)} className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass-card rounded-3xl p-5 space-y-3">
        <h2 className="font-semibold text-navy-900 text-sm flex items-center gap-1.5"><Plus size={15} /> Tambah Siswa</h2>
        <div className="grid sm:grid-cols-3 gap-2">
          <div className="relative sm:col-span-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama siswa..."
              className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm"
            />
          </div>
          <AppSelect
            value={branchFilter}
            onChange={setBranchFilter}
            allLabel="Semua Cabang"
            placeholder="Semua Cabang"
            options={(event.branches?.length ? event.branches.map((b) => b.branch) : allBranches).map((b) => ({ value: b.id, label: `${b.name} (${b.code})` }))}
          />
          <AppSelect
            value={ageFilter}
            onChange={setAgeFilter}
            allLabel="Semua Umur"
            placeholder="Semua Umur"
            options={AGE_GROUPS.map((ag) => ({ value: ag, label: ag }))}
          />
        </div>
        <div className="space-y-2">
          {filteredStudents.map((s) => {
            const payStatus = s.payments?.[0]?.status
            const badge = payStatus ? PAYMENT_STATUS_BADGE[payStatus] : null
            return (
              <div key={s.id} className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-2.5">
                <div>
                  <div className="text-sm font-semibold text-navy-900">{s.fullName}</div>
                  <div className="text-xs text-gray-400 flex items-center gap-1.5 flex-wrap">
                    {s.studentId} · {s.ageGroup} · {s.branch?.code || '-'}
                    {badge && <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${badge.color}`}>{badge.label}</span>}
                  </div>
                </div>
                <button
                  onClick={() => handleAdd(s.id)}
                  disabled={addingId === s.id}
                  className="flex items-center gap-1 bg-gold-400 hover:bg-gold-500 text-navy-900 text-xs font-semibold px-3 py-1.5 rounded-xl disabled:opacity-50"
                >
                  {addingId === s.id ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Tambah
                </button>
              </div>
            )
          })}
          {filteredStudents.length === 0 && <div className="text-sm text-gray-400 text-center py-4">Tidak ada siswa yang cocok.</div>}
        </div>
      </div>

      {payingParticipant && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setPayingParticipant(null)}>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-bold text-navy-900">Konfirmasi Pembayaran</h3>
              <p className="text-xs text-gray-400 mt-0.5">{payingParticipant.student.fullName}</p>
            </div>
            <div className="p-5 space-y-3">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Metode Pembayaran</label>
              <div className="grid grid-cols-2 gap-2">
                {[{ value: 'cash', label: 'Cash' }, { value: 'qris', label: 'QRIS' }].map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setPayMethod(m.value)}
                    className={`px-3 py-2.5 rounded-2xl text-sm font-semibold border ${payMethod === m.value ? 'bg-navy-900 text-white border-navy-900' : 'bg-gray-50 text-gray-600 border-gray-200'}`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <button
                onClick={confirmManualPayment}
                disabled={payingStatus}
                className="w-full flex items-center justify-center gap-2 bg-navy-900 hover:bg-navy-800 text-white font-semibold py-2.5 rounded-2xl disabled:opacity-50"
              >
                {payingStatus && <Loader2 size={14} className="animate-spin" />} Tandai Lunas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {Icon && <Icon size={14} className="text-gray-400 shrink-0" />}
      <span className="text-gray-500">{label}:</span>
      <span className="font-medium text-navy-900">{value || '-'}</span>
    </div>
  )
}
