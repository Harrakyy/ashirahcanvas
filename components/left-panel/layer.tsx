'use client'

import { useState, useEffect, useCallback } from 'react'
import { Eye, EyeOff, Lock, LockOpen, Trash2, ArrowUp, ArrowDown } from 'lucide-react'
import {
  getLayerObjects,
  setLayerVisibility,
  setLayerLocked,
  deleteLayerById,
  moveLayerUp,
  moveLayerDown,
  selectLayerById,
  getCanvas,
  type LayerData,
} from '@/lib/ui/canvas-engine'

export default function LayerPanel() {
  const [layers, setLayers] = useState<LayerData[]>([])
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null)

  const refreshLayers = useCallback(() => {
    setLayers(getLayerObjects())
  }, [])

  const refreshSelection = useCallback(() => {
    const canvas = getCanvas()
    if (!canvas) return
    const active = canvas.getActiveObject()
    if (active) {
      setSelectedLayerId((active as any).id ?? null)
    } else {
      setSelectedLayerId(null)
    }
  }, [])

  useEffect(() => {
    const canvas = getCanvas()
    if (!canvas) return

    const onCanvasEvent = () => {
      refreshLayers()
      refreshSelection()
    }

    canvas.on('object:added', onCanvasEvent)
    canvas.on('object:removed', onCanvasEvent)
    canvas.on('object:modified', onCanvasEvent)
    canvas.on('selection:created', refreshSelection)
    canvas.on('selection:updated', refreshSelection)
    canvas.on('selection:cleared', refreshSelection)

    refreshLayers()
    refreshSelection()

    return () => {
      canvas.off('object:added', onCanvasEvent)
      canvas.off('object:removed', onCanvasEvent)
      canvas.off('object:modified', onCanvasEvent)
      canvas.off('selection:created', refreshSelection)
      canvas.off('selection:updated', refreshSelection)
      canvas.off('selection:cleared', refreshSelection)
    }
  }, [refreshLayers, refreshSelection])

  const toggleVisibility = (id: string, current: boolean) => {
    setLayerVisibility(id, !current)
    refreshLayers()
  }

  const toggleLock = (id: string, current: boolean) => {
    setLayerLocked(id, !current)
    refreshLayers()
  }

  const handleDelete = (id: string) => {
    deleteLayerById(id)
    if (selectedLayerId === id) setSelectedLayerId(null)
    refreshLayers()
  }

  const handleMoveUp = (id: string) => {
    moveLayerUp(id)
    refreshLayers()
  }

  const handleMoveDown = (id: string) => {
    moveLayerDown(id)
    refreshLayers()
  }

  return (
    <div className="p-4 space-y-4 flex flex-col h-full">
      {/* Layers List */}
      <div className="space-y-2 flex-1 overflow-y-auto">
        <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wide">
          Lapisan ({layers.length})
        </h3>

        <div className="space-y-1">
          {layers.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">
              Belum ada objek di canvas
            </p>
          )}

          {layers.map(layer => (
            <div
              key={layer.id}
              onClick={() => {
                setSelectedLayerId(layer.id)
                selectLayerById(layer.id)
              }}
              className={`flex items-center gap-2 p-2 rounded-lg border-2 transition cursor-pointer group ${
                selectedLayerId === layer.id
                  ? 'border-blue-950 bg-blue-50'
                  : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              {/* Thumbnail */}
              <div className="w-10 h-10 bg-gray-100 rounded-md flex items-center justify-center text-sm font-medium text-gray-600 flex-shrink-0">
                {layer.type === 'image' && '🖼️'}
                {layer.type === 'text' && '✏️'}
                {layer.type === 'clipart' && '✨'}
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {layer.name}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                {/* Visibility */}
                <button
                  onClick={e => {
                    e.stopPropagation()
                    toggleVisibility(layer.id, layer.visible)
                  }}
                  className="p-1.5 hover:bg-gray-200 rounded transition"
                  title={layer.visible ? 'Sembunyikan' : 'Tampilkan'}
                >
                  {layer.visible ? (
                    <Eye className="w-4 h-4 text-gray-600" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-gray-400" />
                  )}
                </button>

                {/* Lock */}
                <button
                  onClick={e => {
                    e.stopPropagation()
                    toggleLock(layer.id, layer.locked)
                  }}
                  className="p-1.5 hover:bg-gray-200 rounded transition"
                  title={layer.locked ? 'Buka Kunci' : 'Kunci'}
                >
                  {layer.locked ? (
                    <Lock className="w-4 h-4 text-gray-600" />
                  ) : (
                    <LockOpen className="w-4 h-4 text-gray-400" />
                  )}
                </button>

                {/* Delete */}
                <button
                  onClick={e => {
                    e.stopPropagation()
                    handleDelete(layer.id)
                  }}
                  className="p-1.5 hover:bg-red-100 rounded transition"
                  title="Hapus"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Z-Order Controls */}
      {selectedLayerId && layers.length > 1 && (
        <div className="space-y-2 pt-4 border-t border-gray-200">
          <div className="flex gap-2">
            <button
              onClick={() => handleMoveUp(selectedLayerId)}
              className="flex-1 px-3 py-2 bg-white border-2 border-gray-300 rounded-lg text-xs font-medium text-gray-900 hover:bg-gray-50 transition flex items-center justify-center gap-1"
              title="Bawa ke Depan"
            >
              <ArrowUp className="w-3 h-3" />
              Depan
            </button>
            <button
              onClick={() => handleMoveDown(selectedLayerId)}
              className="flex-1 px-3 py-2 bg-white border-2 border-gray-300 rounded-lg text-xs font-medium text-gray-900 hover:bg-gray-50 transition flex items-center justify-center gap-1"
              title="Kirim ke Belakang"
            >
              <ArrowDown className="w-3 h-3" />
              Belakang
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
