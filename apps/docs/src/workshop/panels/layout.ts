import { create } from 'zustand'
import type { Mode } from '../share/codec'

export type PanelId =
  | 'outliner'
  | 'inspector'
  | 'code'
  | 'world'
  | 'lab'
  | 'console'
  | 'issues'
  | 'picker'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface PanelState extends Rect {
  collapsed: boolean
  z: number
}

export const TOP = 54
export const BOTTOM = 52
export const MARGIN = 12
const SNAP = 14
const KEY = 'runek-workshop:layout:v2'

export const PANEL_TITLES: Record<PanelId, string> = {
  outliner: 'Outliner',
  picker: 'Components',
  inspector: 'Inspector',
  code: 'Code',
  world: 'World',
  lab: 'Lab tools',
  console: 'Console',
  issues: 'Issues',
}

/** Which panels each mode can show, in strip order. */
export const MODE_PANELS: Record<Mode, PanelId[]> = {
  build: ['outliner', 'inspector', 'world', 'code', 'issues', 'console'],
  code: ['outliner', 'inspector', 'code', 'console', 'world', 'issues'],
  lab: ['picker', 'inspector', 'lab'],
}

const DEFAULT_OPEN: Record<Mode, Partial<Record<PanelId, boolean>>> = {
  build: { outliner: true, inspector: true },
  code: { outliner: true, inspector: true, code: true },
  lab: { picker: true, inspector: true, lab: true },
}

export function defaultRects(width: number, height: number): Record<PanelId, Rect> {
  const usable = height - TOP - BOTTOM - MARGIN
  const right = width - 330 - MARGIN
  const codeW = Math.min(720, Math.max(420, width * 0.42))
  return {
    outliner: { x: MARGIN, y: TOP, w: 264, h: Math.round(usable * 0.55) },
    picker: { x: MARGIN, y: TOP, w: 264, h: Math.round(usable * 0.7) },
    inspector: { x: right, y: TOP, w: 330, h: usable },
    world: { x: right - 310, y: TOP, w: 300, h: Math.round(usable * 0.75) },
    lab: { x: right - 300, y: TOP, w: 288, h: Math.round(usable * 0.58) },
    code: { x: 284, y: TOP + Math.round(usable * 0.36), w: codeW, h: Math.round(usable * 0.64) },
    console: {
      x: MARGIN,
      y: TOP + Math.round(usable * 0.55) + 10,
      w: 264,
      h: Math.round(usable * 0.45) - 10,
    },
    issues: {
      x: MARGIN,
      y: TOP + Math.round(usable * 0.55) + 10,
      w: 264,
      h: Math.round(usable * 0.45) - 10,
    },
  }
}

interface LayoutState {
  panels: Partial<Record<PanelId, PanelState>>
  open: Record<Mode, Partial<Record<PanelId, boolean>>>
  /** The visible sheet on narrow screens. */
  sheet: PanelId | null
  top: number
}

const load = (): Pick<LayoutState, 'panels' | 'open'> | null => {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const saved = typeof window === 'undefined' ? null : load()

export const useLayout = create<LayoutState>(() => ({
  panels: saved?.panels ?? {},
  open: saved?.open ?? structuredClone(DEFAULT_OPEN),
  sheet: null,
  top: 10,
}))

let timer: ReturnType<typeof setTimeout> | undefined
useLayout.subscribe(({ panels, open }) => {
  clearTimeout(timer)
  timer = setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ panels, open }))
    } catch {}
  }, 300)
})

export function panelState(id: PanelId): PanelState {
  const existing = useLayout.getState().panels[id]
  if (existing) return existing
  const rect = defaultRects(window.innerWidth, window.innerHeight)[id]
  return { ...rect, collapsed: false, z: 1 }
}

export const setPanel = (id: PanelId, patch: Partial<PanelState>) =>
  useLayout.setState(({ panels }) => ({
    panels: { ...panels, [id]: { ...panelState(id), ...patch } },
  }))

export const raise = (id: PanelId) =>
  useLayout.setState(({ panels, top }) => ({
    top: top + 1,
    panels: { ...panels, [id]: { ...panelState(id), z: top + 1 } },
  }))

export const isOpen = (mode: Mode, id: PanelId) => !!useLayout.getState().open[mode]?.[id]

export function setOpen(mode: Mode, id: PanelId, value: boolean) {
  useLayout.setState(({ open }) => ({ open: { ...open, [mode]: { ...open[mode], [id]: value } } }))
  if (value) {
    raise(id)
    useLayout.setState({ sheet: id })
  }
}

export const togglePanel = (mode: Mode, id: PanelId) => setOpen(mode, id, !isOpen(mode, id))

export function resetLayout() {
  useLayout.setState({ panels: {}, open: structuredClone(DEFAULT_OPEN) })
}

/** Keep a rect on screen, then snap its edges to the screen margins and to other panels. */
export function settle(rect: Rect, others: Rect[], width: number, height: number): Rect {
  const r = { ...rect }
  r.w = Math.min(r.w, width - MARGIN * 2)
  r.h = Math.min(r.h, height - TOP - MARGIN)
  r.x = Math.max(MARGIN, Math.min(r.x, width - r.w - MARGIN))
  r.y = Math.max(TOP, Math.min(r.y, height - 36 - MARGIN))

  const xs = [MARGIN, width - MARGIN]
  const ys = [TOP, height - BOTTOM]
  for (const o of others) {
    xs.push(o.x, o.x + o.w, o.x - 10, o.x + o.w + 10)
    ys.push(o.y, o.y + o.h, o.y - 10, o.y + o.h + 10)
  }
  const snap = (value: number, size: number, lines: number[]) => {
    for (const line of lines) {
      if (Math.abs(value - line) < SNAP) return line
      if (Math.abs(value + size - line) < SNAP) return line - size
    }
    return value
  }
  r.x = snap(r.x, r.w, xs)
  r.y = snap(r.y, r.h, ys)
  return r
}
