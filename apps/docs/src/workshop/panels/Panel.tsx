import { type ReactNode, useEffect, useRef, useState } from 'react'
import { useWorkshop } from '../state/store'
import {
  MODE_PANELS,
  PANEL_TITLES,
  type PanelId,
  panelState,
  type Rect,
  raise,
  setOpen,
  setPanel,
  settle,
  useLayout,
} from './layout'

export function useNarrow() {
  const [narrow, setNarrow] = useState(() => window.matchMedia('(max-width: 899px)').matches)
  useEffect(() => {
    const query = window.matchMedia('(max-width: 899px)')
    const update = () => setNarrow(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return narrow
}

interface PanelProps {
  id: PanelId
  title?: ReactNode
  /** Extra controls in the title bar. */
  actions?: ReactNode
  children: ReactNode
  className?: string
}

/** A floating tool panel over the room: drag by its title, resize from the corner, collapse to
 *  its title, close. On narrow screens it becomes a bottom sheet. */
export function Panel({ id, title, actions, children, className = '' }: PanelProps) {
  const mode = useWorkshop((s) => s.mode)
  const open = useLayout((s) => !!s.open[mode]?.[id])
  const state = useLayout((s) => s.panels[id]) ?? panelState(id)
  const sheet = useLayout((s) => s.sheet)
  const narrow = useNarrow()
  const ref = useRef<HTMLElement>(null)
  const [live, setLive] = useState<Rect | null>(null)

  if (!open || !MODE_PANELS[mode].includes(id)) return null
  if (narrow && sheet !== id) return null

  const rect = live ?? state
  const others = () =>
    MODE_PANELS[mode]
      .filter((other) => other !== id && useLayout.getState().open[mode]?.[other])
      .map((other) => panelState(other))

  const drag = (kind: 'move' | 'resize') => (event: React.PointerEvent) => {
    if (narrow || event.button !== 0) return
    if ((event.target as HTMLElement).closest('button, input, select, a')) return
    event.preventDefault()
    raise(id)
    const start = { x: event.clientX, y: event.clientY }
    const from = { x: state.x, y: state.y, w: state.w, h: state.h }
    const target = event.currentTarget as HTMLElement
    target.setPointerCapture(event.pointerId)
    let latest: Rect = from
    const move = (e: PointerEvent) => {
      const dx = e.clientX - start.x
      const dy = e.clientY - start.y
      latest =
        kind === 'move'
          ? { ...from, x: from.x + dx, y: from.y + dy }
          : { ...from, w: Math.max(220, from.w + dx), h: Math.max(140, from.h + dy) }
      setLive(latest)
    }
    const up = () => {
      target.removeEventListener('pointermove', move)
      target.removeEventListener('pointerup', up)
      const settled = settle(latest, others(), window.innerWidth, window.innerHeight)
      setPanel(id, settled)
      setLive(null)
    }
    target.addEventListener('pointermove', move)
    target.addEventListener('pointerup', up)
  }

  const style = narrow
    ? undefined
    : {
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: state.collapsed ? undefined : rect.h,
        zIndex: 20 + state.z,
      }

  return (
    <section
      ref={ref}
      className={`ws-panel ${state.collapsed && !narrow ? 'is-collapsed' : ''} ${narrow ? 'is-sheet' : ''} ${className}`}
      style={style}
      aria-label={PANEL_TITLES[id]}
      onPointerDown={() => !narrow && raise(id)}
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: a pointer drag handle; the collapse and close buttons inside it serve the keyboard */}
      <header
        className="ws-panel__head"
        onPointerDown={drag('move')}
        onDoubleClick={() => setPanel(id, { collapsed: !state.collapsed })}
      >
        <span className="ws-panel__title">{title ?? PANEL_TITLES[id]}</span>
        <span className="ws-panel__actions">
          {actions}
          {!narrow && (
            <button
              type="button"
              className="ws-icon"
              title={state.collapsed ? 'Expand' : 'Collapse'}
              onClick={() => setPanel(id, { collapsed: !state.collapsed })}
            >
              {state.collapsed ? '▸' : '▾'}
            </button>
          )}
          <button
            type="button"
            className="ws-icon"
            title="Close"
            onClick={() => setOpen(mode, id, false)}
          >
            ✕
          </button>
        </span>
      </header>
      {(!state.collapsed || narrow) && (
        <>
          <div className="ws-panel__body">{children}</div>
          {!narrow && (
            <div className="ws-panel__resize" onPointerDown={drag('resize')} aria-hidden="true" />
          )}
        </>
      )}
    </section>
  )
}
