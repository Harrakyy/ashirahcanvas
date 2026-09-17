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
}

export function useNegotiation({
  productId,
  category,
  color,
  totalQty,
  unitPrice,
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
  }, [sessionId, chatMessages.length, initSession, totalQty, color, unitPrice, productId])

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
        onSuccess: (result: any) => {
          persistVendorBlueprint()
          router.push(`/payment/success?order_id=${encodeURIComponent(result.order_id || '')}`)
        },
        onPending: (result: any) => {
          persistVendorBlueprint()
          router.push(`/payment/success?order_id=${encodeURIComponent(result.order_id || '')}`)
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
  }, [sessionId, agreedDiscount, isProcessingPayment, router])

  const handleSimulateCheckout = useCallback(() => {
    if (isProcessingPayment) return
    setIsProcessingPayment(true)
    try {
      persistVendorBlueprint()
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
