import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTenantBySlug } from '@/lib/server/tenant'
import { getCurrentUser } from '@/lib/server/auth'
import { MapPin, Phone, ShieldCheck, Clock, Scissors, Sparkles, ArrowRight, User as UserIcon } from 'lucide-react'

interface StorePageProps {
  params: Promise<{ slug: string }>
}

const categories = [
  { id: 'tshirts', name: 'Kaos / T-Shirt', count: '8 Model', icon: '👕', image: '/model product/Kaos T-Shirt.png', price: 'Mulai Rp 65.000' },
  { id: 'jackets', name: 'Jacket & Hoodies', count: '6 Model', icon: '🧥', image: '/model product/Jacket & Hoodies.png', price: 'Mulai Rp 145.000' },
  { id: 'polo', name: 'Polo Shirt', count: '5 Model', icon: '👔', image: '/model product/Polo T-Shirt.png', price: 'Mulai Rp 95.000' },
  { id: 'sport', name: 'Jersey & Sportswear', count: '7 Model', icon: '⚽', image: '/model product/Sport T-Shirt.png', price: 'Mulai Rp 85.000' },
]

export default async function StorePage({ params }: StorePageProps) {
  const { slug } = await params
  const tenant = await getTenantBySlug(slug)

  if (!tenant) {
    notFound()
  }

  const currentUser = await getCurrentUser()
  const settings = tenant.settings || {}

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Bar / Branding */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 px-4 md:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white font-bold flex items-center justify-center text-lg shadow-sm">
            {tenant.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">
              {tenant.name}
            </h1>
            <p className="text-xs text-slate-500 font-medium">Garment & Custom Studio</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {currentUser ? (
            <div className="flex items-center gap-2">
              <Link
                href="/orders"
                className="text-xs md:text-sm font-medium text-slate-700 hover:text-blue-700 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
              >
                Pesanan Saya
              </Link>
              <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 px-2.5 py-1.5 rounded-lg">
                <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                <span className="max-w-[120px] truncate">{currentUser.name}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href={`/login?redirect=/store/${slug}`}
                className="text-xs md:text-sm font-medium text-slate-700 hover:text-blue-700 px-3 py-1.5"
              >
                Masuk
              </Link>
              <Link
                href={`/register?store=${slug}`}
                className="text-xs md:text-sm font-semibold bg-blue-700 text-white px-3.5 py-1.5 rounded-lg hover:bg-blue-800 transition-colors shadow-xs"
              >
                Daftar
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-950 via-slate-900 to-slate-900 text-white py-16 md:py-24 px-4 md:px-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/30 text-blue-300 text-xs md:text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4 text-blue-400" />
            Platform Canvas Editor & Konveksi Terintegrasi
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 leading-tight">
            Wujudkan Desain Apparel Brand Kamu di <span className="text-blue-400">{tenant.name}</span>
          </h2>
          <p className="text-slate-300 max-w-2xl mx-auto text-sm md:text-base mb-8 leading-relaxed">
            {settings.description || 'Pesan konveksi custom dengan editor 2D interaktif, negosiasi harga cerdas, dan skema pembayaran DP 70:30 yang aman.'}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={`/store/${slug}/editor`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-[#1A2B56] hover:bg-[#243B6B] text-white font-bold text-base transition-all shadow-lg shadow-black/20 hover:scale-[1.02]"
            >
              Mulai Desain Sekarang
              <ArrowRight className="w-5 h-5" />
            </Link>
            {settings.contactWhatsapp && (
              <a
                href={`https://wa.me/${settings.contactWhatsapp.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-full bg-white/10 hover:bg-white/15 text-white font-bold text-base border border-white/20 transition-all"
              >
                <Phone className="w-4 h-4 text-emerald-400" />
                Konsultasi WhatsApp
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Value Proposition Highlights */}
      <section className="bg-white border-b border-slate-200 py-6 px-4 md:px-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Custom Bebas Sesuai Keinginan</h3>
              <p className="text-xs text-slate-500">Upload logo, clip-art, teks, dan atur zona cetak sesukamu.</p>
            </div>
          </div>
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Pembayaran Terjamin DP 70:30</h3>
              <p className="text-xs text-slate-500">Bayar DP 70% saat mulai, pelunasan 30% setelah pesanan siap.</p>
            </div>
          </div>
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-lg bg-[#F0F2F6] text-[#1A2B56] flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Pantau Status Real-Time</h3>
              <p className="text-xs text-slate-500">Lacak progres produksi hingga nomor resi pengiriman kurir.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Catalog Grid Section */}
      <main className="flex-1 py-12 px-4 md:px-8 max-w-6xl mx-auto w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900">Katalog Apparel Kami</h2>
            <p className="text-xs md:text-sm text-slate-500 mt-1">Pilih kategori untuk membuka editor studio khusus</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/store/${slug}/editor?category=${category.id}`}
              className="group bg-white rounded-2xl p-4 border border-slate-200 hover:border-blue-600 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="aspect-square w-full rounded-xl bg-slate-50 p-4 mb-4 flex items-center justify-center overflow-hidden relative">
                  <img
                    src={category.image}
                    alt={category.name}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute top-3 left-3 text-lg">{category.icon}</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                  {category.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{category.count}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">{category.price}</span>
                <span className="inline-flex items-center text-xs font-bold text-blue-700 group-hover:translate-x-0.5 transition-transform">
                  Desain &rarr;
                </span>
              </div>
            </Link>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-8 px-4 md:px-8 text-slate-600 text-xs">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-bold text-slate-900 text-sm">{tenant.name}</p>
            {tenant.address && (
              <p className="flex items-center gap-1.5 text-slate-500 mt-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {tenant.address}
              </p>
            )}
          </div>
          <div className="text-slate-400 text-center md:text-right">
            <p>&copy; 2026 {tenant.name}. Powered by <span className="text-slate-700 font-semibold">AshiraTech</span>.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
