'use client'

import { useState } from 'react'
import { ChevronDown, MessageCircle } from 'lucide-react'

interface FAQItem {
  id: string
  question: string
  answer: string
}

const faqs: FAQItem[] = [
  {
    id: '1',
    question: 'Bagaimana cara upload logo?',
    answer:
      'Klik menu "Upload Image", pilih file logo (PNG, JPG, SVG), kemudian drag ke canvas. Logo akan otomatis tersimpan di folder "My Images".',
  },
  {
    id: '2',
    question: 'Berapa lama proses produksi?',
    answer:
      'Proses produksi standar adalah 7-10 hari kerja setelah pembayaran diterima. Kami juga menawarkan express 3-5 hari dengan biaya tambahan.',
  },
  {
    id: '3',
    question: 'Apakah bisa request warna khusus?',
    answer:
      'Ya, tentu saja! Kami menyediakan pantone color matching. Silakan hubungi tim kami untuk konsultasi warna khusus Anda.',
  },
  {
    id: '4',
    question: 'Bagaimana cara kerja nego harga?',
    answer:
      'Untuk pembelian dalam jumlah besar (50+ pcs), gunakan fitur "Negotiate Mode" di panel kanan untuk diskusi harga langsung dengan tim kami.',
  },
  {
    id: '5',
    question: 'Metode pembayaran apa saja yang tersedia?',
    answer:
      'Kami menerima transfer bank, kartu kredit, e-wallet (GoPay, OVO, DANA), dan cicilan 0% untuk pembelian tertentu.',
  },
]

export default function HelpPanel() {
  const [expandedId, setExpandedId] = useState<string | null>('1')

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  return (
    <div className="p-4 space-y-4 flex flex-col h-full">
      {/* FAQ Accordion */}
      <div className="space-y-2 flex-1 overflow-y-auto">
        <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wide">
          Pertanyaan Umum (FAQ)
        </h3>

        <div className="space-y-1">
          {faqs.map(faq => (
            <div
              key={faq.id}
              className="rounded-lg border-2 border-gray-200 bg-white hover:border-gray-300 transition"
            >
              {/* Question Button */}
              <button
                onClick={() => toggleExpand(faq.id)}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition"
              >
                <p className="text-sm font-medium text-gray-900 text-left flex-1">
                  {faq.question}
                </p>
                <ChevronDown
                  className={`w-4 h-4 text-gray-600 transition-transform flex-shrink-0 ${
                    expandedId === faq.id ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Answer */}
              {expandedId === faq.id && (
                <div className="px-3 pb-3 pt-0 border-t border-gray-200">
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Contact Card */}
      <div className="space-y-3 pt-4 border-t border-gray-200">
        <div className="p-3 bg-blue-50 rounded-xl border-2 border-blue-200">
          <p className="text-xs font-semibold text-gray-900">
            Butuh bantuan lebih lanjut?
          </p>
          <p className="text-xs text-gray-600 mt-1">
            Hubungi tim kami untuk pertanyaan atau bantuan khusus.
          </p>
        </div>

        <button className="w-full px-4 py-2 bg-blue-950 hover:bg-blue-900 text-white rounded-lg text-sm transition font-medium flex items-center justify-center gap-2">
          <MessageCircle className="w-4 h-4" />
          Chat dengan Tim Kami
        </button>
      </div>
    </div>
  )
}
