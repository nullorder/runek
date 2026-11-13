import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CylinderGeometry,
  PlaneGeometry,
  SphereGeometry,
} from 'three'
import type { LightLook } from './light'
import type { MaterialLook } from './material'
import type { WorldPalette } from './palette'
import type { Vec3 } from './types'

/** A piece of geometry, as data: a primitive three builds, or raw vertex arrays. */
export type BuiltShape =
  | { box: [number, number, number] }
  | { cylinder: [radiusTop: number, radiusBottom: number, height: number, segments?: number] }
  | { sphere: [radius: number, widthSegments?: number, heightSegments?: number] }
  | { plane: [width: number, height: number] }
  | {
      arrays: {
        position: Float32Array
        normal?: Float32Array
        uv?: Float32Array
        index?: Uint16Array | Uint32Array
      }
    }

/** One mesh of a build: a shape drawn in a look, placed in the node's own space. */
export interface BuiltPart {
  shape: BuiltShape
  look: MaterialLook
  position?: Vec3
  rotation?: Vec3
  castShadow?: boolean
  receiveShadow?: boolean
}

/** A fixed collider, in the node's own space: a box by its half extents. */
export interface BuiltCollider {
  cuboid: Vec3
  position?: Vec3
  rotation?: Vec3
}

/** A light the build gives off, registered with the world's light pool like `useLight`. */
export interface BuiltLight {
  look: LightLook
  position: Vec3
  /** Spot only: where the cone aims, in the node's own space. */
  target?: Vec3
}

/**
 * What a component's `build` returns: everything it draws, collides with and lights, as plain
 * data. No React, no three objects (raw arrays aside), so a world can mount it without a
 * component, cache it by props and share it between identical nodes.
 */
export interface Built {
  parts: BuiltPart[]
  colliders?: BuiltCollider[]
  lights?: BuiltLight[]
}

/** What a build reads from the world: the same values its React form reads from `useWorld()`. */
export interface BuildContext {
  unit: number
  palette: WorldPalette
}

/**
 * A component's geometry as a pure function of its props: `Component.build = (props, ctx) =>
 * Built`, beside its React form. The same props and context must give the same result (CONTRACT
 * §2). A streamed world mounts components that have one without React.
 */
// biome-ignore lint/suspicious/noExplicitAny: each component builds from its own props
export type BuildFunction<P = any> = (props: P, ctx: BuildContext) => Built

/** A registry component that can build without React. */
export function buildOf(entry: unknown): BuildFunction | undefined {
  const fn = (entry as { build?: unknown } | undefined)?.build
  return typeof fn === 'function' ? (fn as BuildFunction) : undefined
}

const geometries = new Map<string, BufferGeometry>()
const ids = new WeakMap<object, number>()
let nextId = 0

/** A stable key for a shape: primitives by their numbers, raw arrays by identity. */
export function shapeKey(shape: BuiltShape): string {
  if ('arrays' in shape) {
    let id = ids.get(shape.arrays)
    if (id === undefined) {
      id = nextId++
      ids.set(shape.arrays, id)
    }
    return `arrays:${id}`
  }
  const [kind, args] = Object.entries(shape)[0] as [string, number[]]
  return `${kind}:${args.map((n) => +n.toFixed(5)).join(',')}`
}

/**
 * The geometry for `shape`, shared by every part anywhere with the same shape: a thousand crates
 * hold one geometry per plank size, not a thousand. Shared geometry is read-only.
 */
export function shapeGeometry(shape: BuiltShape): BufferGeometry {
  const key = shapeKey(shape)
  let geometry = geometries.get(key)
  if (!geometry) {
    if ('box' in shape) geometry = new BoxGeometry(...shape.box)
    else if ('cylinder' in shape) {
      const [top, bottom, height, segments = 16] = shape.cylinder
      geometry = new CylinderGeometry(top, bottom, height, segments)
    } else if ('sphere' in shape) {
      const [radius, w = 16, h = 12] = shape.sphere
      geometry = new SphereGeometry(radius, w, h)
    } else if ('plane' in shape) geometry = new PlaneGeometry(...shape.plane)
    else {
      const { position, normal, uv, index } = shape.arrays
      geometry = new BufferGeometry()
      geometry.setAttribute('position', new BufferAttribute(position, 3))
      if (normal) geometry.setAttribute('normal', new BufferAttribute(normal, 3))
      else geometry.computeVertexNormals()
      if (uv) geometry.setAttribute('uv', new BufferAttribute(uv, 2))
      if (index) geometry.setIndex(new BufferAttribute(index, 1))
    }
    geometry.name = `runek:shape:${key}`
    geometries.set(key, geometry)
  }
  return geometry
}

/** How many shared shape geometries exist (for tests and tooling). */
export function shapeGeometryCount() {
  return geometries.size
}

const builds = new Map<string, Built>()
const MAX_BUILDS = 4096

/**
 * `build(props, ctx)`, remembered by its inputs: identical nodes (a street of the same crate)
 * build once. Keyed on the component, its props and the context.
 */
export function cachedBuild(
  type: string,
  build: BuildFunction,
  props: Record<string, unknown>,
  ctx: BuildContext,
): Built {
  const { position: _p, rotation: _r, ...shape } = props
  const key = `${type}|${ctx.unit}|${JSON.stringify(ctx.palette)}|${JSON.stringify(shape)}`
  let built = builds.get(key)
  if (!built) {
    built = build(props, ctx)
    if (builds.size >= MAX_BUILDS) builds.delete(builds.keys().next().value as string)
    builds.set(key, built)
  }
  return built
}
