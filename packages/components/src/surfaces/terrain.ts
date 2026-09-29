// Terrain's height math, shared by the mesh (Terrain.tsx) and the ground query. Plain TS with
// no three.js or React, so Node tooling (`runek check-world`) can import it directly.
import type { SurfaceDef } from '@runek/core'

export interface TerrainShape {
  size?: [number, number]
  relief?: number
  resolution?: number
  frequency?: number
  flatRadius?: number
  falloff?: number
  seed?: number
}

export const TERRAIN_DEFAULTS = {
  size: [40, 40] as [number, number],
  relief: 0,
  resolution: 64,
  frequency: 0.04,
  flatRadius: 0,
  falloff: 0,
  seed: 1,
}

function valueNoise(seed: number) {
  const hash = (x: number, y: number) => {
    let h = (seed ^ Math.imul(x, 374761393) ^ Math.imul(y, 668265263)) >>> 0
    h = Math.imul(h ^ (h >>> 13), 1274126177)
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296
  }
  return (x: number, y: number) => {
    const x0 = Math.floor(x)
    const y0 = Math.floor(y)
    const fx = x - x0
    const fy = y - y0
    const sx = fx * fx * (3 - 2 * fx)
    const sy = fy * fy * (3 - 2 * fy)
    const top = hash(x0, y0) + (hash(x0 + 1, y0) - hash(x0, y0)) * sx
    const bot = hash(x0, y0 + 1) + (hash(x0 + 1, y0 + 1) - hash(x0, y0 + 1)) * sx
    return top + (bot - top) * sy
  }
}

function fbm(noise: (x: number, y: number) => number, x: number, y: number) {
  let value = 0
  let amp = 0.5
  let freq = 1
  for (let octave = 0; octave < 4; octave++) {
    value += amp * noise(x * freq, y * freq)
    amp *= 0.5
    freq *= 2
  }
  return value
}

// three's MathUtils.smoothstep, inlined to keep this module three-free.
function smoothstep(x: number, min: number, max: number) {
  if (x <= min) return 0
  if (x >= max) return 1
  const t = (x - min) / (max - min)
  return t * t * (3 - 2 * t)
}

/** The displaced height field at local (x, z): what each mesh vertex is raised to. */
export function terrainHeight(shape: TerrainShape, unit: number): (x: number, z: number) => number {
  const {
    size = TERRAIN_DEFAULTS.size,
    relief = TERRAIN_DEFAULTS.relief,
    frequency = TERRAIN_DEFAULTS.frequency,
    flatRadius = TERRAIN_DEFAULTS.flatRadius,
    falloff = TERRAIN_DEFAULTS.falloff,
    seed = TERRAIN_DEFAULTS.seed,
  } = shape
  const noise = valueNoise(seed)
  const fr = flatRadius * unit
  const half = (Math.min(size[0], size[1]) * unit) / 2
  const sink = (relief + 4) * unit
  return (x, z) => {
    let h: number
    if (falloff > 0) {
      // Island mode: gentle land above the waterline, masked down to the deep at the rim.
      const land = fbm(noise, x * frequency, z * frequency) * relief * unit
      const rn = Math.hypot(x, z) / half
      const mask = 1 - smoothstep(rn, falloff - 0.18, falloff)
      h = land * mask - (1 - mask) * sink
    } else {
      h = (fbm(noise, x * frequency, z * frequency) - 0.5) * 2 * relief * unit
    }
    if (fr > 0) h *= smoothstep(Math.hypot(x, z), fr, fr + 8 * unit)
    return h
  }
}

/**
 * The walkable top as the mesh actually renders it: flat terrain is a box top; displaced
 * terrain is the PlaneGeometry triangulation of `terrainHeight` (float32 vertices, the
 * `a,b,d` / `b,c,d` diagonal), so queries agree with the trimesh collider, not an idealized
 * noise field.
 */
export const terrainSurface: SurfaceDef = {
  kind: 'terrain',
  build(props, { unit }) {
    const shape = props as TerrainShape
    const [sw, sd] = shape.size ?? TERRAIN_DEFAULTS.size
    const w = sw * unit
    const d = sd * unit
    if ((shape.relief ?? TERRAIN_DEFAULTS.relief) <= 0) {
      return (x, z) => (Math.abs(x) <= w / 2 && Math.abs(z) <= d / 2 ? 0 : null)
    }
    const res = shape.resolution ?? TERRAIN_DEFAULTS.resolution
    const height = terrainHeight(shape, unit)
    const segW = w / res
    const segD = d / res
    const vx = (ix: number) => Math.fround(ix * segW - w / 2)
    const vz = (iz: number) => Math.fround(iz * segD - d / 2)
    const vy = (ix: number, iz: number) => Math.fround(height(vx(ix), vz(iz)))
    return (x, z) => {
      if (Math.abs(x) > w / 2 || Math.abs(z) > d / 2) return null
      const ix = Math.min(res - 1, Math.max(0, Math.floor((x + w / 2) / segW)))
      const iz = Math.min(res - 1, Math.max(0, Math.floor((z + d / 2) / segD)))
      const x0 = vx(ix)
      const z0 = vz(iz)
      const u = (x - x0) / (vx(ix + 1) - x0)
      const v = (z - z0) / (vz(iz + 1) - z0)
      const ha = vy(ix, iz)
      const hb = vy(ix, iz + 1)
      const hd = vy(ix + 1, iz)
      if (u + v <= 1) return ha + u * (hd - ha) + v * (hb - ha)
      const hc = vy(ix + 1, iz + 1)
      return hc + (1 - u) * (hb - hc) + (1 - v) * (hd - hc)
    }
  },
}
