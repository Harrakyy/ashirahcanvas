'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Type, Plus, Check, CornerDownLeft, Bold, Italic, AlignLeft, AlignCenter, AlignRight, ChevronUp, ChevronDown } from 'lucide-react'
import { addTextToCanvas, updateSelectedText, getCanvas } from '@/lib/ui/canvas-engine'
import { useDesignStore } from '@/store/design-store'
import { useCanvasStore } from '@/features/canvas/store/useCanvasStore'

const LOCKED_FONTS = [
  { id: 'Inter', label: 'Inter', family: 'Inter, sans-serif' },
  { id: 'Roboto', label: 'Roboto', family: 'Roboto, sans-serif' },
  { id: 'Montserrat', label: 'Montserrat', family: 'Montserrat, sans-serif' },
  { id: 'Playfair Display', label: 'Playfair Display', family: '"Playfair Display", serif' },
  { id: 'Oswald', label: 'Oswald', family: 'Oswald, sans-serif' },
]

const TEXT_COLORS = [
  { hex: '#000000', label: 'Hitam' },
  { hex: '#FFFFFF', label: 'Putih' },
  { hex: '#1E3A8A', label: 'Navy' },
  { hex: '#DC2626', label: 'Merah' },
  { hex: '#16A34A', label: 'Hijau' },
  { hex: '#D97706', label: 'Kuning' },
  { hex: '#9333EA', label: 'Ungu' },
  { hex: '#E11D48', label: 'Pink' },
]

export default function AddText() {
  const [text, setText] = useState('Ashirah Apparel')
  const [selectedFont, setSelectedFont] = useState('Inter')
  const [textColor, setTextColor] = useState('#000000')
  const [isBold, setIsBold] = useState(false)
  const [isItalic, setIsItalic] = useState(false)
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('center')
  const [fontSize, setFontSize] = useState(28)
  const [hasActiveTextSelection, setHasActiveTextSelection] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const selectedView = useDesignStore((s) => s.selectedView)
  const selectedCategory = useDesignStore((s) => s.selectedCategory)
  const garmentColor = useCanvasStore((s) => s.selectedColor)

  const syncActiveTextSelection = useCallback(() => {
    const canvas = getCanvas()
    if (!canvas) return
    const active = canvas.getActiveObject()
    if (active && ((active as any).type === 'textbox' || active.type === 'i-text' || active.type === 'text')) {
      setHasActiveTextSelection(true)
      const curText = (active as any).text ?? ''
      const curFont = (active as any).fontFamily ?? 'Inter'
      const curColor = (active as any).fill ?? '#000000'
      setText(curText)
      setSelectedFont(curFont)
      setTextColor(typeof curColor === 'string' ? curColor : '#000000')
      setIsBold((active as any).fontWeight === 'bold')
      setIsItalic((active as any).fontStyle === 'italic')
      setTextAlign(((active as any).textAlign as 'left' | 'center' | 'right') ?? 'center')
      setFontSize((active as any).fontSize ?? 28)
    } else {
      setHasActiveTextSelection(false)
    }
  }, [])

  useEffect(() => {
    const canvas = getCanvas()
    if (!canvas) return

    canvas.on('selection:created', syncActiveTextSelection)
    canvas.on('selection:updated', syncActiveTextSelection)
    canvas.on('selection:cleared', syncActiveTextSelection)
    canvas.on('text:changed', syncActiveTextSelection)

    syncActiveTextSelection()

    return () => {
      canvas.off('selection:created', syncActiveTextSelection)
      canvas.off('selection:updated', syncActiveTextSelection)
      canvas.off('selection:cleared', syncActiveTextSelection)
      canvas.off('text:changed', syncActiveTextSelection)
    }
  }, [syncActiveTextSelection])

  const handleTextChange = (newVal: string) => {
    setText(newVal)
    if (hasActiveTextSelection) {
      updateSelectedText({ text: newVal })
    }
  }

  const handleInsertNewline = () => {
    const el = textareaRef.current
    if (!el) {
      handleTextChange(text + '\n')
      return
    }
    const start = el.selectionStart ?? text.length
    const end = el.selectionEnd ?? text.length
    const nextText = text.slice(0, start) + '\n' + text.slice(end)
    handleTextChange(nextText)

    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + 1, start + 1)
    })
  }

  const handleFontChange = (fontId: string) => {
    setSelectedFont(fontId)
    if (hasActiveTextSelection) {
      updateSelectedText({ fontFamily: fontId })
    }
  }

  const handleColorChange = (hex: string) => {
    setTextColor(hex)
    if (hasActiveTextSelection) {
      updateSelectedText({ fill: hex })
    }
  }

  const handleBoldToggle = () => {
    const next = !isBold
    setIsBold(next)
    if (hasActiveTextSelection) {
      updateSelectedText({ fontWeight: next ? 'bold' : 'normal' })
    }
  }

  const handleItalicToggle = () => {
    const next = !isItalic
    setIsItalic(next)
    if (hasActiveTextSelection) {
      updateSelectedText({ fontStyle: next ? 'italic' : 'normal' })
    }
  }

  const handleAlignChange = (align: 'left' | 'center' | 'right') => {
    setTextAlign(align)
    if (hasActiveTextSelection) {
      updateSelectedText({ textAlign: align })
    }
  }

  const handleFontSizeChange = (val: number) => {
    const clamped = Math.max(8, Math.min(120, val))
    setFontSize(clamped)
    if (hasActiveTextSelection) {
      updateSelectedText({ fontSize: clamped })
    }
  }

  const handleAddText = async () => {
    await addTextToCanvas(
      text || 'Teks Baru',
      selectedFont,
      textColor,
      selectedView,
      selectedCategory,
      garmentColor
    )
    // Sync bold/italic/align/fontSize after adding
    syncActiveTextSelection()
  }

  return (
    <div className="p-4 space-y-5 flex flex-col h-full overflow-y-auto">
      <div>
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <Type className="w-4 h-4 text-blue-950" />
          {hasActiveTextSelection ? 'Edit Teks Aktif' : 'Tambah Teks Sablon'}
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          {hasActiveTextSelection
            ? 'Ubah isi, font, atau warna teks yang sedang dipilih di kanvas.'
            : 'Pilih font dan warna untuk menambahkan teks kustom ke desain.'}
        </p>
      </div>

      {/* Input Teks */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-gray-700">Isi Teks</label>
          <button
            type="button"
            onClick={handleInsertNewline}
            className="text-[11px] font-medium text-blue-950 hover:text-blue-800 flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 transition border border-blue-200"
            title="Sisipkan baris baru (newline) ke teks"
          >
            <CornerDownLeft className="w-3 h-3" />
            Baris Baru
          </button>
        </div>
        <textarea
          ref={textareaRef}
          rows={3}
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="Ketik teks di sini (tekan Enter atau klik 'Baris Baru' untuk multi-baris)..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white placeholder:text-gray-500 focus:outline-hidden focus:ring-2 focus:ring-blue-950 font-medium resize-y min-h-[72px]"
        />
        <p className="text-[10px] text-gray-400">
          Tip: Teks otomatis membungkus (wrap) di kanvas, atau gunakan Enter / tombol Baris Baru untuk memisah baris.
        </p>
      </div>

      {/* Style Controls: Bold, Italic, Align, Font Size */}
      <div className="space-y-3">
        <label className="text-xs font-semibold text-gray-700">Gaya Teks</label>
        <div className="flex gap-1.5 flex-wrap">
          {/* Bold */}
          <button
            type="button"
            onClick={handleBoldToggle}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition ${
              isBold ? 'border-blue-950 bg-blue-950 text-white' : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
            }`}
          >
            <Bold className="w-3.5 h-3.5" />
            Bold
          </button>
          {/* Italic */}
          <button
            type="button"
            onClick={handleItalicToggle}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition ${
              isItalic ? 'border-blue-950 bg-blue-950 text-white' : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
            }`}
          >
            <Italic className="w-3.5 h-3.5" />
            Italic
          </button>
        </div>

        {/* Alignment */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {(['left', 'center', 'right'] as const).map((align) => {
            const Icon = align === 'left' ? AlignLeft : align === 'center' ? AlignCenter : AlignRight
            const label = align === 'left' ? 'Kiri' : align === 'center' ? 'Tengah' : 'Kanan'
            return (
              <button
                key={align}
                type="button"
                onClick={() => handleAlignChange(align)}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-xs transition ${
                  textAlign === align ? 'bg-white shadow-sm text-blue-950 font-semibold' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            )
          })}
        </div>

        {/* Font Size */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-700 whitespace-nowrap">Ukuran Font</label>
          <div className="flex items-center gap-1 ml-auto">
            <button
              type="button"
              onClick={() => handleFontSizeChange(fontSize - 2)}
              className="p-1 rounded-md border border-gray-200 hover:bg-gray-100 text-gray-700 transition"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            <input
              type="number"
              min={8}
              max={120}
              value={fontSize}
              onChange={(e) => handleFontSizeChange(Number(e.target.value))}
              className="w-12 text-center border border-gray-200 rounded-md py-0.5 text-xs font-semibold text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-950"
            />
            <button
              type="button"
              onClick={() => handleFontSizeChange(fontSize + 2)}
              className="p-1 rounded-md border border-gray-200 hover:bg-gray-100 text-gray-700 transition"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Font Selector (5 Fonts Terkunci) */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-gray-700">Pilihan Font (5 Tipografi)</label>
        <div className="space-y-1.5">
          {LOCKED_FONTS.map((font) => {
            const isSelected = selectedFont === font.id
            return (
              <button
                key={font.id}
                type="button"
                onClick={() => handleFontChange(font.id)}
                className={`w-full p-2.5 rounded-lg border flex items-center justify-between transition text-left ${
                  isSelected
                    ? 'border-blue-950 bg-blue-50/70 shadow-xs'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <span className="text-base text-gray-900" style={{ fontFamily: font.family }}>
                  {font.label}
                </span>
                {isSelected && <Check className="w-4 h-4 text-blue-950 flex-shrink-0" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Color Selector */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-gray-700">Warna Teks</label>
        <div className="grid grid-cols-4 gap-2">
          {TEXT_COLORS.map((c) => {
            const isSelected = textColor.toLowerCase() === c.hex.toLowerCase()
            return (
              <button
                key={c.hex}
                type="button"
                onClick={() => handleColorChange(c.hex)}
                className={`flex items-center gap-1.5 p-1.5 rounded-lg border text-xs transition ${
                  isSelected
                    ? 'border-blue-950 bg-blue-50 font-semibold'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <span
                  className="w-4 h-4 rounded-full border border-gray-300 flex-shrink-0"
                  style={{ backgroundColor: c.hex }}
                />
                <span className="truncate text-[11px]">{c.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Button Add to Canvas */}
      {!hasActiveTextSelection && (
        <button
          type="button"
          onClick={handleAddText}
          className="w-full py-2.5 px-4 bg-[#1A2B56] hover:bg-[#243B6B] text-white rounded-full text-sm font-bold flex items-center justify-center gap-2 shadow-md transition mt-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Tambahkan ke Kanvas
        </button>
      )}
    </div>
  )
}
