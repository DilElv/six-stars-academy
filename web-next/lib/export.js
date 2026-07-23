import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

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
    Status: p.status === 'success' ? 'Lunas' : p.status === 'pending' ? 'Menunggu Verifikasi' : 'Gagal',
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

  doc.autoTable({
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

  doc.autoTable({
    startY: 32,
    head,
    body,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
    columnStyles: colStyles,
  })

  doc.save(`absensi_${label.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.pdf`)
}
