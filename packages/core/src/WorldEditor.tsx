import { OrbitControls, TransformControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { Leva, useControls } from 'leva'
import { type ComponentRef, type CSSProperties, useEffect, useRef, useState } from 'react'
import { type Object3D, Vector3 } from 'three'
import { GroundContext } from './context'
import { ANCHOR_KINDS, type GroundIndex, type NodeAnchor } from './ground'
import { isEditableTarget } from './input'
import { groundForward, MOVE_KEYS, useOrbitKeys } from './orbitKeys'
import type { Vec3 } from './types'
import { World, type WorldProps } from './World'
import { WorldAbout } from './WorldAbout'
import { WorldContribute } from './WorldContribute'
import { WorldNodes } from './WorldNodes'
import { useGroundIndex } from './WorldRenderer'
import {
  assignNodeIds,
  type ComponentRegistry,
  isCompositeDef,
  type JsonValue,
  seedCompositeNodes,
  serializeWorld,
  unpackComposite,
  type WorldData,
  type WorldNode,
} from './world-data'

type TransformMode = 'translate' | 'rotate'
type Selection = { index: number; object: Object3D } | null

export interface WorldEditorProps
  extends Omit<
    WorldProps,
    | 'children'
    | 'unit'
    | 'gravity'
    | 'palette'
    | 'fog'
    | 'time'
    | 'timezone'
    | 'avatar'
    | 'controls'
  > {
  data: WorldData
  registry: ComponentRegistry
  onChange: (next: WorldData) => void
}

/** Nodes rendered without a transform (no meaningful position to gizmo). */
const NON_SELECTABLE = new Set(['Sky', 'LightRig'])
/** Nodes skipped in the editor (no FPS controller while orbiting). */
const SKIPPED = new Set(['Player'])

const HISTORY_LIMIT = 100
/** Nudges this close together on one node become a single undo step. */
const NUDGE_COALESCE_MS = 1000

/** The gizmo handle being dragged ("X", "XZ", …); typed private upstream, public at runtime. */
const activeAxis = (controls: unknown) =>
  (controls as { axis?: string | null } | null)?.axis ?? null

const round = (n: number) => Math.round(n * 1000) / 1000

const asVec3 = (value: JsonValue | undefined): Vec3 | undefined =>
  Array.isArray(value) && value.length === 3 ? (value as unknown as Vec3) : undefined

/** True if any node in the tree still lacks a stable id. */
const needsIds = (nodes: WorldNode[]): boolean =>
  nodes.some((node) => !node.id || (node.children ? needsIds(node.children) : false))

/** Clear ids on a node subtree so a duplicate gets fresh ones instead of colliding. */
const stripIds = (node: WorldNode): WorldNode => ({
  ...node,
  id: undefined,
  ...(node.children ? { children: node.children.map(stripIds) } : {}),
})

/**
 * Edit a world data-first: orbit camera, click-select, gizmo move/rotate, leva props,
 * add/duplicate/delete nodes, undo — all writing back to `WorldData`.
 */
export function WorldEditor({ data, registry, onChange, ...worldProps }: WorldEditorProps) {
  const [selected, setSelected] = useState<Selection>(null)
  const [mode, setMode] = useState<TransformMode>('translate')
  const [contributeOpen, setContributeOpen] = useState(false)
  const history = useRef<WorldData[]>([])
  const ground = useGroundIndex(data, registry)
  const gizmo = useRef<ComponentRef<typeof TransformControls>>(null)
  const lastNudge = useRef({ index: -1, at: 0 })
  // Key repeat can outrun a render; nudges build on the newest world, not this render's.
  const latest = useRef(data)
  latest.current = data

  /** Contribution is offered only when the world declares where it lives. */
  const canContribute = !!data.meta?.source?.url

  /** Commit a change, recording the previous state for undo. */
  const apply = (next: WorldData) => {
    history.current.push(data)
    if (history.current.length > HISTORY_LIMIT) history.current.shift()
    onChange(next)
  }

  const undo = () => {
    const prev = history.current.pop()
    if (!prev) return
    setSelected(null)
    onChange(prev)
  }

  const patchNode = (index: number, patch: Record<string, JsonValue>) => {
    const nodes = data.nodes.map((node, i) =>
      i === index ? { ...node, props: { ...node.props, ...patch } } : node,
    )
    apply({ ...data, nodes })
  }

  /** Step the selection by `delta` (world units); a burst of steps is one undo. */
  const nudgeSelected = (delta: Vec3) => {
    const world = latest.current
    const node = selected && world.nodes[selected.index]
    if (!selected || !node) return
    const at = asVec3(node.props?.position) ?? [0, 0, 0]
    const position = at.map((n, i) => round(n + delta[i])) as Vec3
    const nodes = world.nodes.map((n, i) =>
      i === selected.index ? { ...n, props: { ...n.props, position } } : n,
    )
    const next = { ...world, nodes }
    const now = performance.now()
    const last = lastNudge.current
    const continuing = last.index === selected.index && now - last.at < NUDGE_COALESCE_MS
    lastNudge.current = { index: selected.index, at: now }
    latest.current = next
    if (continuing) onChange(next)
    else apply(next)
  }

  const replaceNode = (index: number, node: WorldNode) =>
    apply({ ...data, nodes: data.nodes.map((n, i) => (i === index ? node : n)) })

  /** Height under a top-level node's (x, z) for an anchor, never counting the node itself. */
  const heightAt = (node: WorldNode, x: number, z: number, anchor: NodeAnchor) =>
    ground.groundAt(x, z, { kinds: ANCHOR_KINDS[anchor], exclude: node.id })

  /** Where a top-level node stands in world space, anchored or not. */
  const placement = (index: number) => {
    const node = data.nodes[index]
    const at = asVec3(node.props?.position) ?? [0, 0, 0]
    const y = node.anchor ? (ground.position(`${index}`)?.[1] ?? at[1]) : at[1]
    return { node, at, y }
  }

  /** Change the selection's anchor, keeping it where it stands. */
  const setAnchor = (anchor: NodeAnchor | undefined) => {
    if (!selected) return
    const { node, at, y } = placement(selected.index)
    const offset = anchor ? y - heightAt(node, at[0], at[2], anchor) : y
    const next: WorldNode = {
      ...node,
      props: { ...node.props, position: [at[0], round(offset), at[2]] },
    }
    if (anchor) next.anchor = anchor
    else delete next.anchor
    replaceNode(selected.index, next)
  }

  /** Seat the selection on the ground (or the highest surface) under it. */
  const dropSelected = (anchor: NodeAnchor) => {
    if (!selected) return
    const { node, at } = placement(selected.index)
    const y = node.anchor ? 0 : heightAt(node, at[0], at[2], anchor)
    patchNode(selected.index, { position: [at[0], round(y), at[2]] })
  }

  const addNode = (type: string) => {
    apply(
      assignNodeIds({ ...data, nodes: [...data.nodes, { type, props: { position: [0, 0, 0] } }] }),
    )
    setSelected(null)
  }

  const duplicateSelected = () => {
    if (!selected) return
    const source = data.nodes[selected.index]
    const copy = stripIds(JSON.parse(JSON.stringify(source)) as WorldNode)
    const at = asVec3(copy.props?.position) ?? [0, 0, 0]
    copy.props = { ...copy.props, position: [at[0] + 0.5, at[1], at[2] + 0.5] }
    apply(assignNodeIds({ ...data, nodes: [...data.nodes, copy] }))
    setSelected(null)
  }

  const deleteSelected = () => {
    if (!selected) return
    apply({ ...data, nodes: data.nodes.filter((_, i) => i !== selected.index) })
    setSelected(null)
  }

  /** The selected node, when it's a composite instance that can be unpacked. */
  const selectedComposite = (() => {
    if (!selected) return null
    const node = data.nodes[selected.index]
    const entry = node ? registry[node.type] : undefined
    return isCompositeDef(entry) ? { node, def: entry } : null
  })()

  const unpackSelected = () => {
    if (!selected || !selectedComposite) return
    const nodes = data.nodes.map((node, i) =>
      i === selected.index ? unpackComposite(node, selectedComposite.def) : node,
    )
    apply(assignNodeIds({ ...data, nodes }))
    setSelected(null)
  }

  // Dragging an anchored node slides it along the ground: X/Z move freely and it stays at its
  // offset; a drag on the Y handle edits the offset instead.
  const followGround = (axis: string | null) => {
    if (!selected || mode !== 'translate' || axis?.includes('Y')) return
    const node = data.nodes[selected.index]
    if (!node?.anchor) return
    const { position } = selected.object
    const offset = asVec3(node.props?.position)?.[1] ?? 0
    position.y = heightAt(node, position.x, position.z, node.anchor) + offset
  }

  const commitTransform = () => {
    if (!selected) return
    const node = data.nodes[selected.index]
    const { position, rotation } = selected.object
    const y = node?.anchor
      ? position.y - heightAt(node, position.x, position.z, node.anchor)
      : position.y
    patchNode(selected.index, {
      position: [round(position.x), round(y), round(position.z)],
      rotation: [round(rotation.x), round(rotation.y), round(rotation.z)],
    })
  }

  // On load, give every node a stable id so edits and exported JSON carry durable
  // identity (and minimal diffs). Create-time assignment keeps this true afterward,
  // so it settles after one pass. onChange (not apply): id assignment is not undoable.
  useEffect(() => {
    if (needsIds(data.nodes)) onChange(assignNodeIds(data))
  }, [data, onChange])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return
      const mod = event.metaKey || event.ctrlKey
      if (mod && event.key === 'z') {
        event.preventDefault()
        undo()
        return
      }
      if (mod && event.key === 'd') {
        event.preventDefault()
        duplicateSelected()
        return
      }
      if (mod || event.altKey) return
      if (event.key === 'Escape') setSelected(null)
      else if (event.key === 'g') setMode('translate')
      else if (event.key === 'r') setMode('rotate')
      else if (event.key === 'Delete' || event.key === 'Backspace') deleteSelected()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [data, selected, onChange])

  return (
    <>
      <World
        {...worldProps}
        unit={data.unit}
        gravity={data.gravity}
        ground={data.ground}
        palette={data.palette}
        fonts={data.fonts}
        fog={data.fog}
        time={data.time}
        timezone={data.timezone}
        avatar={data.avatar}
        controls={data.controls}
        preserveDrawingBuffer={canContribute}
        onPointerMissed={() => setSelected(null)}
      >
        <OrbitControls makeDefault />
        <EditorKeys selected={selected !== null} onNudge={nudgeSelected} />
        <GroundContext.Provider value={ground}>
          <EditableNodes
            nodes={data.nodes}
            registry={registry}
            ground={ground}
            onSelect={(index, object) => setSelected({ index, object })}
          />
        </GroundContext.Provider>
        {selected && (
          <TransformControls
            ref={gizmo}
            object={selected.object}
            mode={mode}
            onObjectChange={() => followGround(activeAxis(gizmo.current))}
            onMouseUp={commitTransform}
          />
        )}
      </World>

      <Leva hidden={selected === null} />
      <WorldAbout meta={data.meta} />
      {contributeOpen && <WorldContribute data={data} onClose={() => setContributeOpen(false)} />}
      <EditorToolbar
        mode={mode}
        onMode={setMode}
        data={data}
        registry={registry}
        selected={selected?.index ?? null}
        canUndo={history.current.length > 0}
        canContribute={canContribute}
        canUnpack={selectedComposite !== null}
        anchor={selected ? (data.nodes[selected.index]?.anchor ?? 'none') : null}
        onAnchor={(value) => setAnchor(value === 'none' ? undefined : value)}
        onDrop={dropSelected}
        onAdd={addNode}
        onDuplicate={duplicateSelected}
        onDelete={deleteSelected}
        onUnpack={unpackSelected}
        onUndo={undo}
        onContribute={() => setContributeOpen(true)}
      />
      {selected !== null && data.nodes[selected.index] && (
        <NodeControls
          key={data.nodes[selected.index].id ?? selected.index}
          index={selected.index}
          node={data.nodes[selected.index]}
          onPatch={patchNode}
        />
      )}
    </>
  )
}

interface EditableNodesProps {
  nodes: WorldNode[]
  registry: ComponentRegistry
  ground: GroundIndex
  onSelect: (index: number, object: Object3D) => void
}

function EditableNodes({ nodes, registry, ground, onSelect }: EditableNodesProps) {
  return (
    <>
      {nodes.map((node, index) => {
        if (SKIPPED.has(node.type)) return null

        const path = `${index}`
        const { position: authored, rotation, ...rest } = node.props ?? {}
        const position = (node.anchor && ground.position(path)) || authored
        const select =
          (index: number) =>
          // biome-ignore lint/suspicious/noExplicitAny: r3f event typing is looser than the DOM's
          (event: any) => {
            event.stopPropagation()
            onSelect(index, event.eventObject)
          }

        // The built-in Group (e.g. an unpacked composite): one selectable subtree.
        if (node.type === 'Group') {
          return (
            // biome-ignore lint/a11y/noStaticElementInteractions: <group> is a three.js object, not a DOM element
            <group
              key={node.id ?? index}
              position={asVec3(position) ?? [0, 0, 0]}
              rotation={asVec3(rotation) ?? [0, 0, 0]}
              onClick={select(index)}
            >
              {node.children?.length ? (
                <WorldNodes nodes={node.children} registry={registry} ground={ground} path={path} />
              ) : null}
            </group>
          )
        }

        const entry = registry[node.type]
        if (!entry) return null

        // A composite instance: expand its arrangement, selectable as a whole.
        if (isCompositeDef(entry)) {
          const arrangement = seedCompositeNodes(entry.nodes, rest.seed as number | undefined)
          return (
            // biome-ignore lint/a11y/noStaticElementInteractions: <group> is a three.js object, not a DOM element
            <group
              key={node.id ?? index}
              position={asVec3(position) ?? [0, 0, 0]}
              rotation={asVec3(rotation) ?? [0, 0, 0]}
              onClick={select(index)}
            >
              <WorldNodes
                nodes={arrangement}
                registry={registry}
                ground={ground}
                path={path}
                prefix="a"
              />
            </group>
          )
        }

        const Component = entry
        if (NON_SELECTABLE.has(node.type)) {
          return <Component key={node.id ?? index} {...node.props} position={position} />
        }

        return (
          // biome-ignore lint/a11y/noStaticElementInteractions: <group> is a three.js object, not a DOM element
          <group
            key={node.id ?? index}
            position={asVec3(position) ?? [0, 0, 0]}
            rotation={asVec3(rotation) ?? [0, 0, 0]}
            onClick={select(index)}
          >
            <Component {...rest} />
          </group>
        )
      })}
    </>
  )
}

interface NodeControlsProps {
  index: number
  node: WorldNode
  onPatch: (index: number, patch: Record<string, JsonValue>) => void
}

function NodeControls({ index, node, onPatch }: NodeControlsProps) {
  const props = node.props ?? {}
  const [px, py, pz] = asVec3(props.position) ?? [0, 0, 0]
  const [rx, ry, rz] = asVec3(props.rotation) ?? [0, 0, 0]
  const seed = typeof props.seed === 'number' ? props.seed : undefined
  // The panel is built once per node; its handlers must still patch the latest world.
  const patch = useRef(onPatch)
  patch.current = onPatch

  const [, set] = useControls(
    `${node.type} #${index}`,
    () => ({
      position: {
        value: { x: px, y: py, z: pz },
        step: 0.1,
        onChange: (v: XYZ, _path: string, ctx: LevaChange) => {
          if (!ctx.initial && ctx.fromPanel)
            patch.current(index, { position: [round(v.x), round(v.y), round(v.z)] })
        },
      },
      rotation: {
        value: { x: rx, y: ry, z: rz },
        step: 0.05,
        onChange: (v: XYZ, _path: string, ctx: LevaChange) => {
          if (!ctx.initial && ctx.fromPanel)
            patch.current(index, { rotation: [round(v.x), round(v.y), round(v.z)] })
        },
      },
      ...(seed !== undefined
        ? {
            seed: {
              value: seed,
              step: 1,
              onChange: (v: number, _path: string, ctx: LevaChange) => {
                if (!ctx.initial && ctx.fromPanel) patch.current(index, { seed: Math.round(v) })
              },
            },
          }
        : {}),
    }),
    [index],
  )

  // Follow edits made elsewhere (gizmo, keys, undo) so the panel never shows stale numbers.
  useEffect(() => {
    set({
      position: { x: px, y: py, z: pz },
      rotation: { x: rx, y: ry, z: rz },
      ...(seed !== undefined ? { seed } : {}),
    })
  }, [set, px, py, pz, rx, ry, rz, seed])

  return null
}

type XYZ = { x: number; y: number; z: number }
/** What leva hands an `onChange`: `fromPanel` is false for values we `set` ourselves. */
type LevaChange = { initial: boolean; fromPanel?: boolean }

const forward = new Vector3()

/** Snaps a ground direction to the nearest world axis (±X or ±Z). */
const snapToAxis = (v: Vector3) =>
  Math.abs(v.x) > Math.abs(v.z) ? v.set(Math.sign(v.x), 0, 0) : v.set(0, 0, Math.sign(v.z) || 1)

/**
 * Keyboard for the editor camera: WASD / QE pan, arrows orbit. With a selection, WASD / QE step
 * it instead, along the world axis nearest the camera's forward and right (0.1, ⇧ for 1).
 */
function EditorKeys({ selected, onNudge }: { selected: boolean; onNudge: (delta: Vec3) => void }) {
  const camera = useThree((s) => s.camera)
  const latest = useRef({ selected, onNudge })
  latest.current = { selected, onNudge }

  useOrbitKeys({ skip: (code) => code in MOVE_KEYS && latest.current.selected })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const move = MOVE_KEYS[e.code]
      if (!move || !latest.current.selected) return
      if (e.metaKey || e.ctrlKey || e.altKey || isEditableTarget(e.target)) return
      e.preventDefault()
      snapToAxis(groundForward(camera, forward))
      const step = e.shiftKey ? 1 : 0.1
      const [right, up, ahead] = move
      // Right of forward (fx, fz) on the ground is (-fz, fx).
      latest.current.onNudge([
        (forward.x * ahead - forward.z * right) * step,
        up * step,
        (forward.z * ahead + forward.x * right) * step,
      ])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [camera])

  return null
}

const TOOLBAR: CSSProperties = {
  position: 'fixed',
  top: '1rem',
  left: '1rem',
  display: 'flex',
  gap: '0.45rem',
  alignItems: 'center',
  zIndex: 10,
  padding: '0.45rem 0.6rem',
  borderRadius: 10,
  background: 'rgba(7, 11, 17, 0.82)',
  border: '1px solid #15202a',
  backdropFilter: 'blur(8px)',
  fontFamily: 'ui-monospace, SF Mono, Menlo, monospace',
}

const button = (active: boolean, disabled = false): CSSProperties => ({
  padding: '0.35rem 0.65rem',
  borderRadius: 6,
  border: `1px solid ${active ? 'rgba(61, 245, 138, 0.5)' : '#15202a'}`,
  cursor: disabled ? 'default' : 'pointer',
  background: active ? 'rgba(61, 245, 138, 0.14)' : 'rgba(255, 255, 255, 0.04)',
  color: disabled ? '#5f7d75' : active ? '#3df58a' : '#cfe6db',
  opacity: disabled ? 0.5 : 1,
  fontSize: '0.78rem',
  fontFamily: 'inherit',
})

const SELECT: CSSProperties = {
  ...button(false),
  appearance: 'none',
  paddingRight: '0.9rem',
}

const DIVIDER: CSSProperties = {
  width: 1,
  alignSelf: 'stretch',
  background: '#15202a',
}

const HINT: CSSProperties = {
  color: '#5f7d75',
  fontSize: '0.72rem',
  paddingLeft: '0.2rem',
}

interface EditorToolbarProps {
  mode: TransformMode
  onMode: (mode: TransformMode) => void
  data: WorldData
  registry: ComponentRegistry
  selected: number | null
  canUndo: boolean
  canContribute: boolean
  canUnpack: boolean
  /** The selection's anchor, or null with nothing selected. */
  anchor: NodeAnchor | 'none' | null
  onAnchor: (anchor: NodeAnchor | 'none') => void
  onDrop: (anchor: NodeAnchor) => void
  onAdd: (type: string) => void
  onDuplicate: () => void
  onDelete: () => void
  onUnpack: () => void
  onUndo: () => void
  onContribute: () => void
}

function EditorToolbar({
  mode,
  onMode,
  data,
  registry,
  selected,
  canUndo,
  canContribute,
  canUnpack,
  anchor,
  onAnchor,
  onDrop,
  onAdd,
  onDuplicate,
  onDelete,
  onUnpack,
  onUndo,
  onContribute,
}: EditorToolbarProps) {
  const hasSelection = selected !== null

  const exportWorld = () => {
    const text = serializeWorld(data)
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'world.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={TOOLBAR}>
      <button
        type="button"
        style={button(mode === 'translate')}
        onClick={() => onMode('translate')}
        title="Move (g)"
      >
        Move
      </button>
      <button
        type="button"
        style={button(mode === 'rotate')}
        onClick={() => onMode('rotate')}
        title="Rotate (r)"
      >
        Rotate
      </button>

      <span style={DIVIDER} />

      <select
        style={SELECT}
        value=""
        onChange={(event) => {
          if (event.target.value) onAdd(event.target.value)
          event.target.value = ''
        }}
        title="Insert a component at the origin"
      >
        <option value="">+ Add…</option>
        {Object.keys(registry)
          .sort()
          .map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
      </select>
      <button
        type="button"
        style={button(false, !hasSelection)}
        disabled={!hasSelection}
        onClick={onDuplicate}
        title="Duplicate selection (⌘D)"
      >
        Duplicate
      </button>
      <button
        type="button"
        style={button(false, !hasSelection)}
        disabled={!hasSelection}
        onClick={onDelete}
        title="Delete selection (⌫)"
      >
        Delete
      </button>
      {canUnpack && (
        <button
          type="button"
          style={button(false)}
          onClick={onUnpack}
          title="Replace this composite instance with its editable arrangement"
        >
          Unpack
        </button>
      )}
      {anchor !== null && (
        <>
          <span style={DIVIDER} />
          <select
            style={SELECT}
            value={anchor}
            onChange={(event) => onAnchor(event.target.value as NodeAnchor | 'none')}
            title="Measure this node's Y from the ground instead of absolutely"
          >
            <option value="none">Anchor: none</option>
            <option value="ground">Anchor: ground</option>
            <option value="surface">Anchor: surface</option>
          </select>
          <button
            type="button"
            style={button(false)}
            onClick={() => onDrop('ground')}
            title="Seat the selection on the terrain under it"
          >
            Drop to ground
          </button>
          <button
            type="button"
            style={button(false)}
            onClick={() => onDrop('surface')}
            title="Seat the selection on the highest surface under it (terrain, dock, floor)"
          >
            Drop to surface
          </button>
          <span style={DIVIDER} />
        </>
      )}
      <button
        type="button"
        style={button(false, !canUndo)}
        disabled={!canUndo}
        onClick={onUndo}
        title="Undo (⌘Z)"
      >
        Undo
      </button>

      <span style={DIVIDER} />

      <button type="button" style={button(false)} onClick={exportWorld}>
        Download JSON
      </button>
      {canContribute && (
        <button
          type="button"
          style={button(false)}
          onClick={onContribute}
          title="Fork or suggest changes upstream"
        >
          Contribute ↗
        </button>
      )}
      <span style={HINT}>
        {selected === null
          ? 'click a component · WASD QE pan · arrows orbit'
          : `selected #${selected} · WASD QE move · Esc deselects`}
      </span>
    </div>
  )
}
