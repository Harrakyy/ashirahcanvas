'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { productsByCategory, Product } from '@/lib/config/products'
import { useDesignStore } from '@/store/design-store'
import { CheckCircle2 } from 'lucide-react'

interface ProductSwitcherDialogProps {
  isOpen: boolean
  onClose: () => void
}

const CATEGORIES = [
  { id: 'tshirts', label: 'T-Shirts' },
  { id: 'jackets', label: 'Jacket & Hoodies' },
  { id: 'polo', label: 'Polo T-Shirt' },
  { id: 'sport', label: 'Sport T-Shirts' },
]

export function ProductSwitcherDialog({
  isOpen,
  onClose,
}: ProductSwitcherDialogProps) {
  const { selectedProductId, selectedCategory, setSelectedProduct } =
    useDesignStore()
  const [activeTab, setActiveTab] = useState(selectedCategory)

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product.id, product.category)
    onClose()
  }

  const getCurrentProducts = () => {
    return productsByCategory[activeTab] || []
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white w-full md:w-auto md:rounded-lg rounded-2xl md:border md:border-gray-200">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">
            Ganti Produk
          </DialogTitle>
          <DialogDescription className="text-gray-500">
            Pilih produk lain untuk mengganti design Anda
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex gap-2 bg-transparent p-0 w-full overflow-x-auto border-b border-gray-200 pb-2">
            {CATEGORIES.map((cat) => (
              <TabsTrigger
                key={cat.id}
                value={cat.id}
                className="px-4 py-2 rounded-full text-sm whitespace-nowrap data-[state=active]:bg-blue-950 data-[state=active]:text-white data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:text-gray-900 transition"
              >
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {CATEGORIES.map((cat) => (
            <TabsContent key={cat.id} value={cat.id} className="mt-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {getCurrentProducts().map((product) => {
                  const isActive =
                    selectedProductId === product.id &&
                    selectedCategory === product.category

                  return (
                    <button
                      key={product.id}
                      onClick={() => handleSelectProduct(product)}
                      className={`group flex flex-col gap-2 p-3 rounded-xl transition-all ${
                        isActive
                          ? 'border-2 border-blue-950 bg-blue-50'
                          : 'border-2 border-gray-200 bg-white hover:border-blue-950 hover:shadow-md'
                      }`}
                    >
                      {/* Image Placeholder */}
                      <div className="w-full aspect-square bg-gray-200 rounded-lg flex items-center justify-center text-3xl group-hover:bg-gray-300 transition-colors">
                        {product.category === 'tshirts' && '🎽'}
                        {product.category === 'jackets' && '🧥'}
                        {product.category === 'polo' && '👔'}
                        {product.category === 'sport' && '⛹️'}
                      </div>

                      {/* Badge */}
                      {product.badge && (
                        <div className="flex gap-1 justify-center">
                          <Badge
                            className={`text-xs ${
                              product.badge === 'Best Seller'
                                ? 'bg-blue-950 text-white border-blue-950'
                                : 'bg-blue-950/10 text-blue-950 border-blue-950/20'
                            }`}
                          >
                            {product.badge}
                          </Badge>
                        </div>
                      )}

                      {/* Product Info */}
                      <div className="text-left space-y-1">
                        <h3 className="font-semibold text-sm text-gray-900 line-clamp-2">
                          {product.name}
                        </h3>
                        <p className="text-xs text-gray-500 line-clamp-1">
                          {product.material}
                        </p>
                        {product.basePrice && (
                          <p className="text-xs font-medium text-blue-950">
                            Rp {product.basePrice.toLocaleString('id-ID')}
                          </p>
                        )}
                      </div>

                      {/* Active Indicator */}
                      {isActive && (
                        <div className="flex justify-end">
                          <CheckCircle2 className="w-5 h-5 text-blue-950" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
