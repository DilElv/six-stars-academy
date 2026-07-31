'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Calendar, Clock, MapPin, Users, Wallet, Check, Loader2 } from 'lucide-react'
import * as api from '@/lib/api'

function formatRupiah(n) {
  return 'Rp' + (n || 0).toLocaleString('id-ID')
}

export default function AdminEventDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [event, setEvent] = useState(null)
  const [error, setError] = useState('')

  const [payingParticipant, setPayingParticipant] = useState(null)
  const [payMethod, setPayMethod] = useState('cash')
  const [payingStatus, setPayingStatus] = useState(false)

  function load() {
    api.getEvent(id).then(setEvent).catch((err) => setError(err.message))
  }

  useEffect(() => { load() }, [id])

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
      <button onClick={() => router.push('/admin/event')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-navy-700">
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
          <InfoRow icon={Users} label="Dibuat oleh" value={event.createdBy?.name} />
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
                  <div className="text-xs text-gray-400">{p.student.studentId} · {p.student.ageGroup} · {p.student.parentName}</div>
                  {p.payment?.paymentMethod && <div className="text-[11px] text-gray-400 mt-0.5">via {p.payment.paymentMethod}</div>}
                </div>
                {p.paymentStatus === 'paid' ? (
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1"><Check size={11} /> Lunas</span>
                ) : (
                  <button
                    onClick={() => { setPayingParticipant(p); setPayMethod('cash') }}
                    className="flex items-center gap-1 bg-gold-400 hover:bg-gold-500 text-navy-900 text-xs font-semibold px-3 py-1.5 rounded-xl"
                  >
                    <Check size={12} /> Konfirmasi Bayar
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
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
