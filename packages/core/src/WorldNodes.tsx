import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef, useState } from 'react'
import { Vector3 } from 'three'
import type { GroundIndex } from './ground'
import { createStreamIndex, nearNodes, type StreamSetting, streamOptions } from './stream'
import type { Vec3 } from './types'
import { useWorld } from './useWorld'
import {
  type ComponentRegistry,
  isCompositeDef,
  seedCompositeNodes,
  type WorldNode,
} from './world-data'

export interface WorldNodesProps {
  nodes: WorldNode[]
  registry: ComponentRegistry
  /** The world's ground index. Anchored nodes resolve their Y through it; without one they
   *  render with their authored position, as if absolute. */
  ground?: GroundIndex | null
  /** Tree path of the parent node, matching the ground index's paths. Set by recursion. */
  path?: string
  /** Path prefix for this list's entries (`a` marks a composite's arrangement). */
  prefix?: string
  /** Mount only the top-level nodes near the viewer (the avatar, or the camera without one),
   *  by a cell index of their positions and footprints: `true`, or `{ radius, cell }` in units
   *  (default 80 and 20). Nodes with no position, `Group`s and components that opt out
   *  (`stream = false`: the avatar, the sky) are always mounted. */
  stream?: StreamSetting
}

const asVec3 = (value: unknown): Vec3 | undefined =>
  Array.isArray(value) && value.length === 3 ? (value as Vec3) : undefined

/** Tree path of the `index`th node in a list, as `createGroundIndex` numbers it. */
export const nodePath = (parent: string | undefined, index: number, prefix = '') =>
  parent === undefined ? `${index}` : `${parent}/${prefix}${index}`

/**
 * Render a list of world nodes by looking each `type` up in the registry. Recurses
 * into children. Two node types resolve without a registry component: the built-in
 * `Group` (a plain transform container) and any registry entry that is a composite
 * (expanded eagerly into its arrangement inside a positioned group).
 */
export function WorldNodes(props: WorldNodesProps) {
  // Without streaming it stays hook-free: the list itself, nested lists as WorldNodes again.
  return props.stream ? <StreamedNodes {...props} /> : nodeList(props)
}

// How often, in seconds, the viewer's place is checked against the index; and how far, as a share
// of a cell, the viewer must move between checks for one to run sooner.
const RECHECK = 0.25
const MOVE = 0.25
const viewer = new Vector3()

function StreamedNodes({ stream, ...props }: WorldNodesProps) {
  const { nodes, registry, ground } = props
  const { unit, player } = useWorld()
  const camera = useThree((s) => s.camera)
  const index = useMemo(() => {
    const options = streamOptions(stream, unit)
    return options && createStreamIndex(nodes, registry, options, unit, ground)
  }, [nodes, registry, ground, stream, unit])
  const [mounted, setMounted] = useState<{ index: typeof index; nodes: Set<number> }>(() => ({
    index,
    nodes: new Set(index ? nearNodes(index, camera.position.x, camera.position.z) : []),
  }))
  const check = useRef({ x: Number.NaN, z: Number.NaN, wait: 0 })

  useFrame(({ camera }, dt) => {
    if (!index) return
    const at = player?.current ? player.current.getWorldPosition(viewer) : camera.position
    const last = check.current
    last.wait -= dt
    const moved = Math.hypot(at.x - last.x, at.z - last.z)
    if (mounted.index === index && last.wait > 0 && !(moved > index.options.cell * MOVE)) return
    last.x = at.x
    last.z = at.z
    last.wait = RECHECK
    const current = mounted.index === index ? mounted.nodes : undefined
    const next = nearNodes(index, at.x, at.z, current)
    if (current && next.length === current.size && next.every((i) => current.has(i))) return
    setMounted({ index, nodes: new Set(next) })
  })

  const visible = mounted.index === index ? mounted.nodes : undefined
  return nodeList(props, index ? (visible ?? new Set(index.always)) : undefined)
}

function nodeList(
  { nodes, registry, ground, path: parent, prefix }: WorldNodesProps,
  visible?: ReadonlySet<number>,
) {
  return (
    <>
      {nodes.map((node, index) => {
        if (visible && !visible.has(index)) return null
        const key = node.id ?? index
        const path = nodePath(parent, index, prefix)
        const anchored = node.anchor ? ground?.position(path) : undefined
        const props = anchored ? { ...node.props, position: anchored } : (node.props ?? {})
        const children = node.children?.length ? (
          <WorldNodes nodes={node.children} registry={registry} ground={ground} path={path} />
        ) : null

        if (node.type === 'Group') {
          return (
            <group key={key} position={asVec3(props.position)} rotation={asVec3(props.rotation)}>
              {children}
            </group>
          )
        }

        const entry = registry[node.type]
        if (!entry) {
          console.warn(`[runek] Unknown component "${node.type}" — skipped.`)
          return null
        }

        if (isCompositeDef(entry)) {
          const arrangement = seedCompositeNodes(entry.nodes, props.seed as number | undefined)
          return (
            <group key={key} position={asVec3(props.position)} rotation={asVec3(props.rotation)}>
              <WorldNodes
                nodes={arrangement}
                registry={registry}
                ground={ground}
                path={path}
                prefix="a"
              />
              {children}
            </group>
          )
        }

        const Component = entry
        // Pass nested child nodes as children only when present; otherwise render with no
        // children expression so `props.children` (e.g. a `Sign`'s text authored in JSON)
        // flows through instead of being clobbered by a null child.
        return children ? (
          <Component key={key} {...props}>
            {children}
          </Component>
        ) : (
          <Component key={key} {...props} />
        )
      })}
    </>
  )
}
