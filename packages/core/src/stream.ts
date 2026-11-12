import type { GroundIndex } from './ground'
import type { Vec3 } from './types'
import { type ComponentRegistry, isCompositeDef, type WorldNode } from './world-data'

/**
 * Streaming for a dense world: only the nodes near the viewer are mounted. A world file turns it
 * on with `"stream": true` or `{ "radius": 80, "cell": 20 }`.
 */
export type StreamSetting = boolean | { radius?: number; cell?: number; build?: boolean }

export interface StreamOptions {
  /** Mount a node once its footprint comes within this many world units of the viewer. */
  radius: number
  /** Side of the index's grid cells, in world units. */
  cell: number
  /** Mount components that have a `build` from it, without a React component per node. */
  build: boolean
}

/** Mounted nodes stay until they are this much farther than `radius`, so a viewer standing on a
 *  boundary doesn't make them flicker in and out. */
export const STREAM_HYSTERESIS = 1.25

export const DEFAULT_STREAM: StreamOptions = { radius: 80, cell: 20, build: true }

/** The options a world's `stream` setting asks for, or null when it doesn't stream. */
export function streamOptions(setting: StreamSetting | undefined, unit = 1): StreamOptions | null {
  if (!setting) return null
  const given = setting === true ? {} : setting
  return {
    radius: (given.radius ?? DEFAULT_STREAM.radius) * unit,
    cell: (given.cell ?? DEFAULT_STREAM.cell) * unit,
    build: given.build ?? DEFAULT_STREAM.build,
  }
}

/** Top-level nodes by grid cell, with each one's footprint on the ground plane. */
export interface StreamIndex {
  options: StreamOptions
  /** Nodes mounted wherever the viewer is: no position, a `Group`, or a component that opts out
   *  (`stream = false` on it: the avatar, the sky, an ocean that follows the camera). */
  always: number[]
  /** Cell key to the nodes whose footprint touches the cell. */
  cells: Map<string, number[]>
  /** Footprint per node as `[minX, minZ, maxX, maxZ]`, in world units (unset for `always`). */
  boxes: ([number, number, number, number] | undefined)[]
}

const asVec3 = (value: unknown): Vec3 | undefined =>
  Array.isArray(value) && value.length === 3 && value.every((n) => typeof n === 'number')
    ? (value as Vec3)
    : undefined

/** Half the footprint's side, in world units: a composite's `bounds`, else a `size` prop
 *  (`[w, d]` or `[w, h, d]`), else a point. Square and rotation-proof. */
function halfExtent(node: WorldNode, registry: ComponentRegistry, unit: number): number {
  const entry = registry[node.type]
  if (isCompositeDef(entry) && entry.bounds) {
    const [w, , d] = entry.bounds
    return (Math.hypot(w, d) / 2) * unit
  }
  const size = node.props?.size
  if (Array.isArray(size) && size.every((n) => typeof n === 'number')) {
    const [w, a, b] = size as number[]
    const d = size.length === 3 ? b : a
    return (Math.hypot(w, d ?? w) / 2) * unit
  }
  return 0
}

const key = (x: number, z: number) => `${x},${z}`

/**
 * Index a world's top-level nodes by cell for streaming. A node's place is its `position`
 * (through the ground index when anchored) and its footprint its composite `bounds` or `size`.
 */
export function createStreamIndex(
  nodes: WorldNode[],
  registry: ComponentRegistry,
  options: StreamOptions,
  unit = 1,
  ground?: GroundIndex | null,
): StreamIndex {
  const always: number[] = []
  const cells = new Map<string, number[]>()
  const boxes: StreamIndex['boxes'] = []
  nodes.forEach((node, i) => {
    const entry = registry[node.type] as { stream?: boolean } | undefined
    const position = (node.anchor && ground?.position(`${i}`)) || asVec3(node.props?.position)
    if (node.type === 'Group' || !position || entry?.stream === false) {
      always.push(i)
      return
    }
    const r = halfExtent(node, registry, unit)
    const box: [number, number, number, number] = [
      position[0] - r,
      position[2] - r,
      position[0] + r,
      position[2] + r,
    ]
    boxes[i] = box
    const { cell } = options
    for (let cx = Math.floor(box[0] / cell); cx <= Math.floor(box[2] / cell); cx++) {
      for (let cz = Math.floor(box[1] / cell); cz <= Math.floor(box[3] / cell); cz++) {
        const k = key(cx, cz)
        const list = cells.get(k)
        if (list) list.push(i)
        else cells.set(k, [i])
      }
    }
  })
  return { options, always, cells, boxes }
}

/** Distance on the ground plane from `(x, z)` to a footprint (0 inside it). */
function distanceTo(box: [number, number, number, number], x: number, z: number) {
  const dx = Math.max(box[0] - x, 0, x - box[2])
  const dz = Math.max(box[1] - z, 0, z - box[3])
  return Math.hypot(dx, dz)
}

/**
 * The nodes to mount for a viewer at `(x, z)`: every node that never streams, those whose
 * footprint is within `radius`, and those in `mounted` still within `radius` times
 * `STREAM_HYSTERESIS`. Sorted by index.
 */
export function nearNodes(
  index: StreamIndex,
  x: number,
  z: number,
  mounted?: ReadonlySet<number>,
): number[] {
  const { radius, cell } = index.options
  const reach = radius * STREAM_HYSTERESIS
  const near = new Set(index.always)
  for (let cx = Math.floor((x - reach) / cell); cx <= Math.floor((x + reach) / cell); cx++) {
    for (let cz = Math.floor((z - reach) / cell); cz <= Math.floor((z + reach) / cell); cz++) {
      for (const i of index.cells.get(key(cx, cz)) ?? []) {
        if (near.has(i)) continue
        const box = index.boxes[i]
        if (!box) continue
        const d = distanceTo(box, x, z)
        if (d <= radius || (mounted?.has(i) && d <= reach)) near.add(i)
      }
    }
  }
  return [...near].sort((a, b) => a - b)
}
