'use client'

import { useState, useEffect, useCallback } from 'react'
import { Eye, EyeOff, Lock, LockOpen, Trash2, ArrowUp, ArrowDown, GripVertical } from 'lucide-react'
import {
  getLayerObjects,
  setLayerVisibility,
  setLayerLocked,
  deleteLayerById,
  moveLayerUp,
  moveLayerDown,
  reorderLayer,
  selectLayerById,
  getCanvas,
  type LayerData,
} from '@/lib/ui/canvas-engine'
import { useDesignStore } from '@/store/design-store'

export default function LayerPanel() {
  const [layers, setLayers] = useState<LayerData[]>([])
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  const selectedView = useDesignStore((s) => s.selectedView)

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

  // Sync saat view/zona berganti (front/back/dll)
  useEffect(() => {
    refreshLayers()
    refreshSelection()
  }, [selectedView, refreshLayers, refreshSelection])

  useEffect(() => {
    const canvas = getCanvas()
    if (!canvas) return

    const onCanvasEvent = () => {
      refreshLayers()
      refreshSelection()
    }

    // text:changed fire setiap keystroke di Textbox inline editing
    const onTextChanged = () => refreshLayers()

    canvas.on('object:added', onCanvasEvent)
    canvas.on('object:removed', onCanvasEvent)
    canvas.on('object:modified', onCanvasEvent)
    canvas.on('text:changed', onTextChanged)
    canvas.on('selection:created', refreshSelection)
    canvas.on('selection:updated', refreshSelection)
    canvas.on('selection:cleared', refreshSelection)

    refreshLayers()
    refreshSelection()

    return () => {
      canvas.off('object:added', onCanvasEvent)
      canvas.off('object:removed', onCanvasEvent)
      canvas.off('object:modified', onCanvasEvent)
      canvas.off('text:changed', onTextChanged)
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

  // HTML5 Drag & Drop Reorder Handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
    setDraggedId(id)
  }

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverId !== id) {
      setDragOverId(id)
    }
  }

  const handleDragLeave = (e: React.DragEvent, id: string) => {
    if (dragOverId === id) {
      setDragOverId(null)
    }
  }

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    const sourceId = e.dataTransfer.getData('text/plain') || draggedId
    setDraggedId(null)
    setDragOverId(null)
    if (sourceId && sourceId !== targetId) {
      reorderLayer(sourceId, targetId)
      refreshLayers()
    }
  }

  const handleDragEnd = () => {
    setDraggedId(null)
    setDragOverId(null)
  }

  const selectedIndex = layers.findIndex((l) => l.id === selectedLayerId)
  const isTop = selectedIndex === 0
  const isBottom = selectedIndex === layers.length - 1

  return (
    <div className="p-4 space-y-4 flex flex-col h-full">
      {/* Layers List */}
      <div className="space-y-2 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wide">
            Lapisan ({layers.length})
          </h3>
          {layers.length > 1 && (
            <span className="text-[10px] text-gray-400">Tarik handle untuk reorder</span>
          )}
        </div>

        <div className="space-y-1">
          {layers.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">
              Belum ada objek di canvas
            </p>
          )}

          {layers.map((layer) => {
            const isSelected = selectedLayerId === layer.id
            const isDragging = draggedId === layer.id
            const isTarget = dragOverId === layer.id

            return (
              <div
                key={layer.id}
                draggable
                onDragStart={(e) => handleDragStart(e, layer.id)}
                onDragOver={(e) => handleDragOver(e, layer.id)}
                onDragLeave={(e) => handleDragLeave(e, layer.id)}
                onDrop={(e) => handleDrop(e, layer.id)}
                onDragEnd={handleDragEnd}
                onClick={() => {
                  setSelectedLayerId(layer.id)
                  selectLayerById(layer.id)
                }}
                className={`flex items-center gap-2 p-2 rounded-lg border-2 transition cursor-pointer group select-none ${
                  isDragging ? 'opacity-40 scale-95' : ''
                } ${
                  isTarget ? 'border-blue-500 bg-blue-50/70 ring-2 ring-blue-300' : ''
                } ${
                  isSelected && !isTarget
                    ? 'border-blue-950 bg-blue-50 shadow-xs'
                    : !isTarget
                    ? 'border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300'
                    : ''
                } ${!layer.visible ? 'opacity-60 bg-gray-50/80' : ''}`}
              >
                {/* Drag Handle */}
                <div
                  className="text-gray-300 group-hover:text-gray-500 cursor-grab active:cursor-grabbing p-0.5 flex-shrink-0 transition"
                  title="Tarik untuk mengatur urutan lapisan (z-index)"
                >
                  <GripVertical className="w-3.5 h-3.5" />
                </div>

                {/* Thumbnail */}
                <div className="w-9 h-9 bg-gray-100 rounded-md flex items-center justify-center text-sm font-medium text-gray-600 flex-shrink-0 border border-gray-200">
                  {layer.type === 'image' && '🖼️'}
                  {layer.type === 'text' && '✏️'}
                  {layer.type === 'clipart' && '✨'}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-medium text-gray-900 truncate"
                    title={layer.sourceFileName || layer.text || layer.name}
                  >
                    {layer.name}
                  </p>
                  {layer.locked && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-[#4C567A] font-medium">
                      <Lock className="w-2.5 h-2.5" /> Terkunci
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-0.5">
                  {/* Visibility */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleVisibility(layer.id, layer.visible)
                    }}
                    className={`p-1.5 hover:bg-gray-200 rounded-md transition ${
                      !layer.visible ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
                    title={layer.visible ? 'Sembunyikan' : 'Tampilkan'}
                  >
                    {layer.visible ? (
                      <Eye className="w-4 h-4 text-gray-600" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-[#4C567A]" />
                    )}
                  </button>

                  {/* Lock */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleLock(layer.id, layer.locked)
                    }}
                    className={`p-1.5 hover:bg-gray-200 rounded-md transition ${
                      layer.locked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
                    title={layer.locked ? 'Buka Kunci' : 'Kunci'}
                  >
                    {layer.locked ? (
                      <Lock className="w-4 h-4 text-[#1A2B56]" />
                    ) : (
                      <LockOpen className="w-4 h-4 text-gray-400" />
                    )}
                  </button>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(layer.id)
                    }}
                    className="p-1.5 hover:bg-red-100 rounded-md transition opacity-0 group-hover:opacity-100"
                    title="Hapus Lapisan"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Z-Order Controls */}
      {selectedLayerId && layers.length > 1 && (
        <div className="space-y-2 pt-4 border-t border-gray-200">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleMoveUp(selectedLayerId)}
              disabled={isTop}
              className={`flex-1 px-3 py-2 border-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1 ${
                isTop
                  ? 'border-gray-200 text-gray-300 bg-gray-50 cursor-not-allowed'
                  : 'border-gray-300 text-gray-900 bg-white hover:bg-gray-50 shadow-xs'
              }`}
              title={isTop ? 'Sudah di posisi paling depan' : 'Bawa ke Depan (+1 z-index)'}
            >
              <ArrowUp className="w-3.5 h-3.5" />
              Depan
            </button>
            <button
              type="button"
              onClick={() => handleMoveDown(selectedLayerId)}
              disabled={isBottom}
              className={`flex-1 px-3 py-2 border-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1 ${
                isBottom
                  ? 'border-gray-200 text-gray-300 bg-gray-50 cursor-not-allowed'
                  : 'border-gray-300 text-gray-900 bg-white hover:bg-gray-50 shadow-xs'
              }`}
              title={isBottom ? 'Sudah di posisi paling belakang' : 'Kirim ke Belakang (-1 z-index)'}
            >
              <ArrowDown className="w-3.5 h-3.5" />
              Belakang
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
