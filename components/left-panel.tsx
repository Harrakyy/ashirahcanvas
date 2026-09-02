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
} from 'lucide-react'
import { useState } from 'react'
import ProductDetails from './left-panel/product-details'
import UploadImage from './left-panel/upload-image'
import AddText from './left-panel/add-text'
import ClipArt from './left-panel/clip-art'
import LayerPanel from './left-panel/layer'
import MyImages from './left-panel/my-images'
import TemplatePanel from './left-panel/template'
import HelpPanel from './left-panel/help'

interface LeftPanelProps {
  activeMenu: string
  onMenuChange: (menu: string) => void
  selectedColor: string
  onColorChange: (color: string) => void
  colors: string[]
  disabledColors?: string[]
  selectedSize: string
  onSizeChange: (size: string) => void
  sizes: string[]
  basePrice: number
  logoPrice: number
  textPrice: number
  subtotal: number
}

const menuItems = [
  { id: 'product', icon: Shirt, label: 'Product' },
  { id: 'upload', icon: Upload, label: 'Upload Image' },
  { id: 'text', icon: Type, label: 'Add Text' },
  { id: 'clipart', icon: Shapes, label: 'Add Clip Art' },
  { id: 'layer', icon: Layers, label: 'Layer' },
  { id: 'myimages', icon: ImageIcon, label: 'My Images' },
  { id: 'template', icon: LayoutTemplate, label: 'Template' },
  { id: 'help', icon: HelpCircle, label: 'Help' },
]

export default function LeftPanel({
  activeMenu,
  onMenuChange,
  selectedColor,
  onColorChange,
  colors,
  disabledColors,
  selectedSize,
  onSizeChange,
  sizes,
  basePrice,
  logoPrice,
  textPrice,
  subtotal,
}: LeftPanelProps) {
  return (
    <div className="flex mt-16 h-[calc(100vh-64px)]">
      {/* Icon Rail */}
      <div className="w-16 border-r border-gray-200 bg-gray-50 flex flex-col items-center py-4 gap-1">
        {menuItems.map(item => {
          const Icon = item.icon
          const isActive = activeMenu === item.id
          return (
            <button
              key={item.id}
              onClick={() => onMenuChange(item.id)}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                isActive
                  ? 'bg-white border-l-2 border-blue-950 text-blue-950'
                  : 'text-gray-600 hover:bg-white'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] text-center leading-tight">
                {item.label.split(' ')[0]}
              </span>
            </button>
          )
        })}
      </div>

      {/* Detail Panel */}
      <div className="w-80 border-r border-gray-200 bg-white overflow-y-auto flex flex-col">
        {activeMenu === 'product' && (
          <ProductDetails
            selectedColor={selectedColor}
            onColorChange={onColorChange}
            colors={colors}
            disabledColors={disabledColors}
            selectedSize={selectedSize}
            onSizeChange={onSizeChange}
            sizes={sizes}
            basePrice={basePrice}
            logoPrice={logoPrice}
            textPrice={textPrice}
            subtotal={subtotal}
          />
        )}

        {activeMenu === 'upload' && <UploadImage selectedColor={selectedColor} />}

        {activeMenu === 'text' && <AddText />}

        {activeMenu === 'clipart' && <ClipArt />}

        {activeMenu === 'layer' && <LayerPanel />}

        {activeMenu === 'myimages' && <MyImages />}

        {activeMenu === 'template' && <TemplatePanel />}

        {activeMenu === 'help' && <HelpPanel />}
      </div>
    </div>
  )
}
