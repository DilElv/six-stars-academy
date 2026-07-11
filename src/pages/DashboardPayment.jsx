import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  CreditCard,
  CheckCircle,
  AlertTriangle,
  Clock,
  Upload,
  X,
  FileText,
  Star,
  CalendarDays,
  Eye,
  Send,
} from 'lucide-react'

const monthColors = {
  paid: { bg: 'bg-green-50 border-green-200', icon: CheckCircle, iconColor: 'text-green-600', label: 'Lunas' },
  unpaid: { bg: 'bg-red-50 border-red-200', icon: AlertTriangle, iconColor: 'text-red-600', label: 'Belum Bayar' },
  oversession: { bg: 'bg-yellow-50 border-yellow-200', icon: Clock, iconColor: 'text-yellow-600', label: 'Over-Sesi' },
}

function PaymentDetailModal({ show, onClose, month }) {
  if (!show || !month) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 z-10 bg-white/90 hover:bg-white rounded-full p-2 shadow-md transition-all">
          <X size={20} className="text-navy-800" />
        </button>

        <div className="bg-gradient-to-br from-navy-800 to-navy-900 p-6 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur rounded-full px-4 py-1.5 mb-3">
            <CalendarDays size={14} className="text-gold-400" />
            <span className="text-white/80 text-xs font-medium">Detail Pembayaran</span>
          </div>
          <h3 className="font-heading font-bold text-white text-lg">{month.month} {month.year}</h3>
          <p className="text-gold-400 text-sm font-medium mt-1">Rp {month.amount?.toLocaleString('id-ID')}</p>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
            <span className="text-xs text-gray-500">Status</span>
            <span className={`text-sm font-semibold flex items-center gap-1.5 ${
              month.status === 'paid' ? 'text-green-600' : month.status === 'unpaid' ? 'text-red-600' : 'text-yellow-600'
            }`}>
              {month.status === 'paid' ? <CheckCircle size={14} /> : month.status === 'unpaid' ? <AlertTriangle size={14} /> : <Clock size={14} />}
              {monthColors[month.status]?.label}
            </span>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
            <span className="text-xs text-gray-500">Jumlah</span>
            <span className="text-sm font-bold text-navy-800">Rp {month.amount?.toLocaleString('id-ID')}</span>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
            <span className="text-xs text-gray-500">Sesi</span>
            <span className="text-sm font-bold text-navy-800">{month.sessions} Sesi</span>
          </div>
          {month.paidAt && (
            <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
              <span className="text-xs text-gray-500">Dibayar Pada</span>
              <span className="text-sm font-bold text-navy-800">{month.paidAt}</span>
            </div>
          )}
        </div>

        <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="w-full bg-navy-800 hover:bg-navy-700 text-white font-semibold py-3 rounded-xl transition-all">
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPayment() {
  const { session } = useOutletContext()
  const [history, setHistory] = useState(session?.child?.paymentHistory || [])
  const [childName, setChildName] = useState(session?.child?.name || '')
  const [activePackage, setActivePackage] = useState(session?.child?.spp?.package || '8 Sesi / Bulan')
  const [selectedMonth, setSelectedMonth] = useState(null)
  const [uploadedFiles, setUploadedFiles] = useState({})
  const [uploading, setUploading] = useState({})
  const [flashMsg, setFlashMsg] = useState('')
  function flash(msg) { setFlashMsg(msg); setTimeout(() => setFlashMsg(''), 3000) }  useEffect(() => {
    if (session?.id) {
      import('../api').then((api) => {
        api.getPayments().then((payments) => {
          if (payments.length > 0) {
            setHistory(payments.map((p) => ({
              id: p.id,
              studentId: p.student_id,
              month: p.month,
              year: p.year,
              amount: p.amount,
              status: p.status,
              proofUrl: p.proof_url,
              sessions: 8,
              paidAt: p.paid_at,
            })))
          }
        }).catch(() => {})
      })
    }
  }, [session])

  const totalPaid = history.filter((h) => h.status === 'paid').length
  const totalMonths = history.length

  function handleFileUpload(monthKey, file) {
    setUploadedFiles((prev) => ({ ...prev, [monthKey]: file }))
  }

  function removeFile(monthKey) {
    setUploadedFiles((prev) => {
      const copy = { ...prev }
      delete copy[monthKey]
      return copy
    })
  }

  async function handleSubmitProof(monthKey) {
    const file = uploadedFiles[monthKey]
    if (!file) return
    const payment = history.find((h) => `${h.month}-${h.year}` === monthKey)
    if (!payment) return
    setUploading((prev) => ({ ...prev, [monthKey]: true }))
    try {
      const { url } = await api.uploadFile(file)
      await api.uploadProof(payment.id, url)
      setHistory((prev) => prev.map((h) => h.id === payment.id ? { ...h, proofUrl: url } : h))
      setUploadedFiles((prev) => { const c = { ...prev }; delete c[monthKey]; return c })
      flash('Bukti pembayaran berhasil dikirim!')
    } catch (err) {
      flash('Gagal mengirim bukti: ' + err.message)
    }
    setUploading((prev) => ({ ...prev, [monthKey]: false }))
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      {flashMsg && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-6 text-sm text-emerald-700">{flashMsg}</div>
      )}

      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy-800 via-navy-900 to-navy-950 shadow-xl mb-6">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-gold-400/10 rounded-full blur-3xl" />
        </div>
        <div className="relative p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur rounded-full px-3 py-1 mb-2">
                <Star size={12} className="text-gold-400" />
                <span className="text-white/70 text-xs font-medium">Riwayat Pembayaran</span>
              </div>
              <h1 className="font-heading text-2xl font-bold text-white">{childName}</h1>
              <p className="text-white/60 text-sm">{activePackage}</p>
            </div>
            <div className="bg-white/10 backdrop-blur border border-white/10 rounded-2xl px-5 py-3 text-center sm:text-right">
              <p className="text-xs text-white/60">Lunas</p>
              <p className="text-2xl font-bold font-heading text-gold-400">{totalPaid}/{totalMonths} <span className="text-sm text-white/50">bulan</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* Daftar Bulanan */}
      <div className="space-y-3">
        {history.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-10 text-center">
            <FileText size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">Belum ada riwayat pembayaran</p>
          </div>
        ) : (
          [...history].reverse().map((month) => {
            const color = monthColors[month.status] || monthColors.unpaid
            const monthKey = `${month.month}-${month.year}`

            return (
              <div key={monthKey} className={`bg-white rounded-2xl shadow-lg border transition-all duration-200 hover:shadow-xl ${color.bg}`}>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`${color.bg.replace('border', '')} rounded-lg p-1.5`}>
                        <color.icon size={18} className={color.iconColor} />
                      </div>
                      <div>
                        <p className="font-semibold text-navy-900 text-sm">{month.month} {month.year}</p>
                        <p className="text-xs text-gray-400">Rp {month.amount?.toLocaleString('id-ID')} &middot; {month.sessions} sesi</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedMonth(month)}
                        className="text-gray-400 hover:text-navy-700 p-1.5 rounded-lg hover:bg-gray-100 transition-all"
                      >
                        <Eye size={16} />
                      </button>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        month.status === 'paid' ? 'bg-green-100 text-green-700'
                        : month.status === 'unpaid' ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {color.label}
                      </span>
                    </div>
                  </div>

                  {month.status !== 'paid' && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      {month.proofUrl ? (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2">
                          <CheckCircle size={16} className="text-emerald-600" />
                          <span className="text-sm text-emerald-700">Bukti sudah dikirim</span>
                        </div>
                      ) : uploadedFiles[monthKey] ? (
                        <div className="space-y-2">
                          <div className="bg-navy-50 border border-navy-200 rounded-xl p-3 flex items-center justify-between">
                            <div className="flex items-center gap-2 truncate">
                              <Upload size={16} className="text-navy-500 shrink-0" />
                              <span className="text-sm text-navy-700 truncate">{uploadedFiles[monthKey].name}</span>
                            </div>
                            <button onClick={() => removeFile(monthKey)} className="text-red-400 hover:text-red-600 shrink-0 ml-2">
                              <X size={16} />
                            </button>
                          </div>
                          <button
                            onClick={() => handleSubmitProof(monthKey)}
                            disabled={uploading[monthKey]}
                            className="w-full bg-navy-800 hover:bg-navy-700 disabled:bg-gray-300 text-white font-semibold text-sm py-2.5 rounded-xl transition-all flex items-center justify-center gap-2"
                          >
                            <Send size={14} />
                            {uploading[monthKey] ? 'Mengirim...' : 'Kirim Bukti'}
                          </button>
                        </div>
                      ) : (
                        <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl py-3 px-4 cursor-pointer hover:border-navy-400 hover:bg-navy-50 transition-all">
                          <Upload size={16} className="text-gray-400" />
                          <span className="text-sm text-gray-500">Unggah Bukti Transfer</span>
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) handleFileUpload(monthKey, file)
                            }}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Ringkasan */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 mt-6">
        <div className="flex items-center gap-2 mb-3">
          <CreditCard className="text-navy-700" size={18} />
          <h3 className="font-heading font-bold text-navy-900 text-sm">Ringkasan Pembayaran</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-400">Paket</p>
            <p className="text-sm font-bold text-navy-800">{activePackage}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-400">Tagihan/Bulan</p>
            <p className="text-sm font-bold text-navy-800">Rp 350.000</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-400">Lunas</p>
            <p className="text-sm font-bold text-green-600">{totalPaid} Bulan</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-400">Belum Bayar</p>
            <p className="text-sm font-bold text-red-600">{totalMonths - totalPaid} Bulan</p>
          </div>
        </div>
      </div>

      <PaymentDetailModal show={!!selectedMonth} onClose={() => setSelectedMonth(null)} month={selectedMonth} />
    </div>
  )
}
