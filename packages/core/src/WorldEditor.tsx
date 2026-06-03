import { OrbitControls, TransformControls } from '@react-three/drei'
import { Leva, useControls } from 'leva'
import { type CSSProperties, useEffect, useState } from 'react'
import type { Object3D } from 'three'
import type { Vec3 } from './types'
import { World, type WorldProps } from './World'
import {
  type ComponentRegistry,
  type JsonValue,
  serializeWorld,
  type WorldData,
  type WorldNode,
} from './world-data'

type TransformMode = 'translate' | 'rotate'
type Selection = { index: number; object: Object3D } | null

export interface WorldEditorProps extends Omit<WorldProps, 'children' | 'unit' | 'gravity'> {
  data: WorldData
  registry: ComponentRegistry
  onChange: (next: WorldData) => void
}

/** Nodes rendered without a transform (no meaningful position to gizmo). */
const NON_SELECTABLE = new Set(['Sky', 'LightRig'])
/** Nodes skipped in the editor (no FPS controller while orbiting). */
const SKIPPED = new Set(['Player'])

const asVec3 = (value: JsonValue | undefined): Vec3 | undefined =>
  Array.isArray(value) && value.length === 3 ? (value as unknown as Vec3) : undefined

/** Edit a world data-first: orbit camera, click-select, gizmo move/rotate, leva props — all writing back to `WorldData`. */
export function WorldEditor({ data, registry, onChange, ...worldProps }: WorldEditorProps) {
  const [selected, setSelected] = useState<Selection>(null)
  const [mode, setMode] = useState<TransformMode>('translate')

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelected(null)
      else if (event.key === 'g') setMode('translate')
      else if (event.key === 'r') setMode('rotate')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const patchNode = (index: number, patch: Record<string, JsonValue>) => {
    const nodes = data.nodes.map((node, i) =>
      i === index ? { ...node, props: { ...node.props, ...patch } } : node,
    )
    onChange({ ...data, nodes })
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

  return (
    <>
      <World
        {...worldProps}
        unit={data.unit}
        gravity={data.gravity}
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
      <EditorToolbar mode={mode} onMode={setMode} data={data} selected={selected?.index ?? null} />
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
        const Component = registry[node.type]
        if (!Component) return null

        if (NON_SELECTABLE.has(node.type)) {
          return <Component key={index} {...node.props} />
        }

        const { position, rotation, ...rest } = node.props ?? {}
        return (
          // biome-ignore lint/a11y/noStaticElementInteractions: <group> is a three.js object, not a DOM element
          <group
            key={index}
            position={asVec3(position) ?? [0, 0, 0]}
            rotation={asVec3(rotation) ?? [0, 0, 0]}
            onClick={(event) => {
              event.stopPropagation()
              onSelect(index, event.eventObject)
            }}
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
  gap: '0.5rem',
  alignItems: 'center',
  zIndex: 10,
  fontFamily: 'system-ui, sans-serif',
}

const button = (active: boolean): CSSProperties => ({
  padding: '0.4rem 0.7rem',
  borderRadius: 6,
  border: 'none',
  cursor: 'pointer',
  background: active ? '#4a90d9' : 'rgba(0, 0, 0, 0.6)',
  color: '#fff',
  fontSize: '0.8rem',
})

interface EditorToolbarProps {
  mode: TransformMode
  onMode: (mode: TransformMode) => void
  data: WorldData
  selected: number | null
}

function EditorToolbar({ mode, onMode, data, selected }: EditorToolbarProps) {
  const exportWorld = async () => {
    const text = serializeWorld(data)
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // clipboard may be unavailable; the log below is the fallback
    }
    console.log(text)
  }

  return (
    <div style={TOOLBAR}>
      <button
        type="button"
        style={button(mode === 'translate')}
        onClick={() => onMode('translate')}
      >
        Move
      </button>
      <button type="button" style={button(mode === 'rotate')} onClick={() => onMode('rotate')}>
        Rotate
      </button>
      <button type="button" style={button(false)} onClick={exportWorld}>
        Export JSON
      </button>
      <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.8rem' }}>
        {selected === null ? 'click a component · Esc to deselect' : `selected #${selected}`}
      </span>
    </div>
  )
}
