import { live } from '../scene/refs'
import {
  type CodeStyle,
  DEFAULT_LAB,
  type LabState,
  useWorkshop,
  type ViewOptions,
  type WorkshopState,
} from '../state/store'
import type { CameraState, Mode, Stage } from './codec'

const KEY = 'runek-workshop:session:v1'

interface Saved {
  world: WorkshopState['world']
  code: string | null
  codeStyle: CodeStyle
  mode: Mode
  stage: Stage
  view: ViewOptions
  lab: Pick<LabState, 'type' | 'props' | 'light' | 'backdrop' | 'ground' | 'grid' | 'instruments'>
  camera: CameraState | null
  autoRun: boolean
}

export function loadSession(): Saved | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Saved) : null
  } catch {
    return null
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(KEY)
  } catch {}
}

/** Autosave the session (debounced). Returns the unsubscribe. */
export function persistSession() {
  let timer: ReturnType<typeof setTimeout> | undefined
  const save = () => {
    const s = useWorkshop.getState()
    const saved: Saved = {
      world: s.world,
      code: s.code,
      codeStyle: s.codeStyle,
      mode: s.mode,
      stage: s.stage,
      view: s.view,
      lab: {
        type: s.lab.type,
        props: s.lab.props,
        light: s.lab.light,
        backdrop: s.lab.backdrop,
        ground: s.lab.ground,
        grid: s.lab.grid,
        instruments: s.lab.instruments,
      },
      camera: live.camera,
      autoRun: s.sandbox.autoRun,
    }
    try {
      localStorage.setItem(KEY, JSON.stringify(saved))
    } catch {}
  }
  const unsubscribe = useWorkshop.subscribe((state, prev) => {
    if (
      state.world === prev.world &&
      state.code === prev.code &&
      state.mode === prev.mode &&
      state.stage === prev.stage &&
      state.view === prev.view &&
      state.lab === prev.lab &&
      state.focusPoint === prev.focusPoint
    )
      return
    clearTimeout(timer)
    timer = setTimeout(save, 400)
  })
  window.addEventListener('pagehide', save)
  return () => {
    unsubscribe()
    window.removeEventListener('pagehide', save)
  }
}

export function restoreSession(saved: Saved) {
  useWorkshop.setState((s) => ({
    world: saved.world,
    code: saved.code ?? null,
    codeStyle: saved.codeStyle ?? 'data',
    mode: saved.mode ?? 'build',
    stage: saved.stage ?? 'room',
    view: { ...s.view, ...saved.view },
    lab: {
      ...DEFAULT_LAB,
      ...saved.lab,
      instruments: { ...DEFAULT_LAB.instruments, ...saved.lab?.instruments },
    },
    sandbox: { ...s.sandbox, autoRun: saved.autoRun ?? true },
  }))
  if (saved.camera) live.camera = saved.camera
}
