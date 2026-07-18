import PDFDocument from 'pdfkit'
import { ASSESSMENT_CATEGORIES, scoreCategory, MONTHS } from './assessmentFields.js'

export function generateReportPdf({ student, assessment, month, year, settings, headCoachName }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 })
    const chunks = []
    doc.on('data', (c) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    // Header
    doc.fontSize(16).fillColor('#0a1628').font('Helvetica-Bold').text(settings.ssbName || 'SixStars Academy Indonesia', { align: 'center' })
    doc.fontSize(9).fillColor('#666').font('Helvetica')
    const contactLine = [settings.ssbAddress, settings.ssbPhone, settings.ssbEmail].filter(Boolean).join(' | ')
    if (contactLine) doc.text(contactLine, { align: 'center' })
    doc.moveDown(0.5)
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#d4a843').lineWidth(2).stroke()
    doc.moveDown(0.5)

    doc.fontSize(14).fillColor('#0a1628').font('Helvetica-Bold').text(`RAPOR BULANAN — ${MONTHS[month]} ${year}`, { align: 'center' })
    doc.moveDown(1)

    // Profil Anak
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#0a1628').text('PROFIL ANAK')
    doc.moveDown(0.3)
    doc.fontSize(9).font('Helvetica').fillColor('#333')
    const age = Math.floor((Date.now() - new Date(student.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    profileRow(doc, 'Nama', student.fullName)
    profileRow(doc, 'ID Siswa', student.studentId)
    profileRow(doc, 'Kelompok Umur', student.ageGroup)
    profileRow(doc, 'Posisi', student.position)
    profileRow(doc, 'Umur', `${age} tahun`)
    doc.moveDown(0.8)

    for (const cat of ASSESSMENT_CATEGORIES) {
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#0a1628').text(cat.title)
      doc.moveDown(0.2)
      for (const [key, label] of cat.fields) {
        const val = assessment[key]
        const catInfo = val !== null && val !== undefined ? scoreCategory(val) : null
        const y = doc.y
        doc.fontSize(9).font('Helvetica').fillColor('#333').text(label, 50, y, { continued: false, width: 300 })
        doc.text(val ?? '-', 380, y, { width: 40, align: 'right' })
        if (catInfo) doc.fillColor(`#${catInfo.color}`).text(catInfo.label, 430, y, { width: 100 })
        doc.fillColor('#333')
      }
      doc.moveDown(0.2)
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#0a1628').text(`Rata-rata: ${assessment[cat.avgKey] ?? '-'}`, { align: 'right' })
      doc.moveDown(0.6)
      if (doc.y > 700) doc.addPage()
    }

    if (assessment.taktikAvg !== null && assessment.taktikAvg !== undefined) {
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#0a1628').text(`Rata-rata Taktik (Attacking + Defending): ${assessment.taktikAvg}`, { align: 'right' })
      doc.moveDown(0.6)
    }

    doc.moveDown(0.3)
    doc.rect(40, doc.y, 515, 40).fill('#0a1628')
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#d4a843').text(`RATA-RATA KESELURUHAN (OVR): ${assessment.overallAvg ?? '-'}`, 50, doc.y - 30)
    doc.moveDown(1.5)

    doc.fontSize(10).font('Helvetica-Bold').fillColor('#0a1628').text('PESAN COACH:')
    doc.fontSize(9).font('Helvetica').fillColor('#333').text(assessment.coachComment || '-', { width: 515 })
    doc.moveDown(1.5)

    doc.fontSize(8).fillColor('#666')
    doc.text(`Dibuat: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`)
    if (headCoachName) doc.text(`Head Coach: ${headCoachName}`)
    doc.moveDown(2)
    doc.text('Tanda Tangan: _____________________')

    doc.end()
  })
}

function profileRow(doc, label, value) {
  const y = doc.y
  doc.font('Helvetica-Bold').text(`${label}:`, 50, y, { continued: false, width: 100 })
  doc.font('Helvetica').text(value || '-', 150, y)
}
