import PDFDocument from 'pdfkit'
import { fileURLToPath } from 'url'
import path from 'path'
import { getCategoriesForPosition, scoreCategory, formatPeriodLabel } from './assessmentFields.js'
import { buildRichTextTokens, drawRichText } from './emojiPdf.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LOGO_PATH = path.join(__dirname, '..', 'assets', 'logo.png')
const FONT_REGULAR = path.join(__dirname, '..', 'assets', 'fonts', 'NotoSans-Regular.ttf')
const FONT_BOLD = path.join(__dirname, '..', 'assets', 'fonts', 'NotoSans-Bold.ttf')

const PAGE_MARGIN = 40
const CONTENT_X = 40
const CONTENT_WIDTH = 515
const PAGE_BOTTOM = 780

const NAVY = '#0a1628'
const GOLD = '#d4a843'
const GRAY_TEXT = '#333333'
const GRAY_LINE = '#e2e2e2'
const ROW_SHADE = '#f7f7f7'

async function fetchImageBuffer(url) {
  if (!url) return null
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const arrayBuffer = await res.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch {
    return null
  }
}

export async function generateReportPdf({ student, assessment, month, year, endMonth, endYear, settings, headCoachName, headCoachSignature, attendanceSummary }) {
  const [photoBuffer, signatureBuffer, commentTokens] = await Promise.all([
    fetchImageBuffer(student.photo),
    fetchImageBuffer(headCoachSignature),
    buildRichTextTokens(assessment.coachComment || '-'),
  ])
  const periodEndMonth = endMonth || month
  const periodEndYear = endYear || year
  const categories = getCategoriesForPosition(student.position)
  const activeCategories = categories.filter((c) => (assessment.activeCategories || []).includes(c.key))

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: PAGE_MARGIN })
    doc.registerFont('NotoSans', FONT_REGULAR)
    doc.registerFont('NotoSans-Bold', FONT_BOLD)
    const chunks = []
    doc.on('data', (c) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    drawHeader(doc, settings, month, year, periodEndMonth, periodEndYear)
    drawProfileAndPhoto(doc, student, photoBuffer)
    if (attendanceSummary) drawAttendanceSummary(doc, attendanceSummary)

    for (const cat of activeCategories) {
      drawAssessmentTable(doc, cat, assessment)
    }

    if (assessment.taktikAvg !== null && assessment.taktikAvg !== undefined) {
      ensureSpace(doc, 20)
      doc.fontSize(9).font('NotoSans-Bold').fillColor(NAVY)
        .text(`Rata-rata Taktik (Attacking + Defending): ${formatScore(assessment.taktikAvg)}`, CONTENT_X, doc.y, { width: CONTENT_WIDTH, align: 'right' })
      doc.moveDown(0.6)
    }

    drawOverallBox(doc, assessment)
    drawComment(doc, commentTokens)
    drawFooter(doc, headCoachName, signatureBuffer)

    doc.end()
  })
}

function ensureSpace(doc, height) {
  if (doc.y + height > PAGE_BOTTOM) {
    doc.addPage()
    doc.y = PAGE_MARGIN
  }
}

function formatScore(v) {
  return v === null || v === undefined ? '-' : Number(v).toFixed(1)
}

function drawHeader(doc, settings, month, year, endMonth, endYear) {
  try {
    doc.image(LOGO_PATH, CONTENT_X, 30, { width: 42 })
  } catch {
    // logo optional, continue without it
  }
  doc.fontSize(16).fillColor(NAVY).font('NotoSans-Bold')
    .text(settings.ssbName || 'SixStars Academy Indonesia', 90, 34, { align: 'center', width: 425 })
  doc.fontSize(9).fillColor('#666666').font('NotoSans')
  const contactLine = [settings.ssbAddress, settings.ssbPhone, settings.ssbEmail].filter(Boolean).join(' | ')
  if (contactLine) doc.text(contactLine, 90, doc.y, { align: 'center', width: 425 })

  doc.y = Math.max(doc.y, 80)
  doc.x = CONTENT_X
  doc.moveDown(0.4)
  doc.moveTo(CONTENT_X, doc.y).lineTo(CONTENT_X + CONTENT_WIDTH, doc.y).strokeColor(GOLD).lineWidth(2).stroke()
  doc.moveDown(0.5)

  doc.fontSize(14).fillColor(NAVY).font('NotoSans-Bold')
    .text(`RAPOR — ${formatPeriodLabel(month, year, endMonth, endYear)}`, CONTENT_X, doc.y, { align: 'center', width: CONTENT_WIDTH })
  doc.moveDown(0.8)
}

function drawProfileAndPhoto(doc, student, photoBuffer) {
  const top = doc.y
  const photoBoxW = 90
  const photoBoxH = 110
  const photoX = CONTENT_X + CONTENT_WIDTH - photoBoxW
  const infoW = CONTENT_WIDTH - photoBoxW - 16

  // Photo box (right side)
  doc.rect(photoX, top, photoBoxW, photoBoxH).lineWidth(1).strokeColor(GRAY_LINE).stroke()
  if (photoBuffer) {
    try {
      doc.image(photoBuffer, photoX + 4, top + 4, { fit: [photoBoxW - 8, photoBoxH - 8], align: 'center', valign: 'center' })
    } catch {
      doc.fontSize(8).fillColor('#999999').text('Foto tidak tersedia', photoX, top + photoBoxH / 2 - 6, { width: photoBoxW, align: 'center' })
    }
  } else {
    doc.fontSize(8).fillColor('#999999').text('Tanpa Foto', photoX, top + photoBoxH / 2 - 6, { width: photoBoxW, align: 'center' })
  }

  // Profile info (left side)
  doc.fontSize(11).font('NotoSans-Bold').fillColor(NAVY).text('PROFIL ANAK', CONTENT_X, top, { width: infoW })
  doc.moveDown(0.3)
  doc.fontSize(9).font('NotoSans').fillColor(GRAY_TEXT)

  const age = student.dateOfBirth
    ? Math.floor((Date.now() - new Date(student.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null

  const rows = [
    ['Nama', student.fullName],
    ['ID Siswa', student.studentId],
    ['Kelompok Umur', student.ageGroup],
    ['Posisi', student.position],
    ['Umur', age !== null ? `${age} tahun` : null],
  ]
  for (const [label, value] of rows) {
    const y = doc.y
    doc.font('NotoSans-Bold').fillColor(GRAY_TEXT).text(`${label}:`, CONTENT_X, y, { width: 100 })
    doc.font('NotoSans').fillColor(GRAY_TEXT).text(value || '-', CONTENT_X + 100, y, { width: infoW - 100 })
  }

  doc.y = Math.max(doc.y, top + photoBoxH) + 12
  doc.x = CONTENT_X
}

function drawAttendanceSummary(doc, summary) {
  ensureSpace(doc, 60)
  doc.fontSize(11).font('NotoSans-Bold').fillColor(NAVY).text('RINGKASAN ABSENSI', CONTENT_X, doc.y, { width: CONTENT_WIDTH })
  doc.moveDown(0.3)

  const cols = [
    { label: 'Hadir', value: summary.hadir, color: '#10b981' },
    { label: 'Izin', value: summary.izin, color: '#2563eb' },
    { label: 'Sakit', value: summary.sakit, color: '#d97706' },
    { label: 'Alfa', value: summary.alfa, color: '#dc2626' },
    { label: 'Total', value: summary.total, color: NAVY },
  ]
  const colWidth = CONTENT_WIDTH / cols.length
  const top = doc.y
  const boxHeight = 44

  cols.forEach((c, i) => {
    const x = CONTENT_X + i * colWidth
    doc.rect(x + 2, top, colWidth - 4, boxHeight).fillAndStroke(ROW_SHADE, GRAY_LINE)
    doc.fontSize(14).font('NotoSans-Bold').fillColor(c.color).text(String(c.value), x, top + 8, { width: colWidth, align: 'center' })
    doc.fontSize(8).font('NotoSans').fillColor('#666666').text(c.label, x, top + 27, { width: colWidth, align: 'center' })
  })

  doc.y = top + boxHeight + 12
  doc.x = CONTENT_X
}

// [title/aspek column width ratio, nilai, keterangan]
const TABLE_COLS = [0.6, 0.15, 0.25]
const ROW_HEIGHT = 18
const HEADER_HEIGHT = 20

function tableColX() {
  const w1 = CONTENT_WIDTH * TABLE_COLS[0]
  const w2 = CONTENT_WIDTH * TABLE_COLS[1]
  const w3 = CONTENT_WIDTH * TABLE_COLS[2]
  return { x0: CONTENT_X, x1: CONTENT_X + w1, x2: CONTENT_X + w1 + w2, w1, w2, w3 }
}

function drawTableHeaderRow(doc, y) {
  const { x0, x1, x2, w1, w2, w3 } = tableColX()
  doc.rect(x0, y, CONTENT_WIDTH, HEADER_HEIGHT).fill(NAVY)
  doc.fontSize(9).font('NotoSans-Bold').fillColor('#ffffff')
  doc.text('Aspek', x0 + 6, y + 6, { width: w1 - 12 })
  doc.text('Nilai', x1, y + 6, { width: w2, align: 'center' })
  doc.text('Keterangan', x2, y + 6, { width: w3 - 6, align: 'center' })
  return y + HEADER_HEIGHT
}

function drawAssessmentTable(doc, category, assessment) {
  ensureSpace(doc, HEADER_HEIGHT + ROW_HEIGHT * 2)

  doc.fontSize(10).font('NotoSans-Bold').fillColor(NAVY).text(category.title, CONTENT_X, doc.y, { width: CONTENT_WIDTH })
  doc.moveDown(0.25)

  const { x0, x1, x2, w1, w2, w3 } = tableColX()
  let y = drawTableHeaderRow(doc, doc.y)

  category.fields.forEach(([key, label], idx) => {
    if (y + ROW_HEIGHT > PAGE_BOTTOM) {
      doc.addPage()
      y = drawTableHeaderRow(doc, PAGE_MARGIN)
    }
    if (idx % 2 === 1) doc.rect(x0, y, CONTENT_WIDTH, ROW_HEIGHT).fill(ROW_SHADE)

    const val = assessment[key]
    const info = val !== null && val !== undefined ? scoreCategory(val) : null

    doc.fontSize(9).font('NotoSans').fillColor(GRAY_TEXT)
    doc.text(label, x0 + 6, y + 5, { width: w1 - 12 })
    doc.text(val ?? '-', x1, y + 5, { width: w2, align: 'center' })
    if (info) {
      doc.fillColor(info.color.startsWith('#') ? info.color : `#${info.color}`)
        .text(info.label, x2, y + 5, { width: w3 - 6, align: 'center' })
    } else {
      doc.fillColor('#999999').text('-', x2, y + 5, { width: w3 - 6, align: 'center' })
    }

    doc.strokeColor(GRAY_LINE).lineWidth(0.5)
    doc.rect(x0, y, w1, ROW_HEIGHT).stroke()
    doc.rect(x1, y, w2, ROW_HEIGHT).stroke()
    doc.rect(x2, y, w3, ROW_HEIGHT).stroke()

    y += ROW_HEIGHT
  })

  doc.y = y + 4
  doc.x = CONTENT_X
  doc.fontSize(9).font('NotoSans-Bold').fillColor(NAVY)
    .text(`Rata-rata: ${formatScore(assessment[category.avgKey])}`, CONTENT_X, doc.y, { width: CONTENT_WIDTH, align: 'right' })
  doc.moveDown(0.7)
}

function drawOverallBox(doc, assessment) {
  ensureSpace(doc, 56)
  const top = doc.y
  const boxHeight = 40
  doc.rect(CONTENT_X, top, CONTENT_WIDTH, boxHeight).fill(NAVY)
  doc.fontSize(12).font('NotoSans-Bold').fillColor(GOLD)
    .text(`RATA-RATA KESELURUHAN (OVR): ${formatScore(assessment.overallAvg)}`, CONTENT_X + 10, top + 13, { width: CONTENT_WIDTH - 20 })
  doc.y = top + boxHeight + 16
  doc.x = CONTENT_X
}

function drawComment(doc, commentTokens) {
  ensureSpace(doc, 60)
  doc.fontSize(10).font('NotoSans-Bold').fillColor(NAVY).text('PESAN COACH:', CONTENT_X, doc.y, { width: CONTENT_WIDTH })
  doc.moveDown(0.3)
  const commentTop = doc.y
  doc.fontSize(9).font('NotoSans').fillColor(GRAY_TEXT)
  // Pre-measure by doing a dry layout pass first (drawRichText only draws,
  // it doesn't report height up front), then draw for real inside the box.
  const bottomY = drawRichText(doc, commentTokens, CONTENT_X + 8, commentTop + 8, CONTENT_WIDTH - 16, { fontSize: 9 })
  const textHeight = bottomY - (commentTop + 8)
  doc.rect(CONTENT_X, commentTop, CONTENT_WIDTH, textHeight + 8).strokeColor(GRAY_LINE).lineWidth(1).stroke()
  doc.y = commentTop + textHeight + 8 + 12
  doc.x = CONTENT_X
}

function drawFooter(doc, headCoachName, signatureBuffer) {
  ensureSpace(doc, 80)
  doc.fontSize(8).fillColor('#666666').font('NotoSans')
  doc.text(`Dibuat: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, CONTENT_X, doc.y, { width: CONTENT_WIDTH })
  if (headCoachName) doc.text(`Head Coach: ${headCoachName}`, CONTENT_X, doc.y, { width: CONTENT_WIDTH })
  doc.moveDown(0.5)

  const signatureBoxW = 160
  const signatureBoxH = 50
  const top = doc.y
  if (signatureBuffer) {
    try {
      doc.image(signatureBuffer, CONTENT_X, top, { fit: [signatureBoxW, signatureBoxH] })
    } catch {
      // corrupted signature image — fall through to the blank line below
    }
  }
  doc.y = top + signatureBoxH + 2
  doc.x = CONTENT_X
  doc.text('Tanda Tangan Head Coach', CONTENT_X, doc.y, { width: CONTENT_WIDTH })
}
