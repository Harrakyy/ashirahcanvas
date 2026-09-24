'use client'

/**
 * ObjectContextBar — Floating toolbar muncul saat ada objek terpilih di canvas.
 * Tombol: Duplikat (Ctrl+D), Flip H, Flip V, Center H, Center V, Bold (teks), Italic (teks), Hapus.
 * Dirender di bawah canvas, fixed relative terhadap canvas wrapper.
 */

import { Copy, FlipHorizontal2, FlipVertical2, AlignHorizontalDistributeCenter, AlignVerticalDistributeCenter, Bold, Italic, Trash2 } from 'lucide-react'
import {
  duplicateSelectedObject,
  flipSelectedObject,
  centerSelectedObject,
  deleteSelectedObject,
  updateSelectedText,
  getCanvas,
} from '@/lib/ui/canvas-engine'
import { Textbox } from 'fabric'

interface ObjectContextBarProps {
  hasSelection: boolean
  isText: boolean
  isBold: boolean
  isItalic: boolean
  onStateChange?: () => void
}

export default function ObjectContextBar({ hasSelection, isText, isBold, isItalic, onStateChange }: ObjectContextBarProps) {
  if (!hasSelection) return null

  const btn = 'p-2 rounded-xl transition flex items-center justify-center text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed'
  const btnActive = 'p-2 rounded-xl transition flex items-center justify-center bg-neutral-900 text-white'
  const sep = 'w-px bg-neutral-200 h-5 mx-0.5 self-center flex-shrink-0'

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-0.5 glass-hud rounded-2xl px-2 py-1.5 shadow-lg">
      {/* Duplicate */}
      <button
        title="Duplikat (Ctrl+D)"
        className={btn}
        onClick={() => { duplicateSelectedObject(); onStateChange?.() }}
      >
        <Copy className="w-4 h-4" />
      </button>

      <div className={sep} />

      {/* Flip */}
      <button
        title="Balik Horizontal"
        className={btn}
        onClick={() => flipSelectedObject('x')}
      >
        <FlipHorizontal2 className="w-4 h-4" />
      </button>
      <button
        title="Balik Vertikal"
        className={btn}
        onClick={() => flipSelectedObject('y')}
      >
        <FlipVertical2 className="w-4 h-4" />
      </button>

      <div className={sep} />

      {/* Center */}
      <button
        title="Tengahkan Horizontal"
        className={btn}
        onClick={() => centerSelectedObject('h')}
      >
        <AlignHorizontalDistributeCenter className="w-4 h-4" />
      </button>
      <button
        title="Tengahkan Vertikal"
        className={btn}
        onClick={() => centerSelectedObject('v')}
      >
        <AlignVerticalDistributeCenter className="w-4 h-4" />
      </button>

      {/* Text-only tools */}
      {isText && (
        <>
          <div className={sep} />
          <button
            title="Bold"
            className={isBold ? btnActive : btn}
            onClick={() => {
              updateSelectedText({ fontWeight: isBold ? 'normal' : 'bold' })
              onStateChange?.()
            }}
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            title="Italic"
            className={isItalic ? btnActive : btn}
            onClick={() => {
              updateSelectedText({ fontStyle: isItalic ? 'normal' : 'italic' })
              onStateChange?.()
            }}
          >
            <Italic className="w-4 h-4" />
          </button>
        </>
      )}

      <div className={sep} />

      {/* Delete */}
      <button
        title="Hapus Objek (Delete)"
        className="p-2 rounded-xl transition flex items-center justify-center text-red-500 hover:text-red-600 hover:bg-red-50"
        onClick={() => deleteSelectedObject()}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}
