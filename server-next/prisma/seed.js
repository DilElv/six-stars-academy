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
  await prisma.trainingSession.deleteMany()
  await prisma.schedule.deleteMany()
  await prisma.student.deleteMany()
  await prisma.package.deleteMany()
  await prisma.cmsContent.deleteMany()
  await prisma.user.deleteMany()
  await prisma.branch.deleteMany()

  const branchDefs = [
    { name: 'Tangerang', code: 'TGR' },
    { name: 'Bogor', code: 'BGR' },
    { name: 'Jakarta', code: 'JKT' },
  ]
  const branches = []
  for (const def of branchDefs) branches.push(await prisma.branch.create({ data: def }))
  const [tgr] = branches
  console.log('  ✓ 3 cabang dibuat (TGR, BGR, JKT)')

  const admin = await prisma.user.create({
    data: { name: 'Admin SixStars', email: 'admin@ssb.com', password: await bcrypt.hash('admin123', 10), role: 'admin' },
  })
  const headCoach = await prisma.user.create({
    data: { name: 'Budi Santoso', email: 'headcoach@ssb.com', password: await bcrypt.hash('headcoach123', 10), role: 'head_coach', phone: '081234567890', branchId: tgr.id },
  })
  const coach = await prisma.user.create({
    data: { name: 'Andi Wijaya', email: 'coach@ssb.com', password: await bcrypt.hash('coach123', 10), role: 'coach', phone: '081234567891', branchId: tgr.id },
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
          { label: 'Tahun Berdiri', value: 'Sejak 2015', icon: 'Calendar' },
        ],
      },
      {
        section: 'programs',
        content: [
          { title: 'Grassroots (U-8 - U-12)', desc: 'Pengenalan dasar teknik, koordinasi, dan kecintaan pada sepak bola.' },
          { title: 'Development (U-14 - U-16)', desc: 'Penguatan taktik, fisik, dan mental bertanding.' },
          { title: 'Elite (U-18)', desc: 'Persiapan jenjang kompetitif dan seleksi klub.' },
        ],
      },
      {
        section: 'schedulePreview',
        content: [
          { ageGroup: 'U-10', day: 'Selasa & Kamis', time: '16.00 - 18.00 WIB' },
          { ageGroup: 'U-12', day: 'Senin & Rabu', time: '16.00 - 18.00 WIB' },
          { ageGroup: 'U-14', day: 'Jumat & Sabtu', time: '15.30 - 17.30 WIB' },
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
      branchId: tgr.id,
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

  await prisma.schedule.createMany({
    data: [
      { ageGroup: 'U-8', day: 'Senin & Rabu', startTime: '15.00', endTime: '16.30', location: 'Lapangan A', coachId: coach.id, branchId: tgr.id },
      { ageGroup: 'U-10', day: 'Selasa & Kamis', startTime: '16.00', endTime: '18.00', location: 'Lapangan A', coachId: coach.id, branchId: tgr.id },
      { ageGroup: 'U-12', day: 'Senin & Rabu', startTime: '16.00', endTime: '18.00', location: 'Lapangan B', coachId: headCoach.id, branchId: tgr.id },
      { ageGroup: 'U-14', day: 'Jumat & Sabtu', startTime: '15.30', endTime: '17.30', location: 'Lapangan B', coachId: headCoach.id, branchId: tgr.id },
      { ageGroup: 'U-16', day: 'Selasa & Jumat', startTime: '16.00', endTime: '18.00', location: 'Lapangan C', coachId: headCoach.id, branchId: tgr.id },
      { ageGroup: 'U-18', day: 'Senin, Rabu & Jumat', startTime: '17.00', endTime: '19.00', location: 'Lapangan C', coachId: headCoach.id, branchId: tgr.id },
    ],
  })
  console.log('  ✓ Jadwal latihan demo dibuat')

  console.log('Seeding complete!')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
