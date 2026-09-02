'use client'

import { ZoomIn, ZoomOut, Monitor, ChevronDown, Trash2 } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import {
  createCanvas,
  ensureCanvas,
  deleteSelectedObject,
  setBackground,
  reapplyAllClips,
  switchView,
  loadViewState,
  saveViewState,
  showDebugOverlay,
  hideDebugOverlay,
  getDebugOverlayCoords,
  // disposeCanvas intentionally NOT imported here.
  // Calling dispose() inside useEffect cleanup fires during React Strict Mode's
  // deliberate unmount-remount cycle, destroying Fabric's internal DOM wrapper
  // before the second mount can reuse it — resulting in a blank canvas.
  // disposeCanvas() remains exported from canvas-engine.ts for explicit use
  // (e.g. a "reset editor" button or a route-level unmount outside Strict Mode).
} from '@/lib/ui/canvas-engine'
import { useDesignStore } from '@/store/design-store'
import { setActiveColor } from '@/lib/ui/design-state'
import { ZONE_OPTIONS, ACTIVE_ZONES, getZoneLabel } from '@/lib/config/zones'
import { getPrintArea } from '@/lib/config/print-areas'

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

  // FIX #4: latestViewRef shadows selectedView without closing over it.
  // The unmount cleanup reads latestViewRef.current so it always saves the
  // actual current zone, not the stale snapshot from the initial closure.
  const latestViewRef = useRef(selectedView)

  // FIX #1+3: prevViewRef declared here (above all useEffects) — not inline
  // at line 46 as before — to make temporal dependency explicit.
  const prevViewRef = useRef(selectedView)

  // Sync latestViewRef on every render (cheap ref assignment, no dep array).
  useEffect(() => {
    latestViewRef.current = selectedView // FIX #4
  })

  // ── Fabric init ────────────────────────────────────────────────────────────
  // Runs once on mount. ensureCanvas() returns the existing singleton if the
  // same DOM element is already live (identity check via boundElement), so
  // React Strict Mode's double-invoke is handled correctly:
  //   • First mount  → creates Fabric instance, binds to canvasRef.current
  //   • Strict unmount (dev only) → cleanup runs: saves state, nulls ref
  //   • Strict remount → ensureCanvas sees DIFFERENT element (Fabric destroyed
  //     its internal wrapper on dispose, so isConnected = false) → safely
  //     recreates. With NO dispose call, the DOM wrapper is untouched, so
  //     ensureCanvas's liveness check hits true on remount → returns same instance.
  //
  // FIX #4: saveViewState reads latestViewRef.current (not the stale closure
  // value of selectedView) so the correct final zone is persisted on unmount.
  useEffect(() => {
    if (!canvasRef.current) return
    fabricRef.current = ensureCanvas(canvasRef.current, {
      width: 500,
      height: 650,
      backgroundColor: '#ffffff',
    })
    loadViewState(selectedView)

    return () => {
      // FIX #4: non-stale save — reads the ref updated every render.
      saveViewState(latestViewRef.current)
      // DO NOT call disposeCanvas() here. Fabric.js wraps the <canvas> element
      // in an additional DOM node during init; dispose() destroys that wrapper.
      // In Strict Mode (dev), the cleanup runs between the two mounts — the
      // second ensureCanvas() call would then find a dead wrapper and blank the
      // canvas. The boundElement identity guard in ensureCanvas is sufficient to
      // prevent true double-instantiation in production without aggressive teardown.
      fabricRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally empty — Fabric instance is one-per-mount lifecycle

  // Load/set the background mockup whenever color or category changes.
  // Keeps the current zone's user design intact (only garment background
  // is swapped), as required by PRD §4.3.
  useEffect(() => {
    if (!fabricRef.current) return
    setActiveColor(selectedColor)
    setBackground(selectedCategory, selectedColor, selectedView)
    reapplyAllClips(selectedCategory, selectedColor, selectedView)
  }, [selectedColor, selectedCategory])

  // ── View switching ─────────────────────────────────────────────────────────
  // switchView() is async but the activeZone guard inside it (`getActiveZone() ===
  // toZone`) prevents duplicate execution if this effect re-runs for the same zone.
  //
  // Note on AbortController: a controller was added here in the previous fix, but
  // it was too aggressive. This effect's dep array is [selectedView, selectedColor,
  // selectedCategory] — any color change caused the controller cleanup to fire,
  // aborting the background image load mid-flight and producing a blank canvas.
  // Proper per-call cancellation requires a stable dep array or a more granular
  // effect split; that is left as a scoped improvement task for the candidate.
  useEffect(() => {
    if (!fabricRef.current) return
    if (prevViewRef.current === selectedView) return
    const fromZone = prevViewRef.current
    const toZone = selectedView
    prevViewRef.current = toZone
    switchView(fromZone, toZone, selectedCategory, selectedColor)
  }, [selectedView, selectedColor, selectedCategory])

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

  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return

    const onSelect = () => setHasSelection(true)
    const onDeselect = () => setHasSelection(false)

    canvas.on('selection:created', onSelect)
    canvas.on('selection:updated', onSelect)
    canvas.on('selection:cleared', onDeselect)

    return () => {
      canvas.off('selection:created', onSelect)
      canvas.off('selection:updated', onSelect)
      canvas.off('selection:cleared', onDeselect)
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return
        deleteSelectedObject()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

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
    <div className="flex-1 bg-white md:bg-gray-100 relative flex items-center justify-center mt-16 md:mt-0 overflow-auto min-h-0">
      {/* Toolbar - Top Left - Desktop Only */}
      <div className="hidden md:flex absolute top-2 md:top-20 left-2 md:left-4 bg-white rounded-lg shadow-md p-1 md:p-2 flex-col gap-0.5 md:gap-1 z-20 border border-gray-200">
        <button
          onClick={onZoomIn}
          className="p-1 md:p-2 hover:bg-blue-50 text-gray-700 hover:text-blue-950 rounded transition min-h-[44px] md:min-h-auto min-w-[44px] md:min-w-auto flex items-center justify-center"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4 md:w-5 md:h-5" />
        </button>
        <button
          onClick={onZoomOut}
          className="p-1 md:p-2 hover:bg-blue-50 text-gray-700 hover:text-blue-950 rounded transition min-h-[44px] md:min-h-auto min-w-[44px] md:min-w-auto flex items-center justify-center"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4 md:w-5 md:h-5" />
        </button>
        <div className="text-xs text-gray-600 text-center px-1 md:px-2 py-1 font-semibold">
          {zoomLevel}%
        </div>
        <button
          onClick={toggleDebugOverlay}
          className={`p-1 md:p-2 rounded transition min-h-[44px] md:min-h-auto min-w-[44px] md:min-w-auto flex items-center justify-center text-xs font-medium ${
            debugMode
              ? 'bg-red-100 text-red-700 hover:bg-red-200'
              : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
          }`}
          title={debugMode ? 'Sembunyikan Debug Print Area' : 'Tampilkan Debug Print Area'}
        >
          {debugMode ? '✕' : '◻'}
        </button>
      </div>

      {/* Fabric.js Canvas */}
      <div
        className="bg-white rounded-lg md:rounded-xl shadow-lg flex-shrink-0"
        style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'center center' }}
      >
        <canvas ref={canvasRef} />
      </div>

      {/* View Switcher - Mobile Dropdown */}
      <div className="md:hidden absolute top-2 right-2 z-20" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-1 px-3 py-2 bg-white rounded-lg shadow-md border border-gray-200 hover:bg-blue-50 transition min-h-[44px]"
        >
          <Monitor className="w-4 h-4 text-blue-950" />
          <span className="text-sm font-semibold text-gray-900">{currentViewLabel}</span>
          <ChevronDown className={`w-4 h-4 text-gray-600 transition ${dropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {dropdownOpen && (
          <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 w-44 z-30">
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
                  className={`w-full px-4 py-3 text-left flex items-center gap-3 transition ${
                    !isActive
                      ? 'opacity-40 cursor-not-allowed'
                      : 'hover:bg-blue-50'
                  } ${
                    selectedView === view.id ? 'bg-blue-50 border-l-2 border-blue-950' : 'border-l-2 border-transparent'
                  }`}
                >
                  <Monitor className={`w-4 h-4 ${selectedView === view.id ? 'text-blue-950' : 'text-gray-500'}`} />
                  <span className={`text-sm font-medium ${selectedView === view.id ? 'text-blue-950' : 'text-gray-700'}`}>
                    {view.label}
                  </span>
                  {!isActive && <span className="ml-auto text-[10px] text-gray-400">Soon</span>}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* View Switcher - Desktop Card Grid */}
      <div className="hidden md:flex absolute top-20 right-4 bg-white rounded-lg shadow-md p-2 flex-col gap-2 z-10 border border-gray-200">
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
              className={`w-16 p-2 rounded-lg transition-all ${
                !isActive
                  ? 'opacity-40 cursor-not-allowed border border-gray-200'
                  : selectedView === view.id
                    ? 'border-2 border-blue-950 bg-blue-50'
                    : 'border border-gray-200 hover:border-blue-200 hover:bg-blue-50'
              }`}
            >
              <div className="w-full aspect-square bg-gray-100 rounded mb-1 flex items-center justify-center">
                <Monitor className={`w-4 h-4 ${selectedView === view.id ? 'text-blue-950' : 'text-gray-500'}`} />
              </div>
              <p className={`text-xs text-center font-semibold ${selectedView === view.id ? 'text-blue-950' : 'text-gray-700'}`}>
                {view.label}
              </p>
              {!isActive && <p className="text-[9px] text-center text-gray-400 mt-0.5">Soon</p>}
            </button>
          )
        })}
      </div>

      {/* Delete Button - appears when object is selected */}
      {hasSelection && (
        <button
          onClick={deleteSelectedObject}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg shadow-lg transition"
        >
          <Trash2 className="w-4 h-4" />
          Hapus
        </button>
      )}
    </div>
  )
}
