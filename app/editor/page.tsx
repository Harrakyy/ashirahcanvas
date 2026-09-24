'use client'

/**
 * EditorPage — SHELL tipis (milik FE1).
 *
 * - Fetch /api/quote di sini (KEPUTUSAN 1), pass ke CanvasEditor & LeftPanel
 *   sebagai props. Canvas TIDAK pernah fetch API.
 * - Semua state NEGO-PAYMENT diextract ke hook useNegotiation()
 * - Semua state CANVAS (color/size/zoom) di useCanvasStore()
 * - CanvasEditor di-dynamic-import (ssr:false) — modul CSR murni
 * - CanvasBlueprint diterima via onDesignComplete callback, disimpan ke
 *   localStorage untuk dibaca halaman Checkout.
 */

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Header from '@/components/header'
import LeftPanel from '@/components/left-panel'
import RightPanel from '@/components/right-panel'
import MobileBottomNav from '@/components/mobile-bottom-nav'
import MobileLeftPanelSheet from '@/components/mobile-left-panel-sheet'
import MobileRightPanelSheet from '@/components/mobile-right-panel-sheet'
import { useDesignStore } from '@/store/design-store'
import { useCanvasStore } from '@/features/canvas/store/useCanvasStore'
import { useNegotiation } from '@/app/hooks/useNegotiation'
import { saveBlueprint, BLUEPRINT_STORAGE_KEY } from '@/features/canvas/utils/exportHelpers'
import type { PriceQuote } from '@/types/pricing'
import type { CanvasBlueprint } from '@/features/canvas/types/blueprint'

const CanvasEditor = dynamic(
  () => import('@/features/canvas/components/CanvasEditor'),
  { ssr: false, loading: () => <p className="flex-1 flex items-center justify-center text-gray-500">Memuat Engine Desain...</p> }
)

export default function EditorPage() {
  const [mobileLeftPanelOpen, setMobileLeftPanelOpen] = useState(false)
  const [mobileRightPanelOpen, setMobileRightPanelOpen] = useState(false)
  const [activeMenu, setActiveMenu] = useState('product')
  const [quantities, setQuantities] = useState({
    S: 0,
    M: 0,
    L: 0,
    XL: 0,
    '2XL': 0,
    '3XL': 0,
    '4XL': 0,
    '5XL': 0,
  })
  const [quote, setQuote] = useState<PriceQuote | null>(null)

  const selectedProductId = useDesignStore((s) => s.selectedProductId)
  const selectedCategory = useDesignStore((s) => s.selectedCategory)
  const colorVariants = useDesignStore((s) => s.colorVariants)
  const setColorVariants = useDesignStore((s) => s.setColorVariants)
  const setSelectedProduct = useDesignStore((s) => s.setSelectedProduct)
  const setProductDetails = useDesignStore((s) => s.setProductDetails)

  const selectedColor = useCanvasStore((s) => s.selectedColor)
  const selectedSize = useCanvasStore((s) => s.selectedSize)
  const zoomLevel = useCanvasStore((s) => s.zoomLevel)
  const zoomIn = useCanvasStore((s) => s.zoomIn)
  const zoomOut = useCanvasStore((s) => s.zoomOut)
  const setSelectedColor = useCanvasStore((s) => s.setSelectedColor)
  const setSelectedSize = useCanvasStore((s) => s.setSelectedSize)

  // Initial Load: Fetch active tenant products from database if on default '1' or not initialized
  useEffect(() => {
    fetch('/api/products')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.products && Array.isArray(data.products) && data.products.length > 0) {
          const currentInDb = data.products.find((p: any) => p.id === selectedProductId)
          const activeProduct = currentInDb || data.products[0]
          if (activeProduct) {
            setSelectedProduct(activeProduct.id, activeProduct.category, {
              name: activeProduct.name,
              description: activeProduct.description,
              basePrice: Number(activeProduct.basePrice) || undefined,
              material: activeProduct.material,
            })
            if (
              activeProduct.colorVariants &&
              Array.isArray(activeProduct.colorVariants) &&
              activeProduct.colorVariants.length > 0
            ) {
              setColorVariants(activeProduct.colorVariants)
              const hasColor = activeProduct.colorVariants.some(
                (v: any) => v.hex?.trim().toUpperCase() === selectedColor?.trim().toUpperCase()
              )
              if (!hasColor && activeProduct.colorVariants[0]?.hex) {
                setSelectedColor(activeProduct.colorVariants[0].hex)
              }
            }
          }
        }
      })
      .catch((err) => console.error('Failed to init product in editor:', err))
  }, [])

  // Sync details whenever selectedProductId changes to a specific UUID
  useEffect(() => {
    if (!selectedProductId || selectedProductId === '1') return
    fetch(`/api/products/${selectedProductId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.product) {
          setProductDetails({
            name: data.product.name,
            description: data.product.description,
            basePrice: Number(data.product.basePrice) || undefined,
            material: data.product.material,
          })
          if (
            data.product.colorVariants &&
            Array.isArray(data.product.colorVariants) &&
            data.product.colorVariants.length > 0
          ) {
            setColorVariants(data.product.colorVariants)
            const hasSelected = data.product.colorVariants.some(
              (v: any) => v.hex?.trim().toUpperCase() === selectedColor?.trim().toUpperCase()
            )
            if (!hasSelected && data.product.colorVariants[0]?.hex) {
              setSelectedColor(data.product.colorVariants[0].hex)
            }
          }
        }
      })
      .catch(() => {})
  }, [selectedProductId, setColorVariants, setSelectedColor, setProductDetails])

  const sizes = ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL']
  const activeColors = ['#FFFFFF', '#000000']
  const colors = [
    '#000000', '#FFFFFF', '#808080', '#C0C0C0', '#FF0000', '#00FF00', '#0000FF',
    '#FFFF00', '#FFA500', '#800080', '#FFC0CB', '#A52A2A', '#008080', '#FFD700',
    '#4B0082', '#FF69B4', '#1E90FF', '#32CD32', '#FF4500', '#9370DB', '#00CED1',
    '#FF1493', '#00FA9A', '#DC143C', '#7FFF00', '#8B4513', '#FF8C00', '#228B22',
    '#4169E1', '#FF00FF', '#00BFFF', '#F0E68C',
  ]
  const disabledColors = colors.filter(c => !activeColors.includes(c))

  const basePrice = quote?.basePrice ?? 0
  const logoPrice = quote?.logoPrice ?? 0
  const textPrice = quote?.textPrice ?? 0
  const unitPrice = quote?.unitPrice ?? 0

  const totalQty = Object.values(quantities).reduce((a, b) => a + b, 0)
  const subtotal = unitPrice
  const total = subtotal * totalQty
  const moq = quote?.moq ?? 1

  const {
    rightPanelMode,
    chatMessages,
    currentMessage,
    currentPrice,
    currentTier,
    agreedDiscount,
    isLoading,
    isProcessingPayment,
    setCurrentMessage,
    handleModeChange,
    handleSendMessage,
    handlePayment,
    handleSimulateCheckout,
  } = useNegotiation({
    productId: selectedProductId,
    category: selectedCategory,
    color: selectedColor,
    totalQty,
    unitPrice,
    moq,
  })

  const [isQuoteLoading, setIsQuoteLoading] = useState(true)

  // KEPUTUSAN 1: Parent fetch /api/quote, pass ke Canvas & LeftPanel sebagai props.
  useEffect(() => {
    let cancelled = false
    setIsQuoteLoading(true)
    fetch(`/api/quote?productId=${encodeURIComponent(selectedProductId)}&category=${encodeURIComponent(selectedCategory)}`)
      .then(res => (res.ok ? res.json() : Promise.reject(new Error('quote failed'))))
      .then((data: PriceQuote) => {
        if (!cancelled) {
          setQuote(data)
          setIsQuoteLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQuote(null)
          setIsQuoteLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [selectedProductId, selectedCategory])

  const handleQuantityChange = (size: string, value: number) => {
    setQuantities(prev => ({ ...prev, [size]: value }))
  }

  const handleDesignComplete = (blueprint: CanvasBlueprint) => {
    saveBlueprint(blueprint)
    console.log('[EditorPage] Blueprint saved to localStorage:', BLUEPRINT_STORAGE_KEY)
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      <Header
        onAddToCart={() => {
          alert(
            `Added ${totalQty} pcs to cart at total Rp ${total.toLocaleString('id-ID')}`
          )
        }}
      />

      {/* Desktop Layout - 3 Column */}
      <div className="hidden md:flex flex-1 min-h-0">
        <LeftPanel
          activeMenu={activeMenu}
          onMenuChange={setActiveMenu}
          selectedColor={selectedColor}
          onColorChange={setSelectedColor}
          colors={colors}
          colorVariants={colorVariants}
          disabledColors={disabledColors}
          selectedSize={selectedSize}
          onSizeChange={setSelectedSize}
          sizes={sizes}
          basePrice={basePrice}
          logoPrice={logoPrice}
          textPrice={textPrice}
          subtotal={subtotal}
          isQuoteLoading={isQuoteLoading}
        />

        <CanvasEditor
          selectedColor={selectedColor}
          quote={quote ?? {
            productId: selectedProductId,
            category: selectedCategory,
            basePrice: 0,
            logoPrice: 0,
            textPrice: 0,
            unitPrice: 0,
          }}
          onDesignComplete={handleDesignComplete}
        />

        <RightPanel
          mode={rightPanelMode}
          onModeChange={handleModeChange}
          basePrice={basePrice}
          logoPrice={logoPrice}
          textPrice={textPrice}
          subtotal={subtotal}
          quantities={quantities}
          onQuantityChange={handleQuantityChange}
          sizes={sizes}
          totalQty={totalQty}
          total={total}
          chatMessages={chatMessages}
          currentMessage={currentMessage}
          onMessageChange={setCurrentMessage}
          onSendMessage={handleSendMessage}
          currentPrice={currentPrice}
          isLoading={isLoading}
          currentTier={currentTier}
          agreedDiscount={agreedDiscount}
          onPayment={handlePayment}
          isProcessingPayment={isProcessingPayment}
          onSimulateCheckout={handleSimulateCheckout}
          isSimulatingCheckout={isProcessingPayment}
          isQuoteLoading={isQuoteLoading}
          moq={moq}
        />
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden">
        <MobileBottomNav
          activeMenu={activeMenu}
          onMenuChange={(menu) => {
            setActiveMenu(menu)
            setMobileLeftPanelOpen(true)
          }}
          onTogglePricing={() => setMobileRightPanelOpen(!mobileRightPanelOpen)}
          zoomLevel={zoomLevel}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
        />
      </div>

      {/* Mobile Bottom Sheets */}
      <MobileLeftPanelSheet
        isOpen={mobileLeftPanelOpen}
        onClose={() => setMobileLeftPanelOpen(false)}
        activeMenu={activeMenu}
        selectedColor={selectedColor}
        onColorChange={setSelectedColor}
        colors={colors}
        colorVariants={colorVariants}
        disabledColors={disabledColors}
        selectedSize={selectedSize}
        onSizeChange={setSelectedSize}
        sizes={sizes}
        basePrice={basePrice}
        logoPrice={logoPrice}
        textPrice={textPrice}
        subtotal={subtotal}
      />

      <MobileRightPanelSheet
        isOpen={mobileRightPanelOpen}
        onClose={() => setMobileRightPanelOpen(false)}
        mode={rightPanelMode}
        onModeChange={handleModeChange}
        basePrice={basePrice}
        logoPrice={logoPrice}
        textPrice={textPrice}
        subtotal={subtotal}
        quantities={quantities}
        onQuantityChange={handleQuantityChange}
        sizes={sizes}
        totalQty={totalQty}
        total={total}
        chatMessages={chatMessages}
        currentMessage={currentMessage}
        onMessageChange={setCurrentMessage}
        onSendMessage={handleSendMessage}
        currentPrice={currentPrice}
        isLoading={isLoading}
        currentTier={currentTier}
        agreedDiscount={agreedDiscount}
        onPayment={handlePayment}
        isProcessingPayment={isProcessingPayment}
        onSimulateCheckout={handleSimulateCheckout}
        isSimulatingCheckout={isProcessingPayment}
        moq={moq}
      />
    </div>
  )
}
