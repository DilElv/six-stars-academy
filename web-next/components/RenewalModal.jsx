'use client'

import { useEffect, useState } from 'react'
import { X, RefreshCw } from 'lucide-react'
import * as api from '@/lib/api'
import PaymentMethodModal from '@/components/PaymentMethodModal'
import ModalPortal from '@/components/ui/modal-portal'

function formatRupiah(n) {
  return 'Rp' + (Number(n) || 0).toLocaleString('id-ID')
}

export default function RenewalModal({ onClose, onDone }) {
  const [step, setStep] = useState('package') // package | method
  const [packages, setPackages] = useState([])
  const [selectedPackage, setSelectedPackage] = useState(null)
  const [scholarshipPercent, setScholarshipPercent] = useState(0)

  useEffect(() => {
    api.getMyChild().then((s) => {
      setScholarshipPercent(s?.sppScholarshipPercent || 0)
      // "Anak lama" with a custom-priced package (Package.isCustom) never
      // renews from the standard catalog — only their own quoted package is
      // ever offered, since the whole point is a legacy price that differs
      // from Pengaturan's current rates. `customPackage` (from GET /me) is
      // set even before the quote is paid/activated (Student.package only
      // reflects the currently ACTIVE package).
      if (s?.isOldMember && s?.customPackage) {
        setPackages([s.customPackage])
        return
      }
      // Branch-aware: prices here must match what Pengaturan > Harga Paket
      // has for this student's branch, not the package's raw base price.
      return api.getPackages(s?.branchId).then(setPackages)
    }).catch(() => {})
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
    <ModalPortal>
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
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
          {packages.map((pkg) => {
            const pkgDiscount = scholarshipPercent > 0 ? Math.round(pkg.price * scholarshipPercent / 100) : 0
            return (
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
                {pkgDiscount > 0 ? (
                  <div className="text-xs mt-0.5">
                    <span className="text-gray-400">{pkg.sessionsPerWeek}x/minggu &middot; </span>
                    <span className="text-gray-400 line-through">{formatRupiah(pkg.price)}</span>{' '}
                    <span className="text-emerald-600 font-semibold">{formatRupiah(pkg.price - pkgDiscount)}</span>
                    <div className="text-emerald-600">Beasiswa {scholarshipPercent}% — Hemat {formatRupiah(pkgDiscount)}</div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-400">{pkg.sessionsPerWeek}x/minggu &middot; {formatRupiah(pkg.price)}</div>
                )}
              </button>
            )
          })}
        </div>
        <button
          onClick={() => setStep('method')}
          disabled={!selectedPackage}
          className="w-full flex items-center justify-center gap-2 bg-navy-900 hover:bg-navy-800 text-white font-semibold text-sm px-4 py-3 rounded-2xl disabled:opacity-50"
        >
          Lanjut
        </button>
      </div>
    </div>
    </ModalPortal>
  )
}
