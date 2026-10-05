import { lazy, Suspense, useEffect, useState } from 'react'
import { importWorldText } from './actions'
import { boot } from './boot'
import BottomStrip from './chrome/BottomStrip'
import { CodeGate, HelpSheet, Toasts } from './chrome/Overlays'
import TopBar from './chrome/TopBar'
import Inspector from './inspector/Inspector'
import Outliner from './outliner/Outliner'
import { useLayout } from './panels/layout'
import WorldPanel from './panels/WorldPanel'
import Viewport from './scene/Viewport'
import { persistSession } from './share/persist'
import { useShortcuts } from './shortcuts'
import * as store from './state/store'
import { setCode, toast, useWorkshop } from './state/store'
import './workshop.css'

// Dev-only handle for headless checks of the running workshop.
if (import.meta.env.DEV && typeof window !== 'undefined') Object.assign(window, { __ws: store })

const CodePanel = lazy(() => import('./code/CodePanel'))
const ConsolePanel = lazy(() => import('./code/ConsolePanel'))
const SandboxView = lazy(() => import('./sandbox/SandboxView'))
const LabView = lazy(() => import('./lab/LabView'))
const LabPanels = lazy(() => import('./lab/LabPanels'))
const IssuesPanel = lazy(() => import('./outliner/IssuesPanel'))
const CommandPalette = lazy(() => import('./chrome/CommandPalette'))

function Stage() {
  const mode = useWorkshop((s) => s.mode)
  const running = useWorkshop((s) => s.sandbox.running)
  if (mode === 'lab') return <LabView />
  if (running) return <SandboxView />
  return <Viewport />
}

function useFileDrop() {
  const [over, setOver] = useState(false)
  useEffect(() => {
    let depth = 0
    const isFile = (e: DragEvent) => e.dataTransfer?.types.includes('Files')
    const enter = (e: DragEvent) => {
      if (!isFile(e)) return
      depth++
      setOver(true)
    }
    const leave = (e: DragEvent) => {
      if (!isFile(e)) return
      depth = Math.max(0, depth - 1)
      if (!depth) setOver(false)
    }
    const overFn = (e: DragEvent) => isFile(e) && e.preventDefault()
    const drop = async (e: DragEvent) => {
      if (!isFile(e)) return
      e.preventDefault()
      depth = 0
      setOver(false)
      const file = e.dataTransfer?.files[0]
      if (!file) return
      const text = await file.text()
      if (/\.(tsx|jsx|ts|js)$/.test(file.name)) {
        setCode(text)
        useWorkshop.setState({ mode: 'code' })
        toast(`Opened ${file.name} as App.tsx`)
      } else importWorldText(text, file.name)
    }
    window.addEventListener('dragenter', enter)
    window.addEventListener('dragleave', leave)
    window.addEventListener('dragover', overFn)
    window.addEventListener('drop', drop)
    return () => {
      window.removeEventListener('dragenter', enter)
      window.removeEventListener('dragleave', leave)
      window.removeEventListener('dragover', overFn)
      window.removeEventListener('drop', drop)
    }
  }, [])
  return over
}

/** The Workshop: the room is the viewport, the tools float over it. */
export default function Workshop() {
  const [ready, setReady] = useState(false)
  const mode = useWorkshop((s) => s.mode)
  const playing = useWorkshop((s) => s.playing)
  const focusMode = useWorkshop((s) => s.focusMode)
  const paletteOpen = useWorkshop((s) => s.paletteOpen)
  const codeOpen = useLayout((s) => !!s.open[mode]?.code)
  const dropping = useFileDrop()
  useShortcuts()

  useEffect(() => {
    let stop: (() => void) | undefined
    boot().finally(() => {
      setReady(true)
      stop = persistSession()
      // Warm the chunks behind ⌘K and the lab so they open instantly.
      setTimeout(() => {
        import('./chrome/CommandPalette')
        import('./lab/LabView')
      }, 3000)
    })
    return () => stop?.()
  }, [])

  if (!ready) return <div className="ws-loading">opening the workshop…</div>
  const chrome = !playing && !focusMode

  return (
    <div className={`ws-root mode-${mode} ${playing ? 'is-playing' : ''}`}>
      <div className="ws-stage">
        <Suspense fallback={<div className="ws-loading">loading…</div>}>
          <Stage />
        </Suspense>
      </div>
      {chrome && (
        <>
          <TopBar />
          <div className="ws-panels">
            {mode === 'lab' ? (
              <Suspense fallback={null}>
                <LabPanels />
              </Suspense>
            ) : (
              <>
                <Outliner />
                <WorldPanel />
                <Suspense fallback={null}>
                  {codeOpen && <CodePanel />}
                  <ConsolePanel />
                  <IssuesPanel />
                </Suspense>
              </>
            )}
            <Inspector />
          </div>
          <BottomStrip />
        </>
      )}
      {playing && (
        <div className="ws-playhud">
          <span>
            <b>WASD</b> move · <b>drag/arrows</b> look · <b>space</b> jump · <b>Esc</b> back to the
            workshop
          </span>
        </div>
      )}
      {focusMode && !playing && (
        <button
          type="button"
          className="ws-focus-exit"
          onClick={() => useWorkshop.setState({ focusMode: false })}
        >
          show panels (Tab)
        </button>
      )}
      {paletteOpen && (
        <Suspense fallback={null}>
          <CommandPalette />
        </Suspense>
      )}
      <HelpSheet />
      <CodeGate />
      <Toasts />
      {dropping && <div className="ws-dropzone">Drop a .world.json (or an App.tsx) to open it</div>}
    </div>
  )
}
