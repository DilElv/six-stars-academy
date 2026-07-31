'use client'

import { useEffect, useState } from 'react'
import { Trophy, Calendar, MapPin, Wallet, Users, X, Check, Loader2, CreditCard } from 'lucide-react'
import * as api from '@/lib/api'
import PaymentMethodModal from '@/components/PaymentMethodModal'

function formatRupiah(n) {
  return 'Rp' + (n || 0).toLocaleString('id-ID')
}

export default function ParentEventPage() {
  const [events, setEvents] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showPayment, setShowPayment] = useState(false)

  function load() {
    api.getMyEvents().then(setEvents).finally(() => setLoading(false))
  }

  useEffect(load, [])

  if (loading) return <Loader2 className="w-6 h-6 animate-spin mx-auto mt-10 text-gold-500" />

  return (
    <div className="space-y-6">
      <h1 className="font-bold text-navy-900 text-lg">Event Saya</h1>

      {events.length === 0 ? (
        <div className="glass-card rounded-3xl p-10 text-center text-sm text-gray-400">Belum ada event.</div>
      ) : (
        <div className="space-y-3">
          {events.map((p) => (
            <div
              key={p.id}
              onClick={() => setSelected(p)}
              className="glass-card rounded-3xl p-5 cursor-pointer hover:border-gold-300/50 transition-all duration-200 flex items-center justify-between gap-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-navy-900">{p.event.title}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${p.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                    {p.paymentStatus === 'paid' ? 'Lunas' : 'Belum bayar'}
                  </span>
                </div>
                <div className="text-xs text-gray-400 flex flex-wrap gap-x-3 gap-y-1">
                  <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(p.event.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  <span>{p.event.type}</span>
                  {p.event.location && <span className="flex items-center gap-1"><MapPin size={12} /> {p.event.location}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-3xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-navy-900">{selected.event.title}</h2>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${selected.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                  {selected.paymentStatus === 'paid' ? 'Lunas' : 'Belum bayar'}
                </span>
              </div>
              <button onClick={() => setSelected(null)} className="p-1 text-gray-400 hover:text-navy-700"><X size={18} /></button>
            </div>

            <div className="space-y-2 text-sm mb-4">
              <Info icon={Calendar} label="Tanggal" value={new Date(selected.event.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} />
              {selected.event.registrationDeadline && <Info icon={Calendar} label="Deadline" value={new Date(selected.event.registrationDeadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} />}
              <Info icon={Trophy} label="Tipe" value={selected.event.type} />
              {selected.event.ageGroup && (
                <div className="flex items-center gap-2 text-sm">
                  <Users size={14} className="text-gray-400 shrink-0" />
                  <span className="text-gray-500">Kelompok Umur:</span>
                  {selected.event.ageGroup.split(',').map((ag) => (
                    <span key={ag} className="text-xs font-semibold bg-gold-50 text-navy-900 border border-gold-200 px-2 py-0.5 rounded-full">{ag.trim()}</span>
                  ))}
                </div>
              )}
              {selected.event.location && <Info icon={MapPin} label="Lokasi" value={selected.event.location} />}
              {selected.event.fee > 0 && <Info icon={Wallet} label="Biaya" value={formatRupiah(selected.event.fee)} />}
            </div>

            {selected.event.description && <p className="text-sm text-gray-500 mb-4">{selected.event.description}</p>}

            <div className="pt-3 border-t border-gray-100 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Status Pembayaran:</span>
                {selected.paymentStatus === 'paid' ? (
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600"><Check size={12} /> Lunas</span>
                ) : (
                  <span className="text-xs text-amber-600 font-semibold">Belum dibayar</span>
                )}
              </div>
              {selected.paymentStatus !== 'paid' && selected.event.fee > 0 && (
                <button
                  onClick={() => setShowPayment(true)}
                  className="w-full flex items-center justify-center gap-2 bg-gold-400 hover:bg-gold-500 text-navy-900 font-semibold text-sm px-4 py-2.5 rounded-2xl"
                >
                  <CreditCard size={15} /> Bayar Sekarang
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showPayment && selected && (
        <PaymentMethodModal
          title={`Bayar Event: ${selected.event.title}`}
          amount={selected.event.fee}
          onConfirm={(paymentMethod) => api.createEventPayment({ eventParticipantId: selected.id, paymentMethod })}
          onClose={() => setShowPayment(false)}
          onDone={() => { setShowPayment(false); setSelected(null); load() }}
        />
      )}
    </div>
  )
}

function Info({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {Icon && <Icon size={14} className="text-gray-400 shrink-0" />}
      <span className="text-gray-500">{label}:</span>
      <span className="font-medium text-navy-900">{value || '-'}</span>
    </div>
  )
}
