import { jsPDF } from 'jspdf'

const NAVY = [10, 22, 40]
const GOLD = [212, 168, 67]

function loadImageAsDataUrl(src, crossOrigin) {
  return new Promise((resolve) => {
    if (!src) return resolve(null)
    const img = new Image()
    if (crossOrigin) img.crossOrigin = crossOrigin
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

// Builds a single-page (one compact ID-card-sized page, 90mm x 140mm) PDF —
// deliberately NOT using window.print() on the dashboard page, which has no
// print-specific layout and paginates the whole sidebar+content across
// multiple A4 pages. Returns the jsPDF doc so callers can .save() (download)
// or auto-print it.
export async function buildStudentCardPdf(student, qrBlobUrl) {
  const [logoDataUrl, qrDataUrl, photoDataUrl] = await Promise.all([
    loadImageAsDataUrl('/logo.png'),
    loadImageAsDataUrl(qrBlobUrl),
    loadImageAsDataUrl(student.photo, 'anonymous'),
  ])

  const W = 90
  const H = 140
  const doc = new jsPDF({ unit: 'mm', format: [W, H], orientation: 'portrait' })

  // Header band
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, W, 32, 'F')
  doc.setFillColor(...GOLD)
  doc.rect(0, 32, W, 1.4, 'F')

  if (logoDataUrl) doc.addImage(logoDataUrl, 'PNG', 7, 6, 20, 20)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('SIXSTARS ACADEMY', 30, 15)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(212, 168, 67)
  doc.text('KARTU SISWA', 30, 21)

  // Photo
  const photoSize = 32
  const photoX = (W - photoSize) / 2
  const photoY = 41
  doc.setFillColor(240, 240, 240)
  doc.rect(photoX, photoY, photoSize, photoSize, 'F')
  if (photoDataUrl) {
    doc.addImage(photoDataUrl, 'PNG', photoX, photoY, photoSize, photoSize)
  }
  doc.setDrawColor(...GOLD)
  doc.setLineWidth(0.8)
  doc.rect(photoX, photoY, photoSize, photoSize)

  let y = photoY + photoSize + 8
  doc.setTextColor(...NAVY)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(student.fullName || '-', W / 2, y, { align: 'center' })

  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(90, 90, 90)
  doc.text(student.studentId || '-', W / 2, y, { align: 'center' })

  y += 6
  doc.setFontSize(8)
  const detailLine = [student.position, student.ageGroup].filter(Boolean).join(' · ')
  if (detailLine) doc.text(detailLine, W / 2, y, { align: 'center' })

  if (student.branch?.name) {
    y += 5
    doc.text(student.branch.name, W / 2, y, { align: 'center' })
  }

  // QR code
  const qrSize = 34
  const qrX = (W - qrSize) / 2
  const qrY = y + 6
  if (qrDataUrl) doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize)

  doc.setFontSize(6.5)
  doc.setTextColor(120, 120, 120)
  doc.text('Tunjukkan QR ini ke coach untuk absen', W / 2, qrY + qrSize + 5, { align: 'center' })

  return doc
}

export async function downloadStudentCard(student, qrBlobUrl) {
  const doc = await buildStudentCardPdf(student, qrBlobUrl)
  doc.save(`kartu-${student.studentId || student.id}.pdf`)
}

export async function printStudentCard(student, qrBlobUrl) {
  const doc = await buildStudentCardPdf(student, qrBlobUrl)
  const blobUrl = doc.output('bloburl')
  window.open(blobUrl, '_blank')
}
