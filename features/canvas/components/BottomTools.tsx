'use client'

import {
  Shirt,
  Upload,
  Type,
  Shapes,
  Layers,
  Image as ImageIcon,
  LayoutTemplate,
  HelpCircle,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'

export interface ToolItem {
  id: string
  label: string
  icon: React.ElementType
}

export const BOTTOM_TOOL_ITEMS: ToolItem[] = [
  { id: 'product', icon: Shirt, label: 'Produk' },
  { id: 'upload', icon: Upload, label: 'Upload' },
  { id: 'text', icon: Type, label: 'Teks' },
  { id: 'clipart', icon: Shapes, label: 'Klip' },
  { id: 'layer', icon: Layers, label: 'Layer' },
  { id: 'myimages', icon: ImageIcon, label: 'Gambar' },
  { id: 'template', icon: LayoutTemplate, label: 'Template' },
  { id: 'help', icon: HelpCircle, label: 'Bantuan' },
]

interface BottomToolsProps {
  activeMenu: string
  onMenuChange: (menu: string) => void
  zoomLevel?: number
  onZoomIn?: () => void
  onZoomOut?: () => void
  showZoomControls?: boolean
}

export default function BottomTools({
  activeMenu,
  onMenuChange,
  zoomLevel = 100,
  onZoomIn,
  onZoomOut,
  showZoomControls = true,
}: BottomToolsProps) {
  return (
    <div className="flex gap-1 flex-1 overflow-x-auto items-center">
      {BOTTOM_TOOL_ITEMS.map((item) => {
        const Icon = item.icon
        const isActive = activeMenu === item.id
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onMenuChange(item.id)}
            className={`flex flex-col items-center gap-0.5 p-2 rounded-lg transition-all whitespace-nowrap text-xs min-h-[44px] min-w-[44px] ${
              isActive ? 'bg-blue-950 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
            title={item.label}
          >
            <Icon className="w-5 h-5" />
            <span className="text-xs">{item.label}</span>
          </button>
        )
      })}

      {showZoomControls && (
        <>
          <div className="w-px bg-gray-300 h-8 mx-1 flex-shrink-0" />

          <button
            type="button"
            onClick={onZoomOut}
            className="flex flex-col items-center gap-0.5 p-2 rounded-lg transition-all whitespace-nowrap text-xs min-h-[44px] min-w-[44px] text-gray-600 hover:bg-gray-100"
            title="Zoom Out"
          >
            <ZoomOut className="w-5 h-5" />
          </button>

          <div className="flex items-center justify-center px-2 py-1 rounded-lg text-xs font-semibold text-gray-900 bg-gray-100 whitespace-nowrap">
            {zoomLevel}%
          </div>

          <button
            type="button"
            onClick={onZoomIn}
            className="flex flex-col items-center gap-0.5 p-2 rounded-lg transition-all whitespace-nowrap text-xs min-h-[44px] min-w-[44px] text-gray-600 hover:bg-gray-100"
            title="Zoom In"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
        </>
      )}
    </div>
  )
}
