'use client'

import { useEffect, useState } from 'react'
import { X, RefreshCw, ChevronLeft } from 'lucide-react'
import * as api from '@/lib/api'
import PaymentMethodModal from '@/components/PaymentMethodModal'

function formatRupiah(n) {
  return 'Rp' + (Number(n) || 0).toLocaleString('id-ID')
}

export default function RenewalModal({ onClose, onDone }) {
  const [step, setStep] = useState('package') // package | method
  const [packages, setPackages] = useState([])
  const [selectedPackage, setSelectedPackage] = useState(null)
  const [scholarshipPercent, setScholarshipPercent] = useState(0)

  useEffect(() => {
    api.getPackages().then(setPackages).catch(() => {})
    api.getMyChild().then((s) => setScholarshipPercent(s?.sppScholarshipPercent || 0)).catch(() => {})
  }, [])

  const discountAmount = selectedPackage ? Math.round(selectedPackage.price * scholarshipPercent / 100) : 0
  const finalAmount = Math.max(0, (selectedPackage?.price || 0) - discountAmount)

  if (step === 'method' && selectedPackage) {
    return (
      <PaymentMethodModal
        title={`Perpanjang Paket: ${selectedPackage.name}`}
        amount={finalAmount}
        note={scholarshipPercent > 0 ? `Beasiswa SPP ${scholarshipPercent}% — Hemat ${formatRupiah(discountAmount)}` : null}
        onConfirm={(paymentMethod) => api.createRenewalPayment({ packageId: selectedPackage.id, paymentMethod })}
        onClose={() => setStep('package')}
        onDone={(result) => onDone?.(result)}
        pollStatus={async (confirmResult) => {
          const paymentId = confirmResult?.payment?.id
          if (!paymentId) return { status: 'pending' }
          return api.syncPayment(paymentId)
        }}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full max-h-[85vh] overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <RefreshCw size={16} className="text-navy-700" />
            <h3 className="font-bold text-navy-900 text-sm">Perpanjang Paket</h3>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <label className="block text-xs font-semibold text-gray-500 mb-2">Pilih Paket Baru</label>
        <div className="space-y-2 mb-5 max-h-72 overflow-y-auto pr-1">
          {packages.length === 0 && <div className="text-sm text-gray-400 py-4 text-center">Memuat paket...</div>}
          {packages.map((pkg) => (
            <button
              key={pkg.id}
              onClick={() => setSelectedPackage(pkg)}
              className={`w-full text-left px-4 py-3 rounded-2xl border transition-colors duration-150 ${
                selectedPackage?.id === pkg.id
                  ? 'border-gold-400 bg-gold-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-semibold text-navy-900 text-sm">{pkg.name}</div>
              <div className="text-xs text-gray-400">{pkg.sessionsPerWeek}x/minggu &middot; {formatRupiah(pkg.price)}</div>
            </button>
          ))}
        </div>
        {selectedPackage && scholarshipPercent > 0 && (
          <div className="text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg mb-4">
            Beasiswa SPP {scholarshipPercent}% — Hemat {formatRupiah(discountAmount)}
          </div>
        )}
        <button
          onClick={() => setStep('method')}
          disabled={!selectedPackage}
          className="w-full flex items-center justify-center gap-2 bg-navy-900 hover:bg-navy-800 text-white font-semibold text-sm px-4 py-3 rounded-2xl disabled:opacity-50"
        >
          Lanjut
        </button>
      </div>
    </div>
  )
}
