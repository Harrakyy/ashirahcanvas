'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { persistVendorBlueprint } from '@/features/canvas/utils/exportHelpers'
import type { ChatMessage } from '@/types/chat'
import type { NegotiateResponse, SessionInitResponse, SessionStatusResponse } from '@/types/api'

interface UseNegotiationParams {
  productId: string
  category: string
  color: string
  totalQty: number
  unitPrice: number
  moq?: number
}

export function useNegotiation({
  productId,
  category,
  color,
  totalQty,
  unitPrice,
  moq = 12,
}: UseNegotiationParams) {
  const router = useRouter()

  const [rightPanelMode, setRightPanelMode] = useState<'review' | 'negotiate'>('review')
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [currentMessage, setCurrentMessage] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [currentPrice, setCurrentPrice] = useState(105000)
  const [currentTier, setCurrentTier] = useState(0)
  const [agreedDiscount, setAgreedDiscount] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)

  const initSession = useCallback(async (force = false) => {
    if (!force && sessionId) return

    try {
      const res = await fetch('/api/session/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          category,
          color,
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
        color,
      }))
    } catch {
      setChatMessages([{
        id: 1,
        type: 'ai',
        message: `Halo kak! Terima kasih sudah tertarik dengan kaos custom Ashirah. Untuk pesanan ${totalQty} pcs (${color}), harga normalnya Rp ${unitPrice.toLocaleString('id-ID')}/pcs. Ada yang bisa saya bantu?`,
      }])
    }
  }, [sessionId, totalQty, color, unitPrice, productId, category])

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
    const rawFingerprint = localStorage.getItem('negotiationSessionFingerprint')

    if (savedSessionId && rawFingerprint) {
      try {
        const savedFingerprint = JSON.parse(rawFingerprint)
        const paramsMatch =
          savedFingerprint &&
          savedFingerprint.quantity === totalQty &&
          savedFingerprint.productId === productId &&
          savedFingerprint.color === color

        if (paramsMatch) {
          restoreSession(savedSessionId)
        } else {
          // Spec changed (e.g. user selected different quantity/color/product), clear old session
          localStorage.removeItem('negotiationSessionId')
          localStorage.removeItem('negotiationSessionFingerprint')
          setSessionId(null)
          setChatMessages([])
          setCurrentTier(0)
          setAgreedDiscount(null)
          setCurrentPrice(unitPrice)
        }
      } catch {
        localStorage.removeItem('negotiationSessionId')
        localStorage.removeItem('negotiationSessionFingerprint')
      }
    } else if (savedSessionId && !rawFingerprint) {
      localStorage.removeItem('negotiationSessionId')
    }
  }, [restoreSession, totalQty, productId, color, unitPrice])

  const handleModeChange = useCallback(async (mode: 'review' | 'negotiate') => {
    if (mode === 'negotiate' && totalQty < 1) {
      alert('Silakan tentukan jumlah pesanan terlebih dahulu.')
      return
    }
    setRightPanelMode(mode)
    if (mode !== 'negotiate') return

    let needsNewSession = !sessionId

    if (sessionId) {
      const savedFingerprint = JSON.parse(localStorage.getItem('negotiationSessionFingerprint') || 'null')
      const paramsMatch = savedFingerprint
        && savedFingerprint.quantity === totalQty
        && savedFingerprint.productId === productId
        && savedFingerprint.color === color

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
  }, [sessionId, chatMessages.length, initSession, totalQty, color, unitPrice, productId, moq])

  const handleSendMessage = useCallback(async () => {
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
          message: 'Maaf kak, ada gangguan sedikit. Bisa ulangi pesannya?',
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }, [currentMessage, isLoading, sessionId, chatMessages.length, initSession])

  const handlePayment = useCallback(async () => {
    if (!sessionId || agreedDiscount === null || isProcessingPayment) return

    if (totalQty < 1) {
      alert('Jumlah pesanan tidak valid. Tentukan jumlah pesanan terlebih dahulu.')
      return
    }

    if (totalQty < 12 && agreedDiscount > 0) {
      alert('Diskon hanya berlaku untuk pemesanan minimal 12 pcs.')
      return
    }

    setIsProcessingPayment(true)
    try {
      // 1. Snapshot canvas and persist blueprint to storage first
      persistVendorBlueprint()

      // 2. Read blueprint snapshot from storage
      let designBlueprint: Record<string, unknown> = {}
      try {
        const raw =
          sessionStorage.getItem('vendor_blueprint') ||
          localStorage.getItem('vendor_blueprint') ||
          localStorage.getItem('vendorBlueprint') ||
          localStorage.getItem('canvas_blueprint')
        if (raw) {
          designBlueprint = JSON.parse(raw)
        }
      } catch (storageErr) {
        console.warn('[AshirahBot] Could not read blueprint from storage:', storageErr)
      }

      // Attach canvas preview data URL if available
      try {
        const { getCanvas } = await import('@/lib/ui/canvas-engine')
        const canvas = getCanvas()
        if (canvas) {
          const pBase64 = canvas.toDataURL()
          if (pBase64) {
            designBlueprint.preview_base64 = pBase64
            designBlueprint.previewBase64 = pBase64
            if (!designBlueprint.design_assets) {
              designBlueprint.design_assets = {} as any
            }
            (designBlueprint.design_assets as any).preview_base64 = pBase64
          }
        }
      } catch (canvasErr) {
        console.warn('[AshirahBot] Could not capture canvas preview:', canvasErr)
      }

      // 3. Request payment creation and DB order record
      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          designBlueprint,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Payment init failed' }))
        alert(err.error || 'Gagal memulai pembayaran. Silakan coba lagi.')
        return
      }

      const { paymentUrl, redirectUrl, orderId, orderNumber } = await res.json()
      const targetUrl = paymentUrl || redirectUrl

      // Clean up consumed negotiation session
      localStorage.removeItem('negotiationSessionId')
      localStorage.removeItem('negotiationSessionFingerprint')
      setSessionId(null)
      setChatMessages([])
      setAgreedDiscount(null)
      setCurrentTier(0)

      if (orderId) {
        localStorage.setItem('lastOrderId', orderId)
      }
      if (orderNumber) {
        localStorage.setItem('lastOrderNumber', orderNumber)
      }

      if (targetUrl) {
        window.location.href = targetUrl
      } else {
        router.push(`/payment/success?order_id=${encodeURIComponent(orderNumber || orderId || '')}`)
      }
    } catch (error) {
      console.error('[AshirahBot] Payment init failed:', error)
      alert(error instanceof Error ? error.message : 'Gagal memulai pembayaran. Silakan coba lagi.')
    } finally {
      setIsProcessingPayment(false)
    }
  }, [sessionId, agreedDiscount, isProcessingPayment, router, totalQty, moq])

  const handleSimulateCheckout = useCallback(() => {
    if (isProcessingPayment) return
    setIsProcessingPayment(true)
    try {
      persistVendorBlueprint()
      // Clean up negotiation session on simulation
      localStorage.removeItem('negotiationSessionId')
      localStorage.removeItem('negotiationSessionFingerprint')
      setSessionId(null)
      setChatMessages([])
      setAgreedDiscount(null)
      setCurrentTier(0)

      const orderId = `SIM-${Date.now()}`
      router.push(`/payment/success?order_id=${encodeURIComponent(orderId)}`)
    } finally {
      setIsProcessingPayment(false)
    }
  }, [isProcessingPayment, router])

  return {
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
  }
}
