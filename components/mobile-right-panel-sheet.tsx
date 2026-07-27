'use client'

import { X } from 'lucide-react'
import { useRef } from 'react'
import ReviewMode from './right-panel/review-mode'
import NegotiateMode from './right-panel/negotiate-mode'

interface ChatMessage {
  id: number
  type: 'user' | 'ai'
  message: string
  isLoading?: boolean
}

interface MobileRightPanelSheetProps {
  isOpen: boolean
  onClose: () => void
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
}

export default function MobileRightPanelSheet({
  isOpen,
  onClose,
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
}: MobileRightPanelSheetProps) {
  const chatEndRef = useRef<HTMLDivElement>(null)

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

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div className="fixed bottom-16 left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-30 md:hidden overflow-y-auto max-h-[calc(100vh-120px)]">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 flex items-center justify-between p-4 rounded-t-2xl">
          <div className="flex gap-2">
            <button
              onClick={() => onModeChange('review')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                mode === 'review'
                  ? 'bg-blue-950 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Review
            </button>
            <button
              onClick={() => onModeChange('negotiate')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                mode === 'negotiate'
                  ? 'bg-blue-950 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Negosiasi
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 pb-8">
          {mode === 'review' && (
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
            />
          )}

          {mode === 'negotiate' && (
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
      </div>
    </>
  )
}
