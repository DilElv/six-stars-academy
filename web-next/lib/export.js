import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'

function formatRupiah(n) {
  return 'Rp' + (n || 0).toLocaleString('id-ID')
}

export function exportPaymentsToExcel(payments) {
  const data = payments.map((p) => ({
    'Nama Siswa': p.student?.fullName || '',
    'ID Siswa': p.student?.studentId || '',
    'Nama Orang Tua': p.student?.parentName || '',
    Paket: p.package?.name || '-',
    Tagihan: formatRupiah(p.amount),
    'Biaya Daftar': formatRupiah(p.registrationFee),
    Total: formatRupiah(p.totalAmount),
    Status: p.status === 'success' ? 'Lunas' : p.status === 'pending' ? 'Menunggu Pembayaran' : 'Gagal',
    Tanggal: new Date(p.paidAt || p.createdAt).toLocaleDateString('id-ID'),
  }))

  const ws = XLSX.utils.json_to_sheet(data)
  ws['!cols'] = [
    { wch: 22 }, { wch: 10 }, { wch: 20 }, { wch: 18 },
    { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 20 }, { wch: 14 },
  ]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Pembayaran')
  XLSX.writeFile(wb, `pembayaran_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

export function exportPaymentsToPDF(payments) {
  const doc = new jsPDF()
  doc.setFontSize(14)
  doc.text('Laporan Pembayaran', 14, 20)
  doc.setFontSize(9)
  doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, 14, 27)

  const rows = payments.map((p) => [
    p.student?.fullName || '',
    p.student?.studentId || '',
    p.student?.parentName || '',
    p.package?.name || '-',
    formatRupiah(p.totalAmount),
    p.status === 'success' ? 'Lunas' : p.status === 'pending' ? 'Pending' : 'Gagal',
    new Date(p.paidAt || p.createdAt).toLocaleDateString('id-ID'),
  ])

  autoTable(doc, {
    startY: 32,
    head: [['Nama Siswa', 'ID', 'Orang Tua', 'Paket', 'Total', 'Status', 'Tanggal']],
    body: rows,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 38 },
      1: { cellWidth: 16 },
      2: { cellWidth: 30 },
      3: { cellWidth: 28 },
      4: { cellWidth: 24 },
      5: { cellWidth: 22 },
      6: { cellWidth: 22 },
    },
  })

  doc.save(`pembayaran_${new Date().toISOString().slice(0, 10)}.pdf`)
}

export function exportAttendanceToExcel(records, type) {
  const label = type === 'siswa' ? 'Siswa' : 'Staff'
  const data = records.map((r) => {
    if (type === 'siswa') {
      return {
        'Nama': r.student?.fullName || '',
        'Kelompok': r.student?.ageGroup || '',
        'Cabang': r.student?.branch?.code || '-',
        'Status': r.status === 'hadir' ? 'Hadir' : r.status === 'izin' ? 'Izin' : r.status === 'sakit' ? 'Sakit' : 'Alfa',
        'Dicatat Oleh': r.coach?.name || '-',
        Waktu: r.submittedAt ? new Date(r.submittedAt).toLocaleString('id-ID') : '-',
      }
    }
    return {
      Nama: r.user?.name || '',
      Role: r.user?.role === 'head_coach' ? 'Head Coach' : 'Coach',
      Cabang: r.branch?.code || '-',
      'Check In': r.checkInTime ? new Date(r.checkInTime).toLocaleString('id-ID') : '-',
    }
  })

  const ws = XLSX.utils.json_to_sheet(data)
  ws['!cols'] = type === 'siswa'
    ? [{ wch: 22 }, { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 18 }, { wch: 18 }]
    : [{ wch: 22 }, { wch: 14 }, { wch: 8 }, { wch: 18 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, label)
  XLSX.writeFile(wb, `absensi_${label.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

export function exportAttendanceToPDF(records, type) {
  const doc = new jsPDF()
  const label = type === 'siswa' ? 'Siswa' : 'Staff'
  doc.setFontSize(14)
  doc.text(`Laporan Absensi ${label}`, 14, 20)
  doc.setFontSize(9)
  doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, 14, 27)

  let head, body, colStyles
  if (type === 'siswa') {
    head = [['Nama Siswa', 'Kelompok', 'Cabang', 'Status', 'Pencatat', 'Waktu']]
    body = records.map((r) => [
      r.student?.fullName || '',
      r.student?.ageGroup || '',
      r.student?.branch?.code || '-',
      r.status === 'hadir' ? 'Hadir' : r.status === 'izin' ? 'Izin' : r.status === 'sakit' ? 'Sakit' : 'Alfa',
      r.coach?.name || '-',
      r.submittedAt ? new Date(r.submittedAt).toLocaleString('id-ID') : '-',
    ])
    colStyles = {
      0: { cellWidth: 38 },
      1: { cellWidth: 16 },
      2: { cellWidth: 14 },
      3: { cellWidth: 14 },
      4: { cellWidth: 24 },
      5: { cellWidth: 30 },
    }
  } else {
    head = [['Nama', 'Role', 'Cabang', 'Check In']]
    body = records.map((r) => [
      r.user?.name || '',
      r.user?.role === 'head_coach' ? 'Head Coach' : 'Coach',
      r.branch?.code || '-',
      r.checkInTime ? new Date(r.checkInTime).toLocaleString('id-ID') : '-',
    ])
    colStyles = {
      0: { cellWidth: 40 },
      1: { cellWidth: 24 },
      2: { cellWidth: 14 },
      3: { cellWidth: 40 },
    }
  }

  autoTable(doc, {
    startY: 32,
    head,
    body,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
    columnStyles: colStyles,
  })

  doc.save(`absensi_${label.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.pdf`)
}

// Rekap kehadiran coach (menu Absensi Coach) — satu baris per coach.
const COACH_RECAP_HEAD = ['Nama', 'Role', 'Cabang', 'Hari Hadir', 'Pending', 'Ditolak', 'Tanpa Absen Pulang', 'Total Absen']

function coachRecapRows(coaches) {
  return coaches.map((entry) => [
    entry.coach.name,
    entry.coach.role === 'head_coach' ? 'Head Coach' : 'Coach',
    entry.coach.branches?.map((b) => b.branch.code).join(', ') || '-',
    String(entry.stats.daysPresent),
    String(entry.stats.pending),
    String(entry.stats.rejected),
    String(entry.stats.missingCheckout),
    String(entry.stats.totalRecords),
  ])
}

export function exportCoachRecapToExcel(coaches, periodLabel) {
  const data = coachRecapRows(coaches).map((row) => Object.fromEntries(COACH_RECAP_HEAD.map((head, i) => [head, row[i]])))
  const ws = XLSX.utils.json_to_sheet(data)
  ws['!cols'] = [{ wch: 22 }, { wch: 12 }, { wch: 14 }, { wch: 11 }, { wch: 9 }, { wch: 9 }, { wch: 18 }, { wch: 11 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Absensi Coach')
  XLSX.writeFile(wb, `absensi_coach_${periodLabel.replace(/\s+/g, '_')}.xlsx`)
}

export function exportCoachRecapToPDF(coaches, periodLabel) {
  const doc = new jsPDF()
  doc.setFontSize(14)
  doc.text('Rekap Absensi Coach', 14, 20)
  doc.setFontSize(9)
  doc.text(`Periode: ${periodLabel}`, 14, 27)

  autoTable(doc, {
    startY: 32,
    head: [COACH_RECAP_HEAD],
    body: coachRecapRows(coaches),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 38 },
      1: { cellWidth: 20 },
      2: { cellWidth: 16 },
      3: { cellWidth: 16 },
      4: { cellWidth: 14 },
      5: { cellWidth: 14 },
      6: { cellWidth: 26 },
      7: { cellWidth: 16 },
    },
  })

  doc.save(`absensi_coach_${periodLabel.replace(/\s+/g, '_')}.pdf`)
}

// ---------------------------------------------------------------------------
// Laporan absensi coach dalam bentuk KETERANGAN KALIMAT (bukan foto): satu
// kalimat per absen berisi nama coach, tanggal, cabang/tempat, jam absen masuk
// dan jam absen keluar. Foto selfie tetap tersimpan & tampil di menu Absensi
// admin — laporan ini hanya untuk arsip/cetak.
// ---------------------------------------------------------------------------
const COACH_DETAIL_HEAD = ['Coach', 'Role', 'Keterangan Absen']

function pad(n) {
  return String(n).padStart(2, '0')
}

function timeOf(value) {
  if (!value) return null
  const d = new Date(value)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Contoh: "Ahmad Fauzi (Coach) pada Senin, 05 Oktober 2026 di Jakarta (JKT) —
// Lapangan A absen masuk pukul 07:12 dan absen keluar pukul 17:05."
function attendanceSentence(entry, record) {
  const roleLabel = entry.coach.role === 'head_coach' ? 'Head Coach' : 'Coach'
  const dayLabel = new Date(record.date).toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
  const branchLabel = record.branch ? `${record.branch.name}${record.branch.code ? ` (${record.branch.code})` : ''}` : null
  const place = [branchLabel, record.locationName].filter(Boolean).join(' — ')
  const checkIn = record.checkInTime ? `absen masuk pukul ${timeOf(record.checkInTime)}` : 'tidak absen masuk'
  const checkOut = record.checkOutTime ? `absen keluar pukul ${timeOf(record.checkOutTime)}` : 'belum absen keluar'
  return `${entry.coach.name} (${roleLabel}) pada ${dayLabel}${place ? ` di ${place}` : ''} ${checkIn} dan ${checkOut}.`
}

function coachDetailRows(coaches) {
  const rows = []
  ;(coaches || []).forEach((entry) => {
    ;(entry.records || []).forEach((record) => {
      rows.push([
        entry.coach.name,
        entry.coach.role === 'head_coach' ? 'Head Coach' : 'Coach',
        attendanceSentence(entry, record),
      ])
    })
  })
  return rows
}

// Excel: sheet "Rekap" (ringkasan per coach) + sheet "Keterangan Absen" (satu
// baris kalimat per absen: nama, absen masuk, absen keluar — tanpa foto).
export function exportCoachRecapDetailToExcel(coaches, periodLabel) {
  const wb = XLSX.utils.book_new()

  const recap = coachRecapRows(coaches || []).map((row) => Object.fromEntries(COACH_RECAP_HEAD.map((h, i) => [h, row[i]])))
  const wsRecap = XLSX.utils.json_to_sheet(recap)
  wsRecap['!cols'] = [{ wch: 22 }, { wch: 12 }, { wch: 14 }, { wch: 11 }, { wch: 9 }, { wch: 9 }, { wch: 18 }, { wch: 11 }]
  XLSX.utils.book_append_sheet(wb, wsRecap, 'Rekap')

  const rows = coachDetailRows(coaches)
  const detail = rows.map((row) => Object.fromEntries(COACH_DETAIL_HEAD.map((h, i) => [h, row[i]])))
  const wsDetail = XLSX.utils.json_to_sheet(detail)
  wsDetail['!cols'] = [{ wch: 22 }, { wch: 11 }, { wch: 110 }]
  XLSX.utils.book_append_sheet(wb, wsDetail, 'Keterangan Absen')

  XLSX.writeFile(wb, `laporan_absensi_coach_${periodLabel.replace(/\s+/g, '_')}.xlsx`)
}

// PDF: laporan keterangan kalimat per coach — nama, tanggal, absen masuk dan
// absen keluar. Tidak ada foto yang ditanam.
export function exportCoachRecapDetailToPDF(coaches, periodLabel) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth ? doc.internal.pageSize.getWidth() : doc.internal.pageSize.width
  const left = 14
  const contentWidth = pageWidth - left * 2

  function drawHeader() {
    doc.setFontSize(14)
    doc.setTextColor(15, 23, 42)
    doc.text('Laporan Absensi Coach', left, 18)
    doc.setFontSize(9)
    doc.setTextColor(100)
    doc.text(`Keterangan absen masuk & absen keluar · Periode: ${periodLabel}`, left, 24)
    return 32
  }

  let y = drawHeader()
  const bottom = 280

  function ensure(height) {
    if (y + height > bottom) {
      doc.addPage()
      y = drawHeader()
    }
  }

  for (const entry of coaches || []) {
    const roleLabel = entry.coach.role === 'head_coach' ? 'Head Coach' : 'Coach'
    const branchCodes = entry.coach.branches?.map((b) => b.branch.code).join(', ') || 'tanpa cabang'

    ensure(24)
    doc.setFillColor(30, 41, 59)
    doc.rect(left, y, contentWidth, 7, 'F')
    doc.setTextColor(255)
    doc.setFontSize(9)
    doc.text(`${entry.coach.name} — ${roleLabel} — ${branchCodes}`, left + 2, y + 4.8)
    y += 10

    doc.setTextColor(110)
    doc.setFontSize(8)
    doc.text(`Hari hadir: ${entry.stats.daysPresent} · Total absen: ${entry.stats.totalRecords} · Tanpa absen pulang: ${entry.stats.missingCheckout}`, left + 2, y)
    y += 7

    const records = entry.records || []
    if (!records.length) {
      doc.setTextColor(150)
      doc.setFontSize(8.5)
      doc.text('Tidak ada absen pada periode ini.', left + 4, y)
      y += 10
      continue
    }

    doc.setFontSize(9)
    doc.setTextColor(30, 41, 59)
    records.forEach((record, index) => {
      const lines = doc.splitTextToSize(`${index + 1}. ${attendanceSentence(entry, record)}`, contentWidth - 8)
      ensure(lines.length * 4.7 + 2)
      doc.text(lines, left + 4, y)
      y += lines.length * 4.7 + 1.6
    })
    y += 5
  }

  if (!coaches?.length) {
    doc.setTextColor(140)
    doc.setFontSize(10)
    doc.text('Belum ada absensi coach pada periode ini.', left, y + 6)
  }

  doc.save(`laporan_absensi_coach_${periodLabel.replace(/\s+/g, '_')}.pdf`)
}
