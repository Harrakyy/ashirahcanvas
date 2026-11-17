'use client'

import { useState } from 'react'
import { LayoutTemplate, Loader2 } from 'lucide-react'
import { STARTER_TEMPLATES, type CanvasTemplate } from '@/lib/config/templates'
import { clearUserObjects, getCanvas } from '@/lib/ui/canvas-engine'
import { util, Textbox, FabricObject } from 'fabric'
import { useDesignStore } from '@/store/design-store'

// Zone label display
const ZONE_LABELS: Record<string, string> = {
  front: 'Depan',
  back: 'Belakang',
  left: 'Lengan Kiri',
  right: 'Lengan Kanan',
}

// Tiny SVG previews per template id — simple illustrative thumbnails
function TemplateThumbnail({ tpl }: { tpl: CanvasTemplate }) {
  const hasRect = tpl.objects.some((o: any) => o.type === 'rect')
  const texts = tpl.objects.filter((o: any) => o.type === 'textbox')

  return (
    <svg viewBox="0 0 60 40" className="w-full h-full" aria-hidden>
      {/* Shirt silhouette */}
      <rect x="10" y="6" width="40" height="28" rx="2" fill="#f3f4f6" />
      {/* Content preview */}
      {hasRect && <rect x="18" y="14" width="24" height="12" rx="1" fill="#1e1e2e" />}
      {texts.slice(0, 2).map((t: any, i: number) => (
        <rect
          key={i}
          x={hasRect ? 20 : 16}
          y={hasRect ? 17 + i * 5 : 15 + i * 8}
          width={hasRect ? 20 : 28}
          height={hasRect ? 3 : 4}
          rx="1"
          fill={hasRect && i === 0 ? '#ffffff' : i === 0 ? '#1e1e2e' : '#9ca3af'}
        />
      ))}
    </svg>
  )
}

export default function TemplatePanel() {
  const [loading, setLoading] = useState<string | null>(null)
  const selectedView = useDesignStore((s) => s.selectedView)

  const handleApplyTemplate = async (tpl: CanvasTemplate) => {
    const canvas = getCanvas()
    if (!canvas) return
    setLoading(tpl.id)
    try {
      // Clear existing user objects
      clearUserObjects()

      // Revive and add template objects
      const objects = tpl.objects
      if (objects.length > 0) {
        const revived = (await util.enlivenObjects(objects as any[])) as FabricObject[]
        for (const obj of revived) {
          if ((obj as any).lockRotation) obj.setControlVisible('mtr', false)
          if (obj instanceof Textbox || (obj as any).type === 'textbox') {
            // Re-attach textbox scaling behavior
            ;(obj as any).on('scaling', () => {
              const tb = obj as Textbox
              if ((tb.scaleX && tb.scaleX !== 1) || (tb.scaleY && tb.scaleY !== 1)) {
                const newWidth = Math.max(tb.dynamicMinWidth || 20, (tb.width ?? 100) * (tb.scaleX ?? 1))
                tb.set({ width: newWidth, scaleX: 1, scaleY: 1 })
                tb.initDimensions()
                tb.setCoords()
                canvas.requestRenderAll()
              }
            })
          }
          canvas.add(obj)
        }
      }
      canvas.discardActiveObject()
      canvas.requestRenderAll()
      canvas.fire('object:added', { target: canvas.getObjects()[0] ?? undefined })
    } finally {
      setLoading(null)
    }
  }

  // Group templates by zone, current zone first
  const sorted = [...STARTER_TEMPLATES].sort((a, b) => {
    if (a.zone === selectedView && b.zone !== selectedView) return -1
    if (b.zone === selectedView && a.zone !== selectedView) return 1
    return 0
  })

  return (
    <div className="p-4 space-y-4 flex flex-col h-full overflow-y-auto">
      <div>
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <LayoutTemplate className="w-4 h-4 text-blue-950" />
          Template Desain
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          Klik template untuk menerapkan layout starter ke zona yang aktif. Template dapat diedit bebas setelahnya.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {sorted.map((tpl) => {
          const isCurrentZone = tpl.zone === selectedView
          return (
            <button
              key={tpl.id}
              onClick={() => handleApplyTemplate(tpl)}
              disabled={loading === tpl.id}
              className={`group flex flex-col items-center gap-2 p-3 rounded-xl border transition-all active:scale-95 ${
                isCurrentZone
                  ? 'border-blue-950/30 hover:border-blue-950 hover:shadow-sm bg-blue-50/30'
                  : 'border-gray-200 hover:border-gray-400 bg-white'
              }`}
            >
              <div className="w-full aspect-[3/2] rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                {loading === tpl.id ? (
                  <Loader2 className="w-5 h-5 text-blue-950 animate-spin" />
                ) : (
                  <TemplateThumbnail tpl={tpl} />
                )}
              </div>
              <div className="text-left w-full">
                <p className="text-xs font-semibold text-gray-900 line-clamp-1">{tpl.name}</p>
                <p className="text-[10px] text-gray-500 line-clamp-1">{tpl.description}</p>
                <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full inline-block mt-0.5 ${
                  isCurrentZone
                    ? 'bg-blue-950 text-white'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {ZONE_LABELS[tpl.zone] ?? tpl.zone}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      <p className="text-[10px] text-gray-400 text-center pb-2">
        Template ditandai biru = cocok untuk zona yang sedang aktif ({ZONE_LABELS[selectedView] ?? selectedView})
      </p>
    </div>
  )
}
