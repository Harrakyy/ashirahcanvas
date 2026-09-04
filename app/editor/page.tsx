'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Script from 'next/script'
import Header from '@/components/header'
import LeftPanel from '@/components/left-panel'
import Canvas from '@/components/canvas'
import RightPanel from '@/components/right-panel'
import MobileBottomNav from '@/components/mobile-bottom-nav'
import MobileLeftPanelSheet from '@/components/mobile-left-panel-sheet'
import MobileRightPanelSheet from '@/components/mobile-right-panel-sheet'
import { useDesignStore } from '@/store/design-store'
import { captureAndPersistBlueprint } from '@/lib/ui/blueprint-extractor'
import type { PriceQuote } from '@/types/pricing'
import type { ChatMessage } from '@/types/chat'
import type { NegotiateResponse, SessionInitResponse, SessionStatusResponse } from '@/types/api'

export default function EditorPage() {
  const router = useRouter()
  const [mobileLeftPanelOpen, setMobileLeftPanelOpen] = useState(false)
  const [mobileRightPanelOpen, setMobileRightPanelOpen] = useState(false)
  const [activeMenu, setActiveMenu] = useState('product')
  const [selectedColor, setSelectedColor] = useState('#FFFFFF')
  const [selectedSize, setSelectedSize] = useState('M')
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
  const [rightPanelMode, setRightPanelMode] = useState<'review' | 'negotiate'>(
    'review'
  )
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [currentMessage, setCurrentMessage] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [currentPrice, setCurrentPrice] = useState(105000)
  const [currentTier, setCurrentTier] = useState(0)
  const [agreedDiscount, setAgreedDiscount] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(100)
  const [quote, setQuote] = useState<PriceQuote | null>(null)

  const sizes = ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL']
  const activeColors = ['#FFFFFF', '#000000']
  const colors = [
    '#000000',
    '#FFFFFF',
    '#808080',
    '#C0C0C0',
    '#FF0000',
    '#00FF00',
    '#0000FF',
    '#FFFF00',
    '#FFA500',
    '#800080',
    '#FFC0CB',
    '#A52A2A',
    '#008080',
    '#FFD700',
    '#4B0082',
    '#FF69B4',
    '#1E90FF',
    '#32CD32',
    '#FF4500',
    '#9370DB',
    '#00CED1',
    '#FF1493',
    '#00FA9A',
    '#DC143C',
    '#7FFF00',
    '#8B4513',
    '#FF8C00',
    '#228B22',
    '#4169E1',
    '#FF00FF',
    '#00BFFF',
    '#F0E68C',
  ]
  const disabledColors = colors.filter(c => !activeColors.includes(c))

  const basePrice = quote?.basePrice ?? 0
  const logoPrice = quote?.logoPrice ?? 0
  const textPrice = quote?.textPrice ?? 0

  const totalQty = Object.values(quantities).reduce((a, b) => a + b, 0)
  const unitPrice = quote?.unitPrice ?? 0
  const subtotal = currentPrice
  const total = subtotal * totalQty

  useEffect(() => {
    const productId = useDesignStore.getState().selectedProductId
    const category = useDesignStore.getState().selectedCategory

    let cancelled = false
    fetch(`/api/quote?productId=${encodeURIComponent(productId)}&category=${encodeURIComponent(category)}`)
      .then(res => (res.ok ? res.json() : Promise.reject(new Error('quote failed'))))
      .then((data: PriceQuote) => {
        if (!cancelled) setQuote(data)
      })
      .catch(() => {
        if (!cancelled) setQuote(null)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const initSession = useCallback(async (force = false) => {
    if (!force && sessionId) return

    try {
      const productId = useDesignStore.getState().selectedProductId
      const category = useDesignStore.getState().selectedCategory

      const res = await fetch('/api/session/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          category,
          color: selectedColor,
          quantities: totalQty,
        }),
      })

      if (!res.ok) throw new Error('Failed to init session')

      const data = (await res.json()) as SessionInitResponse
      setSessionId(data.sessionId)
      setCurrentPrice(data.currentPrice)
      setCurrentTier(data.tier)
      setChatMessages([{
        id: 1,
        type: 'ai',
        message: data.initialMessage,
      }])
      localStorage.setItem('negotiationSessionId', data.sessionId)
      localStorage.setItem('negotiationSessionFingerprint', JSON.stringify({
        quantity: totalQty,
        productId,
        color: selectedColor,
      }))
    } catch {
      setChatMessages([{
        id: 1,
        type: 'ai',
        message: `Halo kak! 👋 Terima kasih sudah tertarik dengan kaos custom Ashirah. Untuk pesanan ${totalQty} pcs (${selectedColor}), harga normalnya Rp ${unitPrice.toLocaleString('id-ID')}/pcs. Ada yang bisa saya bantu? 😊`,
      }])
    }
  }, [sessionId, totalQty, selectedColor, unitPrice])

  const restoreSession = useCallback(async (sid: string) => {
    try {
      const res = await fetch('/api/session/status', {
        headers: { 'x-session-id': sid },
      })

      if (!res.ok) {
        localStorage.removeItem('negotiationSessionId')
        localStorage.removeItem('negotiationSessionFingerprint')
        return false
      }

      const data = (await res.json()) as SessionStatusResponse
      setSessionId(data.sessionId)
      setCurrentPrice(data.currentPrice)
      setCurrentTier(data.tier)
      setAgreedDiscount(data.agreedDiscount)
      setChatMessages(data.messages)
      return true
    } catch {
      localStorage.removeItem('negotiationSessionId')
      localStorage.removeItem('negotiationSessionFingerprint')
      return false
    }
  }, [])

  useEffect(() => {
    const savedSessionId = localStorage.getItem('negotiationSessionId')
    if (savedSessionId) {
      restoreSession(savedSessionId)
    }
  }, [restoreSession])

  const handleModeChange = useCallback(async (mode: 'review' | 'negotiate') => {
    setRightPanelMode(mode)
    if (mode !== 'negotiate') return

    let needsNewSession = !sessionId

    if (sessionId) {
      const savedFingerprint = JSON.parse(localStorage.getItem('negotiationSessionFingerprint') || 'null')
      const currentProductId = useDesignStore.getState().selectedProductId
      const paramsMatch = savedFingerprint
        && savedFingerprint.quantity === totalQty
        && savedFingerprint.productId === currentProductId
        && savedFingerprint.color === selectedColor

      if (!paramsMatch) {
        setSessionId(null)
        setAgreedDiscount(null)
        setChatMessages([])
        setCurrentTier(0)
        setCurrentPrice(unitPrice)
        localStorage.removeItem('negotiationSessionId')
        localStorage.removeItem('negotiationSessionFingerprint')
        needsNewSession = true
      }
    }

    if (needsNewSession && chatMessages.length === 0) {
      setChatMessages([{
        id: 1,
        type: 'ai',
        message: '',
        isLoading: true,
      }])
      await initSession(true)
    }
  }, [sessionId, chatMessages.length, initSession, totalQty, selectedColor, unitPrice])

  const handleQuantityChange = (size: string, value: number) => {
    setQuantities(prev => ({ ...prev, [size]: value }))
  }

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || isLoading) return
    if (!sessionId) {
      await initSession()
      return
    }

    const userMsg = {
      id: chatMessages.length + 1,
      type: 'user' as const,
      message: currentMessage,
    }

    setChatMessages(prev => [...prev, userMsg])
    setCurrentMessage('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/negotiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId,
        },
        body: JSON.stringify({ message: currentMessage }),
      })

      if (!res.ok) throw new Error('Failed to send message')

      const data = (await res.json()) as NegotiateResponse

      setChatMessages(data.messages)
      setCurrentPrice(data.currentPrice)
      setCurrentTier(data.tier)
      if (data.agreedDiscount !== null && data.agreedDiscount !== undefined) {
        setAgreedDiscount(data.agreedDiscount)
      }
    } catch {
      setChatMessages(prev => [
        ...prev,
        {
          id: prev.length + 1,
          type: 'ai',
          message: 'Maaf kak, ada gangguan sedikit. Bisa ulangi pesannya? 🙏',
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 10, 200))
  }

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 10, 50))
  }

  // ── Take-Home Test: capture blueprint sebelum meninggalkan /editor ───
  // Dipakai dua alur checkout (Simulasi Checkout & pembayaran Midtrans asli).
  // WAJIB dipanggil sebelum router.push: viewStates hidup di memori modul
  // (lib/ui/design-state.ts) dan hilang begitu halaman /editor unmount.
  const captureBlueprint = useCallback(
    () =>
      captureAndPersistBlueprint({
        productId: useDesignStore.getState().selectedProductId,
        category: useDesignStore.getState().selectedCategory,
        colorHex: selectedColor,
      }),
    [selectedColor]
  )

  const handlePayment = async () => {
    if (!sessionId || agreedDiscount === null || isProcessingPayment) return

    setIsProcessingPayment(true)
    try {
      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Payment init failed' }))
        throw new Error(err.error || 'Payment init failed')
      }

      const { token, orderId } = await res.json()

      const snap = (window as any).snap
      if (!snap) {
        alert('Sistem pembayaran belum siap. Silakan refresh halaman.')
        return
      }

      snap.pay(token, {
        // Take-Home Test: snapshot blueprint juga di alur pembayaran asli,
        // konsisten dengan handleSimulateCheckout. onPending ikut di-wire
        // karena ia juga menuju /payment/success — tanpa ini pembayaran
        // pending akan mendarat di modal blueprint yang kosong.
        // Kegagalan hanya di-log (bukan alert): pembayarannya sendiri sudah
        // berhasil, dan modal punya empty state yang layak.
        onSuccess: async (result: any) => {
          console.log('[AshirahBot] Payment success:', result)
          const oid = result.order_id || orderId || ''
          const blueprint = await captureBlueprint()
          if (!blueprint.ok) {
            console.error('[blueprint] gagal menyimpan snapshot:', blueprint.message)
          }
          router.push(`/payment/success?order_id=${encodeURIComponent(oid)}`)
        },
        onPending: async (result: any) => {
          console.log('[AshirahBot] Payment pending:', result)
          const oid = result.order_id || orderId || ''
          const blueprint = await captureBlueprint()
          if (!blueprint.ok) {
            console.error('[blueprint] gagal menyimpan snapshot:', blueprint.message)
          }
          router.push(`/payment/success?order_id=${encodeURIComponent(oid)}`)
        },
        onError: (result: any) => {
          console.error('[AshirahBot] Payment error:', result)
          alert('Pembayaran gagal. Silakan coba lagi.')
        },
      })
    } catch (error) {
      console.error('[AshirahBot] Payment init failed:', error)
      alert(error instanceof Error ? error.message : 'Gagal memulai pembayaran. Silakan coba lagi.')
    } finally {
      setIsProcessingPayment(false)
    }
  }

  // ── Take-Home Test seam: "Simulasi Checkout" ─────────────────────────
  // Jalan pintas dev-only untuk mencapai /payment/success TANPA negosiasi AI
  // maupun Midtrans (zero env vars). snapshotAllZones() dipanggil di sini
  // SEBELUM navigasi karena viewStates hidup di memori modul (design-state.ts)
  // dan hilang saat halaman /editor unmount. Alur pembayaran asli
  // (handlePayment) tetap utuh di atas dan tidak disentuh di sini.
  const handleSimulateCheckout = async () => {
    if (isProcessingPayment) return
    setIsProcessingPayment(true)
    try {
      const result = await captureBlueprint()
      if (!result.ok) {
        // Non-blocking: checkout tetap lanjut, modal blueprint akan
        // menampilkan state kosong (lihat vendor-blueprint-modal.tsx).
        // Tidak digagalkan diam-diam — user diberi tahu kenapa.
        console.error('[blueprint] gagal menyimpan snapshot:', result.message)
        alert(`Blueprint gagal disimpan: ${result.message}`)
      }
      const orderId = `SIM-${Date.now()}`
      router.push(`/payment/success?order_id=${encodeURIComponent(orderId)}`)
    } finally {
      setIsProcessingPayment(false)
    }
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
          disabledColors={disabledColors}
          selectedSize={selectedSize}
          onSizeChange={setSelectedSize}
          sizes={sizes}
          basePrice={basePrice}
          logoPrice={logoPrice}
          textPrice={textPrice}
          subtotal={subtotal}
        />

        {/* CANVAS — single instance, avoids singleton conflict */}
        <Canvas selectedColor={selectedColor} zoomLevel={zoomLevel} onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} />

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
        />
      </div>

      {/* Mobile Layout — reuses the same Canvas above; only panels differ */}
      <div className="md:hidden flex-1 flex flex-col overflow-hidden pb-16">
        {/* Canvas is rendered once in the desktop layout above and shared.
            On mobile the outer wrapper is hidden, so this slot is intentionally
            empty — do NOT add a second <Canvas> here (it would create two
            Fabric instances fighting over the same singleton). */}

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
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
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
      />

      <Script
        src={
          process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === 'true'
            ? 'https://app.midtrans.com/snap/snap.js'
            : 'https://app.sandbox.midtrans.com/snap/snap.js'
        }
        data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
        strategy="lazyOnload"
      />
    </div>
  )
}
