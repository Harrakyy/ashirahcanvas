import { ChevronLeft, Send, MessageCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ChatMessage {
  id: number
  type: 'user' | 'ai'
  message: string
  isLoading?: boolean
}

interface NegotiateModeProps {
  onBack: () => void
  chatMessages: ChatMessage[]
  currentMessage: string
  onMessageChange: (message: string) => void
  onSendMessage: () => void
  handleKeyDown: (e: React.KeyboardEvent) => void
  currentPrice: number
  totalQty: number
  total: number
  chatEndRef: React.RefObject<HTMLDivElement>
  isLoading?: boolean
  currentTier?: number
  agreedDiscount?: number | null
  onPayment?: () => void
  isProcessingPayment?: boolean
}

export default function NegotiateMode({
  onBack,
  chatMessages,
  currentMessage,
  onMessageChange,
  onSendMessage,
  handleKeyDown,
  currentPrice,
  totalQty,
  total,
  chatEndRef,
  isLoading = false,
  currentTier = 0,
  agreedDiscount = null,
  onPayment,
  isProcessingPayment = false,
}: NegotiateModeProps) {
  const tierLabels: Record<number, string> = {
    0: 'Tidak ada diskon',
    1: 'Diskon 2%',
    2: 'Diskon 5%',
    3: 'Diskon 7% (maksimal)',
  }

  return (
    <>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-1 hover:bg-gray-100 rounded transition"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            Nego Harga dengan AshirahBot
          </h2>
          <p className="text-xs text-gray-500">
            {agreedDiscount !== null
              ? `Deal! Diskon ${agreedDiscount}%`
              : tierLabels[currentTier]}
          </p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-4 flex flex-col gap-3">
        {chatMessages.map(msg => (
          <div
            key={msg.id}
            className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                msg.type === 'user'
                  ? 'bg-blue-950 text-white rounded-tr-sm'
                  : 'bg-white text-gray-900 rounded-tl-sm shadow-sm'
              }`}
            >
              {msg.isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  AshirahBot sedang mengetik...
                </span>
              ) : (
                msg.message
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white text-gray-900 rounded-2xl rounded-tl-sm shadow-sm px-3 py-2 text-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              AshirahBot sedang mengetik...
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Current Offer Card */}
      <div className={`border-t p-4 space-y-2 border-b ${
        agreedDiscount !== null
          ? 'bg-green-50 border-green-200'
          : 'bg-blue-50 border-blue-200'
      }`}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-900">
            {agreedDiscount !== null ? 'Harga Final' : 'Penawaran saat ini'}
          </p>
          {agreedDiscount !== null && (
            <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">
              Deal {agreedDiscount}%
            </span>
          )}
        </div>
        <p className="text-sm text-gray-700">
          Rp {currentPrice.toLocaleString('id-ID')}/pcs x {totalQty} pcs
        </p>
        <p className="text-2xl font-bold text-blue-950">
          Total: Rp {total.toLocaleString('id-ID')}
        </p>
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4 space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={currentMessage}
            onChange={e => onMessageChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ketik pesan..."
            disabled={isLoading || agreedDiscount !== null}
            className="flex-1 px-3 py-2 bg-white border-2 border-gray-300 rounded-md text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-950 focus:border-blue-950 transition disabled:opacity-50"
          />
          <button
            onClick={onSendMessage}
            disabled={isLoading || agreedDiscount !== null}
            className="p-2 bg-blue-950 hover:bg-blue-900 text-white rounded-lg transition font-medium disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {agreedDiscount !== null && (
            <Button
              disabled={totalQty === 0 || isProcessingPayment}
              type="button"
              onClick={onPayment}
              className={`w-full font-semibold py-2 ${
                totalQty === 0 || isProcessingPayment
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isProcessingPayment ? 'Memproses...' : 'Lanjut ke Pembayaran'}
            </Button>
          )}
          <Button
            variant="outline"
            className="w-full border-2 border-blue-950 text-blue-950 hover:bg-blue-50 gap-2 font-medium py-2"
            disabled
          >
            <MessageCircle className="w-4 h-4" />
            Chat dengan Tim Kami
          </Button>
        </div>
      </div>
    </>
  )
}
