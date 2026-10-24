import PDFDocument from 'pdfkit'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LOGO_PATH = path.join(__dirname, '..', 'assets', 'logo.png')
const FONT_REGULAR = path.join(__dirname, '..', 'assets', 'fonts', 'NotoSans-Regular.ttf')
const FONT_BOLD = path.join(__dirname, '..', 'assets', 'fonts', 'NotoSans-Bold.ttf')

const X = 40
const W = 515
const NAVY = '#0a1628'
const GOLD = '#d4a843'
const GRAY = '#666666'
const LIGHT = '#f6f4ee'
const LINE = '#e5e1d5'
const GREEN = '#15803d'

const TYPE_LABEL = {
  registration: 'Pendaftaran',
  renewal: 'Perpanjangan Paket',
  event: 'Biaya Event',
  cart: 'Tagihan',
}

const METHOD_LABEL = {
  cash: 'Tunai (Cash)',
  transfer_manual: 'Transfer Manual',
  qris: 'QRIS',
  lainnya: 'Lainnya',
}

export function formatRupiah(n) {
  return 'Rp ' + (Number(n) || 0).toLocaleString('id-ID')
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' })
}

// Nomor invoice stabil: tanggal bayar + 6 karakter terakhir id pembayaran.
export function invoiceNumber(payment) {
  const d = new Date(payment.paidAt || payment.createdAt)
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  return `INV-${ymd}-${String(payment.id).slice(-6).toUpperCase()}`
}

// Baris rincian: tiap item keranjang, atau satu baris sesuai jenis pembayaran.
export function invoiceLines(payment) {
  const lines = []
  if (payment.paymentType === 'cart' && payment.cartItems?.length) {
    for (const item of payment.cartItems) lines.push({ title: item.label, detail: item.category, amount: item.amount })
  } else if (payment.paymentType === 'event') {
    const event = payment.eventParticipant?.event
    lines.push({ title: event ? `Biaya Event — ${event.title}` : 'Biaya Event', detail: event ? formatDate(event.date) : null, amount: payment.amount })
  } else {
    const pkg = payment.package
    const title = `${TYPE_LABEL[payment.paymentType] || payment.paymentType}${pkg ? ` — ${pkg.name}` : ''}`
    const detail = pkg ? `${pkg.durationMonths} bulan · ${pkg.sessionsPerWeek}x latihan per minggu` : null
    lines.push({ title, detail, amount: payment.amount })
  }
  if (payment.registrationFee > 0) lines.push({ title: 'Biaya Pendaftaran', detail: null, amount: payment.registrationFee })

  const sum = lines.reduce((s, l) => s + l.amount, 0)
  if (sum !== payment.totalAmount) {
    lines.push({ title: 'Penyesuaian', detail: null, amount: payment.totalAmount - sum })
  }
  return lines
}

export function generateInvoicePdf({ payment, settings = {} }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40, info: { Title: `Invoice ${invoiceNumber(payment)}`, Author: settings.ssbName || 'SixStars Academy Indonesia' } })
    doc.registerFont('NotoSans', FONT_REGULAR)
    doc.registerFont('NotoSans-Bold', FONT_BOLD)
    const chunks = []
    doc.on('data', (c) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const student = payment.student
    const branch = student?.branch
    const paid = payment.status === 'success'

    // Pita atas
    doc.rect(0, 0, 595, 8).fill(NAVY)
    doc.rect(0, 8, 595, 3).fill(GOLD)

    // Kop: logo + identitas
    try { doc.image(LOGO_PATH, X, 30, { width: 56 }) } catch { /* logo opsional */ }
    doc.font('NotoSans-Bold').fontSize(16).fillColor(NAVY).text(settings.ssbName || 'SixStars Academy Indonesia', X + 68, 34, { width: 280 })
    doc.font('NotoSans').fontSize(8.5).fillColor(GRAY)
    const contact = [settings.ssbAddress, settings.ssbPhone, settings.ssbEmail].filter(Boolean)
    contact.forEach((c) => doc.text(c, X + 68, doc.y, { width: 280 }))

    // Judul + nomor (kanan)
    doc.font('NotoSans-Bold').fontSize(26).fillColor(NAVY).text('INVOICE', 340, 30, { width: 215, align: 'right' })
    doc.font('NotoSans').fontSize(9).fillColor(GRAY).text(invoiceNumber(payment), 340, 62, { width: 215, align: 'right' })
    doc.text(`Tanggal: ${formatDate(payment.paidAt || payment.createdAt)}`, 340, doc.y, { width: 215, align: 'right' })

    let y = 108
    doc.moveTo(X, y).lineTo(X + W, y).strokeColor(GOLD).lineWidth(1.5).stroke()
    y += 16

    // Blok "Ditagihkan kepada" & "Detail pembayaran"
    const colW = 247
    doc.font('NotoSans-Bold').fontSize(8).fillColor(GOLD).text('DITAGIHKAN KEPADA', X, y)
    doc.font('NotoSans-Bold').fontSize(11).fillColor(NAVY).text(student?.parentName || '-', X, y + 14, { width: colW })
    doc.font('NotoSans').fontSize(9).fillColor(GRAY)
    if (student?.parentPhone) doc.text(student.parentPhone, X, doc.y, { width: colW })
    doc.text(`Siswa: ${student?.fullName || '-'}${student?.studentId ? ` (${student.studentId})` : ''}`, X, doc.y + 2, { width: colW })
    if (branch) doc.text(`Cabang: ${branch.name}`, X, doc.y, { width: colW })
    const leftEnd = doc.y

    const rx = X + colW + 21
    doc.font('NotoSans-Bold').fontSize(8).fillColor(GOLD).text('DETAIL PEMBAYARAN', rx, y)
    const meta = [
      ['Jenis', TYPE_LABEL[payment.paymentType] || payment.paymentType],
      ['Metode', METHOD_LABEL[payment.paymentMethod] || payment.paymentMethod || '-'],
      payment.transactionId ? ['Ref. transaksi', payment.transactionId] : null,
      payment.paidAt ? ['Dibayar pada', formatDate(payment.paidAt)] : null,
    ].filter(Boolean)
    let my = y + 14
    for (const [k, v] of meta) {
      doc.font('NotoSans').fontSize(9).fillColor(GRAY).text(k, rx, my, { width: 80 })
      doc.font('NotoSans-Bold').fontSize(9).fillColor(NAVY).text(String(v), rx + 82, my, { width: colW - 82 })
      my = Math.max(doc.y, my + 14)
    }
    y = Math.max(leftEnd, my) + 20

    // Tabel rincian
    const cols = { no: X + 10, desc: X + 40, amount: X + W - 120 }
    doc.rect(X, y, W, 24).fill(NAVY)
    doc.font('NotoSans-Bold').fontSize(9).fillColor('#ffffff')
    doc.text('No', cols.no, y + 8, { width: 24 })
    doc.text('Deskripsi', cols.desc, y + 8, { width: 300 })
    doc.text('Jumlah', cols.amount, y + 8, { width: 110, align: 'right' })
    y += 24

    const lines = invoiceLines(payment)
    lines.forEach((line, i) => {
      const titleH = doc.font('NotoSans-Bold').fontSize(10).heightOfString(line.title, { width: 330 })
      const detailH = line.detail ? doc.font('NotoSans').fontSize(8.5).heightOfString(line.detail, { width: 330 }) : 0
      const rowH = Math.max(30, titleH + detailH + 16)
      if (y + rowH > 700) { doc.addPage(); y = 50 }
      if (i % 2 === 0) doc.rect(X, y, W, rowH).fill(LIGHT)
      doc.font('NotoSans').fontSize(9).fillColor(GRAY).text(String(i + 1), cols.no, y + 9, { width: 24 })
      doc.font('NotoSans-Bold').fontSize(10).fillColor(NAVY).text(line.title, cols.desc, y + 8, { width: 330 })
      if (line.detail) doc.font('NotoSans').fontSize(8.5).fillColor(GRAY).text(line.detail, cols.desc, doc.y + 1, { width: 330 })
      doc.font('NotoSans-Bold').fontSize(10).fillColor(NAVY).text(formatRupiah(line.amount), cols.amount, y + 8, { width: 110, align: 'right' })
      y += rowH
    })
    doc.moveTo(X, y).lineTo(X + W, y).strokeColor(LINE).lineWidth(1).stroke()
    y += 14

    // Total
    const tx = X + W - 240
    if (lines.length > 1) {
      doc.font('NotoSans').fontSize(10).fillColor(GRAY).text('Subtotal', tx, y, { width: 110 })
      doc.font('NotoSans-Bold').fillColor(NAVY).text(formatRupiah(payment.totalAmount), tx + 110, y, { width: 130, align: 'right' })
      y += 20
    }
    doc.rect(tx - 10, y, 250, 34).fill(NAVY)
    doc.font('NotoSans-Bold').fontSize(11).fillColor('#ffffff').text('TOTAL', tx, y + 11, { width: 100 })
    doc.fontSize(14).fillColor(GOLD).text(formatRupiah(payment.totalAmount), tx + 60, y + 9, { width: 170, align: 'right' })
    y += 34 + 16

    // Cap status
    const label = paid ? 'LUNAS' : 'BELUM LUNAS'
    const color = paid ? GREEN : '#b45309'
    doc.save()
    doc.roundedRect(X, y - 62, 120, 40, 6).lineWidth(2).strokeColor(color).stroke()
    doc.font('NotoSans-Bold').fontSize(18).fillColor(color).text(label, X, y - 52, { width: 120, align: 'center' })
    doc.restore()

    // Catatan
    if (payment.note) {
      doc.font('NotoSans-Bold').fontSize(8).fillColor(GOLD).text('CATATAN', X, y + 4)
      doc.font('NotoSans').fontSize(9).fillColor(GRAY).text(payment.note, X, doc.y + 2, { width: W })
    }

    // Footer
    const fy = 770
    doc.moveTo(X, fy).lineTo(X + W, fy).strokeColor(LINE).lineWidth(1).stroke()
    doc.font('NotoSans').fontSize(8).fillColor(GRAY)
      .text('Terima kasih telah mempercayakan pembinaan putra/putri Anda kepada SixStars Academy Indonesia.', X, fy + 8, { width: W, align: 'center' })
      .text('Invoice ini dibuat otomatis oleh sistem dan sah tanpa tanda tangan.', X, doc.y + 2, { width: W, align: 'center' })
    doc.rect(0, 832, 595, 10).fill(NAVY)

    doc.end()
  })
}
