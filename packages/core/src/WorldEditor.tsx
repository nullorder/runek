import { OrbitControls, TransformControls } from '@react-three/drei'
import { Leva, useControls } from 'leva'
import { type CSSProperties, useEffect, useRef, useState } from 'react'
import type { Object3D } from 'three'
import type { Vec3 } from './types'
import { World, type WorldProps } from './World'
import { WorldAbout } from './WorldAbout'
import { WorldContribute } from './WorldContribute'
import { WorldNodes } from './WorldNodes'
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

const isTyping = (target: EventTarget | null) => {
  const el = target as HTMLElement | null
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
}

/**
 * Edit a world data-first: orbit camera, click-select, gizmo move/rotate, leva props,
 * add/duplicate/delete nodes, undo — all writing back to `WorldData`.
 */
export function WorldEditor({ data, registry, onChange, ...worldProps }: WorldEditorProps) {
  const [selected, setSelected] = useState<Selection>(null)
  const [mode, setMode] = useState<TransformMode>('translate')
  const [contributeOpen, setContributeOpen] = useState(false)
  const history = useRef<WorldData[]>([])

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

  const commitTransform = () => {
    if (!selected) return
    const { position, rotation } = selected.object
    const r = (n: number) => Math.round(n * 1000) / 1000
    patchNode(selected.index, {
      position: [r(position.x), r(position.y), r(position.z)],
      rotation: [r(rotation.x), r(rotation.y), r(rotation.z)],
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
      if (isTyping(event.target)) return
      if ((event.metaKey || event.ctrlKey) && event.key === 'z') {
        event.preventDefault()
        undo()
        return
      }
      if (event.key === 'Escape') setSelected(null)
      else if (event.key === 'g') setMode('translate')
      else if (event.key === 'r') setMode('rotate')
      else if (event.key === 'd') duplicateSelected()
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
        <EditableNodes
          nodes={data.nodes}
          registry={registry}
          onSelect={(index, object) => setSelected({ index, object })}
        />
        {selected && (
          <TransformControls object={selected.object} mode={mode} onMouseUp={commitTransform} />
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
        onAdd={addNode}
        onDuplicate={duplicateSelected}
        onDelete={deleteSelected}
        onUnpack={unpackSelected}
        onUndo={undo}
        onContribute={() => setContributeOpen(true)}
      />
      {selected !== null && (
        <NodeControls
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
  onSelect: (index: number, object: Object3D) => void
}

function EditableNodes({ nodes, registry, onSelect }: EditableNodesProps) {
  return (
    <>
      {nodes.map((node, index) => {
        if (SKIPPED.has(node.type)) return null

        const { position, rotation, ...rest } = node.props ?? {}
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
                <WorldNodes nodes={node.children} registry={registry} />
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
              <WorldNodes nodes={arrangement} registry={registry} />
            </group>
          )
        }

        const Component = entry
        if (NON_SELECTABLE.has(node.type)) {
          return <Component key={node.id ?? index} {...node.props} />
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
  const position = asVec3(props.position) ?? [0, 0, 0]
  const rotation = asVec3(props.rotation) ?? [0, 0, 0]
  const seed = typeof props.seed === 'number' ? props.seed : undefined

  useControls(
    `${node.type} #${index}`,
    () => ({
      position: {
        value: { x: position[0], y: position[1], z: position[2] },
        step: 0.1,
        onChange: (
          v: { x: number; y: number; z: number },
          _path: string,
          ctx: { initial: boolean },
        ) => {
          if (!ctx.initial) onPatch(index, { position: [v.x, v.y, v.z] })
        },
      },
      rotation: {
        value: { x: rotation[0], y: rotation[1], z: rotation[2] },
        step: 0.05,
        onChange: (
          v: { x: number; y: number; z: number },
          _path: string,
          ctx: { initial: boolean },
        ) => {
          if (!ctx.initial) onPatch(index, { rotation: [v.x, v.y, v.z] })
        },
      },
      ...(seed !== undefined
        ? {
            seed: {
              value: seed,
              step: 1,
              onChange: (v: number, _path: string, ctx: { initial: boolean }) => {
                if (!ctx.initial) onPatch(index, { seed: Math.round(v) })
              },
            },
          }
        : {}),
    }),
    [index],
  )

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
        title="Duplicate selection (d)"
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
        {selected === null ? 'click a component · Esc deselects' : `selected #${selected}`}
      </span>
    </div>
  )
}
