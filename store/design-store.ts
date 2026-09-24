import { create } from 'zustand'
import { setActiveColorVariants, type ProductColorVariant } from '@/lib/config/mockup-paths'

export interface ActiveProductDetails {
  name: string
  description?: string
  basePrice?: number
  material?: string
}

interface DesignStore {
  selectedProductId: string
  selectedCategory: string
  selectedView: string
  tenantSlug: string | null
  tenantId: string | null
  colorVariants: ProductColorVariant[]
  productDetails: ActiveProductDetails | null
  setTenant: (tenantSlug: string | null, tenantId: string | null) => void
  setSelectedProduct: (productId: string, category: string, details?: ActiveProductDetails | null) => void
  setSelectedView: (view: string) => void
  setColorVariants: (variants: ProductColorVariant[]) => void
  setProductDetails: (details: ActiveProductDetails | null) => void
  resetSelection: () => void
}

export const useDesignStore = create<DesignStore>((set) => ({
  selectedProductId: '1',
  selectedCategory: 'tshirts',
  selectedView: 'front',
  tenantSlug: null,
  tenantId: null,
  colorVariants: [],
  productDetails: null,

  setTenant: (tenantSlug, tenantId) => {
    set({ tenantSlug, tenantId })
  },

  setColorVariants: (variants: ProductColorVariant[]) => {
    setActiveColorVariants(variants)
    set({ colorVariants: variants })
  },

  setProductDetails: (details) => {
    set({ productDetails: details })
  },

  setSelectedProduct: (productId: string, category: string, details?: ActiveProductDetails | null) => {
    set((state) => ({
      selectedProductId: productId,
      selectedCategory: category,
      productDetails: details !== undefined ? details : state.productDetails,
    }))
  },

  setSelectedView: (view: string) => {
    set({ selectedView: view })
  },

  resetSelection: () => {
    set({
      selectedProductId: '1',
      selectedCategory: 'tshirts',
      selectedView: 'front',
      productDetails: null,
    })
  },
}))
