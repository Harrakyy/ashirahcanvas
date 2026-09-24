'use client'

import { ZoomIn, ZoomOut, Monitor, ChevronDown, AlertTriangle, RotateCcw, Play, Undo2, Redo2 } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import {
  createCanvas,
  ensureCanvas,
  deleteSelectedObject,
  setBackground,
  reapplyAllClips,
  updateSafeZoneGuide,
  switchView,
  loadViewState,
  saveViewState,
  clearUserObjects,
  showDebugOverlay,
  hideDebugOverlay,
  getDebugOverlayCoords,
  undoCanvas,
  redoCanvas,
  canUndoCanvas,
  canRedoCanvas,
  duplicateSelectedObject,
  getCanvas,
} from '@/lib/ui/canvas-engine'
import ObjectContextBar from '@/components/canvas-toolbar/ObjectContextBar'
import { useDesignStore } from '@/store/design-store'
import { setActiveColor, getViewState, setViewState } from '@/lib/ui/design-state'
import { ZONE_OPTIONS, ACTIVE_ZONES, getZoneLabel } from '@/lib/config/zones'
import { getPrintArea } from '@/lib/config/print-areas'
import { useBoundingBox } from '../hooks/useBoundingBox'
import { useAlignmentGuides } from '../hooks/useAlignmentGuides'
import { useCanvasStore, scheduleDebouncedSave } from '../store/useCanvasStore'
import type { CanvasZone } from '@/types/design'

interface CanvasProps {
  selectedColor: string
  zoomLevel?: number
  onZoomIn?: () => void
  onZoomOut?: () => void
}

export default function Canvas({ selectedColor, zoomLevel = 100, onZoomIn, onZoomOut }: CanvasProps) {
  const selectedView = useDesignStore(s => s.selectedView)
  const selectedCategory = useDesignStore(s => s.selectedCategory)

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<ReturnType<typeof createCanvas> | null>(null)
  const [debugMode, setDebugMode] = useState(false)
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false })

  // Data Safety state
  const [showDraftPrompt, setShowDraftPrompt] = useState(false)
  const [quotaWarning, setQuotaWarning] = useState(false)

  const latestViewRef = useRef(selectedView)
  const prevViewRef = useRef(selectedView)

  useEffect(() => {
    latestViewRef.current = selectedView
  })

  // ── Fabric init & Draft detection ──────────────────────────────────────────
  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = ensureCanvas(canvasRef.current, {
      width: 500,
      height: 650,
      backgroundColor: '#ffffff',
    })
    fabricRef.current = canvas

    // Check if draft exists in persisted store
    const storeViewStates = useCanvasStore.getState().viewStates
    const hasDraftPrompted = useCanvasStore.getState().hasDraftPrompted
    const hasSavedObjects = Object.values(storeViewStates).some(
      (v) => v !== null && typeof v === 'string' && v.length > 25
    )

    if (hasSavedObjects && !hasDraftPrompted) {
      setShowDraftPrompt(true)
    } else {
      loadViewState(selectedView)
    }

    setActiveColor(selectedColor)
    setBackground(selectedCategory, selectedColor, selectedView)
    reapplyAllClips(selectedCategory, selectedColor, selectedView)
    updateSafeZoneGuide(selectedView)

    return () => {
      saveViewState(latestViewRef.current)
      fabricRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useBoundingBox(fabricRef)
  useAlignmentGuides(fabricRef)

  // Swap garment background ONLY on color/category change (NOT on view change)
  const prevColorRef = useRef(selectedColor)
  const prevCategoryRef = useRef(selectedCategory)

  useEffect(() => {
    if (!fabricRef.current) return
    const isColorChange = prevColorRef.current !== selectedColor
    const isCatChange = prevCategoryRef.current !== selectedCategory
    if (!isColorChange && !isCatChange) return

    prevColorRef.current = selectedColor
    prevCategoryRef.current = selectedCategory

    setActiveColor(selectedColor)
    setBackground(selectedCategory, selectedColor, selectedView)
    reapplyAllClips(selectedCategory, selectedColor, selectedView)
    updateSafeZoneGuide(selectedView)

    // Save immediately on color change
    saveViewState(selectedView)
    const currentZone = selectedView as CanvasZone
    useCanvasStore.getState().setZoneViewState(currentZone, getViewState(currentZone))
  }, [selectedColor, selectedCategory, selectedView])

  // ── View switching ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!fabricRef.current) return
    if (prevViewRef.current === selectedView) return
    const fromZone = prevViewRef.current
    const toZone = selectedView
    prevViewRef.current = toZone

    // Save current view state immediately before switching
    saveViewState(fromZone)
    useCanvasStore.getState().setZoneViewState(fromZone as CanvasZone, getViewState(fromZone))

    switchView(fromZone, toZone, selectedCategory, selectedColor)
  }, [selectedView, selectedColor, selectedCategory])

  // ── Auto-save Object Event Listeners (object:modified / object:added / object:removed)
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return

    const handleObjectChange = () => {
      // Sync history state for button enabled/disabled
      setHistoryState({ canUndo: canUndoCanvas(), canRedo: canRedoCanvas() })

      scheduleDebouncedSave(() => {
        try {
          const currentZone = latestViewRef.current as CanvasZone
          saveViewState(currentZone)

          const allStates: Record<CanvasZone, string | null> = {
            front: getViewState('front'),
            back: getViewState('back'),
            left: getViewState('left'),
            right: getViewState('right'),
            label: getViewState('label'),
          }
          useCanvasStore.getState().setAllViewStates(allStates)
        } catch (err: any) {
          if (err?.name === 'QuotaExceededError' || err?.code === 22 || err?.message?.includes('quota')) {
            setQuotaWarning(true)
          } else {
            console.error('[AutoSave] Save error:', err)
          }
        }
      }, 1000)
    }

    canvas.on('object:modified', handleObjectChange)
    canvas.on('object:added', handleObjectChange)
    canvas.on('object:removed', handleObjectChange)

    return () => {
      canvas.off('object:modified', handleObjectChange)
      canvas.off('object:added', handleObjectChange)
      canvas.off('object:removed', handleObjectChange)
    }
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const [hasSelection, setHasSelection] = useState(false)
  const [selectionMeta, setSelectionMeta] = useState({ isText: false, isBold: false, isItalic: false })

  const syncSelectionMeta = () => {
    const canvas = getCanvas()
    if (!canvas) {
      setHasSelection(false)
      setSelectionMeta({ isText: false, isBold: false, isItalic: false })
      return
    }
    const active = canvas.getActiveObject()
    if (!active) {
      setHasSelection(false)
      setSelectionMeta({ isText: false, isBold: false, isItalic: false })
      return
    }
    setHasSelection(true)
    const isText = (active as any).type === 'textbox' || active.type === 'i-text' || active.type === 'text'
    setSelectionMeta({
      isText,
      isBold: isText && (active as any).fontWeight === 'bold',
      isItalic: isText && (active as any).fontStyle === 'italic',
    })
  }

  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return

    canvas.on('selection:created', syncSelectionMeta)
    canvas.on('selection:updated', syncSelectionMeta)
    canvas.on('selection:cleared', syncSelectionMeta)

    return () => {
      canvas.off('selection:created', syncSelectionMeta)
      canvas.off('selection:updated', syncSelectionMeta)
      canvas.off('selection:cleared', syncSelectionMeta)
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isText = (e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA'
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (isText) return
        deleteSelectedObject()
        syncSelectionMeta()
      }
      // Ctrl+D: Duplicate
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault()
        duplicateSelectedObject().then(() => syncSelectionMeta())
      }
      // Undo: Ctrl+Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undoCanvas().then(() => {
          setHistoryState({ canUndo: canUndoCanvas(), canRedo: canRedoCanvas() })
          syncSelectionMeta()
        })
      }
      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        redoCanvas().then(() => {
          setHistoryState({ canUndo: canUndoCanvas(), canRedo: canRedoCanvas() })
          syncSelectionMeta()
        })
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Draft Restore Actions
  const handleRestoreDraft = async () => {
    setShowDraftPrompt(false)
    useCanvasStore.getState().setHasDraftPrompted(true)

    const storeViewStates = useCanvasStore.getState().viewStates
    for (const zoneId of ACTIVE_ZONES) {
      const savedStr = storeViewStates[zoneId as CanvasZone]
      if (savedStr) {
        setViewState(zoneId, savedStr)
      }
    }

    await loadViewState(selectedView)
    reapplyAllClips(selectedCategory, selectedColor, selectedView)
  }

  const handleStartFresh = () => {
    setShowDraftPrompt(false)
    useCanvasStore.getState().setHasDraftPrompted(true)
    useCanvasStore.getState().clearDraft()

    for (const zoneId of ACTIVE_ZONES) {
      setViewState(zoneId, null)
    }

    clearUserObjects()
  }

  const toggleDebugOverlay = () => {
    if (debugMode) {
      const coords = getDebugOverlayCoords()
      if (coords) {
        console.log('[DEBUG] Print Area coords:', JSON.stringify(coords))
      }
      hideDebugOverlay()
      setDebugMode(false)
    } else {
      const area = getPrintArea(selectedCategory, selectedColor, selectedView)
      if (area) {
        showDebugOverlay(area)
        setDebugMode(true)
      }
    }
  }

  const currentViewLabel = getZoneLabel(selectedView)

  return (
    <div className="flex-1 bg-neutral-100/70 relative flex items-center justify-center mt-16 md:mt-0 overflow-auto min-h-0">
      {/* Draft Restore Prompt Modal */}
      {showDraftPrompt && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white/95 backdrop-blur-2xl rounded-2xl shadow-2xl ring-1 ring-black/5 max-w-md w-full p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-neutral-100 text-neutral-900 flex items-center justify-center mx-auto ring-1 ring-black/5">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-neutral-900">Draf Desain Ditemukan</h3>
              <p className="text-xs text-neutral-500">
                Ada desain yang tersimpan dari sesi sebelumnya. Apakah Anda ingin melanjutkan draf ini?
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                onClick={handleStartFresh}
                className="flex-1 py-2 px-3 border border-[#C4C8D8] text-[#1A2B56] hover:bg-[#EDEDF2] rounded-full text-xs font-bold transition cursor-pointer"
              >
                Mulai Baru
              </button>
              <button
                onClick={handleRestoreDraft}
                className="flex-1 py-2 px-3 bg-[#1A2B56] hover:bg-[#243B6B] text-white rounded-full text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quota Exceeded Warning Toast */}
      {quotaWarning && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-[#1A2B56] text-white px-4 py-2.5 rounded-full shadow-xl flex items-center gap-2.5 text-xs font-medium max-w-md">
          <AlertTriangle className="w-4 h-4 text-[#B697BD] flex-shrink-0" />
          <span>Desain terlalu besar untuk auto-save. Harap kurangi ukuran gambar.</span>
          <button onClick={() => setQuotaWarning(false)} className="ml-auto font-semibold text-slate-300 hover:text-white cursor-pointer">
            OK
          </button>
        </div>
      )}

      {/* Toolbar - Top Left - Apple Floating HUD */}
      <div className="hidden md:flex absolute top-20 left-4 glass-hud rounded-2xl p-1.5 flex-col gap-1 z-20">
        <button
          onClick={onZoomIn}
          className="p-2 hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900 rounded-xl transition flex items-center justify-center"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={onZoomOut}
          className="p-2 hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900 rounded-xl transition flex items-center justify-center"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="text-[10px] text-neutral-500 text-center px-1 py-0.5 font-semibold select-none">
          {zoomLevel}%
        </div>
        <div className="w-full h-px bg-neutral-200 my-0.5" />
        <button
          onClick={() => undoCanvas().then(() => setHistoryState({ canUndo: canUndoCanvas(), canRedo: canRedoCanvas() }))}
          disabled={!historyState.canUndo}
          className="p-2 hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900 rounded-xl transition flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => redoCanvas().then(() => setHistoryState({ canUndo: canUndoCanvas(), canRedo: canRedoCanvas() }))}
          disabled={!historyState.canRedo}
          className="p-2 hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900 rounded-xl transition flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="w-4 h-4" />
        </button>
        <div className="w-full h-px bg-neutral-200 my-0.5" />
        <button
          onClick={toggleDebugOverlay}
          className={`p-2 rounded-xl transition flex items-center justify-center text-xs font-medium ${
            debugMode
              ? 'bg-red-50 text-red-600'
              : 'hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700'
          }`}
          title={debugMode ? 'Sembunyikan Debug Print Area' : 'Tampilkan Debug Print Area'}
        >
          {debugMode ? '✕' : '◻'}
        </button>
      </div>

      {/* Fabric.js Canvas Wrapper */}
      <div
        className="bg-white rounded-2xl shadow-xl shadow-black/5 ring-1 ring-black/[0.06] flex-shrink-0"
        style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'center center', touchAction: 'none' }}
      >
        <canvas ref={canvasRef} />
      </div>

      {/* View Switcher - Mobile Dropdown */}
      <div className="md:hidden absolute top-2 right-2 z-20" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-1.5 px-3 py-2 glass-hud rounded-xl text-xs font-medium text-neutral-800 transition"
        >
          <Monitor className="w-3.5 h-3.5 text-neutral-700" />
          <span>{currentViewLabel}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-neutral-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {dropdownOpen && (
          <div className="absolute top-full right-0 mt-1.5 glass-hud rounded-xl shadow-xl w-44 z-30 py-1 overflow-hidden">
            {ZONE_OPTIONS.map(view => {
              const isActive = ACTIVE_ZONES.includes(view.id)
              return (
                <button
                  key={view.id}
                  onClick={() => {
                    if (!isActive) return
                    useDesignStore.getState().setSelectedView(view.id)
                    setDropdownOpen(false)
                  }}
                  className={`w-full px-3.5 py-2.5 text-left flex items-center gap-2.5 transition text-xs ${
                    !isActive
                      ? 'opacity-40 cursor-not-allowed'
                      : 'hover:bg-neutral-100'
                  } ${
                    selectedView === view.id ? 'bg-neutral-100 font-semibold text-neutral-900' : 'text-neutral-600'
                  }`}
                >
                  <Monitor className={`w-3.5 h-3.5 ${selectedView === view.id ? 'text-neutral-900' : 'text-neutral-400'}`} />
                  <span>{view.label}</span>
                  {!isActive && <span className="ml-auto text-[9px] text-neutral-400">Soon</span>}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* View Switcher - Desktop Apple HUD Palette */}
      <div className="hidden md:flex absolute top-20 right-4 glass-hud rounded-2xl p-2 flex-col gap-1.5 z-10">
        {ZONE_OPTIONS.map(view => {
          const isActive = ACTIVE_ZONES.includes(view.id)
          return (
            <button
              key={view.id}
              onClick={() => {
                if (!isActive) return
                useDesignStore.getState().setSelectedView(view.id)
              }}
              disabled={!isActive}
              className={`w-16 p-1.5 rounded-xl transition-all duration-150 ${
                !isActive
                  ? 'opacity-35 cursor-not-allowed'
                  : selectedView === view.id
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'hover:bg-neutral-100 text-neutral-700'
              }`}
            >
              <div className={`w-full aspect-square rounded-lg mb-1 flex items-center justify-center ${selectedView === view.id ? 'bg-white/10' : 'bg-neutral-100'}`}>
                <Monitor className={`w-3.5 h-3.5 ${selectedView === view.id ? 'text-white' : 'text-neutral-600'}`} />
              </div>
              <p className={`text-[10px] text-center font-medium ${selectedView === view.id ? 'text-white' : 'text-neutral-700'}`}>
                {view.label}
              </p>
              {!isActive && <p className="text-[8px] text-center text-neutral-400 mt-0.5">Soon</p>}
            </button>
          )
        })}
      </div>

      {/* Object Context Bar — appears when any user object is selected */}
      <ObjectContextBar
        hasSelection={hasSelection}
        isText={selectionMeta.isText}
        isBold={selectionMeta.isBold}
        isItalic={selectionMeta.isItalic}
        onStateChange={syncSelectionMeta}
      />
    </div>
  )
}
