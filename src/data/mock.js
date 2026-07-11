export const quickStats = [
  { label: 'Siswa Aktif', value: '500+', icon: 'Users' },
  { label: 'Pelatih Bersertifikat', value: '15+', icon: 'Award' },
  { label: 'Lapangan Latihan', value: '5+', icon: 'MapPin' },
  { label: 'Tahun Berdiri', value: 'Sejak 2015', icon: 'Calendar' },
]

export const programs = [
  {
    id: 'u10',
    ageGroup: 'U-10',
    title: 'Early Development',
    description:
      'Program dasar untuk memperkenalkan teknik fundamental sepak bola. Fokus pada koordinasi motorik, keseimbangan, dan kecintaan terhadap olahraga.',
    focus: ['Basic Ball Control', 'Motor Coordination', 'Fun Games', 'Team Play Basics'],
    status: 'open',
    statusText: 'Pendaftaran Dibuka',
    color: 'emerald',
  },
  {
    id: 'u12',
    ageGroup: 'U-12',
    title: 'Pre-Academy',
    description:
      'Tahap pengembangan lanjutan dengan kurikulum terstruktur. Mulai diperkenalkan taktik dasar, passing patterns, dan positioning.',
    focus: ['Passing & Receiving', 'Dribbling Technique', 'Positional Play', 'Small-Sided Games'],
    status: 'limited',
    statusText: 'Sisa 5 Kursi',
    color: 'amber',
  },
  {
    id: 'u15',
    ageGroup: 'U-15',
    title: 'Youth Academy',
    description:
      'Program elite untuk pemain berbakat. Latihan intensif dengan pendekatan taktik modern, analisis performa, dan persiapan kompetisi.',
    focus: ['Tactical Formation', 'Match Analysis', 'Set Pieces', 'Physical Conditioning'],
    status: 'closed',
    statusText: 'Pendaftaran Ditutup',
    color: 'rose',
  },
]

export const schedules = {
  u10: [
    { day: 'Selasa', time: '16:00 - 18:00 WIB', focus: 'Basic Drills & Agility', coach: 'Coach Andi Pratama' },
    { day: 'Kamis', time: '16:00 - 18:00 WIB', focus: 'Ball Control Fundamentals', coach: 'Coach Andi Pratama' },
    { day: 'Sabtu', time: '07:00 - 09:00 WIB', focus: 'Fun Match & Coordination', coach: 'Coach Dedi Kurniawan' },
  ],
  u12: [
    { day: 'Senin', time: '16:00 - 18:30 WIB', focus: 'Passing & Positioning', coach: 'Coach Rudi Hartono' },
    { day: 'Rabu', time: '16:00 - 18:30 WIB', focus: 'Dribbling & 1v1', coach: 'Coach Rudi Hartono' },
    { day: 'Sabtu', time: '09:00 - 11:30 WIB', focus: 'Small-Sided Games', coach: 'Coach Rudi Hartono' },
  ],
  u15: [
    { day: 'Senin', time: '16:30 - 19:00 WIB', focus: 'Tactical Formation', coach: 'Coach Firman Syah' },
    { day: 'Rabu', time: '16:30 - 19:00 WIB', focus: 'Match Analysis & Set Pieces', coach: 'Coach Firman Syah' },
    { day: 'Jumat', time: '16:30 - 19:00 WIB', focus: 'Physical Conditioning', coach: 'Coach Bayu Saputra' },
    { day: 'Minggu', time: '07:00 - 10:00 WIB', focus: 'Full Match Simulation', coach: 'Coach Firman Syah' },
  ],
}

export const venues = {
  main: {
    name: 'Lapangan Six Star Arena',
    address: 'Jl. Olahraga No. 15, Kel. Sukamaju, Kec. Cimahi Utara, Kota Cimahi, Jawa Barat 40512',
    mapsUrl: 'https://maps.google.com/?q=-6.8723,107.5426',
    facilities: ['Lapangan Berstandar FIFA', 'Ruang Ganti', 'Tribun Penonton', 'Café'],
  },
  secondary: {
    name: 'Lapangan Training Center',
    address: 'Jl. Latihan No. 8, Kel. Cibabat, Kec. Cimahi Utara, Kota Cimahi, Jawa Barat 40513',
    mapsUrl: 'https://maps.google.com/?q=-6.8801,107.5350',
    facilities: ['2 Lapangan Latihan', 'Fitness Room', 'Ruang Meeting', 'Parkir Luas'],
  },
}

export const gallery = [
  { id: 1, src: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80', title: 'Latihan Dribbling U-12', date: '15 Juni 2026', category: 'Latihan' },
  { id: 2, src: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800&q=80', title: 'Turnamen Piala Six Star', date: '10 Juni 2026', category: 'Turnamen' },
  { id: 3, src: 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=800&q=80', title: 'Kegiatan Team Building', date: '5 Juni 2026', category: 'Kegiatan' },
  { id: 4, src: 'https://images.unsplash.com/photo-1553778263-73a83bab9b0c?w=800&q=80', title: 'Sesi Taktik U-15', date: '1 Juni 2026', category: 'Latihan' },
  { id: 5, src: 'https://images.unsplash.com/photo-1459865264687-595d652de67e?w=800&q=80', title: 'Final Turnamen Kategori U-10', date: '28 Mei 2026', category: 'Turnamen' },
  { id: 6, src: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&q=80', title: 'Kunjungan Orang Tua', date: '20 Mei 2026', category: 'Kegiatan' },
  { id: 7, src: 'https://images.unsplash.com/photo-1626248801379-51a0748a5f96?w=800&q=80', title: 'Latihan Fisih U-15', date: '15 Mei 2026', category: 'Latihan' },
  { id: 8, src: 'https://images.unsplash.com/photo-1511882150382-421056c89033?w=800&q=80', title: 'Pertandingan Persahabatan', date: '10 Mei 2026', category: 'Turnamen' },
  { id: 9, src: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&q=80', title: 'Sosialisasi Akademi', date: '5 Mei 2026', category: 'Kegiatan' },
  { id: 10, src: 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800&q=80', title: 'Latihan Passing U-12', date: '1 Mei 2026', category: 'Latihan' },
  { id: 11, src: 'https://images.unsplash.com/photo-1577471488278-16eec37ffcc2?w=800&q=80', title: 'Award Ceremony', date: '25 April 2026', category: 'Kegiatan' },
]

export const sponsors = {
  platinum: [
    { name: 'Nike Indonesia', logo: 'https://logo.clearbit.com/nike.com', type: 'Apparel & Equipment' },
    { name: 'Bank Mandiri', logo: 'https://logo.clearbit.com/bankmandiri.co.id', type: 'Financial Partner' },
  ],
  official: [
    { name: 'PSSI', logo: 'https://logo.clearbit.com/pssi.org', type: 'Football Association' },
    { name: 'Liga Indonesia', logo: 'https://logo.clearbit.com/ligaindonesiabaru.com', type: 'League Partner' },
    { name: 'SportOne', logo: 'https://logo.clearbit.com/sportone.com', type: 'Sports Retail' },
  ],
  media: [
    { name: 'Sport7', logo: 'https://logo.clearbit.com/sport7.com', type: 'Media Partner' },
    { name: 'Bola.net', logo: 'https://logo.clearbit.com/bola.net', type: 'Media Partner' },
    { name: 'Telkomsel', logo: 'https://logo.clearbit.com/telkomsel.com', type: 'Technical Partner' },
    { name: 'Dewa United', logo: 'https://logo.clearbit.com/dewaunited.com', type: 'Technical Partner' },
  ],
}

export const aboutContent = {
  mission: 'Menciptakan ekosistem pembinaan sepak bola usia dini yang profesional, modern, dan berkelanjutan untuk melahirkan bintang-bintang sepak bola masa depan Indonesia.',
  vision: 'Menjadi akademi sepak bola terdepan di Indonesia yang dikenal akan kualitas pembinaan, prestasi konsisten, dan pengembangan karakter pemain secara holistik.',
  values: [
    { title: 'Disiplin', desc: 'Membentuk karakter melalui latihan yang konsisten dan terstruktur.' },
    { title: 'Integritas', desc: 'Menjunjung tinggi nilai sportivitas dan kejujuran dalam setiap aspek.' },
    { title: 'Inovasi', desc: 'Mengadopsi metodologi pelatihan modern berbasis data dan teknologi.' },
  ],
}

export const studentProfile = {
  name: 'Arkananta Putra',
  studentId: '6S-2026-042',
  ageGroup: 'U-12 Pre-Academy',
  avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Arkananta',
}

export const studentMetrics = {
  passing: 82,
  dribbling: 75,
  stamina: 70,
  shooting: 68,
  tactics: 85,
}

export const coachFeedback = {
  name: 'Coach Doni',
  note: 'Akurasi passing dengan kaki kiri sudah meningkat pesat. Pertahankan kerja kerasmu di rumah!',
  avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=CoachDoni',
}

export const attendance = {
  sessionsAttended: 11,
  totalSessions: 12,
  percentage: 91,
}

export const sppData = {
  package: '8 Sesi / Bulan',
  status: 'paid',
  sessionsUsed: 9,
  sessionsPaid: 8,
}

export const mockUsers = [
  {
    email: 'coach@ssb.com',
    password: 'coach123',
    role: 'coach',
    coachName: 'Coach Doni',
    coachTitle: 'Head Coach U-12',
    coachAvatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=CoachDoni',
  },
  {
    email: 'parent@ssb.com',
    password: 'sixstar123',
    parentName: 'Bapak Dwi Putra',
    parentAvatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=PapaDwi',
    child: {
      name: 'Arkananta Putra',
      studentId: '6S-2026-042',
      ageGroup: 'U-12 Pre-Academy',
      avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Arkananta',
      position: 'CM',
      metrics: { passing: 82, dribbling: 75, stamina: 70, shooting: 68, tactics: 85 },
      coachFeedback: {
        name: 'Coach Doni',
        note: 'Akurasi passing dengan kaki kiri sudah meningkat pesat. Pertahankan kerja kerasmu di rumah!',
        avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=CoachDoni',
      },
      attendance: { sessionsAttended: 11, totalSessions: 12, percentage: 91 },
      spp: { package: '8 Sesi / Bulan', status: 'paid', sessionsUsed: 9, sessionsPaid: 8 },
      profile: {
        birthDate: '15 April 2014',
        birthPlace: 'Cimahi, Jawa Barat',
        bloodType: 'O',
        parentName: 'Bapak Dwi Putra',
        parentPhone: '+62 812-3456-7890',
        emergencyContact: 'Ibu Sari (+62 811-2345-6789)',
        address: 'Jl. Merdeka No. 45, Kel. Cimahi, Kec. Cimahi Utara, Kota Cimahi, Jawa Barat 40512',
        medicalHistory: 'Tidak ada riwayat penyakit serius. Alergi debu ringan.',
        school: 'SD Negeri Cimahi 3',
        joinedDate: 'Januari 2025',
        height: '148 cm',
        weight: '40 kg',
        preferredFoot: 'Kanan',
      },
      paymentHistory: [
        { month: 'Januari', year: 2026, status: 'paid', amount: 350000, paidAt: '5 Jan 2026', sessions: 8 },
        { month: 'Februari', year: 2026, status: 'paid', amount: 350000, paidAt: '3 Feb 2026', sessions: 8 },
        { month: 'Maret', year: 2026, status: 'paid', amount: 350000, paidAt: '7 Mar 2026', sessions: 8 },
        { month: 'April', year: 2026, status: 'paid', amount: 350000, paidAt: '2 Apr 2026', sessions: 8 },
        { month: 'Mei', year: 2026, status: 'paid', amount: 350000, paidAt: '6 Mei 2026', sessions: 8 },
        { month: 'Juni', year: 2026, status: 'paid', amount: 350000, paidAt: '4 Jun 2026', sessions: 8 },
        { month: 'Juli', year: 2026, status: 'paid', amount: 350000, paidAt: null, sessions: 8 },
      ],
      schedules: [
        { day: 'Senin', time: '16:00 - 18:30 WIB', focus: 'Passing & Positioning', coach: 'Coach Rudi Hartono', venue: 'Six Star Arena' },
        { day: 'Rabu', time: '16:00 - 18:30 WIB', focus: 'Dribbling & 1v1', coach: 'Coach Rudi Hartono', venue: 'Six Star Arena' },
        { day: 'Sabtu', time: '09:00 - 11:30 WIB', focus: 'Small-Sided Games', coach: 'Coach Rudi Hartono', venue: 'Training Center' },
      ],
    },
  },
]

export const defaultPositions = [
  { id: 'pos-gk', label: 'Kiper', singkatan: 'GK' },
  { id: 'pos-cb', label: 'Bek Tengah', singkatan: 'CB' },
  { id: 'pos-lb', label: 'Bek Kiri', singkatan: 'LB' },
  { id: 'pos-rb', label: 'Bek Kanan', singkatan: 'RB' },
  { id: 'pos-cm', label: 'Gelandang Tengah', singkatan: 'CM' },
  { id: 'pos-cam', label: 'Gelandang Serang', singkatan: 'CAM' },
  { id: 'pos-lw', label: 'Sayap Kiri', singkatan: 'LW' },
  { id: 'pos-rw', label: 'Sayap Kanan', singkatan: 'RW' },
  { id: 'pos-st', label: 'Penyerang', singkatan: 'ST' },
]

export const defaultAgeGroups = [
  { id: 'grp-u10', label: 'U-10', minAge: 6, maxAge: 9 },
  { id: 'grp-u12', label: 'U-12', minAge: 10, maxAge: 12 },
  { id: 'grp-u15', label: 'U-15', minAge: 13, maxAge: 15 },
]

export const coachProfile = {
  name: 'Coach Doni',
  title: 'Head Coach U-12',
  email: 'coach.doni@ssbsixstar.com',
  phone: '+62 812-3456-7890',
  avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=CoachDoni',
  stats: {
    totalStudents: 24,
    weeklySessions: 3,
    avgAttendance: 91,
  },
}

export const coachStudents = [
  {
    id: 'STU-001',
    name: 'Arkananta Putra',
    dateOfBirth: '2014-04-15',
    birthPlace: 'Cimahi',
    address: 'Jl. Merdeka No. 45, Cimahi',
    parentName: 'Bapak Dwi Putra',
    parentPhone: '+62 812-3456-7890',
    avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Arkananta',
    ageGroup: 'U-12',
    position: 'CM',
    metrics: { passing: 82, dribbling: 75, stamina: 70, shooting: 68, tactics: 85 },
    coachNote: 'Akurasi passing dengan kaki kiri sudah meningkat pesat. Pertahankan kerja kerasmu di rumah!',
  },
  {
    id: 'STU-002',
    name: 'Bima Sakti',
    dateOfBirth: '2013-08-22',
    birthPlace: 'Bandung',
    address: 'Jl. Diponegoro No. 12, Bandung',
    parentName: 'Bapak Ahmad Fauzi',
    parentPhone: '+62 813-9876-5432',
    avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=BimaSakti',
    ageGroup: 'U-12',
    position: 'ST',
    metrics: { passing: 70, dribbling: 78, stamina: 85, shooting: 72, tactics: 65 },
    coachNote: 'Fisik dan stamina sangat baik. Tingkatkan visi permainan.',
  },
  {
    id: 'STU-003',
    name: 'Cahyo Nugroho',
    dateOfBirth: '2014-11-03',
    birthPlace: 'Cimahi',
    address: 'Jl. Raya Cimahi No. 78, Cimahi',
    parentName: 'Ibu Siti Rahmawati',
    parentPhone: '+62 817-6543-2109',
    avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=CahyoN',
    ageGroup: 'U-12',
    position: 'CB',
    metrics: { passing: 65, dribbling: 72, stamina: 68, shooting: 75, tactics: 70 },
    coachNote: 'Memiliki tendangan keras. Perbaiki kontrol bola pertama.',
  },
  {
    id: 'STU-004',
    name: 'Dimas Ardiansyah',
    dateOfBirth: '2015-06-18',
    birthPlace: 'Jakarta',
    address: 'Jl. Sudirman No. 34, Jakarta',
    parentName: 'Bapak Hendra Gunawan',
    parentPhone: '+62 811-2223-4455',
    avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=DimasA',
    ageGroup: 'U-10',
    position: 'LW',
    metrics: { passing: 60, dribbling: 65, stamina: 72, shooting: 58, tactics: 55 },
    coachNote: 'Semangat latihan tinggi. Masih perlu banyak latihan dasar.',
  },
  {
    id: 'STU-005',
    name: 'Eko Prasetyo',
    dateOfBirth: '2015-01-25',
    birthPlace: 'Bandung',
    address: 'Jl. Setiabudi No. 56, Bandung',
    parentName: 'Bapak Agus Prasetyo',
    parentPhone: '+62 815-7788-9900',
    avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=EkoP',
    ageGroup: 'U-10',
    position: 'GK',
    metrics: { passing: 55, dribbling: 60, stamina: 65, shooting: 62, tactics: 50 },
    coachNote: 'Koordinasi mata dan kaki masih perlu dilatih. Rajin berlatih.',
  },
  {
    id: 'STU-006',
    name: 'Farhan Hidayat',
    dateOfBirth: '2012-09-12',
    birthPlace: 'Cimahi',
    address: 'Jl. Leuwigajah No. 23, Cimahi',
    parentName: 'Bapak Rudi Hidayat',
    parentPhone: '+62 819-3344-5566',
    avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=FarhanH',
    ageGroup: 'U-12',
    position: 'RB',
    metrics: { passing: 78, dribbling: 70, stamina: 75, shooting: 80, tactics: 73 },
    coachNote: 'Penempatan posisi bagus. Tingkatkan stamina untuk bermain penuh.',
  },
  {
    id: 'STU-007',
    name: 'Gilang Permana',
    dateOfBirth: '2011-03-08',
    birthPlace: 'Bandung',
    address: 'Jl. Buah Batu No. 88, Bandung',
    parentName: 'Ibu Dewi Sartika',
    parentPhone: '+62 812-6677-8899',
    avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=GilangP',
    ageGroup: 'U-15',
    position: 'CAM',
    metrics: { passing: 85, dribbling: 80, stamina: 78, shooting: 82, tactics: 88 },
    coachNote: 'Kapten tim. Kepemimpinan dan visi bermain sangat baik.',
  },
  {
    id: 'STU-008',
    name: 'Hafiz Ramadhan',
    dateOfBirth: '2011-07-21',
    birthPlace: 'Cimahi',
    address: 'Jl. Cimindi No. 15, Cimahi',
    parentName: 'Bapak Yusuf Ramadhan',
    parentPhone: '+62 813-9900-1122',
    avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=HafizR',
    ageGroup: 'U-15',
    position: 'LB',
    metrics: { passing: 72, dribbling: 68, stamina: 80, shooting: 75, tactics: 70 },
    coachNote: 'Kecepatan lari bagus. Asah teknik dribbling.',
  },
  {
    id: 'STU-009',
    name: 'Iqbal Maulana',
    dateOfBirth: '2016-12-05',
    birthPlace: 'Jakarta',
    address: 'Jl. Kemang No. 67, Jakarta',
    parentName: 'Ibu Rina Maulana',
    parentPhone: '+62 817-2233-4455',
    avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=IqbalM',
    ageGroup: 'U-10',
    position: 'RW',
    metrics: { passing: 50, dribbling: 55, stamina: 60, shooting: 48, tactics: 45 },
    coachNote: 'Baru bergabung 2 bulan. Progress bagus untuk pemula.',
  },
  {
    id: 'STU-010',
    name: 'Joko Susanto',
    dateOfBirth: '2011-11-30',
    birthPlace: 'Bandung',
    address: 'Jl. Cicadas No. 90, Bandung',
    parentName: 'Bapak Sukirman',
    parentPhone: '+62 815-5566-7788',
    avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=JokoS',
    ageGroup: 'U-15',
    position: 'CM',
    metrics: { passing: 76, dribbling: 85, stamina: 72, shooting: 70, tactics: 78 },
    coachNote: 'Dribbling lincah dan sulit diambil bolanya. Tingkatkan penyelesaian akhir.',
  },
]

export const coachSchedule = [
  { day: 'Kamis', venue: 'KM7 MiniSoccer', time: '16:00 - 18:00 WIB', startHour: 16, group: 'U-12', focus: 'Teknik Dasar & Sirkuit' },
  { day: 'Sabtu', venue: 'Panenka Lakeside Soccer', time: '08:00 - 10:00 WIB', startHour: 8, group: 'U-12', focus: 'Game & Taktik' },
]

export const navLinks = [
  { label: 'Beranda', path: '/' },
  { label: 'Program', path: '/programs' },
  { label: 'Jadwal', path: '/schedule' },
  { label: 'Galeri', path: '/gallery' },
  { label: 'Sponsor', path: '/sponsors' },
]
