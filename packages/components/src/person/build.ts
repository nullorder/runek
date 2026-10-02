// Turn a FigureSpec into mesh data: each part meshed, skin-weighted, and painted (base color,
// baked occlusion, skin tint). A generator, so the scheduler can spread it over frames. Output is
// plain typed arrays, shareable between every figure with the same spec.
import { clamp01, type Field, lattice, len, noise3, type Prim, surfaceNets, type V3 } from './sdf'
import { BONES, type PartDef, type Shape, shapeFigure } from './shape'
import type { FigureSpec, MaterialKind } from './spec'

export type Lod = 'near' | 'far'

export interface BuiltPart {
  name: string
  material: MaterialKind
  positions: Float32Array
  normals: Float32Array
  indices: Uint32Array
  /** Linear RGB, final color (base x occlusion x tint). */
  colors: Float32Array
  skinIndex: Uint16Array
  skinWeight: Float32Array
}

export interface BuiltFigure {
  lod: Lod
  joints: V3[]
  height: number
  eyes: Shape['eyes']
  lidRadius: number
  marks: Shape['marks']
  props: Shape['props']
  parts: BuiltPart[]
  triangles: number
}

/** Reference height the part cell sizes are tuned for. */
const REF_HEIGHT = 1.65
const VERTS_PER_SLICE = 512

export function* buildFigure(spec: FigureSpec, lod: Lod): Generator<void, BuiltFigure> {
  const shape = shapeFigure(spec)
  const scale = shape.height / REF_HEIGHT
  const parts: BuiltPart[] = []
  let triangles = 0
  // Occlusion reads a coarse cached copy of the whole figure's field, shared by every part.
  const occluder = lattice(shape.occluder, (lod === 'near' ? 0.012 : 0.03) * scale)
  for (const def of shape.parts) {
    if (lod === 'near' ? def.farOnly : def.nearOnly || def.far === null) continue
    const h = (lod === 'near' ? def.near : (def.far ?? def.near)) * scale
    const raw = yield* surfaceNets(def.field, def.min, def.max, h)
    if (raw.indices.length === 0) continue
    const { skinIndex, skinWeight } = yield* weigh(
      raw.positions,
      def.weightBy,
      def.sigma,
      def.below,
    )
    const colors = yield* paint(raw.positions, raw.normals, def, shape, spec, scale, occluder)
    parts.push({ name: def.name, material: def.material, ...raw, colors, skinIndex, skinWeight })
    triangles += raw.indices.length / 3
  }
  return {
    lod,
    joints: shape.joints,
    height: shape.height,
    eyes: shape.eyes,
    lidRadius: shape.lidRadius,
    marks: shape.marks,
    props: shape.props,
    parts,
    triangles,
  }
}

/** Skin weights from distance to each bone's primitives: soft-min falloff, best four kept. */
export function* weigh(
  positions: Float32Array,
  prims: readonly Prim[],
  sigma: number,
  below?: { y: number; maxX: number; prims: readonly Prim[]; sigma: number },
) {
  const count = positions.length / 3
  const skinIndex = new Uint16Array(count * 4)
  const skinWeight = new Float32Array(count * 4)
  const dist = new Float64Array(BONES.length)
  const above = prims.filter((q) => !q.sub)
  const under = below ? below.prims.filter((q) => !q.sub) : above
  const top: number[] = []
  for (let v = 0; v < count; v++) {
    if (v % VERTS_PER_SLICE === 0) yield
    const x = positions[v * 3]
    const y = positions[v * 3 + 1]
    const z = positions[v * 3 + 2]
    dist.fill(1e9)
    const low = below !== undefined && y < below.y && Math.abs(x) < below.maxX
    const adds = low ? under : above
    const fall = low && below ? below.sigma : sigma
    for (const q of adds) {
      if (len(x - q.c[0], y - q.c[1], z - q.c[2]) - q.R > dist[q.bone]) continue
      const d = q.d(x, y, z)
      if (d < dist[q.bone]) dist[q.bone] = d
    }
    let dmin = 1e9
    for (let b = 0; b < dist.length; b++) dmin = Math.min(dmin, dist[b])
    top.length = 0
    for (let b = 0; b < dist.length; b++) {
      if (dist[b] > 1e8) continue
      const w = Math.exp(-(dist[b] - dmin) / fall)
      if (w > 0.01) top.push(b, w)
    }
    // Keep the four heaviest (pairs of [bone, weight]); a vertex rarely has more than three.
    const order = Array.from({ length: top.length / 2 }, (_, i) => i).sort(
      (a, b) => top[b * 2 + 1] - top[a * 2 + 1],
    )
    let sum = 0
    for (let i = 0; i < Math.min(4, order.length); i++) sum += top[order[i] * 2 + 1]
    for (let i = 0; i < Math.min(4, order.length); i++) {
      skinIndex[v * 4 + i] = top[order[i] * 2]
      skinWeight[v * 4 + i] = top[order[i] * 2 + 1] / sum
    }
    if (order.length === 0) skinWeight[v * 4] = 1
  }
  return { skinIndex, skinWeight }
}

const linearCache = new Map<string, V3>()
/** sRGB hex to linear RGB (vertex colors are linear). */
export function linear(hex: string): V3 {
  let c = linearCache.get(hex)
  if (!c) {
    const v = Number.parseInt(hex.replace('#', '').padEnd(6, '0').slice(0, 6), 16)
    const ch = (s: number) => {
      const x = ((v >> s) & 255) / 255
      return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
    }
    c = [ch(16), ch(8), ch(0)]
    linearCache.set(hex, c)
  }
  return c
}

/** iq-style field occlusion: how much closer the field gets than a ray along the normal. */
function occlusion(
  f: Field,
  x: number,
  y: number,
  z: number,
  nx: number,
  ny: number,
  nz: number,
  s: number,
) {
  let occ = 0
  let w = 1
  for (let i = 1; i <= 3; i++) {
    const h = 0.006 * s * i * i
    occ += (h - Math.max(f(x + nx * h, y + ny * h, z + nz * h), 0)) * w
    w *= 0.55
  }
  return Math.max(0.35, Math.min(1, 1 - (occ * 18) / s))
}

function* paint(
  positions: Float32Array,
  normals: Float32Array,
  def: PartDef,
  shape: Shape,
  spec: FigureSpec,
  s: number,
  occluder: Field,
) {
  const out = new Float32Array(positions.length)
  const n = noise3(spec.seed + 7)
  const isSkin = def.material === 'skin'
  const lip = linear(spec.colors.lip)
  const hair = linear(spec.colors.hair)
  const flat = typeof def.paint === 'string' ? linear(def.paint) : null
  for (let i = 0; i < positions.length; i += 3) {
    if ((i / 3) % VERTS_PER_SLICE === 0) yield
    const x = positions[i]
    const y = positions[i + 1]
    const z = positions[i + 2]
    const ao = occlusion(occluder, x, y, z, normals[i], normals[i + 1], normals[i + 2], s)
    let base = flat
    if (!base) {
      const hex = (def.paint as (x: number, y: number, z: number) => string | null)(x, y, z)
      base = linear(hex ?? '#808080')
    }
    let r = base[0]
    let g = base[1]
    let b = base[2]
    const grain =
      1 +
      (n((x * 40) / s, (y * 40) / s, (z * 40) / s) - 0.5) *
        (isSkin ? 0.05 : def.material === 'hair' ? 0.22 : 0.08)
    if (isSkin) {
      const t = shape.skinPaint(x, y, z)
      r = r * (1 + t.flush * 0.06)
      g = g * (1 - t.flush * 0.14)
      b = b * (1 - t.flush * 0.12)
      const lw = clamp01(t.lip * 0.85)
      r += (lip[0] - r) * lw
      g += (lip[1] - g) * lw
      b += (lip[2] - b) * lw
      const sw = t.stubble * 0.35
      r += (hair[0] - r) * sw
      g += (hair[1] - g) * sw
      b += (hair[2] - b) * sw
    }
    out[i] = r * ao * grain
    out[i + 1] = g * ao * grain
    out[i + 2] = b * ao * grain
  }
  return out
}
