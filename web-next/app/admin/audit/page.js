'use client'

import { useEffect, useState } from 'react'
import { ShieldAlert, RefreshCw, Loader2, AlertTriangle, Info, History, Wallet, Clock, CheckCircle2, XCircle } from 'lucide-react'
import * as api from '@/lib/api'

const ANOMALY_LABEL = {
  stuck_pending: 'Pending macet',
  success_no_effects: 'Lunas tanpa efek',
  cart_total_mismatch: 'Total tidak cocok',
  missing_gateway_ref: 'Tanpa referensi',
  duplicate_pending: 'Kemungkinan ganda',
}

const STATUS_STYLE = {
  success: 'bg-emerald-50 text-emerald-700',
  pending: 'bg-amber-50 text-amber-700',
  failed: 'bg-red-50 text-red-600',
}

function formatRupiah(n) {
  return 'Rp' + (Number(n) || 0).toLocaleString('id-ID')
}

function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

export default function AdminAuditPage() {
  const [data, setData] = useState(null)
  const [days, setDays] = useState(90)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState('')
  const [error, setError] = useState('')
  const [flash, setFlash] = useState('')

  function load() {
    setLoading(true)
    api.getPaymentAudit(days)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(load, [days])

  async function handleSync(paymentId) {
    setSyncing(paymentId)
    setError('')
    try {
      const res = await api.syncPaymentAdmin(paymentId)
      setFlash(res.status === 'success' ? 'Pembayaran kini lunas' : `Status gateway: ${res.status}`)
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSyncing('')
    }
  }

  const summary = data?.summary

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-navy-600 to-navy-800 shadow-md shadow-navy-900/25 flex items-center justify-center shrink-0">
            <ShieldAlert size={18} className="text-gold-300" />
          </div>
          <div>
            <h1 className="font-bold text-navy-900 text-lg">Audit Pembayaran</h1>
            <p className="text-sm text-gray-400">Deteksi anomali transaksi & jejak perubahan pembayaran</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
          >
            <option value={30}>30 hari</option>
            <option value={90}>90 hari</option>
            <option value={180}>180 hari</option>
            <option value={365}>365 hari</option>
          </select>
          <button onClick={load} className="flex items-center gap-1.5 bg-navy-900 hover:bg-navy-800 text-white text-sm font-semibold px-4 py-2 rounded-2xl">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Muat Ulang
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-2xl p-3 text-sm text-red-600">{error}</div>}
      {flash && <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-sm text-emerald-700">{flash}</div>}

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <SummaryCard icon={Wallet} label="Transaksi diperiksa" value={summary.scanned} tone="navy" />
          <SummaryCard icon={Clock} label="Pending" value={summary.pending} tone="amber" />
          <SummaryCard icon={CheckCircle2} label="Lunas" value={summary.success} tone="emerald" />
          <SummaryCard icon={XCircle} label="Gagal" value={summary.failed} tone="red" />
          <SummaryCard icon={AlertTriangle} label="Anomali" value={summary.anomalies} tone={summary.warnings > 0 ? 'red' : 'emerald'} />
        </div>
      )}

      <div className="glass-card rounded-3xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={15} className="text-amber-500" />
          <h2 className="font-semibold text-navy-900 text-sm">Anomali</h2>
          {data && <span className="text-xs text-gray-400">· {data.anomalies.length} temuan</span>}
        </div>

        {!data ? (
          <div className="py-8 text-center"><Loader2 size={18} className="animate-spin text-navy-300 mx-auto" /></div>
        ) : data.anomalies.length === 0 ? (
          <div className="text-sm text-gray-400 bg-emerald-50/60 border border-emerald-100 rounded-2xl px-4 py-4 text-center">
            Tidak ada anomali terdeteksi. 🎉
          </div>
        ) : (
          <div className="space-y-2">
            {data.anomalies.map((a) => (
              <div key={a.id} className="flex items-start gap-3 rounded-2xl border border-gray-100 px-4 py-3">
                <div className={`mt-0.5 shrink-0 ${a.severity === 'warning' ? 'text-amber-500' : 'text-blue-400'}`}>
                  {a.severity === 'warning' ? <AlertTriangle size={15} /> : <Info size={15} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-navy-50 text-navy-700">
                      {ANOMALY_LABEL[a.type] || a.type}
                    </span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[a.status] || 'bg-gray-100 text-gray-600'}`}>
                      {a.status}
                    </span>
                    <span className="text-sm font-semibold text-navy-900">{a.title}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{a.detail}</p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    {a.studentName} · {formatRupiah(a.amount)} · {formatDateTime(a.createdAt)}
                  </p>
                </div>
                {(a.type === 'stuck_pending' || a.type === 'missing_gateway_ref') && (
                  <button
                    onClick={() => handleSync(a.paymentId)}
                    disabled={syncing === a.paymentId}
                    className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-navy-700 border border-gray-200 hover:border-gold-300 rounded-xl px-3 py-2 disabled:opacity-50"
                  >
                    {syncing === a.paymentId ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Sinkron
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass-card rounded-3xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <History size={15} className="text-gold-500" />
          <h2 className="font-semibold text-navy-900 text-sm">Jejak Perubahan</h2>
          {data && <span className="text-xs text-gray-400">· {data.logs.length} terbaru</span>}
        </div>

        {!data ? null : data.logs.length === 0 ? (
          <div className="text-sm text-gray-400 bg-gray-50 rounded-2xl px-4 py-4 text-center">Belum ada perubahan tercatat.</div>
        ) : (
          <div className="overflow-x-auto modal-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400">
                  <th className="py-2 pr-3 font-semibold">Waktu</th>
                  <th className="py-2 pr-3 font-semibold">Aksi</th>
                  <th className="py-2 pr-3 font-semibold">Pelaku</th>
                  <th className="py-2 pr-3 font-semibold">Anak</th>
                  <th className="py-2 pr-3 font-semibold">Nominal</th>
                  <th className="py-2 pr-3 font-semibold">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {data.logs.map((log) => (
                  <tr key={log.id} className="border-t border-gray-100 align-top">
                    <td className="py-2 pr-3 text-gray-500 whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                    <td className="py-2 pr-3">
                      <span className="text-xs font-semibold text-navy-800">{log.actionLabel}</span>
                    </td>
                    <td className="py-2 pr-3 text-gray-600">{log.actorName}</td>
                    <td className="py-2 pr-3 text-gray-600">{log.studentName}</td>
                    <td className="py-2 pr-3 text-gray-600 tabular-nums whitespace-nowrap">{log.amount != null ? formatRupiah(log.amount) : '—'}</td>
                    <td className="py-2 pr-3 text-gray-500 max-w-xs">{log.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function SummaryCard({ icon: Icon, label, value, tone }) {
  const tones = {
    navy: 'text-navy-700 bg-navy-50',
    amber: 'text-amber-600 bg-amber-50',
    emerald: 'text-emerald-600 bg-emerald-50',
    red: 'text-red-600 bg-red-50',
  }
  return (
    <div className="glass-card rounded-2xl p-4">
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${tones[tone]}`}>
        <Icon size={15} />
      </div>
      <div className="mt-2 text-2xl font-bold text-navy-900 tabular-nums">{value}</div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  )
}
