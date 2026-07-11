import pool from './db.js'

async function seed() {
  console.log('Seeding database...')

  await pool.query(`DELETE FROM attendance; DELETE FROM sessions; DELETE FROM metrics; DELETE FROM payments; DELETE FROM students; DELETE FROM coaches; DELETE FROM schedules; DELETE FROM age_groups; DELETE FROM positions; DELETE FROM site_content; DELETE FROM profiles;`)

  // Seed positions
  const positions = [
    { label: 'Kiper', singkatan: 'GK' },
    { label: 'Bek Tengah', singkatan: 'CB' },
    { label: 'Bek Kiri', singkatan: 'LB' },
    { label: 'Bek Kanan', singkatan: 'RB' },
    { label: 'Gelandang Tengah', singkatan: 'CM' },
    { label: 'Gelandang Serang', singkatan: 'CAM' },
    { label: 'Sayap Kiri', singkatan: 'LW' },
    { label: 'Sayap Kanan', singkatan: 'RW' },
    { label: 'Penyerang', singkatan: 'ST' },
  ]
  const posMap = {}
  for (const p of positions) {
    const r = await pool.query(
      `INSERT INTO positions (label, singkatan) VALUES ($1,$2) ON CONFLICT (singkatan) DO UPDATE SET label=EXCLUDED.label RETURNING id`,
      [p.label, p.singkatan]
    )
    posMap[p.singkatan] = r.rows[0].id
  }
  console.log('  ✓ Positions seeded')

  // Seed age groups
  const ageGroups = [
    { label: 'U-10', minAge: 6, maxAge: 9 },
    { label: 'U-12', minAge: 10, maxAge: 12 },
    { label: 'U-15', minAge: 13, maxAge: 15 },
  ]
  const agMap = {}
  for (const ag of ageGroups) {
    const r = await pool.query(
      `INSERT INTO age_groups (label, min_age, max_age) VALUES ($1,$2,$3) RETURNING id`,
      [ag.label, ag.minAge, ag.maxAge]
    )
    agMap[ag.label] = r.rows[0].id
  }
  console.log('  ✓ Age groups seeded')

  // Seed admin
  const bcrypt = (await import('bcryptjs')).default
  const hashedAdmin = await bcrypt.hash('admin123', 10)
  const adminResult = await pool.query(
    `INSERT INTO profiles (email, password, name, role, avatar) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name RETURNING id`,
    ['admin@ssb.com', hashedAdmin, 'Admin SSB', 'admin', 'https://api.dicebear.com/9.x/avataaars/svg?seed=AdminSSB']
  )
  console.log('  ✓ Admin seeded (admin@ssb.com / admin123)')

  // Seed coach
  const hashedCoach = await bcrypt.hash('coach123', 10)
  const coachResult = await pool.query(
    `INSERT INTO profiles (email, password, name, role, avatar) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name RETURNING id`,
    ['coach@ssb.com', hashedCoach, 'Coach Doni', 'coach', 'https://api.dicebear.com/9.x/avataaars/svg?seed=CoachDoni']
  )
  await pool.query(
    `INSERT INTO coaches (profile_id, title) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [coachResult.rows[0].id, 'Head Coach U-12']
  )
  console.log('  ✓ Coach seeded (coach@ssb.com / coach123)')

  // Seed parent
  const hashedParent = await bcrypt.hash('sixstar123', 10)
  const parentResult = await pool.query(
    `INSERT INTO profiles (email, password, name, role, avatar) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name RETURNING id`,
    ['parent@ssb.com', hashedParent, 'Bapak Dwi Putra', 'parent', 'https://api.dicebear.com/9.x/avataaars/svg?seed=PapaDwi']
  )

  // Seed students
  const studentData = [
    { name: 'Arkananta Putra', dob: '2014-04-15', place: 'Cimahi', addr: 'Jl. Merdeka No. 45, Cimahi', parentName: 'Bapak Dwi Putra', parentPhone: '+62 812-3456-7890', ageGroup: 'U-12', position: 'CM', metrics: { passing: 82, dribbling: 75, stamina: 70, shooting: 68, tactics: 85 }, note: 'Akurasi passing dengan kaki kiri sudah meningkat pesat. Pertahankan kerja kerasmu di rumah!' },
    { name: 'Bima Sakti', dob: '2013-08-22', place: 'Bandung', addr: 'Jl. Diponegoro No. 12, Bandung', parentName: 'Bapak Ahmad Fauzi', parentPhone: '+62 813-9876-5432', ageGroup: 'U-12', position: 'ST', metrics: { passing: 70, dribbling: 78, stamina: 85, shooting: 72, tactics: 65 }, note: 'Fisik dan stamina sangat baik. Tingkatkan visi permainan.' },
    { name: 'Cahyo Nugroho', dob: '2014-11-03', place: 'Cimahi', addr: 'Jl. Raya Cimahi No. 78, Cimahi', parentName: 'Ibu Siti Rahmawati', parentPhone: '+62 817-6543-2109', ageGroup: 'U-12', position: 'CB', metrics: { passing: 65, dribbling: 72, stamina: 68, shooting: 75, tactics: 70 }, note: 'Memiliki tendangan keras. Perbaiki kontrol bola pertama.' },
    { name: 'Dimas Ardiansyah', dob: '2015-06-18', place: 'Jakarta', addr: 'Jl. Sudirman No. 34, Jakarta', parentName: 'Bapak Hendra Gunawan', parentPhone: '+62 811-2223-4455', ageGroup: 'U-10', position: 'LW', metrics: { passing: 60, dribbling: 65, stamina: 72, shooting: 58, tactics: 55 }, note: 'Semangat latihan tinggi. Masih perlu banyak latihan dasar.' },
    { name: 'Eko Prasetyo', dob: '2015-01-25', place: 'Bandung', addr: 'Jl. Setiabudi No. 56, Bandung', parentName: 'Bapak Agus Prasetyo', parentPhone: '+62 815-7788-9900', ageGroup: 'U-10', position: 'GK', metrics: { passing: 55, dribbling: 60, stamina: 65, shooting: 62, tactics: 50 }, note: 'Koordinasi mata dan kaki masih perlu dilatih. Rajin berlatih.' },
    { name: 'Farhan Hidayat', dob: '2012-09-12', place: 'Cimahi', addr: 'Jl. Leuwigajah No. 23, Cimahi', parentName: 'Bapak Rudi Hidayat', parentPhone: '+62 819-3344-5566', ageGroup: 'U-12', position: 'RB', metrics: { passing: 78, dribbling: 70, stamina: 75, shooting: 80, tactics: 73 }, note: 'Penempatan posisi bagus. Tingkatkan stamina untuk bermain penuh.' },
    { name: 'Gilang Permana', dob: '2011-03-08', place: 'Bandung', addr: 'Jl. Buah Batu No. 88, Bandung', parentName: 'Ibu Dewi Sartika', parentPhone: '+62 812-6677-8899', ageGroup: 'U-15', position: 'CAM', metrics: { passing: 85, dribbling: 80, stamina: 78, shooting: 82, tactics: 88 }, note: 'Kapten tim. Kepemimpinan dan visi bermain sangat baik.' },
    { name: 'Hafiz Ramadhan', dob: '2011-07-21', place: 'Cimahi', addr: 'Jl. Cimindi No. 15, Cimahi', parentName: 'Bapak Yusuf Ramadhan', parentPhone: '+62 813-9900-1122', ageGroup: 'U-15', position: 'LB', metrics: { passing: 72, dribbling: 68, stamina: 80, shooting: 75, tactics: 70 }, note: 'Kecepatan lari bagus. Asah teknik dribbling.' },
    { name: 'Iqbal Maulana', dob: '2016-12-05', place: 'Jakarta', addr: 'Jl. Kemang No. 67, Jakarta', parentName: 'Ibu Rina Maulana', parentPhone: '+62 817-2233-4455', ageGroup: 'U-10', position: 'RW', metrics: { passing: 50, dribbling: 55, stamina: 60, shooting: 48, tactics: 45 }, note: 'Baru bergabung 2 bulan. Progress bagus untuk pemula.' },
    { name: 'Joko Susanto', dob: '2011-11-30', place: 'Bandung', addr: 'Jl. Cicadas No. 90, Bandung', parentName: 'Bapak Sukirman', parentPhone: '+62 815-5566-7788', ageGroup: 'U-15', position: 'CM', metrics: { passing: 76, dribbling: 85, stamina: 72, shooting: 70, tactics: 78 }, note: 'Dribbling lincah dan sulit diambil bolanya. Tingkatkan penyelesaian akhir.' },
  ]

  for (const st of studentData) {
    const s = await pool.query(
      `INSERT INTO students (name, date_of_birth, birth_place, address, parent_name, parent_phone, age_group_id, position_id, parent_id, avatar, joined_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [
        st.name, st.dob, st.place, st.addr, st.parentName, st.parentPhone,
        agMap[st.ageGroup], posMap[st.position],
        st.parentName === 'Bapak Dwi Putra' ? parentResult.rows[0].id : null,
        `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(st.name.replace(/\s/g, ''))}`,
        'Januari 2025',
      ]
    )
    const studentId = s.rows[0].id

    await pool.query(
      `INSERT INTO metrics (student_id, passing, dribbling, stamina, shooting, tactics, coach_note) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [studentId, st.metrics.passing, st.metrics.dribbling, st.metrics.stamina, st.metrics.shooting, st.metrics.tactics, st.note]
    )

    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni']
    for (const month of months) {
      await pool.query(
        `INSERT INTO payments (student_id, month, year, amount, status) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
        [studentId, month, 2026, 350000, 'paid']
      )
    }
    await pool.query(
      `INSERT INTO payments (student_id, month, year, amount, status) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
      [studentId, 'Juli', 2026, 350000, 'unpaid']
    )
  }
  console.log('  ✓ 10 students seeded')

  // Seed schedules
  const schedules = [
    { day: 'Selasa', time: '16:00 - 18:00 WIB', venue: 'KM7 MiniSoccer', focus: 'Teknik Dasar & Sirkuit', agLabel: 'U-12' },
    { day: 'Kamis', time: '16:00 - 18:00 WIB', venue: 'KM7 MiniSoccer', focus: 'Teknik Dasar & Sirkuit', agLabel: 'U-12' },
    { day: 'Sabtu', time: '08:00 - 10:00 WIB', venue: 'Panenka Lakeside Soccer', focus: 'Game & Taktik', agLabel: 'U-12' },
  ]
  for (const sch of schedules) {
    await pool.query(
      `INSERT INTO schedules (day, time, venue, focus, age_group_id) VALUES ($1,$2,$3,$4,$5)`,
      [sch.day, sch.time, sch.venue, sch.focus, agMap[sch.agLabel]]
    )
  }
  console.log('  ✓ Schedules seeded')

  // Seed site content
  const contentData = {
    quickStats: [
      { label: 'Siswa Aktif', value: '500+', icon: 'Users' },
      { label: 'Pelatih Bersertifikat', value: '15+', icon: 'Award' },
      { label: 'Lapangan Latihan', value: '5+', icon: 'MapPin' },
      { label: 'Tahun Berdiri', value: 'Sejak 2015', icon: 'Calendar' },
    ],
    programs: [
      { id: 'u10', ageGroup: 'U-10', title: 'Early Development', description: 'Program dasar untuk memperkenalkan teknik fundamental sepak bola.', focus: ['Basic Ball Control', 'Motor Coordination', 'Fun Games', 'Team Play Basics'], status: 'open', statusText: 'Pendaftaran Dibuka', color: 'emerald' },
      { id: 'u12', ageGroup: 'U-12', title: 'Pre-Academy', description: 'Tahap pengembangan lanjutan dengan kurikulum terstruktur.', focus: ['Passing & Receiving', 'Dribbling Technique', 'Positional Play', 'Small-Sided Games'], status: 'limited', statusText: 'Sisa 5 Kursi', color: 'amber' },
      { id: 'u15', ageGroup: 'U-15', title: 'Youth Academy', description: 'Program elite untuk pemain berbakat.', focus: ['Tactical Formation', 'Match Analysis', 'Set Pieces', 'Physical Conditioning'], status: 'closed', statusText: 'Pendaftaran Ditutup', color: 'rose' },
    ],
    venues: {
      main: { name: 'Lapangan Six Star Arena', address: 'Jl. Olahraga No. 15, Cimahi', mapsUrl: 'https://maps.google.com/?q=-6.8723,107.5426', facilities: ['Lapangan Berstandar FIFA', 'Ruang Ganti', 'Tribun Penonton', 'Café'] },
      secondary: { name: 'Lapangan Training Center', address: 'Jl. Latihan No. 8, Cimahi', mapsUrl: 'https://maps.google.com/?q=-6.8801,107.5350', facilities: ['2 Lapangan Latihan', 'Fitness Room', 'Ruang Meeting', 'Parkir Luas'] },
    },
    gallery: [
      { id: 1, src: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80', title: 'Latihan Dribbling U-12', date: '15 Juni 2026', category: 'Latihan' },
      { id: 2, src: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800&q=80', title: 'Turnamen Piala Six Star', date: '10 Juni 2026', category: 'Turnamen' },
      { id: 3, src: 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=800&q=80', title: 'Kegiatan Team Building', date: '5 Juni 2026', category: 'Kegiatan' },
    ],
    sponsors: {
      platinum: [{ name: 'Nike Indonesia', logo: 'https://logo.clearbit.com/nike.com', type: 'Apparel & Equipment' }],
      official: [{ name: 'PSSI', logo: 'https://logo.clearbit.com/pssi.org', type: 'Football Association' }],
      media: [{ name: 'Sport7', logo: 'https://logo.clearbit.com/sport7.com', type: 'Media Partner' }],
    },
    aboutContent: {
      mission: 'Menciptakan ekosistem pembinaan sepak bola usia dini yang profesional.',
      vision: 'Menjadi akademi sepak bola terdepan di Indonesia.',
      values: [
        { title: 'Disiplin', desc: 'Membentuk karakter melalui latihan yang konsisten.' },
        { title: 'Integritas', desc: 'Menjunjung tinggi nilai sportivitas.' },
        { title: 'Inovasi', desc: 'Mengadopsi metodologi pelatihan modern.' },
      ],
    },
  }

  for (const [section, data] of Object.entries(contentData)) {
    await pool.query(
      `INSERT INTO site_content (section, data) VALUES ($1, $2) ON CONFLICT (section) DO UPDATE SET data = $2`,
      [section, JSON.stringify(data)]
    )
  }
  console.log('  ✓ Site content seeded')

  console.log('Seeding complete!')
  await pool.end()
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
