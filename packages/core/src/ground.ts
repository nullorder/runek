// The world's ground as a pure query: which surface is under (x, z), and how high is it.
// React-free and three-free so it runs in the renderer, the editor, Node scripts, and the CLI.
import type { Vec3 } from './types.ts'
import {
  type CompositeDef,
  isCompositeDef,
  type RegistryEntry,
  seedCompositeNodes,
  type WorldData,
  type WorldNode,
} from './world-data.ts'

/** `terrain` is ground proper; `deck` a built walkable top (dock, floor, slab); `water` an
 *  open water surface (never stood on, but checked against the ground at its rim). */
export type SurfaceKind = 'terrain' | 'deck' | 'water'

/** Height of a node's top at local (x, z), or null when (x, z) is off it. */
export type SurfaceFn = (x: number, z: number) => number | null

/** The world settings a surface depends on. */
export interface SurfaceWorld {
  unit: number
  /** The world's baseline ground, for components whose default placement is `world.ground`. */
  ground: number
}

/** How a component publishes its walkable top. Attach it as a static `Component.surface`. */
export interface SurfaceDef {
  kind: SurfaceKind
  /** Build the local height field from props. Pure: same props, same field. It must agree
   *  with the component's collider to within 1 cm. */
  build: (props: Record<string, unknown>, world: SurfaceWorld) => SurfaceFn
  /** Water only: local (x, z) points along the shoreline, compared against the ground. */
  rim?: (props: Record<string, unknown>, world: SurfaceWorld) => Array<[number, number]>
}

/** Where a node's `position[1]` is measured from. Absent means absolute. */
export type NodeAnchor = 'ground' | 'surface'

export interface GroundQueryOptions {
  /** Surface kinds to consider. Default: terrain and deck. */
  kinds?: SurfaceKind[]
  /** A node id whose subtree is ignored, so a node never lands on itself. */
  exclude?: string
}

/** Highest surface at world (x, z), or the world's `ground` baseline if nothing is there. */
export type GroundQuery = (x: number, z: number, opts?: GroundQueryOptions) => number

/** What the ground index reads from a registry entry, beyond rendering it. Components carry
 *  these as static properties (`Terrain.surface`, `Person.groundSitting`). */
export interface GroundEntry {
  surface?: SurfaceDef
  /** Stands on the ground: the world check flags it when buried or floating. */
  groundSitting?: boolean
}

export type GroundRegistry = Record<string, RegistryEntry | GroundEntry | CompositeDef>

export interface GroundIndex {
  groundAt: GroundQuery
  /** The position to render the node at `path` with: resolved when anchored, else undefined. */
  position: (path: string) => Vec3 | undefined
  /** Anchors and surfaces that couldn't be resolved (e.g. under a tilted parent). */
  warnings: string[]
}

/** Default tolerance for the world check, in units. */
export const GROUND_TOLERANCE = 0.08

const SURFACE_KINDS: SurfaceKind[] = ['terrain', 'deck']
/** The surface kinds each anchor stands on. */
export const ANCHOR_KINDS: Record<NodeAnchor, SurfaceKind[]> = {
  ground: ['terrain'],
  surface: ['terrain', 'deck'],
}
/** Past ~1° a parent's tilt makes "the ground below" ambiguous, so anchors under it are absolute. */
const MAX_TILT_COS = Math.cos(Math.PI / 180)

// A 3×4 affine transform, row-major: [r00 r01 r02 tx, r10 r11 r12 ty, r20 r21 r22 tz].
type Frame = number[]

const IDENTITY: Frame = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0]

/** Local transform from a position and an XYZ Euler rotation (three.js's default order). */
function localFrame([px, py, pz]: Vec3, [rx, ry, rz]: Vec3): Frame {
  const a = Math.cos(rx)
  const b = Math.sin(rx)
  const c = Math.cos(ry)
  const d = Math.sin(ry)
  const e = Math.cos(rz)
  const f = Math.sin(rz)
  const ae = a * e
  const af = a * f
  const be = b * e
  const bf = b * f
  return [
    c * e,
    -c * f,
    d,
    px,
    af + be * d,
    ae - bf * d,
    -b * c,
    py,
    bf - ae * d,
    be + af * d,
    a * c,
    pz,
  ]
}

function compose(p: Frame, l: Frame): Frame {
  const out = new Array<number>(12)
  for (let r = 0; r < 3; r++) {
    for (let col = 0; col < 4; col++) {
      out[r * 4 + col] =
        p[r * 4] * l[col] +
        p[r * 4 + 1] * l[4 + col] +
        p[r * 4 + 2] * l[8 + col] +
        (col === 3 ? p[r * 4 + 3] : 0)
    }
  }
  return out
}

const tilted = (m: Frame) => m[5] < MAX_TILT_COS

/** World point of a local point. */
const apply = (m: Frame, x: number, y: number, z: number): Vec3 => [
  m[0] * x + m[1] * y + m[2] * z + m[3],
  m[4] * x + m[5] * y + m[6] * z + m[7],
  m[8] * x + m[9] * y + m[10] * z + m[11],
]

/** Local (x, z) under world (x, z) in an untilted frame. */
function toLocalXZ(m: Frame, x: number, z: number): [number, number] {
  const dx = x - m[3]
  const dz = z - m[11]
  return [m[0] * dx + m[8] * dz, m[2] * dx + m[10] * dz]
}

const asVec3 = (value: unknown): Vec3 | undefined =>
  Array.isArray(value) && value.length === 3 && value.every((n) => typeof n === 'number')
    ? (value as Vec3)
    : undefined

const within = (path: string, root: string) => path === root || path.startsWith(`${root}/`)

interface Entry {
  path: string
  parent: string | null
  type: string
  id?: string
  props: Record<string, unknown>
  anchor?: NodeAnchor
  position: Vec3
  rotation: Vec3
  surface?: SurfaceDef
  groundSitting: boolean
  /** Part of a composite's arrangement rather than the world file itself. */
  arranged: boolean
  /** A `Group` or composite: its children are placed in the world, not carried by a component. */
  container: boolean
}

function groundEntry(entry: unknown): GroundEntry {
  if ((typeof entry !== 'function' && typeof entry !== 'object') || entry === null) return {}
  const { surface, groundSitting } = entry as GroundEntry
  return { surface, groundSitting: groundSitting === true }
}

function flatten(nodes: WorldNode[], registry: GroundRegistry): Entry[] {
  const out: Entry[] = []
  const walk = (list: WorldNode[], parent: string | null, prefix: string, arranged: boolean) => {
    list.forEach((node, i) => {
      const path = parent === null ? `${i}` : `${parent}/${prefix}${i}`
      const props = (node.props ?? {}) as Record<string, unknown>
      const registered = node.type === 'Group' ? undefined : registry[node.type]
      const composite = isCompositeDef(registered as RegistryEntry)
        ? (registered as CompositeDef)
        : undefined
      const { surface, groundSitting } = composite
        ? {
            surface: undefined,
            groundSitting: (composite as { groundSitting?: boolean }).groundSitting === true,
          }
        : groundEntry(registered)
      out.push({
        path,
        parent,
        type: node.type,
        id: node.id,
        props,
        anchor: node.anchor,
        position: asVec3(props.position) ?? [0, 0, 0],
        rotation: asVec3(props.rotation) ?? [0, 0, 0],
        surface,
        groundSitting: groundSitting ?? false,
        arranged,
        container: node.type === 'Group' || composite !== undefined,
      })
      if (composite) {
        walk(seedCompositeNodes(composite.nodes, props.seed as number | undefined), path, 'a', true)
      }
      if (node.children?.length) walk(node.children, path, '', arranged)
    })
  }
  walk(nodes, null, '', false)
  return out
}

interface Resolver extends GroundIndex {
  entries: Entry[]
  frameOf: (path: string) => Frame | undefined
  query: (x: number, z: number, kinds: SurfaceKind[], excludePath?: string) => number
}

function resolver(world: WorldData, registry: GroundRegistry): Resolver {
  const unit = world.unit ?? 1
  const baseline = world.ground ?? 0
  const surfaceWorld: SurfaceWorld = { unit, ground: baseline }
  const entries = flatten(world.nodes, registry)
  const byPath = new Map(entries.map((e) => [e.path, e]))
  const idToPath = new Map<string, string>()
  for (const e of entries) if (e.id && !e.arranged) idToPath.set(e.id, e.path)

  const surfaces = entries.filter((e) => e.surface)
  const fields = new Map<string, SurfaceFn>()
  const frames = new Map<string, Frame>()
  const positions = new Map<string, Vec3>()
  const busy = new Set<string>()
  const warnings: string[] = []
  const warned = new Set<string>()
  const warn = (key: string, message: string) => {
    if (warned.has(key)) return
    warned.add(key)
    warnings.push(message)
  }

  const fieldOf = (e: Entry): SurfaceFn => {
    let fn = fields.get(e.path)
    if (!fn) {
      fn = (e.surface as SurfaceDef).build(e.props, surfaceWorld)
      fields.set(e.path, fn)
    }
    return fn
  }

  /** World transform of a node, or undefined while it is still being resolved (a cycle). */
  const frameOf = (path: string): Frame | undefined => {
    const cached = frames.get(path)
    if (cached) return cached
    if (busy.has(path)) return undefined
    const e = byPath.get(path)
    if (!e) return undefined
    busy.add(path)
    const parent = e.parent === null ? IDENTITY : frameOf(e.parent)
    let frame: Frame | undefined
    if (parent) {
      const position = e.anchor ? anchored(e, parent) : e.position
      frame = compose(parent, localFrame(position, e.rotation))
      frames.set(path, frame)
    }
    busy.delete(path)
    return frame
  }

  function anchored(e: Entry, parent: Frame): Vec3 {
    const cached = positions.get(e.path)
    if (cached) return cached
    if (tilted(parent)) {
      warn(
        e.path,
        `[runek] "${e.type}" (${e.id ?? e.path}) is anchored under a tilted parent; its anchor is treated as absolute.`,
      )
      return e.position
    }
    const [px, offset, pz] = e.position
    const [wx, , wz] = apply(parent, px, 0, pz)
    const height = query(wx, wz, ANCHOR_KINDS[e.anchor as NodeAnchor], e.path)
    // Solve for the local Y that puts the node's origin at height + offset in world space.
    const y = (height + offset - parent[7] - parent[4] * px - parent[6] * pz) / parent[5]
    const resolved: Vec3 = [px, y, pz]
    positions.set(e.path, resolved)
    return resolved
  }

  function query(x: number, z: number, kinds: SurfaceKind[], excludePath?: string): number {
    let best = Number.NEGATIVE_INFINITY
    for (const s of surfaces) {
      if (!kinds.includes((s.surface as SurfaceDef).kind)) continue
      if (excludePath !== undefined && within(s.path, excludePath)) continue
      const m = frameOf(s.path)
      if (!m) continue
      if (tilted(m)) {
        warn(
          `surface:${s.path}`,
          `[runek] "${s.type}" (${s.id ?? s.path}) is tilted; it is left out of ground queries.`,
        )
        continue
      }
      const [lx, lz] = toLocalXZ(m, x, z)
      const h = fieldOf(s)(lx, lz)
      if (h === null) continue
      const wy = m[4] * lx + m[5] * h + m[6] * lz + m[7]
      if (wy > best) best = wy
    }
    return best === Number.NEGATIVE_INFINITY ? baseline : best
  }

  const groundAt: GroundQuery = (x, z, opts = {}) =>
    query(
      x,
      z,
      opts.kinds ?? SURFACE_KINDS,
      opts.exclude === undefined ? undefined : idToPath.get(opts.exclude),
    )

  const position = (path: string): Vec3 | undefined => {
    const e = byPath.get(path)
    if (!e?.anchor) return undefined
    frameOf(path)
    return positions.get(path) ?? e.position
  }

  return { groundAt, position, warnings, entries, frameOf, query }
}

/**
 * Index a world's surfaces for ground queries. Walks the node tree (composing `Group` and
 * composite transforms), finds every node whose registry entry publishes a `surface`, and
 * resolves anchored nodes against them. Build once per world; queries are O(surface nodes).
 */
export function createGroundIndex(world: WorldData, registry: GroundRegistry): GroundIndex {
  const { groundAt, position, warnings, entries, frameOf } = resolver(world, registry)
  // Resolve every anchor up front so warnings are complete when the index is returned.
  for (const e of entries) if (e.anchor) frameOf(e.path)
  return { groundAt, position, warnings }
}

/** One-shot ground height at world (x, z). Build a `createGroundIndex` to query repeatedly. */
export function groundAt(
  world: WorldData,
  registry: GroundRegistry,
  x: number,
  z: number,
  opts?: GroundQueryOptions,
): number {
  return createGroundIndex(world, registry).groundAt(x, z, opts)
}

export type WorldIssueKind = 'buried' | 'floating' | 'water-above-ground'

export interface WorldIssue {
  kind: WorldIssueKind
  /** Tree path of the node (`"3"`, `"3/0"`), stable for a given file. */
  path: string
  id?: string
  type: string
  /** The node's world X, Y, Z. For water, Y is the water level. */
  at: Vec3
  /** The ground it was compared against. */
  ground: number
  /** A `position[1]` that fixes it, in the node's own (local or anchored-offset) terms. */
  fix?: number
}

export interface CheckWorldOptions {
  /** Allowed gap before a node counts as buried or floating, in units. */
  tolerance?: number
}

/**
 * Flag ground-sitting nodes that are buried (below the terrain) or floating (above the highest
 * surface), and open water that sits above the ground at its rim. Nodes inside composite
 * arrangements and under tilted parents are skipped; the composite instance is checked instead.
 */
export function checkWorld(
  world: WorldData,
  registry: GroundRegistry,
  { tolerance = GROUND_TOLERANCE }: CheckWorldOptions = {},
): WorldIssue[] {
  const r = resolver(world, registry)
  const byPath = new Map(r.entries.map((e) => [e.path, e]))
  const issues: WorldIssue[] = []

  for (const e of r.entries) {
    // Arrangement parts are checked through their instance, and a component's own children
    // (a Person carried as a Player's body) ride their parent rather than stand on the ground.
    if (e.arranged || (e.parent !== null && !byPath.get(e.parent)?.container)) continue
    const parent = e.parent === null ? IDENTITY : r.frameOf(e.parent)
    const frame = r.frameOf(e.path)
    if (!parent || !frame || tilted(parent)) continue
    const base = { path: e.path, id: e.id, type: e.type }
    // Y offset a local position[1] change makes in world space.
    const fix = (target: number, y: number) =>
      Math.round((e.position[1] + (target - y) / parent[5]) * 1000) / 1000

    if (e.surface?.kind === 'water') {
      const level =
        (e.surface.build(e.props, { unit: world.unit ?? 1, ground: world.ground ?? 0 })(0, 0) ??
          0) + frame[7]
      const rim =
        e.surface.rim?.(e.props, { unit: world.unit ?? 1, ground: world.ground ?? 0 }) ?? []
      let lowest = Number.POSITIVE_INFINITY
      for (const [lx, lz] of rim) {
        const [wx, , wz] = apply(frame, lx, 0, lz)
        lowest = Math.min(lowest, r.query(wx, wz, ['terrain'], e.path))
      }
      if (rim.length && level > lowest + tolerance) {
        issues.push({
          ...base,
          kind: 'water-above-ground',
          at: [frame[3], level, frame[11]],
          ground: lowest,
          fix: fix(lowest, level),
        })
      }
      continue
    }

    if (!e.groundSitting) continue
    const [x, y, z] = [frame[3], frame[7], frame[11]]
    const terrain = r.query(x, z, ['terrain'], e.path)
    if (y < terrain - tolerance) {
      issues.push({ ...base, kind: 'buried', at: [x, y, z], ground: terrain, fix: fix(terrain, y) })
      continue
    }
    const top = r.query(x, z, SURFACE_KINDS, e.path)
    if (y > top + tolerance) {
      issues.push({ ...base, kind: 'floating', at: [x, y, z], ground: top, fix: fix(top, y) })
    }
  }
  return issues
}
