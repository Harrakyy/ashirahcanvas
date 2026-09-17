'use client'

/**
 * CanvasEditor — wrapper komponen CSR untuk Canvas Configurator.
 *
 * Target dynamic import dari FE1 (app/editor/page.tsx):
 *   const CanvasEditor = dynamic(
 *     () => import('@/features/canvas/components/CanvasEditor'),
 *     { ssr: false, loading: () => <p>Memuat Engine Desain...</p> }
 *   )
 *
 * Komponen ini TIDAK melakukan fetch API apapun.
 * Semua data (quote, product info) diterima dari parent sebagai props.
 * Zero backend dependency — 100% client-side rendering.
 */

import { useState } from 'react'
import type { PriceQuote } from '@/types/pricing'
import type { CanvasBlueprint } from '../types/blueprint'
import Canvas from './Canvas'
import { useCanvasStore } from '../store/useCanvasStore'

interface CanvasEditorProps {
  selectedColor: string
  quote: PriceQuote
  onDesignComplete?: (blueprint: CanvasBlueprint) => void
}

export default function CanvasEditor({
  selectedColor,
  quote,
  onDesignComplete,
}: CanvasEditorProps) {
  const zoomLevel = useCanvasStore((s) => s.zoomLevel)
  const zoomIn = useCanvasStore((s) => s.zoomIn)
  const zoomOut = useCanvasStore((s) => s.zoomOut)

  return (
    <Canvas
      selectedColor={selectedColor}
      zoomLevel={zoomLevel}
      onZoomIn={zoomIn}
      onZoomOut={zoomOut}
    />
  )
}
