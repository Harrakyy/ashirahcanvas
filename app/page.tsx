'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/header'
import {
  ArrowRight,
  Sparkles,
  Layers,
  Bot,
  Truck,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Shirt,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ProductCategory {
  id: string
  name: string
  productCount: number
  icon: string
  image?: string
  description?: string
}

const categories: ProductCategory[] = [
  {
    id: 'tshirts',
    name: 'Kaos / T-Shirt',
    productCount: 8,
    icon: '👕',
    image: '/model product/Kaos T-Shirt.png',
    description: 'Cotton Combed 30s & 24s dengan sablon DTF tajam.',
  },
  {
    id: 'jackets',
    name: 'Jacket & Hoodies',
    productCount: 6,
    icon: '🧥',
    image: '/model product/Jacket & Hoodies.png',
    description: 'Fleece tebal & premium, nyaman untuk outdoor & komunitas.',
  },
  {
    id: 'polo',
    name: 'Polo T-Shirt',
    productCount: 5,
    icon: '👔',
    image: '/model product/Polo T-Shirt.png',
    description: 'Lacoste CVC elegan dengan kombinasi bordir komputer.',
  },
  {
    id: 'sport',
    name: 'Sport T-Shirt',
    productCount: 7,
    icon: '⚽',
    image: '/model product/Sport T-Shirt.png',
    description: 'Bahan Dry-Fit berpori, sejuk untuk jersey tim & olahraga.',
  },
]

export default function HomePage() {
  const router = useRouter()

  const handleCategoryClick = (categoryId: string) => {
    router.push(`/design/${categoryId}`)
  }

  return (
    <div className="min-h-screen bg-[#FAFBFC] text-[#0F152E]">
      <Header onAddToCart={() => {}} />

      <main className="pt-20">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden bg-gradient-to-b from-[#F0F4FA] via-[#FAFBFC] to-white py-16 md:py-24 border-b border-neutral-200/60">
          <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#1A2B56]/15 shadow-xs text-[#1A2B56] text-xs font-bold mb-6">
              <Sparkles className="w-3.5 h-3.5 text-[#1A2B56]" />
              <span>Platform Konveksi & Apparel Custom Modern</span>
            </div>

            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-[#1A2B56] tracking-tight max-w-4xl mx-auto leading-[1.15]">
              Platform Konveksi & Apparel Custom Terpercaya
            </h1>

            <p className="mt-5 text-[#4C567A] text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
              Wujudkan kaos komunitas, seragam kantor, polo, dan jaket berkualitas tinggi langsung dari studio desain 4 sisi interaktif dengan skema termin aman 70:30.
            </p>

            {/* CTA Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <Link href="/editor">
                <Button
                  size="lg"
                  className="w-full sm:w-auto h-12 px-7 rounded-full bg-[#1A2B56] hover:bg-[#243B6B] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer gap-2"
                >
                  <Shirt className="w-4 h-4" />
                  <span>Mulai Desain Kaos (Canvas Studio)</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <a href="#katalog">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto h-12 px-7 rounded-full border-neutral-300 hover:border-[#1A2B56] hover:bg-neutral-50 text-[#1A2B56] font-bold text-sm transition-all cursor-pointer"
                >
                  Katalog Produk
                </Button>
              </a>
            </div>

            {/* Value Highlights */}
            <div className="mt-12 pt-8 border-t border-neutral-200/80 max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold text-[#1A2B56]">
              <div className="flex items-center justify-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Garansi Sample Sebelum Jahit Masal</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Bahan 100% Combed & Fleece Asli</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <Truck className="w-4 h-4 text-[#1A2B56] shrink-0" />
                <span>Integrasi Ekspedisi Biteship Live</span>
              </div>
            </div>
          </div>
        </section>

        {/* 3 LANGKAH MUDAH SECTION */}
        <section className="py-16 md:py-20 max-w-7xl mx-auto px-4 md:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold text-[#1A2B56] tracking-wider uppercase bg-blue-50 px-3 py-1 rounded-full">
              Cara Kerja Platform
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-[#1A2B56] mt-3">
              3 Langkah Mudah Pesan di Ashirah
            </h2>
            <p className="text-xs md:text-sm text-[#4C567A] mt-2">
              Proses transparan mulai dari visualisasi desain hingga paket tiba di alamat Anda.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-xs hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1A2B56] flex items-center justify-center font-bold text-sm mb-4">
                ①
              </div>
              <h3 className="font-bold text-base text-[#1A2B56] mb-2 flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Desain di Studio 4 Sisi
              </h3>
              <p className="text-xs text-[#4C567A] leading-relaxed">
                Sesuaikan pakaian secara leluasa untuk tampak Depan, Belakang, Lengan Kanan, dan Kiri. Upload logo, tambahkan teks, dan atur penempatan real-time.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-xs hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1A2B56] flex items-center justify-center font-bold text-sm mb-4">
                ②
              </div>
              <h3 className="font-bold text-base text-[#1A2B56] mb-2 flex items-center gap-2">
                <Bot className="w-4 h-4" />
                Nego AI & DP 70% + Ongkir
              </h3>
              <p className="text-xs text-[#4C567A] leading-relaxed">
                Dapatkan penawaran harga grosir otomatis via chatbot AI, pilih kurir Biteship (JNE/SiCepat/J&T), dan bayar DP 70% aman melalui Duitku.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-xs hover:shadow-md transition-all">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1A2B56] flex items-center justify-center font-bold text-sm mb-4">
                ③
              </div>
              <h3 className="font-bold text-base text-[#1A2B56] mb-2 flex items-center gap-2">
                <Truck className="w-4 h-4" />
                Review Sample, Pelunasan & Kirim
              </h3>
              <p className="text-xs text-[#4C567A] leading-relaxed">
                Pantau foto sample dari konveksi. Setelah produksi selesai dan lolos QC, lunasi sisa 30% dan nomor resi kurir akan terbit otomatis.
              </p>
            </div>
          </div>
        </section>

        {/* KEUNGGULAN KONVEKSI SECTION */}
        <section className="py-14 bg-neutral-50/70 border-y border-neutral-200/60">
          <div className="max-w-7xl mx-auto px-4 md:px-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="p-4 bg-white rounded-xl border border-neutral-200">
                <div className="text-xs font-bold text-[#1A2B56] mb-1">Kain Combed 100%</div>
                <p className="text-[11px] text-[#4C567A]">
                  Serat kapas murni 30s & 24s yang adem, halus di kulit, dan tidak menerawang.
                </p>
              </div>
              <div className="p-4 bg-white rounded-xl border border-neutral-200">
                <div className="text-xs font-bold text-[#1A2B56] mb-1">Sablon DTF Anti Retak</div>
                <p className="text-[11px] text-[#4C567A]">
                  Tinta grade industri dengan elastisitas tinggi dan tahan cuci berulang kali.
                </p>
              </div>
              <div className="p-4 bg-white rounded-xl border border-neutral-200">
                <div className="text-xs font-bold text-[#1A2B56] mb-1">Garansi Sample Fisik</div>
                <p className="text-[11px] text-[#4C567A]">
                  Persetujuan foto sample oleh customer sebelum jahit masal dimulai demi kepuasan 100%.
                </p>
              </div>
              <div className="p-4 bg-white rounded-xl border border-neutral-200">
                <div className="text-xs font-bold text-[#1A2B56] mb-1">Kapasitas Produksi Cepat</div>
                <p className="text-[11px] text-[#4C567A]">
                  Didukung jaringan pabrik konveksi terverifikasi dengan pelacakan status real-time.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* KATALOG SECTION */}
        <section id="katalog" className="py-16 md:py-20 max-w-7xl mx-auto px-4 md:px-6">
          <div className="mb-10 text-center max-w-2xl mx-auto">
            <span className="text-xs font-bold text-[#1A2B56] tracking-wider uppercase bg-blue-50 px-3 py-1 rounded-full">
              Katalog Pilihan
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-[#1A2B56] mt-3">
              Pilih Model Pakaian
            </h2>
            <p className="text-xs md:text-sm text-[#4C567A] mt-2">
              Klik salah satu kategori di bawah untuk langsung membuka Canvas Studio
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category.id)}
                className="group flex flex-col p-5 bg-white rounded-2xl shadow-xs border border-neutral-200 hover:border-[#1A2B56]/60 hover:shadow-lg transition-all duration-200 text-left h-full cursor-pointer"
              >
                <div className="w-full aspect-square bg-[#F8F9FA] rounded-xl flex items-center justify-center overflow-hidden border border-neutral-100 mb-4">
                  {category.image ? (
                    <img
                      src={category.image}
                      alt={category.name}
                      className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-5xl">{category.icon}</span>
                  )}
                </div>

                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-base text-[#1A2B56] group-hover:text-[#243B6B] transition-colors">
                      {category.name}
                    </h3>
                    <span className="text-[11px] font-semibold text-[#1A2B56] bg-blue-50 px-2 py-0.5 rounded-full">
                      {category.productCount} Model
                    </span>
                  </div>
                  {category.description && (
                    <p className="text-xs text-[#4C567A] line-clamp-2">
                      {category.description}
                    </p>
                  )}
                </div>

                <div className="w-full mt-5 py-2.5 px-4 bg-[#1A2B56] group-hover:bg-[#243B6B] text-white text-xs font-semibold rounded-xl text-center transition flex items-center justify-center gap-2 shadow-xs">
                  <span>Pilih & Mulai Desain</span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-80 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
