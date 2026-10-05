import { useEffect, useRef, useState } from 'react'
import { copyText, exportPng, exportSchema, exportWorld, worldText } from '../actions'
import { generateApp } from '../code/generate'
import { live } from '../scene/refs'
import type { Mode } from '../share/codec'
import { encodeShare, SHARE_SOFT_LIMIT } from '../share/codec'
import {
  redoWorld,
  setMode,
  startPlay,
  stopPlay,
  toast,
  undoWorld,
  useWorkshop,
} from '../state/store'

const MODES: [Mode, string, string][] = [
  ['build', 'Build', 'Compose a world'],
  ['lab', 'Lab', 'One component under the microscope'],
  ['code', 'Code', 'world.json and live App.tsx'],
]

function Menu({
  label,
  children,
  title,
}: {
  label: string
  children: (close: () => void) => React.ReactNode
  title?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('pointerdown', onDown)
    return () => window.removeEventListener('pointerdown', onDown)
  }, [open])
  return (
    <div className="ws-menu" ref={ref}>
      <button
        type="button"
        className={`ws-btn ${open ? 'is-on' : ''}`}
        title={title}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {label} ▾
      </button>
      {open && (
        <div className="ws-menu__list" role="menu">
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}

export async function shareLink(withCode: boolean) {
  const { world, code, mode, stage, lab } = useWorkshop.getState()
  const payload = await encodeShare({
    world,
    ...(withCode && code ? { code } : {}),
    mode,
    stage,
    ...(live.camera ? { camera: live.camera } : {}),
    ...(mode === 'lab' ? { lab: { type: lab.type, props: lab.props } } : {}),
  })
  return `${location.origin}${location.pathname}#s=${payload}`
}

export default function TopBar() {
  const mode = useWorkshop((s) => s.mode)
  const playing = useWorkshop((s) => s.playing)
  const canUndo = useWorkshop((s) => s.history.past.length > 0)
  const canRedo = useWorkshop((s) => s.history.future.length > 0)
  const hasCode = useWorkshop((s) => s.code !== null)
  const title = useWorkshop((s) => s.world.meta?.title)

  const share = async (withCode: boolean) => {
    const url = await shareLink(withCode)
    history.replaceState(null, '', url)
    if (url.length > SHARE_SOFT_LIMIT) {
      toast(
        `Link is ${Math.round(url.length / 1000)} KB; long links may break. Consider Download .world.json.`,
      )
    }
    await copyText(url, `Share link copied (${url.length.toLocaleString()} chars)`)
  }

  return (
    <header className="ws-top">
      <a className="ws-top__back" href="/library" title="Back to the library">
        ◂ library
      </a>
      <span className="ws-top__brand">
        runek <b>workshop</b>
      </span>
      {title && (
        <span className="ws-top__title" title="World title (World panel → Identity)">
          {title}
        </span>
      )}

      <nav className="ws-modes" aria-label="Mode">
        {MODES.map(([id, label, hint]) => (
          <button
            key={id}
            type="button"
            className={mode === id ? 'is-on' : ''}
            title={hint}
            onClick={() => setMode(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      <span className="ws-top__spacer" />

      <button
        type="button"
        className="ws-btn ws-btn--ghost"
        title="Command palette (⌘K)"
        onClick={() => useWorkshop.setState({ paletteOpen: true })}
      >
        ⌘K
      </button>
      <button
        type="button"
        className="ws-icon ws-icon--lg"
        title="Undo (⌘Z)"
        disabled={!canUndo}
        onClick={undoWorld}
      >
        ↶
      </button>
      <button
        type="button"
        className="ws-icon ws-icon--lg"
        title="Redo (⇧⌘Z)"
        disabled={!canRedo}
        onClick={redoWorld}
      >
        ↷
      </button>

      <Menu label="Share" title="Share this world as a link (no server: it is all in the URL)">
        {(close) => (
          <>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                share(false)
                close()
              }}
            >
              Copy link
              <small>the world, stage and camera, in the URL</small>
            </button>
            {hasCode && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  share(true)
                  close()
                }}
              >
                Copy link with App.tsx
                <small>opens behind a “run this code?” gate</small>
              </button>
            )}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                copyText(worldText(useWorkshop.getState().world), 'world.json copied')
                close()
              }}
            >
              Copy world.json
            </button>
          </>
        )}
      </Menu>
      <Menu label="Export" title="Take it home">
        {(close) => (
          <>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                exportWorld()
                close()
              }}
            >
              Download .world.json
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                const { world, code, codeStyle } = useWorkshop.getState()
                const blob = new Blob([code ?? generateApp(world, codeStyle)], {
                  type: 'text/plain',
                })
                const a = document.createElement('a')
                a.href = URL.createObjectURL(blob)
                a.download = 'App.tsx'
                a.click()
                close()
              }}
            >
              Download App.tsx
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                exportPng(false)
                close()
              }}
            >
              PNG of the view
              <small>2× resolution</small>
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                exportPng(true)
                close()
              }}
            >
              PNG, transparent
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                exportSchema()
                close()
              }}
            >
              Prop schema (JSON)
              <small>every component's props, types, defaults</small>
            </button>
          </>
        )}
      </Menu>
      {mode !== 'lab' && (
        <button
          type="button"
          className={`ws-btn ws-btn--primary ${playing ? 'is-on' : ''}`}
          title="Walk the world (p), Esc to come back"
          onClick={() => (playing ? stopPlay() : startPlay())}
        >
          {playing ? '■ Stop' : '▶ Play'}
        </button>
      )}
    </header>
  )
}
