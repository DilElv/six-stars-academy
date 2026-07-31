import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'

const NAVY = [10, 22, 40]
const GOLD = [212, 168, 67]

const TAB_LABEL = { pemasukan: 'Pemasukan', pengeluaran: 'Pengeluaran' }
const MONTH_LABELS = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

function formatRupiah(n) {
  return 'Rp' + (n || 0).toLocaleString('id-ID')
}

function loadImageAsDataUrl(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null)
    const img = new Image()
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        canvas.getContext('2d').drawImage(img, 0, 0)
        resolve(canvas.toDataURL('image/png'))
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = src
  })
}

function csvEscape(value) {
  const s = String(value ?? '')
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function downloadCsv(rows, filename) {
  const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\r\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

async function addPdfHeader(doc, subtitle) {
  const logoDataUrl = await loadImageAsDataUrl('/logo.png')
  const pageWidth = doc.internal.pageSize.getWidth()

  doc.setFillColor(...NAVY)
  doc.rect(0, 0, pageWidth, 26, 'F')
  doc.setFillColor(...GOLD)
  doc.rect(0, 26, pageWidth, 1.2, 'F')

  if (logoDataUrl) doc.addImage(logoDataUrl, 'PNG', 12, 4, 18, 18)

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('SixStars Academy Indonesia', 36, 13)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...GOLD)
  doc.text(subtitle, 36, 19)

  doc.setTextColor(150, 150, 150)
  doc.setFontSize(8)
  doc.text(`Dicetak ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, pageWidth - 12, 13, { align: 'right' })

  return 34
}

function addPdfFooter(doc) {
  const pageCount = doc.internal.getNumberOfPages()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(7.5)
    doc.setTextColor(160, 160, 160)
    doc.text('SixStars Academy Indonesia — Laporan Keuangan', 12, pageHeight - 8)
    doc.text(`Halaman ${i}/${pageCount}`, pageWidth - 12, pageHeight - 8, { align: 'right' })
  }
}

// ---- Pemasukan / Pengeluaran (ledger item list) ----

function ledgerRows(items, type) {
  return items.map((item) => [
    new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
    item.description,
    type === 'pemasukan' ? (item.source === 'payment' ? 'Otomatis' : 'Manual') : 'Manual',
    item.branch?.code || item.branch?.name || '-',
    formatRupiah(item.amount),
  ])
}

export function exportLedgerToCSV(items, { type, month, year }) {
  const header = ['Tanggal', 'Deskripsi', 'Sumber', 'Cabang', 'Nominal (Rp)']
  const rows = items.map((item) => [
    new Date(item.date).toLocaleDateString('id-ID'),
    item.description,
    type === 'pemasukan' ? (item.source === 'payment' ? 'Otomatis' : 'Manual') : 'Manual',
    item.branch?.code || item.branch?.name || '-',
    item.amount,
  ])
  const total = items.reduce((sum, i) => sum + i.amount, 0)
  downloadCsv([header, ...rows, [], ['', '', '', 'TOTAL', total]], `${type}_${MONTH_LABELS[month]}_${year}.csv`)
}

export async function exportLedgerToPDF(items, { type, month, year, total }) {
  const doc = new jsPDF()
  const startY = await addPdfHeader(doc, `Laporan ${TAB_LABEL[type]} — ${MONTH_LABELS[month]} ${year}`)

  autoTable(doc, {
    startY,
    head: [['Tanggal', 'Deskripsi', 'Sumber', 'Cabang', 'Nominal']],
    body: ledgerRows(items, type),
    styles: { fontSize: 8.5, cellPadding: 3 },
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 249, 251] },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 70 },
      2: { cellWidth: 24 },
      3: { cellWidth: 24 },
      4: { cellWidth: 32, halign: 'right' },
    },
    foot: [['', '', '', 'Total', formatRupiah(total ?? items.reduce((sum, i) => sum + i.amount, 0))]],
    footStyles: { fillColor: type === 'pemasukan' ? [16, 185, 129] : [239, 68, 68], textColor: 255, fontStyle: 'bold', fontSize: 9 },
  })

  addPdfFooter(doc)
  doc.save(`${type}_${MONTH_LABELS[month]}_${year}.pdf`)
}

// ---- Laba & Overview (trend table) ----

export function exportLabaToCSV(trend, { month, year }) {
  const header = ['Bulan', 'Pemasukan (Rp)', 'Pengeluaran (Rp)', 'Laba/Rugi (Rp)']
  const rows = trend.map((t) => [t.label, t.income, t.expense, t.laba])
  downloadCsv([header, ...rows], `laba_overview_${MONTH_LABELS[month]}_${year}.csv`)
}

export async function exportLabaToPDF(trend, summary, { month, year }) {
  const doc = new jsPDF()
  const startY = await addPdfHeader(doc, `Laba & Overview — ${MONTH_LABELS[month]} ${year}`)

  doc.setFontSize(9)
  doc.setTextColor(80, 80, 80)
  doc.setFont('helvetica', 'bold')
  doc.text('Ringkasan Periode Terpilih', 14, startY + 4)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(16, 150, 100)
  doc.text(`Pemasukan: ${formatRupiah(summary.income)}`, 14, startY + 11)
  doc.setTextColor(220, 38, 38)
  doc.text(`Pengeluaran: ${formatRupiah(summary.expense)}`, 80, startY + 11)
  doc.setTextColor(...NAVY)
  doc.setFont('helvetica', 'bold')
  doc.text(`${summary.laba >= 0 ? 'Laba' : 'Rugi'} Bersih: ${formatRupiah(Math.abs(summary.laba))}`, 145, startY + 11)

  autoTable(doc, {
    startY: startY + 18,
    head: [['Bulan', 'Pemasukan', 'Pengeluaran', 'Laba / Rugi']],
    body: trend.map((t) => [
      t.label,
      formatRupiah(t.income),
      formatRupiah(t.expense),
      { content: formatRupiah(t.laba), styles: { textColor: t.laba >= 0 ? [16, 150, 100] : [220, 38, 38] } },
    ]),
    styles: { fontSize: 9, cellPadding: 3.5 },
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 249, 251] },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 46, halign: 'right' },
      2: { cellWidth: 46, halign: 'right' },
      3: { cellWidth: 46, halign: 'right', fontStyle: 'bold' },
    },
  })

  addPdfFooter(doc)
  doc.save(`laba_overview_${MONTH_LABELS[month]}_${year}.pdf`)
}
