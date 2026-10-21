import prisma from './prisma.js'
import { notifyUser } from './notify.js'

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

// Label yang tampil di keranjang & rincian pembayaran, mis. "BPJS Oktober 2026".
export function bpjsLabel(month, year) {
  return `BPJS ${MONTHS[month - 1] || month} ${year}`
}

// Konfigurasi BPJS disimpan di CMS section "settings" (blob JSON), sama seperti
// pengaturan lain. `day` = tanggal mulai penagihan tiap bulan (1-28).
export async function getBpjsSettings() {
  const row = await prisma.cmsContent.findFirst({ where: { section: 'settings' } })
  const content = row?.content || {}
  const amount = Math.max(0, Math.round(Number(content.bpjsAmount) || 0))
  const day = Math.min(28, Math.max(1, Math.round(Number(content.bpjsDay) || 1)))
  return { enabled: !!content.bpjsEnabled, amount, day }
}

// Menambahkan satu item BPJS periode tertentu ke keranjang setiap anak yang
// masih terdaftar (status bukan "inactive"). Idempoten: anak yang sudah punya
// item BPJS periode itu dilewati, jadi aman dipanggil berulang / dari job.
export async function runBpjsBilling({ month, year, amount, studentIds } = {}) {
  const settings = await getBpjsSettings()
  const now = new Date()
  const periodMonth = Math.min(12, Math.max(1, Math.round(Number(month) || now.getMonth() + 1)))
  const periodYear = Math.round(Number(year) || now.getFullYear())
  const value = amount !== undefined && amount !== null && amount !== '' ? Math.round(Number(amount)) : settings.amount
  const label = bpjsLabel(periodMonth, periodYear)
  const base = { period: { month: periodMonth, year: periodYear }, label, amount: value }

  if (!Number.isSafeInteger(value) || value <= 0) {
    return { ...base, created: 0, eligible: 0, reason: 'amount_not_set' }
  }

  // Anak yang dikecualikan (bpjsExempt) tidak pernah ditagih, juga bila dipilih manual.
  const where = { status: { not: 'inactive' }, bpjsExempt: false }
  if (Array.isArray(studentIds) && studentIds.length > 0) where.id = { in: studentIds }
  const students = await prisma.student.findMany({ where, select: { id: true, userId: true, fullName: true } })

  let created = 0
  for (const student of students) {
    const existing = await prisma.cartItem.findFirst({
      where: { studentId: student.id, type: 'bpjs', periodMonth, periodYear },
      select: { id: true },
    })
    if (existing) continue

    await prisma.cartItem.create({
      data: {
        studentId: student.id,
        type: 'bpjs',
        category: 'BPJS',
        label,
        amount: value,
        periodMonth,
        periodYear,
        metadata: { periodMonth, periodYear },
        status: 'open',
      },
    })
    created++
    await notifyUser(student.userId, {
      type: 'bpjs_billing',
      title: 'Tagihan BPJS',
      message: `${label} sebesar Rp${value.toLocaleString('id-ID')} sudah masuk sebagai tagihan. Silakan bayar dari menu BPJS.`,
      link: '/dashboard/bpjs',
    })
  }

  return { ...base, created, eligible: students.length }
}

// Ringkasan untuk ditampilkan di Pengaturan: berapa anak yang sudah/belum
// punya item BPJS periode ini.
export async function getBpjsStatus({ month, year } = {}) {
  const settings = await getBpjsSettings()
  const now = new Date()
  const periodMonth = Math.min(12, Math.max(1, Math.round(Number(month) || now.getMonth() + 1)))
  const periodYear = Math.round(Number(year) || now.getFullYear())
  const [eligible, billed, exempt] = await Promise.all([
    prisma.student.count({ where: { status: { not: 'inactive' }, bpjsExempt: false } }),
    prisma.cartItem.count({ where: { type: 'bpjs', periodMonth, periodYear } }),
    prisma.student.count({ where: { status: { not: 'inactive' }, bpjsExempt: true } }),
  ])
  return { ...settings, period: { month: periodMonth, year: periodYear }, label: bpjsLabel(periodMonth, periodYear), eligible, billed, exempt }
}

// Daftar semua anak beserta status BPJS-nya untuk periode terpilih.
export async function listBpjsStudents({ month, year } = {}) {
  const now = new Date()
  const periodMonth = Math.min(12, Math.max(1, Math.round(Number(month) || now.getMonth() + 1)))
  const periodYear = Math.round(Number(year) || now.getFullYear())
  const [students, items] = await Promise.all([
    prisma.student.findMany({
      select: {
        id: true, fullName: true, studentId: true, ageGroup: true, status: true, bpjsExempt: true,
        branchId: true, branch: { select: { id: true, name: true, code: true } },
      },
      orderBy: { fullName: 'asc' },
    }),
    prisma.cartItem.findMany({
      where: { type: 'bpjs', periodMonth, periodYear },
      select: { studentId: true, status: true },
    }),
  ])
  const billedBy = new Map(items.map((item) => [item.studentId, item.status]))
  return students.map((student) => ({ ...student, billedStatus: billedBy.get(student.id) || null }))
}

// Tandai anak dikecualikan / ditagih lagi. Mengecualikan juga membatalkan tagihan
// BPJS yang masih terbuka (belum masuk pembayaran) supaya parent tidak melihatnya.
export async function setBpjsExempt({ exemptIds = [], includeIds = [] } = {}) {
  const exempt = [...new Set(exemptIds.filter(Boolean))]
  const include = [...new Set(includeIds.filter(Boolean))]
  const [a, b, cancelled] = await prisma.$transaction([
    prisma.student.updateMany({ where: { id: { in: exempt } }, data: { bpjsExempt: true } }),
    prisma.student.updateMany({ where: { id: { in: include } }, data: { bpjsExempt: false } }),
    prisma.cartItem.updateMany({ where: { studentId: { in: exempt }, type: 'bpjs', status: 'open' }, data: { status: 'canceled' } }),
  ])
  return { exempted: a.count, included: b.count, cancelledItems: cancelled.count }
}

// Job latar: setelah tanggal `day` tiap bulan (dan saat startup), pastikan
// setiap anak punya item BPJS periode berjalan. Dipanggil ulang tiap jam dan
// bergantung pada idempotensi runBpjsBilling, sehingga anak yang baru masuk di
// tengah bulan tetap ikut tertagih.
export function startBpjsBilling() {
  let running = false
  // Sekali per bulan per proses: mencegah tagihan yang sengaja dihapus parent
  // muncul lagi tiap jam, dan mengurangi query. Admin tetap bisa menjalankan
  // ulang lewat tombol "Tagih Sekarang".
  let lastRunKey = ''
  async function sweep() {
    if (running) return
    running = true
    try {
      const settings = await getBpjsSettings()
      if (!settings.enabled || settings.amount <= 0) return
      const now = new Date()
      if (now.getDate() < settings.day) return
      const key = `${now.getFullYear()}-${now.getMonth() + 1}`
      if (key === lastRunKey) return
      const result = await runBpjsBilling({ month: now.getMonth() + 1, year: now.getFullYear() })
      lastRunKey = key
      if (result.created > 0) {
        console.log(`BPJS billing ${result.label}: ${result.created} item ditambahkan (${result.eligible} anak terdaftar)`)
      }
    } catch (err) {
      console.error('BPJS billing failed:', err.message)
    } finally { running = false }
  }
  void sweep()
  const timer = setInterval(sweep, 60 * 60 * 1000)
  timer.unref()
  return timer
}
