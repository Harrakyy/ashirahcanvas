'use client'

import { useRef, useEffect } from 'react'
import ReviewMode from './right-panel/review-mode'
import NegotiateMode from './right-panel/negotiate-mode'
import type { ChatMessage } from '@/types/chat'

interface RightPanelProps {
  mode: 'review' | 'negotiate'
  onModeChange: (mode: 'review' | 'negotiate') => void
  basePrice: number
  logoPrice: number
  textPrice: number
  subtotal: number
  quantities: { [key: string]: number }
  onQuantityChange: (size: string, value: number) => void
  sizes: string[]
  totalQty: number
  total: number
  chatMessages: ChatMessage[]
  currentMessage: string
  onMessageChange: (message: string) => void
  onSendMessage: () => void
  currentPrice: number
  isLoading?: boolean
  currentTier?: number
  agreedDiscount?: number | null
  onPayment?: () => void
  isProcessingPayment?: boolean
  onSimulateCheckout?: () => void
  isSimulatingCheckout?: boolean
}

export default function RightPanel({
  mode,
  onModeChange,
  basePrice,
  logoPrice,
  textPrice,
  subtotal,
  quantities,
  onQuantityChange,
  sizes,
  totalQty,
  total,
  chatMessages,
  currentMessage,
  onMessageChange,
  onSendMessage,
  currentPrice,
  isLoading = false,
  currentTier = 0,
  agreedDiscount = null,
  onPayment,
  isProcessingPayment = false,
  onSimulateCheckout,
  isSimulatingCheckout = false,
}: RightPanelProps) {
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (
      e.key === 'Enter' &&
      !e.shiftKey &&
      !e.nativeEvent.isComposing &&
      e.keyCode !== 229
    ) {
      e.preventDefault()
      onSendMessage()
    }
  }

  return (
    <div className="w-96 border-l border-gray-200 bg-white flex flex-col mt-16 overflow-hidden">
      {mode === 'review' ? (
        <ReviewMode
          basePrice={basePrice}
          logoPrice={logoPrice}
          textPrice={textPrice}
          subtotal={subtotal}
          quantities={quantities}
          onQuantityChange={onQuantityChange}
          sizes={sizes}
          totalQty={totalQty}
          total={total}
          onCustomNow={() => onModeChange('negotiate')}
          onSimulateCheckout={onSimulateCheckout}
          isSimulatingCheckout={isSimulatingCheckout}
        />
      ) : (
        <NegotiateMode
          onBack={() => onModeChange('review')}
          chatMessages={chatMessages}
          currentMessage={currentMessage}
          onMessageChange={onMessageChange}
          onSendMessage={onSendMessage}
          handleKeyDown={handleKeyDown}
          currentPrice={currentPrice}
          totalQty={totalQty}
          total={total}
          chatEndRef={chatEndRef}
          isLoading={isLoading}
          currentTier={currentTier}
          agreedDiscount={agreedDiscount}
          onPayment={onPayment}
          isProcessingPayment={isProcessingPayment}
        />
      )}
    </div>
  )
}
