const API_URL = 'http://localhost:3002/api'

export const defaultStats = [
  { label: 'Siswa Aktif', value: '500+', icon: 'Users' },
  { label: 'Pelatih Bersertifikat', value: '15+', icon: 'Award' },
  { label: 'Lapangan Latihan', value: '5+', icon: 'MapPin' },
  { label: 'Tahun Berdiri', value: '2024', icon: 'Calendar' },
]

export const defaultPrograms = [
  { title: 'Grassroots (U-6 - U-8)', desc: 'Pengenalan dasar teknik, koordinasi, dan kecintaan pada sepak bola.' },
  { title: 'Development (U-9 - U-12)', desc: 'Penguatan taktik, fisik, dan mental bertanding.' },
  { title: 'Elite (U-13 - U-16)', desc: 'Persiapan jenjang untuk kompetitif.' },
]

// Presentational detail matched by index to defaultPrograms / CMS `programs` —
// not stored in CMS since it mirrors the fixed 4-pillar assessment system
// (see lib/assessmentFields.js), not per-tier editable copy.
export const programDetails = [
  {
    ageGroups: ['U-6', 'U-7', 'U-8'],
    sessionsPerWeek: '1-2x seminggu',
    focus: { teknik: 70, taktik: 15, fisik: 10, mental: 5 },
    highlights: [
      'Kontrol bola, passing, dribbling dasar',
      'Koordinasi gerak & keseimbangan tubuh',
      'Permainan kecil (small-sided games) untuk membangun kecintaan pada bola',
      'Pengenalan aturan dasar & sportivitas',
    ],
  },
  {
    ageGroups: ['U-9', 'U-10', 'U-11', 'U-12'],
    sessionsPerWeek: '2x seminggu',
    focus: { teknik: 35, taktik: 35, fisik: 20, mental: 10 },
    highlights: [
      'Prinsip taktik menyerang & bertahan (possession, transisi, zonal defending)',
      'Peningkatan kekuatan, kecepatan, dan daya tahan',
      'Pengambilan keputusan dalam situasi permainan nyata',
      'Latihan posisi & peran spesifik di lapangan',
    ],
  },
  {
    ageGroups: ['U-13', 'U-14', 'U-15', 'U-16'],
    sessionsPerWeek: '2-3x seminggu',
    focus: { teknik: 25, taktik: 30, fisik: 25, mental: 20 },
    highlights: [
      'Simulasi pertandingan kompetitif & analisis performa',
      'Kesiapan fisik level kompetisi (speed endurance, power, reaction)',
      'Kepemimpinan, komunikasi, dan mental bertanding',
      'Persiapan seleksi klub & jenjang kompetitif lanjutan',
    ],
  },
]

export const defaultSchedule = [
  { branch: 'Serpong - BSD', ageGroup: 'U-6 - U-8', day: 'Kamis & Sabtu', time: '16.00 - 18.00 (Kamis) · 08.00 - 10.00 (Sabtu)', location: 'KM7 Mini Soccer / Panenka Lakeside', mapsUrl: 'https://maps.google.com/?q=KM7+Mini+Soccer+BSD' },
  { branch: 'Serpong - BSD', ageGroup: 'U-9 - U-12', day: 'Kamis & Sabtu', time: '16.00 - 18.00 (Kamis) · 08.00 - 10.00 (Sabtu)', location: 'KM7 Mini Soccer / Panenka Lakeside', mapsUrl: 'https://maps.google.com/?q=KM7+Mini+Soccer+BSD' },
  { branch: 'Serpong - BSD', ageGroup: 'U-13 - U-16', day: 'Kamis & Sabtu', time: '16.00 - 18.00 (Kamis) · 08.00 - 10.00 (Sabtu)', location: 'KM7 Mini Soccer / Panenka Lakeside', mapsUrl: 'https://maps.google.com/?q=KM7+Mini+Soccer+BSD' },
  { branch: 'Jakarta', ageGroup: 'U-6 - U-8', day: 'Rabu', time: '16.00 - 18.00', location: 'Centro Mini Soccer Utan Jati', mapsUrl: 'https://maps.google.com/?q=Centro+Mini+Soccer+Utan+Jati' },
  { branch: 'Jakarta', ageGroup: 'U-9 - U-12', day: 'Rabu', time: '16.00 - 18.00', location: 'Centro Mini Soccer Utan Jati', mapsUrl: 'https://maps.google.com/?q=Centro+Mini+Soccer+Utan+Jati' },
  { branch: 'Jakarta', ageGroup: 'U-13 - U-16', day: 'Rabu', time: '16.00 - 18.00', location: 'Centro Mini Soccer Utan Jati', mapsUrl: 'https://maps.google.com/?q=Centro+Mini+Soccer+Utan+Jati' },
]

export const galleryFallbackPhotos = [
  'https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?auto=format&fit=crop&w=600&q=75',
  'https://images.unsplash.com/photo-1543326727-cf6c39e8f84c?auto=format&fit=crop&w=600&q=75',
  'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?auto=format&fit=crop&w=600&q=75',
  'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=600&q=75',
  'https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=600&q=75',
  'https://images.unsplash.com/photo-1614632537197-38a17061c2bd?auto=format&fit=crop&w=600&q=75',
  'https://images.unsplash.com/photo-1526232761682-d26e03ac148e?auto=format&fit=crop&w=600&q=75',
  'https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?auto=format&fit=crop&w=600&q=75',
]

export function formatRupiah(n) {
  return 'Rp' + (n || 0).toLocaleString('id-ID')
}

export async function safeFetch(url) {
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export function groupPackages(packages) {
  const byName = {}
  for (const p of packages) {
    if (!byName[p.name]) byName[p.name] = { name: p.name, durationMonths: p.durationMonths }
    if (p.sessionsPerWeek === 1) { byName[p.name].id1 = p.id; byName[p.name].price1 = p.price }
    if (p.sessionsPerWeek === 2) { byName[p.name].id2 = p.id; byName[p.name].price2 = p.price }
  }
  return Object.values(byName).sort((a, b) => a.durationMonths - b.durationMonths)
}

export function jerseyNumber(title) {
  const match = title.match(/U-?(\d+)/i)
  return match ? match[1] : null
}

export async function getLandingData() {
  const [cms, packagesRaw, settings] = await Promise.all([
    safeFetch(`${API_URL}/cms/public`),
    safeFetch(`${API_URL}/packages`),
    safeFetch(`${API_URL}/settings`),
  ])

  return {
    stats: cms?.quickStats?.length ? cms.quickStats : defaultStats,
    programs: cms?.programs?.length ? cms.programs : defaultPrograms,
    schedulePreview: cms?.schedulePreview?.length ? cms.schedulePreview : defaultSchedule,
    gallery: cms?.gallery?.length ? cms.gallery : null,
    sponsors: cms?.sponsors?.length ? cms.sponsors : null,
    packages: packagesRaw?.length ? groupPackages(packagesRaw) : null,
    settings,
  }
}
