import 'dotenv/config'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma.js'

async function main() {
  console.log('Seeding server-next database...')

  await prisma.staffAttendance.deleteMany()
  await prisma.report.deleteMany()
  await prisma.assessment.deleteMany()
  await prisma.attendance.deleteMany()
  await prisma.studentCard.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.eventParticipant.deleteMany()
  await prisma.event.deleteMany()
  await prisma.trainingSession.deleteMany()
  await prisma.schedule.deleteMany()
  await prisma.student.deleteMany()
  await prisma.package.deleteMany()
  await prisma.cmsContent.deleteMany()
  await prisma.user.deleteMany()
  await prisma.field.deleteMany()
  await prisma.branch.deleteMany()

  const branchDefs = [
    { name: 'BSD', code: 'BSD', registrationFee: 750000 },
    { name: 'Jakarta', code: 'JKT', registrationFee: 950000 },
  ]
  const branches = []
  for (const def of branchDefs) branches.push(await prisma.branch.create({ data: def }))
  const [bsd, jkt] = branches
  console.log('  ✓ 2 cabang dibuat (BSD, JKT)')

  const fieldDefs = [
    { name: 'KM7 Mini Soccer', branchId: bsd.id },
    { name: 'Panenka Lakeside Mini Soccer', branchId: bsd.id },
    { name: 'Centro Mini Soccer Utan Jati', branchId: jkt.id },
  ]
  for (const def of fieldDefs) {
    await prisma.field.create({ data: def })
  }
  console.log('  ✓ 3 lapangan dibuat (BSD: KM7, Panenka | JKT: Centro)')

  const admin = await prisma.user.create({
    data: { name: 'Admin SixStars', email: 'admin@ssb.com', password: await bcrypt.hash('admin123', 10), role: 'admin' },
  })
  const headCoach = await prisma.user.create({
    data: { name: 'Budi Santoso', email: 'headcoach@ssb.com', password: await bcrypt.hash('headcoach123', 10), role: 'head_coach', phone: '081234567890', branchId: bsd.id },
  })
  const coach = await prisma.user.create({
    data: { name: 'Andi Wijaya', email: 'coach@ssb.com', password: await bcrypt.hash('coach123', 10), role: 'coach', phone: '081234567891', branchId: bsd.id },
  })
  const parent = await prisma.user.create({
    data: { name: 'Siti Rahayu', email: 'parent@ssb.com', password: await bcrypt.hash('parent123', 10), role: 'parent', phone: '081234567892' },
  })
  console.log('  ✓ 4 akun demo dibuat (admin, head_coach, coach, parent)')

  const packageDefs = [
    { name: '1 Bulan', durationMonths: 1, sessionsPerWeek: 1, price: 550000 },
    { name: '1 Bulan', durationMonths: 1, sessionsPerWeek: 2, price: 750000 },
    { name: '3 Bulan', durationMonths: 3, sessionsPerWeek: 1, price: 1400000 },
    { name: '3 Bulan', durationMonths: 3, sessionsPerWeek: 2, price: 2000000 },
    { name: '6 Bulan', durationMonths: 6, sessionsPerWeek: 1, price: 2500000 },
    { name: '6 Bulan', durationMonths: 6, sessionsPerWeek: 2, price: 3800000 },
  ]
  const packages = []
  for (const def of packageDefs) {
    packages.push(await prisma.package.create({ data: def }))
  }
  const pkg = packages[3] // 3 Bulan / 2 sesi, dipakai untuk student demo
  console.log('  ✓ 6 Package dibuat sesuai tabel harga')

  await prisma.cmsContent.createMany({
    data: [
      {
        section: 'quickStats',
        content: [
          { label: 'Siswa Aktif', value: '500+', icon: 'Users' },
          { label: 'Pelatih Bersertifikat', value: '15+', icon: 'Award' },
          { label: 'Lapangan Latihan', value: '5+', icon: 'MapPin' },
          { label: 'Tahun Berdiri', value: '2024', icon: 'Calendar' },
        ],
      },
      {
        section: 'programs',
        content: [
          { title: 'Grassroots (U-6 - U-8)', desc: 'Pengenalan dasar teknik, koordinasi, dan kecintaan pada sepak bola.' },
          { title: 'Development (U-9 - U-12)', desc: 'Penguatan taktik, fisik, dan mental bertanding.' },
          { title: 'Elite (U-13 - U-16)', desc: 'Persiapan jenjang untuk kompetitif.' },
        ],
      },
      {
        section: 'schedulePreview',
        content: [
          { branch: 'Serpong - BSD', ageGroup: 'U-6 - U-8', day: 'Kamis & Sabtu', time: '16.00 - 18.00 (Kamis) · 08.00 - 10.00 (Sabtu)', location: 'KM7 Mini Soccer / Panenka Lakeside', mapsUrl: 'https://maps.google.com/?q=KM7+Mini+Soccer+BSD' },
          { branch: 'Serpong - BSD', ageGroup: 'U-9 - U-12', day: 'Kamis & Sabtu', time: '16.00 - 18.00 (Kamis) · 08.00 - 10.00 (Sabtu)', location: 'KM7 Mini Soccer / Panenka Lakeside', mapsUrl: 'https://maps.google.com/?q=KM7+Mini+Soccer+BSD' },
          { branch: 'Serpong - BSD', ageGroup: 'U-13 - U-16', day: 'Kamis & Sabtu', time: '16.00 - 18.00 (Kamis) · 08.00 - 10.00 (Sabtu)', location: 'KM7 Mini Soccer / Panenka Lakeside', mapsUrl: 'https://maps.google.com/?q=KM7+Mini+Soccer+BSD' },
          { branch: 'Jakarta', ageGroup: 'U-6 - U-8', day: 'Rabu', time: '16.00 - 18.00', location: 'Centro Mini Soccer Utan Jati', mapsUrl: 'https://maps.google.com/?q=Centro+Mini+Soccer+Utan+Jati' },
          { branch: 'Jakarta', ageGroup: 'U-9 - U-12', day: 'Rabu', time: '16.00 - 18.00', location: 'Centro Mini Soccer Utan Jati', mapsUrl: 'https://maps.google.com/?q=Centro+Mini+Soccer+Utan+Jati' },
          { branch: 'Jakarta', ageGroup: 'U-13 - U-16', day: 'Rabu', time: '16.00 - 18.00', location: 'Centro Mini Soccer Utan Jati', mapsUrl: 'https://maps.google.com/?q=Centro+Mini+Soccer+Utan+Jati' },
        ],
      },
      { section: 'gallery', content: [] },
      { section: 'sponsors', content: [] },
    ],
  })
  console.log('  ✓ Konten CMS awal dibuat')

  const packageStartDate = new Date()
  const packageEndDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
  const student = await prisma.student.create({
    data: {
      userId: parent.id,
      studentId: 'SS-0001',
      fullName: 'Ananda Rahayu',
      dateOfBirth: new Date('2015-03-12'),
      position: 'CM',
      ageGroup: 'U-12',
      parentName: parent.name,
      parentPhone: parent.phone,
      parentEmail: parent.email,
      address: 'Jl. Merdeka No. 10, Jakarta',
      packageId: pkg.id,
      packageStartDate,
      packageEndDate,
      branchId: bsd.id,
    },
  })
  console.log('  ✓ Student demo dibuat untuk akun parent')

  await prisma.studentCard.create({
    data: { studentId: student.id, qrCode: crypto.randomBytes(16).toString('hex'), cardNumber: student.studentId },
  })
  console.log('  ✓ Kartu QR siswa demo dibuat')

  await prisma.payment.create({
    data: {
      studentId: student.id,
      packageId: pkg.id,
      amount: pkg.price,
      registrationFee: 750000,
      totalAmount: pkg.price + 750000,
      paymentType: 'registration',
      status: 'success',
      paymentMethod: 'transfer',
      paidAt: packageStartDate,
    },
  })
  console.log('  ✓ Payment demo dibuat (lunas)')

  // Jadwal latihan is date-based (not recurring by weekday) — seed a couple
  // of upcoming demo dates, all assigned to the head coach (only head_coach
  // users are assignable, per Pengaturan Jadwal).
  const nextWeekday = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d }
  await prisma.schedule.createMany({
    data: [
      { date: nextWeekday(1), startTime: '15.00', endTime: '16.30', location: 'Lapangan A', coachId: headCoach.id, branchId: bsd.id },
      { date: nextWeekday(3), startTime: '16.00', endTime: '18.00', location: 'Lapangan B', coachId: headCoach.id, branchId: bsd.id },
      { date: nextWeekday(5), startTime: '15.30', endTime: '17.30', location: 'Lapangan C', coachId: headCoach.id, branchId: bsd.id },
    ],
  })
  console.log('  ✓ Jadwal latihan demo dibuat')

  const branchPriceDefs = [
    { branchId: jkt.id, packageId: packages[0].id, price: 650000 },
    { branchId: jkt.id, packageId: packages[1].id, price: 900000 },
    { branchId: jkt.id, packageId: packages[2].id, price: 1500000 },
    { branchId: jkt.id, packageId: packages[3].id, price: 2150000 },
    { branchId: jkt.id, packageId: packages[4].id, price: 2600000 },
    { branchId: jkt.id, packageId: packages[5].id, price: 3950000 },
  ]
  for (const def of branchPriceDefs) {
    await prisma.branchPackage.create({ data: def })
  }
  console.log('  ✓ 6 Harga paket JKT disesuaikan (650k–3.95M)')

  console.log('Seeding complete!')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
