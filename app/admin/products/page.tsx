'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Header from '@/components/header'
import {
  ArrowLeft,
  Plus,
  Package,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Edit2,
  Tag,
  DollarSign,
  Layers,
  X,
  Upload,
  Image as ImageIcon,
  Check,
  Palette,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { ProductColorVariant } from '@/lib/db/schema'

interface ProductItem {
  id: string
  name: string
  category: string
  basePrice: number
  availableColors: string[]
  colorVariants?: ProductColorVariant[]
  availableSizes: string[]
  thumbnailUrl?: string
  description?: string
  isActive: boolean
  createdAt: string
}

const CATEGORIES = [
  { id: 'all', label: 'Semua Kategori' },
  { id: 'tshirts', label: 'Kaos (T-Shirts)' },
  { id: 'jackets', label: 'Jaket & Hoodie' },
  { id: 'polo', label: 'Polo Shirt' },
  { id: 'sport', label: 'Jersey Olahraga' },
]

const SIZE_PRESETS = ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL']

const DEFAULT_STANDARD_VARIANTS: ProductColorVariant[] = [
  {
    name: 'Putih',
    hex: '#FFFFFF',
    mockups: {
      front: '/mockups/tshirt/white/front.png',
      back: '/mockups/tshirt/white/back.png',
      left: '/mockups/tshirt/white/left.png',
      right: '/mockups/tshirt/white/right.png',
    },
  },
  {
    name: 'Hitam',
    hex: '#000000',
    mockups: {
      front: '/mockups/tshirt/black/front.png',
      back: '/mockups/tshirt/black/back.png',
      left: '/mockups/tshirt/black/left.png',
      right: '/mockups/tshirt/black/right.png',
    },
  },
]

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [modalError, setModalError] = useState<string | null>(null)

  // Form State
  const [formName, setFormName] = useState('')
  const [formCategory, setFormCategory] = useState('tshirts')
  const [formPrice, setFormPrice] = useState('85000')
  const [formDescription, setFormDescription] = useState('')
  const [formSizes, setFormSizes] = useState<string[]>(['S', 'M', 'L', 'XL', '2XL'])
  const [formColorVariants, setFormColorVariants] = useState<ProductColorVariant[]>([])

  // New Variant Creator Form State
  const [newColorName, setNewColorName] = useState('')
  const [newColorHex, setNewColorHex] = useState('#D32F2F')
  const [newMockupFront, setNewMockupFront] = useState('')
  const [newMockupBack, setNewMockupBack] = useState('')
  const [newMockupLeft, setNewMockupLeft] = useState('')
  const [newMockupRight, setNewMockupRight] = useState('')
  const [activeSideTab, setActiveSideTab] = useState<'front' | 'back' | 'left' | 'right'>('front')

  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchProducts = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/products')
      if (res.ok) {
        const data = await res.json()
        setProducts(data.products || [])
      }
    } catch (err) {
      console.error('Failed to load products:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  const handleOpenCreateModal = () => {
    setEditingProductId(null)
    setFormName('')
    setFormCategory('tshirts')
    setFormPrice('85000')
    setFormDescription('')
    setFormSizes(['S', 'M', 'L', 'XL', '2XL'])
    setFormColorVariants([...DEFAULT_STANDARD_VARIANTS])
    resetNewVariantForm()
    setModalError(null)
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (product: ProductItem) => {
    setEditingProductId(product.id)
    setFormName(product.name)
    setFormCategory(product.category)
    setFormPrice(String(product.basePrice))
    setFormDescription(product.description || '')
    setFormSizes(product.availableSizes || ['S', 'M', 'L', 'XL'])
    setModalError(null)

    if (product.colorVariants && product.colorVariants.length > 0) {
      setFormColorVariants(product.colorVariants)
    } else if (product.availableColors && product.availableColors.length > 0) {
      // Convert legacy colors
      const converted = product.availableColors.map((hex) => ({
        name: hex === '#000000' ? 'Hitam' : hex === '#ffffff' || hex === '#FFFFFF' ? 'Putih' : 'Custom ' + hex,
        hex,
        mockups: {
          front: hex === '#000000' ? '/mockups/tshirt/black/front.png' : '/mockups/tshirt/white/front.png',
          back: hex === '#000000' ? '/mockups/tshirt/black/back.png' : '/mockups/tshirt/white/back.png',
          left: hex === '#000000' ? '/mockups/tshirt/black/left.png' : '/mockups/tshirt/white/left.png',
          right: hex === '#000000' ? '/mockups/tshirt/black/right.png' : '/mockups/tshirt/white/right.png',
        },
      }))
      setFormColorVariants(converted)
    } else {
      setFormColorVariants([...DEFAULT_STANDARD_VARIANTS])
    }

    resetNewVariantForm()
    setIsModalOpen(true)
  }

  const resetNewVariantForm = () => {
    setNewColorName('')
    setNewColorHex('#D32F2F')
    setNewMockupFront('')
    setNewMockupBack('')
    setNewMockupLeft('')
    setNewMockupRight('')
    setActiveSideTab('front')
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back' | 'left' | 'right') => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string
      if (side === 'front') setNewMockupFront(result)
      if (side === 'back') setNewMockupBack(result)
      if (side === 'left') setNewMockupLeft(result)
      if (side === 'right') setNewMockupRight(result)
    }
    reader.readAsDataURL(file)
  }

  const handleAddColorVariant = () => {
    if (!newColorName.trim()) {
      alert('Silakan masukkan nama warna terlebih dahulu (misal: Merah Cabe, Sage Green).')
      return
    }

    const newVariant: ProductColorVariant = {
      name: newColorName.trim(),
      hex: newColorHex.trim().toUpperCase(),
      mockups: {
        front: newMockupFront || (newColorHex.toUpperCase() === '#000000' ? '/mockups/tshirt/black/front.png' : '/mockups/tshirt/white/front.png'),
        back: newMockupBack || (newColorHex.toUpperCase() === '#000000' ? '/mockups/tshirt/black/back.png' : '/mockups/tshirt/white/back.png'),
        left: newMockupLeft || (newColorHex.toUpperCase() === '#000000' ? '/mockups/tshirt/black/left.png' : '/mockups/tshirt/white/left.png'),
        right: newMockupRight || (newColorHex.toUpperCase() === '#000000' ? '/mockups/tshirt/black/right.png' : '/mockups/tshirt/white/right.png'),
      },
    }

    setFormColorVariants((prev) => [...prev, newVariant])
    resetNewVariantForm()
  }

  const handleRemoveColorVariant = (index: number) => {
    setFormColorVariants((prev) => prev.filter((_, i) => i !== index))
  }

  const handleAddDefaultPresets = () => {
    const existingHexes = formColorVariants.map((v) => v.hex.toUpperCase())
    const toAdd = DEFAULT_STANDARD_VARIANTS.filter((v) => !existingHexes.includes(v.hex.toUpperCase()))
    if (toAdd.length === 0) {
      alert('Varian Hitam dan Putih sudah ada di daftar warna.')
      return
    }
    setFormColorVariants((prev) => [...prev, ...toAdd])
  }

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formColorVariants.length === 0) {
      alert('Tambahkan minimal 1 varian warna untuk produk ini.')
      return
    }

    setIsSubmitting(true)
    setFeedback(null)
    setModalError(null)

    const payload = {
      name: formName,
      category: formCategory,
      basePrice: Number(formPrice),
      description: formDescription,
      colorVariants: formColorVariants,
      availableColors: formColorVariants.map((v) => v.hex),
      availableSizes: formSizes,
      thumbnailUrl:
        formColorVariants[0]?.mockups?.front ||
        (formCategory === 'jackets'
          ? '/jackets/jacket-mockup.png'
          : formCategory === 'polo'
          ? '/polo/polo-mockup.png'
          : '/tshirts model/Premium Cotton T-Shirt.png'),
    }

    try {
      const url = editingProductId ? `/api/products/${editingProductId}` : '/api/products'
      const method = editingProductId ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (res.ok) {
        setFeedback({
          type: 'success',
          message: editingProductId
            ? `Produk "${formName}" berhasil diperbarui!`
            : `Produk "${formName}" berhasil ditambahkan!`,
        })
        setModalError(null)
        setIsModalOpen(false)
        await fetchProducts()
      } else {
        const errMsg = data.error || 'Gagal menyimpan produk'
        setFeedback({ type: 'error', message: errMsg })
        setModalError(errMsg)
      }
    } catch (err: any) {
      const errMsg = err.message || 'Koneksi bermasalah'
      setFeedback({ type: 'error', message: errMsg })
      setModalError(errMsg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleActive = async (product: ProductItem) => {
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !product.isActive }),
      })
      if (res.ok) {
        setProducts((prev) =>
          prev.map((p) => (p.id === product.id ? { ...p, isActive: !p.isActive } : p))
        )
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`Hapus produk "${name}" dari katalog?`)) return
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== id))
        setFeedback({ type: 'success', message: `Produk "${name}" berhasil dihapus` })
      }
    } catch (err) {
      console.error(err)
    }
  }

  const toggleSize = (sz: string) => {
    setFormSizes((prev) =>
      prev.includes(sz) ? prev.filter((s) => s !== sz) : [...prev, sz]
    )
  }

  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === 'all' || p.category === selectedCategory
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCat && matchesSearch
  })

  const getSideMockupValue = (side: 'front' | 'back' | 'left' | 'right') => {
    if (side === 'front') return newMockupFront
    if (side === 'back') return newMockupBack
    if (side === 'left') return newMockupLeft
    return newMockupRight
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Header />

      <main className="pt-20 pb-16 px-4 md:px-8 max-w-7xl mx-auto space-y-6">
        {/* Top Breadcrumb & Action */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <Link href="/admin" className="hover:text-blue-600 flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
              </Link>
              <span>/</span>
              <span className="text-slate-800 font-medium">Katalog Produk & Varian Warna</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Manajemen Produk & Mockup Warna
            </h1>
            <p className="text-xs text-slate-500">
              Kelola katalog pakaian, tentukan warna khusus tiap bahan, dan unggah mockup 4 sisi untuk canvas studio.
            </p>
          </div>

          <Button
            onClick={handleOpenCreateModal}
            className="bg-blue-950 hover:bg-blue-900 text-white rounded-xl text-xs font-semibold px-4 py-2 flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Tambah Produk Baru
          </Button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
              feedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-blue-950 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari produk apparel..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-950 transition"
            />
          </div>
        </div>

        {/* Product Cards Grid */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-xs">Memuat katalog produk...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
            <Package className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">Belum ada produk yang cocok</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Silakan tambahkan produk baru atau ubah kata kunci pencarian.
            </p>
            <Button
              onClick={handleOpenCreateModal}
              variant="outline"
              className="text-xs rounded-xl border-slate-200"
            >
              Tambah Produk Pertama
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map((product) => {
              const variants = product.colorVariants || []
              const hasVariants = variants.length > 0

              return (
                <div
                  key={product.id}
                  className={`bg-white rounded-2xl border transition-all p-4 flex flex-col justify-between hover:shadow-md ${
                    product.isActive ? 'border-slate-200' : 'border-slate-200 opacity-70 bg-slate-50/50'
                  }`}
                >
                  <div>
                    {/* Image Thumbnail */}
                    <div className="w-full h-44 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden mb-3 relative group">
                      {product.thumbnailUrl ? (
                        <img
                          src={product.thumbnailUrl}
                          alt={product.name}
                          className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <Package className="w-12 h-12 text-slate-300" />
                      )}
                      <span className="absolute top-2 right-2">
                        <Badge
                          variant="secondary"
                          className={`text-[10px] font-semibold ${
                            product.isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}
                        >
                          {product.isActive ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider">
                        {product.category}
                      </span>
                      <h3 className="font-bold text-sm text-slate-900 line-clamp-1">{product.name}</h3>
                      <p className="text-base font-extrabold text-slate-900">
                        Rp {product.basePrice?.toLocaleString('id-ID')}
                        <span className="text-[10px] font-normal text-slate-400 ml-1">/ pcs</span>
                      </p>
                      {product.description && (
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                          {product.description}
                        </p>
                      )}
                    </div>

                    {/* Dynamic Color Variants Preview */}
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-2 text-[11px]">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-slate-400">Varian Warna:</span>
                          <span className="text-[10px] font-semibold text-blue-950">
                            {hasVariants ? `${variants.length} Warna` : `${product.availableColors?.length || 0} Warna`}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {hasVariants
                            ? variants.map((v, i) => (
                                <span
                                  key={i}
                                  style={{ backgroundColor: v.hex }}
                                  className="w-4 h-4 rounded-full border border-slate-300 inline-block shadow-xs"
                                  title={`${v.name} (${v.hex})`}
                                />
                              ))
                            : product.availableColors?.map((c, i) => (
                                <span
                                  key={i}
                                  style={{ backgroundColor: c }}
                                  className="w-4 h-4 rounded-full border border-slate-300 inline-block shadow-xs"
                                  title={c}
                                />
                              ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-400 block mb-1">Ukuran:</span>
                        <div className="flex items-center gap-1 flex-wrap">
                          {product.availableSizes?.map((s, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-semibold rounded border border-slate-200"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleToggleActive(product)}
                      className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 underline cursor-pointer"
                    >
                      {product.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditModal(product)}
                        className="text-slate-500 hover:text-blue-950 p-1.5 hover:bg-slate-100 rounded-lg transition"
                        title="Edit Produk & Warna"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteProduct(product.id, product.name)}
                        className="text-slate-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition"
                        title="Hapus Produk"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Modal Tambah / Edit Produk Baru */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 my-8 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 sticky top-0 bg-white z-10">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-950" />
                  <div>
                    <h3 className="font-bold text-base text-slate-900">
                      {editingProductId ? 'Edit Produk & Varian Warna' : 'Tambah Produk Apparel Tenant'}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Atur spesifikasi bahan pakaian dan upload mockup 4 sisi untuk setiap warna.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveProduct} className="space-y-5 text-xs text-slate-900">
                {/* 1. Basic Info */}
                <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
                  <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                    <Tag className="w-3.5 h-3.5 text-blue-950" /> 1. Informasi Dasar Produk
                  </h4>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nama Produk Apparel</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Kaos Katun Bambu Premium 30s"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-950 focus:ring-1 focus:ring-blue-950"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Kategori</label>
                      <select
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-blue-950 focus:ring-1 focus:ring-blue-950"
                      >
                        <option value="tshirts" className="text-slate-900 bg-white">Kaos (T-Shirts)</option>
                        <option value="jackets" className="text-slate-900 bg-white">Jaket & Hoodie</option>
                        <option value="polo" className="text-slate-900 bg-white">Polo Shirt</option>
                        <option value="sport" className="text-slate-900 bg-white">Jersey Olahraga</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Harga Dasar Polos (Rp)</label>
                      <input
                        type="number"
                        required
                        min="1000"
                        placeholder="85000"
                        value={formPrice}
                        onChange={(e) => setFormPrice(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-950 focus:ring-1 focus:ring-blue-950"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Deskripsi Produk & Bahan</label>
                    <textarea
                      rows={2}
                      placeholder="Serat katun bambu alami, antibakterial, adem dan jatuh di badan."
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-950 focus:ring-1 focus:ring-blue-950"
                    />
                  </div>

                  {/* Sizes */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Pilihan Ukuran</label>
                    <div className="flex flex-wrap gap-1.5">
                      {SIZE_PRESETS.map((sz) => {
                        const isSelected = formSizes.includes(sz)
                        return (
                          <button
                            type="button"
                            key={sz}
                            onClick={() => toggleSize(sz)}
                            className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition cursor-pointer ${
                              isSelected
                                ? 'border-blue-950 bg-blue-950 text-white'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {sz}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* 2. Color Variants & 4-Side Mockup Manager */}
                <div className="space-y-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                        <Palette className="w-3.5 h-3.5 text-blue-950" /> 2. Varian Warna & Mockup 4 Sisi
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Warna yang Anda tambahkan di sini akan langsung menjadi palet warna di canvas customer.
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddDefaultPresets}
                      className="text-[10px] h-7 px-2.5 rounded-lg border-slate-300 text-slate-700 hover:bg-slate-100"
                    >
                      + Tambah Hitam & Putih Standar
                    </Button>
                  </div>

                  {/* Existing Variants List */}
                  <div className="space-y-2">
                    <label className="block font-semibold text-slate-700 text-[11px]">
                      Daftar Warna Aktif ({formColorVariants.length} warna):
                    </label>

                    {formColorVariants.length === 0 ? (
                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-[11px] text-center">
                        Belum ada varian warna. Tambahkan warna di bawah atau klik tombol preset di atas.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {formColorVariants.map((variant, index) => (
                          <div
                            key={index}
                            className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between shadow-2xs"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                style={{ backgroundColor: variant.hex }}
                                className="w-5 h-5 rounded-full border border-slate-300 inline-block shadow-xs shrink-0"
                              />
                              <div>
                                <p className="font-bold text-slate-800 text-[11px] leading-tight">{variant.name}</p>
                                <p className="font-mono text-[9px] text-slate-400 uppercase">{variant.hex}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 text-[9px] text-slate-400">
                              <span className={variant.mockups?.front ? 'text-emerald-600 font-bold' : ''}>D</span>
                              <span>•</span>
                              <span className={variant.mockups?.back ? 'text-emerald-600 font-bold' : ''}>B</span>
                              <span>•</span>
                              <span className={variant.mockups?.left ? 'text-emerald-600 font-bold' : ''}>L</span>
                              <span>•</span>
                              <span className={variant.mockups?.right ? 'text-emerald-600 font-bold' : ''}>R</span>

                              <button
                                type="button"
                                onClick={() => handleRemoveColorVariant(index)}
                                className="ml-2 text-slate-300 hover:text-red-600 p-1 transition"
                                title="Hapus varian ini"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add New Variant Subform */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-3 mt-3">
                    <h5 className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5 text-blue-950" /> Input Warna Baru & Mockup
                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">Nama Warna</label>
                        <input
                          type="text"
                          placeholder="Misal: Sage Green, Merah Cabe"
                          value={newColorName}
                          onChange={(e) => setNewColorName(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-950 focus:ring-1 focus:ring-blue-950"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 mb-1">Pilih Kode Warna (HEX)</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={newColorHex}
                            onChange={(e) => setNewColorHex(e.target.value)}
                            className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                          />
                          <input
                            type="text"
                            placeholder="#FFFFFF"
                            value={newColorHex}
                            onChange={(e) => setNewColorHex(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-mono text-xs uppercase text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-950 focus:ring-1 focus:ring-blue-950"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 4 Sides Tabs for Mockup */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[11px] font-medium text-slate-700">
                          Upload Mockup Baju 4 Sisi (Warna: {newColorName || 'Baru'})
                        </label>
                        <span className="text-[10px] text-slate-400">Minimal sisi depan disarankan</span>
                      </div>

                      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg mb-2.5">
                        {(['front', 'back', 'left', 'right'] as const).map((side) => {
                          const labels: Record<string, string> = {
                            front: '1. Tampak Depan',
                            back: '2. Tampak Belakang',
                            left: '3. Lengan Kiri',
                            right: '4. Lengan Kanan',
                          }
                          const hasMockup = Boolean(getSideMockupValue(side))
                          return (
                            <button
                              type="button"
                              key={side}
                              onClick={() => setActiveSideTab(side)}
                              className={`flex-1 py-1 text-[10px] font-medium rounded-md transition cursor-pointer flex items-center justify-center gap-1 ${
                                activeSideTab === side
                                  ? 'bg-white text-blue-950 font-bold shadow-2xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              <span>{labels[side]}</span>
                              {hasMockup && <Check className="w-3 h-3 text-emerald-600" />}
                            </button>
                          )
                        })}
                      </div>

                      {/* Active Side Uploader */}
                      <div className="border border-dashed border-slate-300 rounded-xl p-3 bg-slate-50 flex items-center gap-3">
                        <div className="w-16 h-16 rounded-lg bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                          {getSideMockupValue(activeSideTab) ? (
                            <img
                              src={getSideMockupValue(activeSideTab)}
                              alt={activeSideTab}
                              className="w-full h-full object-contain p-1"
                            />
                          ) : (
                            <ImageIcon className="w-6 h-6 text-slate-300" />
                          )}
                        </div>

                        <div className="flex-1 space-y-1.5">
                          <p className="text-[11px] font-semibold text-slate-800">
                            Mockup {activeSideTab === 'front' ? 'Tampak Depan' : activeSideTab === 'back' ? 'Tampak Belakang' : activeSideTab === 'left' ? 'Lengan Kiri' : 'Lengan Kanan'}
                          </p>
                          <div className="flex items-center gap-2">
                            <label className="cursor-pointer bg-white border border-slate-200 hover:bg-slate-50 px-2.5 py-1 rounded-lg text-[10px] font-medium text-slate-700 flex items-center gap-1 shadow-2xs">
                              <Upload className="w-3 h-3 text-blue-950" />
                              Pilih File Gambar
                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                className="hidden"
                                onChange={(e) => handleFileUpload(e, activeSideTab)}
                              />
                            </label>
                            {getSideMockupValue(activeSideTab) && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (activeSideTab === 'front') setNewMockupFront('')
                                  if (activeSideTab === 'back') setNewMockupBack('')
                                  if (activeSideTab === 'left') setNewMockupLeft('')
                                  if (activeSideTab === 'right') setNewMockupRight('')
                                }}
                                className="text-[10px] text-red-600 hover:underline"
                              >
                                Hapus Mockup
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <Button
                      type="button"
                      onClick={handleAddColorVariant}
                      className="w-full h-8 bg-blue-950 hover:bg-blue-900 text-white rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 mt-2"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Tambahkan Varian Warna Ini
                    </Button>
                  </div>
                </div>

                {/* In-Modal Error Alert */}
                {modalError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      <span className="font-medium">{modalError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setModalError(null)}
                      className="text-red-400 hover:text-red-700 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Form Buttons */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 sticky bottom-0 bg-white py-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsModalOpen(false)}
                    className="h-9 rounded-xl border-slate-200 text-xs"
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting || !formName || formColorVariants.length === 0}
                    className="h-9 rounded-xl bg-blue-950 hover:bg-blue-900 text-white text-xs font-semibold px-5 shadow-xs"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                        Menyimpan...
                      </>
                    ) : editingProductId ? (
                      'Simpan Perubahan'
                    ) : (
                      'Simpan Produk ke Katalog'
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
