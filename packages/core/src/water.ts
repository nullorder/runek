// Open water as something the world can be asked about: where its surface is and how it moves,
// so whatever goes through the world (the `Player`, a `Person`) can tell when it is in water.
import { useEffect } from 'react'
import { Matrix4, type Object3D, Vector3 } from 'three'
import { useWorld } from './useWorld'

/** A body of water a figure can get into, published by a water component (`Ocean`, `Lake`,
 *  `Pool`) while it is mounted. Heights are world Y, in world units. */
export interface WaterBody {
  /** The still water's surface at world (x, z), or null where this water isn't. */
  level(x: number, z: number): number | null
  /** How far the surface stands above its still level at (x, z) right now (below it, when
   *  negative): the swell a swimmer rides. Leave it out for flat water. */
  swell?(x: number, z: number): number
  /** How deep the water goes below its surface (a pool's basin). Whatever is wholly under that
   *  is not in this water. Leave it out for water with no floor of its own. */
  depth?: number
}

/** The water at a point: its still surface and the swell on it now. */
export interface WaterSample {
  level: number
  swell: number
}

/**
 * The water over world (x, z) for something whose highest point is `top`: the highest surface
 * among `waters` that is there and whose floor is not above `top` (a room under a pool is dry).
 * Null where there is none. Writes into `out` and returns it, so a caller can reuse one sample.
 */
export function waterAt(
  waters: Iterable<WaterBody> | undefined,
  x: number,
  top: number,
  z: number,
  out: WaterSample = { level: 0, swell: 0 },
): WaterSample | null {
  if (!waters) return null
  let found: WaterBody | null = null
  for (const water of waters) {
    const level = water.level(x, z)
    if (level === null) continue
    if (water.depth !== undefined && level - water.depth > top) continue
    if (found && level <= out.level) continue
    found = water
    out.level = level
  }
  if (!found) return null
  out.swell = found.swell?.(x, z) ?? 0
  return out
}

export interface PlaneWaterOptions {
  /** The swell at a point of the plane, given both in the plane's own coordinates and in the
   *  world's, in world units. */
  wave?: (localX: number, localY: number, x: number, z: number) => number
  /** How deep the water goes below the plane, in world units. */
  depth?: number
}

/**
 * The `WaterBody` of a flat sheet of water: a rectangle `size` (`[width, depth]`, world units)
 * lying in `object`'s local X-Y plane, as a `planeGeometry` turned to lie flat does, or water
 * without edges when `size` is null. `object` is read when asked, so pass a ref's getter. The
 * sheet is taken as level: its height is its origin's.
 */
export function planeWater(
  object: () => Object3D | null,
  size: [number, number] | null,
  { wave, depth }: PlaneWaterOptions = {},
): WaterBody {
  const at = new Matrix4()
  const inverse = new Matrix4()
  const point = new Vector3()
  let placed: Object3D | null = null
  /** The plane's world height, with `point` left at (x, z) in the plane's own coordinates. */
  const locate = (x: number, z: number): number | null => {
    const o = object()
    if (!o) return null
    // A sheet asked about before its first render has no world matrix yet.
    if (placed !== o) {
      o.updateWorldMatrix(true, false)
      placed = o
    }
    const y = o.matrixWorld.elements[13]
    if (size || wave) {
      // Inverted again only when the sheet has moved: many figures ask in one frame.
      if (!at.equals(o.matrixWorld)) inverse.copy(at.copy(o.matrixWorld)).invert()
      point.set(x, y, z).applyMatrix4(inverse)
    }
    return y
  }
  const inside = () =>
    !size || (Math.abs(point.x) <= size[0] / 2 && Math.abs(point.y) <= size[1] / 2)
  return {
    depth,
    level: (x, z) => {
      const y = locate(x, z)
      return y !== null && inside() ? y : null
    },
    swell: wave && ((x, z) => (locate(x, z) === null ? 0 : wave(point.x, point.y, x, z))),
  }
}

/** Publish a body of water to the world while the component is mounted, so figures can swim in
 *  it. Keep `water` stable (memoize it); null publishes nothing. */
export function useWater(water: WaterBody | null) {
  const { waters } = useWorld()
  useEffect(() => {
    if (!waters || !water) return
    waters.add(water)
    return () => {
      waters.delete(water)
    }
  }, [waters, water])
}
