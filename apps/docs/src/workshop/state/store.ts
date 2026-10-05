import { assignNodeIds, type JsonValue, type WorldData, type WorldNode } from '@runek/core/data'
import { create } from 'zustand'
import { PREVIEW } from '../../lib/preview'
import { hasSeed, schemaFor } from '../schema'
import type { CameraState, Mode, Stage } from '../share/codec'
import { emptyHistory, type History, record, redo, undo } from './history'
import {
  duplicateNode,
  groupNodes,
  insertNodes,
  locate,
  moveNode,
  offsetNodes,
  patchProps,
  removeNode,
  type Vec3,
} from './ops'

export type GizmoMode = 'translate' | 'rotate'
export type Instrument =
  | 'wireframe'
  | 'normals'
  | 'colliders'
  | 'bounds'
  | 'scale'
  | 'stats'
  | 'turntable'
export type LabLight = 'studio' | 'morning' | 'noon' | 'dusk' | 'night'
export type LabBackdrop = 'stage' | 'grey' | 'checker' | 'transparent'
export type LabGround = 'pedestal' | 'grid' | 'floor' | 'terrain' | 'none'
export type LabView = 'single' | 'seeds' | 'compare'
export type CodeStyle = 'data' | 'jsx'

export interface ViewOptions {
  grid: boolean
  snap: boolean
  snapStep: number
  rotationSnap: boolean
  colliders: boolean
  bounds: boolean
  stats: boolean
}

export interface LabState {
  type: string
  props: Record<string, JsonValue>
  /** The B side of a compare, forked from A. */
  propsB: Record<string, JsonValue> | null
  editing: 'a' | 'b'
  view: LabView
  instruments: Record<Instrument, boolean>
  light: LabLight
  backdrop: LabBackdrop
  ground: LabGround
  grid: 3 | 4 | 5
  seedBase: number
  pinned: number[]
  /** Bumped to rerun the determinism check. */
  checkRun: number
}

export interface LogEntry {
  level: 'log' | 'info' | 'warn' | 'error'
  text: string
  at: number
}

export interface SandboxError {
  phase: 'transpile' | 'runtime'
  message: string
  line?: number
  column?: number
}

export interface SandboxState {
  /** The viewport shows the sandbox instead of the workshop's own canvas. */
  running: boolean
  autoRun: boolean
  /** Bumped to (re)send the code. */
  runId: number
  error: SandboxError | null
  logs: LogEntry[]
  /** Component names the running App.tsx registered beyond the stock registry. */
  registry: string[]
  /** A shared link's code waits for consent before it runs. */
  gated: boolean
}

/** A one-shot request to the viewport camera; `n` makes each request distinct. */
export type CameraRequest =
  /** `aspect` overrides the canvas's, for a view drawn in a narrower viewport (A/B halves). */
  | { kind: 'frame'; id: string; aspect?: number; n: number }
  | { kind: 'all'; n: number }
  | { kind: 'preset'; preset: 'perspective' | 'top' | 'front' | 'side'; n: number }
  | { kind: 'restore'; camera: CameraState; n: number }

export interface Toast {
  text: string
  n: number
}

export interface WorkshopState {
  world: WorldData
  history: History<WorldData>
  code: string | null
  codeStyle: CodeStyle
  selection: string | null
  hidden: Record<string, true>
  locked: Record<string, true>
  mode: Mode
  stage: Stage
  gizmo: GizmoMode
  view: ViewOptions
  lab: LabState
  sandbox: SandboxState
  playing: boolean
  focusMode: boolean
  paletteOpen: boolean
  helpOpen: boolean
  /** A temporary time-of-day while the day animation plays; the world keeps its own. */
  previewTime: string | null
  /** Orbit target: where new nodes and snippets land. */
  focusPoint: Vec3
  camera: CameraRequest | null
  toast: Toast | null
  /** Problems found by the world check and the JSON editor, for the Issues badge. */
  issueCount: number
}

const DEFAULT_VIEW: ViewOptions = {
  grid: true,
  snap: false,
  snapStep: 0.25,
  rotationSnap: false,
  colliders: false,
  bounds: false,
  stats: false,
}

export const DEFAULT_LAB: LabState = {
  type: 'Bookshelf',
  props: { fill: 0.7 },
  propsB: null,
  editing: 'a',
  view: 'single',
  instruments: {
    wireframe: false,
    normals: false,
    colliders: false,
    bounds: true,
    scale: false,
    stats: true,
    turntable: false,
  },
  light: 'studio',
  backdrop: 'stage',
  ground: 'pedestal',
  grid: 4,
  seedBase: 1,
  pinned: [],
  checkRun: 0,
}

export const EMPTY_WORLD: WorldData = { version: 1, nodes: [] }

let cameraN = 0
let toastN = 0

const randomSeed = () => 1 + Math.floor(Math.random() * 9999)

export const useWorkshop = create<WorkshopState>(() => ({
  world: EMPTY_WORLD,
  history: emptyHistory(),
  code: null,
  codeStyle: 'data',
  selection: null,
  hidden: {},
  locked: {},
  mode: 'build',
  stage: 'room',
  gizmo: 'translate',
  view: DEFAULT_VIEW,
  lab: DEFAULT_LAB,
  sandbox: {
    running: false,
    autoRun: true,
    runId: 0,
    error: null,
    logs: [],
    registry: [],
    gated: false,
  },
  playing: false,
  focusMode: false,
  paletteOpen: false,
  helpOpen: false,
  previewTime: null,
  focusPoint: [0, 0, 0],
  camera: null,
  toast: null,
  issueCount: 0,
}))

const get = () => useWorkshop.getState()
const set = useWorkshop.setState

/** Replace the world, recording the previous one for undo (merged into the last step when
 *  `key` repeats quickly, as during a slider drag). */
export function commit(next: WorldData, key: string | null = null) {
  const { world, history } = get()
  if (next === world) return
  set({ world: next, history: record(history, world, key, performance.now()) })
}

/** Load a whole world (template, import, share); undoable unless `fresh`. */
export function loadWorld(next: WorldData, { fresh = false } = {}) {
  const world = assignNodeIds(next)
  if (fresh) set({ world, history: emptyHistory(), selection: null })
  else {
    commit(world)
    set({ selection: null })
  }
}

export function undoWorld() {
  const { world, history, selection } = get()
  const step = undo(history, world)
  if (!step) return
  set({
    world: step.value,
    history: step.history,
    selection: selection && locate(step.value.nodes, selection) ? selection : null,
  })
}

export function redoWorld() {
  const { world, history, selection } = get()
  const step = redo(history, world)
  if (!step) return
  set({
    world: step.value,
    history: step.history,
    selection: selection && locate(step.value.nodes, selection) ? selection : null,
  })
}

export const select = (id: string | null) => set({ selection: id })

export function patchNode(
  id: string,
  patch: Record<string, JsonValue | undefined>,
  key: string | null = null,
) {
  commit(patchProps(get().world, id, patch), key)
}

export function replaceNode(
  id: string,
  fn: (node: WorldNode) => WorldNode,
  key: string | null = null,
) {
  const { world } = get()
  const found = locate(world.nodes, id)
  if (!found) return
  const next = fn(found.node)
  const nodes = (list: WorldNode[]): WorldNode[] =>
    list.map((n) => (n.id === id ? next : n.children ? { ...n, children: nodes(n.children) } : n))
  commit({ ...world, nodes: nodes(world.nodes) }, key)
}

/** A fresh node of `type` for the catalog: placed, and seeded when the component takes one. */
export function newNode(type: string, at: Vec3): WorldNode {
  const props: Record<string, JsonValue> = { position: at }
  if (hasSeed(type)) props.seed = randomSeed()
  if (type === 'Sign') props.children = 'Hello'
  return { type, props }
}

export function addNodes(
  nodes: WorldNode[],
  { at, parentId }: { at?: Vec3; parentId?: string | null } = {},
) {
  const { world } = get()
  const placed = at ? offsetNodes(nodes, at) : nodes
  const result = insertNodes(world, placed, { parentId: parentId ?? null })
  commit(result.world)
  if (result.ids.length) set({ selection: result.ids[0] })
  return result.ids
}

export const addComponent = (type: string, at: Vec3 = get().focusPoint) =>
  addNodes([newNode(type, [0, 0, 0])], { at })

export function removeSelected() {
  const { selection, world } = get()
  if (!selection) return
  commit(removeNode(world, selection))
  set({ selection: null })
}

export function removeById(id: string) {
  commit(removeNode(get().world, id))
  if (get().selection === id) set({ selection: null })
}

export function duplicateSelected() {
  const { selection, world } = get()
  if (!selection) return
  const result = duplicateNode(world, selection)
  commit(result.world)
  if (result.ids[0]) set({ selection: result.ids[0] })
}

export function moveTo(id: string, parentId: string | null, index: number) {
  commit(moveNode(get().world, id, parentId, index))
}

export function groupSelected() {
  const { selection, world } = get()
  if (!selection) return
  const result = groupNodes(world, [selection])
  commit(result.world)
  if (result.id) set({ selection: result.id })
}

export function reseedAll() {
  const { world, locked } = get()
  const reseed = (list: WorldNode[]): WorldNode[] =>
    list.map((node) => {
      const next = { ...node }
      if (
        node.id &&
        !locked[node.id] &&
        (schemaFor(node.type)?.props.seed || node.props?.seed !== undefined)
      ) {
        next.props = { ...node.props, seed: randomSeed() }
      }
      if (node.children) next.children = reseed(node.children)
      return next
    })
  commit({ ...world, nodes: reseed(world.nodes) })
}

export const setWorldField = <K extends keyof WorldData>(
  key: K,
  value: WorldData[K] | undefined,
  coalesce?: string,
) => {
  const next = { ...get().world }
  if (value === undefined) delete next[key]
  else next[key] = value
  commit(next, coalesce ?? null)
}

export const toggleHidden = (id: string) =>
  set(({ hidden }) => {
    const next = { ...hidden }
    if (next[id]) delete next[id]
    else next[id] = true
    return { hidden: next }
  })

export const toggleLocked = (id: string) =>
  set(({ locked, selection }) => {
    const next = { ...locked }
    if (next[id]) delete next[id]
    else next[id] = true
    return { locked: next, selection: selection === id ? null : selection }
  })

export const setMode = (mode: Mode) => set({ mode, playing: false })
export const setStage = (stage: Stage) => set({ stage })
export const setGizmo = (gizmo: GizmoMode) => set({ gizmo })
export const setView = (patch: Partial<ViewOptions>) =>
  set(({ view }) => ({ view: { ...view, ...patch } }))
export const toggleView = (key: keyof ViewOptions) =>
  set(({ view }) => ({ view: { ...view, [key]: !view[key] } }))

type CameraAsk = CameraRequest extends infer R
  ? R extends CameraRequest
    ? Omit<R, 'n'>
    : never
  : never

export const requestCamera = (request: CameraAsk) =>
  set({ camera: { ...request, n: ++cameraN } as CameraRequest })

export const toast = (text: string) => set({ toast: { text, n: ++toastN } })

export const setLab = (patch: Partial<LabState>) =>
  set(({ lab }) => ({ lab: { ...lab, ...patch } }))

export function setLabType(type: string) {
  const props = { ...((PREVIEW[type]?.props as Record<string, JsonValue> | undefined) ?? {}) }
  set(({ lab }) => ({ lab: { ...lab, type, props, propsB: null, editing: 'a', pinned: [] } }))
}

export function patchLab(patch: Record<string, JsonValue | undefined>) {
  set(({ lab }) => {
    const side = lab.editing === 'b' && lab.propsB ? 'propsB' : 'props'
    const props: Record<string, JsonValue> = { ...(lab[side] ?? {}) }
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) delete props[key]
      else props[key] = value
    }
    return { lab: { ...lab, [side]: props } }
  })
}

export const toggleInstrument = (key: Instrument) =>
  set(({ lab }) => ({
    lab: { ...lab, instruments: { ...lab.instruments, [key]: !lab.instruments[key] } },
  }))

/** Open a scene node in the lab, keeping its props (minus the transform). */
export function openInLab(id: string) {
  const found = locate(get().world.nodes, id)
  if (!found || !schemaFor(found.node.type)) return
  const { position: _p, rotation: _r, ...props } = found.node.props ?? {}
  set(({ lab }) => ({
    mode: 'lab',
    lab: { ...lab, type: found.node.type, props, propsB: null, editing: 'a', view: 'single' },
  }))
}

/** Write the lab subject's props back onto the scene node (or add it at the focus point). */
export function applyLab(targetId: string | null) {
  const { lab, world } = get()
  const found = targetId ? locate(world.nodes, targetId) : null
  if (found && found.node.type === lab.type) {
    replaceNode(found.node.id as string, (node) => ({
      ...node,
      props: {
        ...lab.props,
        ...(node.props?.position ? { position: node.props.position } : {}),
        ...(node.props?.rotation ? { rotation: node.props.rotation } : {}),
      },
    }))
    set({ mode: 'build', selection: found.node.id ?? null })
    toast(`Applied to ${lab.type}`)
    return
  }
  set({ mode: 'build' })
  addNodes([{ type: lab.type, props: { ...lab.props, position: [0, 0, 0] } }], {
    at: get().focusPoint,
  })
  toast(`Added ${lab.type} to the scene`)
}

export const setSandbox = (patch: Partial<SandboxState>) =>
  set(({ sandbox }) => ({ sandbox: { ...sandbox, ...patch } }))

export function pushLog(entry: Omit<LogEntry, 'at'>) {
  set(({ sandbox }) => ({
    sandbox: { ...sandbox, logs: [...sandbox.logs, { ...entry, at: Date.now() }].slice(-300) },
  }))
}

export const runCode = () =>
  set(({ sandbox }) => ({
    sandbox: { ...sandbox, running: true, gated: false, error: null, runId: sandbox.runId + 1 },
  }))

export const stopCode = () => set(({ sandbox }) => ({ sandbox: { ...sandbox, running: false } }))

export const setCode = (code: string | null) => set({ code })

export const startPlay = () =>
  set({ playing: true, selection: null, paletteOpen: false, helpOpen: false })
export const stopPlay = () => set({ playing: false })
