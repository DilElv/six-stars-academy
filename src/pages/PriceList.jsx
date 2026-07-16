import { useNavigate } from 'react-router-dom'
import { Check, ChevronRight, Shirt, Footprints, Trophy, ArrowLeft } from 'lucide-react'

const packages = [
  {
    id: '1bulan',
    label: '1 Bulan',
    desc: 'Coba latihan dulu',
    options: [
      { key: '1bulan-1sesi', sesi: '1 Sesi / Minggu', price: 550000 },
      { key: '1bulan-2sesi', sesi: '2 Sesi / Minggu', price: 750000 },
    ],
  },
  {
    id: '3bulan',
    label: '3 Bulan',
    desc: 'Paling populer',
    popular: true,
    options: [
      { key: '3bulan-1sesi', sesi: '1 Sesi / Minggu', price: 1400000 },
      { key: '3bulan-2sesi', sesi: '2 Sesi / Minggu', price: 2000000 },
    ],
  },
  {
    id: '6bulan',
    label: '6 Bulan',
    desc: 'Investasi jangka panjang',
    options: [
      { key: '6bulan-1sesi', sesi: '1 Sesi / Minggu', price: 2500000 },
      { key: '6bulan-2sesi', sesi: '2 Sesi / Minggu', price: 3800000 },
    ],
  },
]

const REG_FEE = 750000

function formatPrice(n) {
  return 'Rp' + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

export default function PriceList() {
  const navigate = useNavigate()

  function handleSelect(pkgKey, price) {
    navigate(`/login?tab=daftar&package=${pkgKey}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-950 via-navy-900 to-navy-950">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gold-400/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gold-400/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 pt-8 pb-6">
          <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-white/50 hover:text-white text-sm mb-6 transition-colors">
            <ArrowLeft size={16} /> Kembali
          </button>
          <div className="text-center">
            <Trophy size={40} className="mx-auto text-gold-400 mb-3" />
            <h1 className="font-heading font-bold text-white text-3xl md:text-4xl">Pilih Paket Latihan</h1>
            <p className="text-white/60 mt-2 max-w-xl mx-auto">Setiap pemain punya perjalanan berbeda. Pilih paket yang paling cocok untuk buah hati Anda.</p>
          </div>
        </div>
      </div>

      {/* Package Cards */}
      <div className="max-w-6xl mx-auto px-4 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 -mt-2">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className={`relative bg-white rounded-3xl shadow-xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${
                pkg.popular ? 'ring-2 ring-gold-400' : ''
              }`}
            >
              {pkg.popular && (
                <div className="absolute top-4 right-4 bg-gold-400 text-navy-900 text-[10px] font-bold px-3 py-1 rounded-full">
                  POPULER
                </div>
              )}

              <div className={`p-6 text-center ${pkg.popular ? 'bg-gradient-to-br from-navy-800 to-navy-900' : 'bg-gradient-to-br from-navy-800 to-navy-900'}`}>
                <h3 className="font-heading font-bold text-white text-xl">{pkg.label}</h3>
                <p className="text-white/50 text-xs mt-1">{pkg.desc}</p>
              </div>

              <div className="p-5 space-y-3">
                {pkg.options.map((opt) => {
                  const total = opt.price + REG_FEE
                  return (
                    <div
                      key={opt.key}
                      className="border border-gray-100 rounded-2xl p-4 hover:border-gold-400 transition-all cursor-pointer group"
                      onClick={() => handleSelect(opt.key, opt.price)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-navy-900">{opt.sesi}</span>
                        <span className="text-lg font-bold text-gold-600">{formatPrice(opt.price)}</span>
                      </div>
                      <div className="text-xs text-gray-400 mb-3">
                        Total + daftar: <span className="font-semibold text-navy-700">{formatPrice(total)}</span>
                      </div>
                      <button className="w-full py-2.5 bg-navy-800 hover:bg-navy-700 text-white text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 group-hover:bg-gold-500 group-hover:text-navy-900">
                        Pilih Paket <ChevronRight size={15} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Registration Fee Info */}
        <div className="mt-8 bg-white/5 backdrop-blur border border-white/10 rounded-3xl p-6 md:p-8 text-center">
          <div className="inline-flex items-center gap-2 bg-gold-400/20 rounded-full px-4 py-1.5 mb-4">
            <Shirt size={14} className="text-gold-400" />
            <span className="text-gold-300 text-xs font-semibold">BIAYA PENDAFTARAN</span>
          </div>
          <h2 className="font-heading font-bold text-white text-2xl">{formatPrice(REG_FEE)}</h2>
          <p className="text-white/50 text-sm mt-1">Sekali bayar saat daftar</p>
          <div className="flex flex-wrap items-center justify-center gap-6 mt-5">
            <div className="flex items-center gap-2 text-white/70 text-sm">
              <Check size={16} className="text-emerald-400" />
              Jersey 2 Setel
            </div>
            <div className="flex items-center gap-2 text-white/70 text-sm">
              <Check size={16} className="text-emerald-400" />
              Kaos Kaki
            </div>
            <div className="flex items-center gap-2 text-white/70 text-sm">
              <Check size={16} className="text-emerald-400" />
              1 Bola
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-8">
          <p className="text-white/40 text-xs">Butuh bantuan? Hubungi kami di <span className="text-gold-400">+62 811-2345-6789</span></p>
        </div>
      </div>
    </div>
  )
}
