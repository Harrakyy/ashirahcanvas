import { create } from 'zustand'

interface DesignStore {
  selectedProductId: string
  selectedCategory: string
  selectedView: string
  setSelectedProduct: (productId: string, category: string) => void
  setSelectedView: (view: string) => void
  resetSelection: () => void
}

export const useDesignStore = create<DesignStore>((set) => ({
  selectedProductId: '1',
  selectedCategory: 'tshirts',
  selectedView: 'front',

  setSelectedProduct: (productId: string, category: string) => {
    set({
      selectedProductId: productId,
      selectedCategory: category,
    })
  },

  setSelectedView: (view: string) => {
    set({ selectedView: view })
  },

  resetSelection: () => {
    set({
      selectedProductId: '1',
      selectedCategory: 'tshirts',
      selectedView: 'front',
    })
  },
}))
