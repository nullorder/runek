import { Html, TransformControls } from '@react-three/drei'
import { type ThreeEvent, useFrame } from '@react-three/fiber'
import { registry } from '@runek/components'
import {
  ANCHOR_KINDS,
  createGroundIndex,
  GroundContext,
  type GroundIndex,
  isCompositeDef,
  seedCompositeNodes,
  type WorldNode,
  WorldNodes,
} from '@runek/core'
import { type ComponentRef, memo, useEffect, useMemo, useRef, useState } from 'react'
import { Box3, type Box3Helper, type Group, type Object3D, Vector3 } from 'three'
import { locate, round, type Vec3 } from '../state/ops'
import { patchNode, requestCamera, select, useWorkshop } from '../state/store'
import { live, nodeObjects } from './refs'

const asVec3 = (value: unknown): Vec3 | undefined =>
  Array.isArray(value) && value.length === 3 ? (value as Vec3) : undefined

const sameVec = (a?: Vec3, b?: Vec3) =>
  a === b || (!!a && !!b && a[0] === b[0] && a[1] === b[1] && a[2] === b[2])

export function EditScene() {
  const world = useWorkshop((s) => s.world)
  const custom = useWorkshop((s) => s.sandbox.registry)
  const ground = useMemo(() => createGroundIndex(world, registry), [world])
  useEffect(() => {
    live.ground = ground
  }, [ground])

  return (
    <GroundContext.Provider value={ground}>
      <group name="world">
        <EditableList nodes={world.nodes} ground={ground} custom={custom} />
      </group>
      <Gizmo ground={ground} />
      <SelectionBox />
    </GroundContext.Provider>
  )
}

function EditableList({
  nodes,
  ground,
  parent,
  custom,
}: {
  nodes: WorldNode[]
  ground: GroundIndex
  parent?: string
  custom: string[]
}) {
  return (
    <>
      {nodes.map((node, index) => {
        const path = parent === undefined ? `${index}` : `${parent}/${index}`
        return (
          <EditableNode
            key={node.id ?? index}
            node={node}
            path={path}
            ground={ground}
            anchored={node.anchor ? ground.position(path) : undefined}
            custom={custom}
          />
        )
      })}
    </>
  )
}

interface EditableNodeProps {
  node: WorldNode
  path: string
  ground: GroundIndex
  anchored?: Vec3
  custom: string[]
}

const EditableNode = memo(
  function EditableNode({ node, path, ground, anchored, custom }: EditableNodeProps) {
    const id = node.id as string
    const hidden = useWorkshop((s) => !!s.hidden[id])
    const locked = useWorkshop((s) => !!s.locked[id])
    const { position: authored, rotation, ...rest } = node.props ?? {}
    const position = anchored ?? asVec3(authored)

    const register = (object: Group | null) => {
      if (object) nodeObjects.set(id, object)
      else nodeObjects.delete(id)
    }
    const onClick = (event: ThreeEvent<MouseEvent>) => {
      if (locked) return
      event.stopPropagation()
      select(id)
    }
    const onDoubleClick = (event: ThreeEvent<MouseEvent>) => {
      if (locked) return
      event.stopPropagation()
      requestCamera({ kind: 'frame', id })
    }

    const children = node.children?.length ? (
      <EditableList nodes={node.children} ground={ground} parent={path} custom={custom} />
    ) : null

    return (
      // biome-ignore lint/a11y/noStaticElementInteractions: a three.js group, not a DOM element
      <group
        ref={register}
        name={id}
        position={position ?? [0, 0, 0]}
        rotation={asVec3(rotation) ?? [0, 0, 0]}
        visible={!hidden}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
      >
        <NodeBody node={node} rest={rest} path={path} ground={ground} custom={custom}>
          {children}
        </NodeBody>
      </group>
    )
  },
  (a, b) =>
    a.node === b.node &&
    a.path === b.path &&
    sameVec(a.anchored, b.anchored) &&
    a.custom === b.custom &&
    // Only anchored subtrees and composites read the ground index.
    (a.ground === b.ground || !needsGround(b.node)),
)

const needsGround = (node: WorldNode): boolean =>
  !!node.anchor ||
  isCompositeDef(registry[node.type]) ||
  !!node.children?.some(needsGround) ||
  node.type === 'Person'

function NodeBody({
  node,
  rest,
  path,
  ground,
  custom,
  children,
}: {
  node: WorldNode
  rest: Record<string, unknown>
  path: string
  ground: GroundIndex
  custom: string[]
  children: React.ReactNode
}) {
  if (node.type === 'Group') return <>{children}</>
  if (node.type === 'Player') return <PlayerMarker />
  const entry = registry[node.type]
  if (!entry) return <Placeholder type={node.type} custom={custom.includes(node.type)} />
  if (isCompositeDef(entry)) {
    const arrangement = seedCompositeNodes(entry.nodes, rest.seed as number | undefined)
    return (
      <>
        <WorldNodes
          nodes={arrangement}
          registry={registry}
          ground={ground}
          path={path}
          prefix="a"
        />
        {children}
      </>
    )
  }
  const Component = entry
  return children ? <Component {...rest}>{children}</Component> : <Component {...rest} />
}

function PlayerMarker() {
  return (
    <group>
      <mesh position={[0, 0.9, 0]}>
        <capsuleGeometry args={[0.3, 1.2, 4, 12]} />
        <meshBasicMaterial color="#3df58a" wireframe transparent opacity={0.55} />
      </mesh>
      <Html position={[0, 2, 0]} center className="ws-tag">
        Player spawn
      </Html>
    </group>
  )
}

function Placeholder({ type, custom }: { type: string; custom: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={custom ? '#2aa7ff' : '#ff6b6b'} wireframe />
      </mesh>
      <Html position={[0, 1.3, 0]} center className="ws-tag">
        {custom ? `${type} (App.tsx)` : `unknown: ${type}`}
      </Html>
    </group>
  )
}

const ROTATION_SNAP = Math.PI / 12

function Gizmo({ ground }: { ground: GroundIndex }) {
  const selection = useWorkshop((s) => s.selection)
  const world = useWorkshop((s) => s.world)
  const mode = useWorkshop((s) => s.gizmo)
  const view = useWorkshop((s) => s.view)
  const hidden = useWorkshop((s) => (selection ? !!s.hidden[selection] : false))
  const gizmo = useRef<ComponentRef<typeof TransformControls>>(null)
  const [object, setObject] = useState<Object3D | null>(null)

  // The wrapper registers after mount; pick it up on the next frame.
  useFrame(() => {
    const next = selection && !hidden ? (nodeObjects.get(selection) ?? null) : null
    if (next !== object) setObject(next)
  })

  if (!selection || !object) return null
  const found = locate(world.nodes, selection)
  if (!found || ['Sky', 'LightRig'].includes(found.node.type)) return null
  const node = found.node

  const heightAt = (x: number, z: number) =>
    node.anchor ? ground.groundAt(x, z, { kinds: ANCHOR_KINDS[node.anchor], exclude: node.id }) : 0

  const followGround = () => {
    const axis = (gizmo.current as { axis?: string | null } | null)?.axis ?? null
    if (mode !== 'translate' || !node.anchor || axis?.includes('Y') || found.parent) return
    const offset = asVec3(node.props?.position)?.[1] ?? 0
    object.position.y = heightAt(object.position.x, object.position.z) + offset
  }

  const commitTransform = () => {
    const { position: p, rotation: r } = object
    let y = p.y
    if (node.anchor) {
      const world = object.getWorldPosition(new Vector3())
      y = world.y - heightAt(world.x, world.z)
    }
    patchNode(selection, {
      position: [round(p.x), round(y), round(p.z)],
      rotation: [round(r.x), round(r.y), round(r.z)],
    })
  }

  return (
    <TransformControls
      ref={gizmo}
      object={object}
      mode={mode}
      size={0.8}
      translationSnap={view.snap ? view.snapStep : null}
      rotationSnap={view.rotationSnap ? ROTATION_SNAP : null}
      onObjectChange={followGround}
      onMouseUp={commitTransform}
    />
  )
}

const box = new Box3()
const size = new Vector3()

/** A box around the selection, with its size in meters when bounds are on. */
function SelectionBox() {
  const selection = useWorkshop((s) => s.selection)
  const showSize = useWorkshop((s) => s.view.bounds)
  const helper = useRef<Box3Helper>(null)
  const [label, setLabel] = useState('')
  const labelAt = useRef<Vec3>([0, 0, 0])
  const target = useMemo(() => new Box3(), [])

  useFrame(() => {
    const object = selection ? nodeObjects.get(selection) : undefined
    if (!helper.current) return
    if (!object?.visible) {
      helper.current.visible = false
      return
    }
    box.setFromObject(object)
    if (box.isEmpty()) {
      helper.current.visible = false
      return
    }
    target.copy(box)
    helper.current.visible = true
    if (showSize) {
      box.getSize(size)
      const text = `${size.x.toFixed(2)} × ${size.y.toFixed(2)} × ${size.z.toFixed(2)} m`
      labelAt.current = [(box.min.x + box.max.x) / 2, box.max.y + 0.25, (box.min.z + box.max.z) / 2]
      if (text !== label) setLabel(text)
    }
  })

  if (!selection) return null
  return (
    <>
      <box3Helper ref={helper} args={[target, '#3df58a']} />
      {showSize && label && (
        <Html position={labelAt.current} center className="ws-tag ws-tag--size">
          {label}
        </Html>
      )}
    </>
  )
}
