import type { Color } from 'three'
import {
  bowZ,
  DECK,
  GANGWAY,
  halfBreadth,
  innerBreadth,
  LEVEL,
  railY,
  type ShipLayout,
  type ShipShape,
  SKIN,
  sternZ,
  TOP,
} from '../surfaces/ship'
import { hash01, MeshBuilder, type V3 } from './mesh'

export interface HullColors {
  hull: Color
  band: Color
  bottom: Color
  trim: Color
  inner: Color
}

type Height = number | ((z: number) => number)

interface Band {
  y0: Height
  y1: Height
  rows: number
  color?: Color
  /** Above the main deck, where the gangway opening is cut. */
  upper?: boolean
}

interface Skin {
  breadth: (z: number, y: number) => number
  ends: (y: number) => [number, number]
  /** Which way the face looks on the port (+x) side. */
  outward: 1 | -1
}

const at = (h: Height, z: number) => (typeof h === 'number' ? h : h(z))

/** Stations along the hull, cosine-spaced so the ends get detail, plus exact marks. */
export function stations(s: ShipShape, n: number, marks: number[]): number[] {
  const z0 = sternZ(s, TOP)
  const z1 = bowZ(s, TOP)
  const out: number[] = []
  for (let i = 0; i < n; i++)
    out.push(z0 + ((1 - Math.cos((Math.PI * i) / (n - 1))) / 2) * (z1 - z0))
  for (const m of marks) if (m > z0 && m < z1) out.push(m)
  out.sort((a, b) => a - b)
  return out.filter((z, i) => i === 0 || z - out[i - 1] > 0.05)
}

export interface Gap {
  side: 1 | -1
  z0: number
  z1: number
}

export function gangwayGap(lay: ShipLayout, open: boolean): Gap | null {
  if (!open) return null
  const half = GANGWAY.gap / 2
  return { side: lay.gangway.side, z0: lay.gangway.z - half, z1: lay.gangway.z + half }
}

function inGap(gap: Gap | null, side: number, za: number, zb: number) {
  return !!gap && side === gap.side && (za + zb) / 2 > gap.z0 && (za + zb) / 2 < gap.z1
}

function skin(
  b: MeshBuilder,
  zs: number[],
  sk: Skin,
  bands: Band[],
  gap: Gap | null,
  seed: number,
  shade = true,
) {
  const point = (side: number, z: number, y: number): [V3, number] => {
    const [lo, hi] = sk.ends(y)
    const zc = Math.min(hi, Math.max(lo, z))
    return [[side * sk.breadth(zc, y), y, zc], zc]
  }
  bands.forEach((band, bi) => {
    for (let r = 0; r < band.rows; r++) {
      for (const side of [1, -1]) {
        const tint = shade ? 0.93 + 0.12 * hash01(bi * 16 + r, side, seed) : 1
        const color = band.color?.clone().multiplyScalar(tint)
        for (let i = 0; i < zs.length - 1; i++) {
          const za = zs[i]
          const zb = zs[i + 1]
          if (band.upper && inGap(gap, side, za, zb)) continue
          const y = (z: number, k: number) => {
            const y0 = at(band.y0, z)
            return y0 + ((at(band.y1, z) - y0) * k) / band.rows
          }
          const [A, cA] = point(side, za, y(za, r))
          const [B, cB] = point(side, zb, y(zb, r))
          const [C, cC] = point(side, zb, y(zb, r + 1))
          const [D, cD] = point(side, za, y(za, r + 1))
          if (cA === cB && cC === cD) continue
          b.quad(A, B, C, D, [side * sk.outward, 0, 0], color)
        }
      }
    }
  })
}

/** A flat face across the stern (or the stem), port to starboard, through the band rows. */
function across(
  b: MeshBuilder,
  bands: Band[],
  zAt: (y: number) => number,
  breadth: (z: number, y: number) => number,
  hint: V3,
  zRef: number,
) {
  for (const band of bands) {
    const y0 = at(band.y0, zRef)
    const y1 = at(band.y1, zRef)
    for (let r = 0; r < band.rows; r++) {
      const ya = y0 + ((y1 - y0) * r) / band.rows
      const yb = y0 + ((y1 - y0) * (r + 1)) / band.rows
      const za = zAt(ya)
      const zb = zAt(yb)
      const xa = breadth(za, ya)
      const xb = breadth(zb, yb)
      b.quad([-xa, ya, za], [xa, ya, za], [xb, yb, zb], [-xb, yb, zb], hint, band.color)
    }
  }
}

export interface HullGeometry {
  outer: MeshBuilder
  inner: MeshBuilder
  trim: MeshBuilder
}

/** The hull's painted outer skin, its planked inner skin, and the rail cap that joins them. */
export function buildHull(
  lay: ShipLayout,
  colors: HullColors,
  gap: Gap | null,
  seed: number,
): HullGeometry {
  const s = lay.shape
  const rail = (z: number) => railY(s, z)
  const cap = (z: number) => rail(z) - 0.12
  const zs = stations(s, 72, [
    ...(gap ? [gap.z0, gap.z1] : []),
    lay.zQ,
    lay.zQ + 1.5,
    lay.zF - 1.5,
    lay.zF,
  ])
  const { keel, gun, main, hold } = LEVEL
  const outerBands: Band[] = [
    { y0: keel, y1: 0.3, rows: 4, color: colors.bottom },
    { y0: 0.3, y1: gun + 0.3, rows: 3, color: colors.hull },
    { y0: gun + 0.3, y1: gun + 1.25, rows: 1, color: colors.band },
    { y0: gun + 1.25, y1: main, rows: 2, color: colors.hull },
    { y0: main, y1: cap, rows: 3, color: colors.hull, upper: true },
    { y0: cap, y1: rail, rows: 1, color: colors.trim, upper: true },
  ]
  const innerBands: Band[] = [
    { y0: hold - DECK, y1: gun, rows: 2, color: colors.inner },
    { y0: gun, y1: main, rows: 2, color: colors.inner },
    { y0: main, y1: rail, rows: 3, color: colors.inner, upper: true },
  ]
  const outerSkin: Skin = {
    breadth: (z, y) => halfBreadth(s, z, y),
    ends: (y) => [sternZ(s, y), bowZ(s, y)],
    outward: 1,
  }
  const innerSkin: Skin = {
    breadth: (z, y) => innerBreadth(s, z, y),
    ends: (y) => [sternZ(s, y) + SKIN, bowZ(s, y)],
    outward: -1,
  }

  const outer = new MeshBuilder()
  skin(outer, zs, outerSkin, outerBands, gap, seed)
  const zStern = sternZ(s, TOP)
  const zBow = bowZ(s, TOP)
  const hb = (z: number, y: number) => halfBreadth(s, z, y)
  across(outer, outerBands, (y) => sternZ(s, y), hb, [0, 0, -1], zStern)
  across(outer, outerBands, (y) => bowZ(s, y), hb, [0, 0, 1], zBow)
  for (let i = 0; i < zs.length - 1; i++) {
    const [lo, hi] = outerSkin.ends(keel)
    const za = Math.min(hi, Math.max(lo, zs[i]))
    const zb = Math.min(hi, Math.max(lo, zs[i + 1]))
    if (za === zb) continue
    const xa = hb(za, keel)
    const xb = hb(zb, keel)
    outer.quad(
      [-xa, keel, za],
      [xa, keel, za],
      [xb, keel, zb],
      [-xb, keel, zb],
      [0, -1, 0],
      colors.bottom,
    )
  }

  const inner = new MeshBuilder()
  skin(inner, zs, innerSkin, innerBands, gap, seed + 1)
  const ib = (z: number, y: number) => innerBreadth(s, z, y)
  across(inner, innerBands, (y) => sternZ(s, y) + SKIN, ib, [0, 0, 1], zStern)

  const trim = new MeshBuilder()
  for (const side of [1, -1]) {
    for (let i = 0; i < zs.length - 1; i++) {
      const za = zs[i]
      const zb = zs[i + 1]
      const open = inGap(gap, side, za, zb)
      const ya = open ? main : rail(za)
      const yb = open ? main : rail(zb)
      const [lo, hi] = outerSkin.ends(ya)
      if (zb <= lo || za >= hi) continue
      const ca = Math.max(lo, za)
      const cb = Math.min(hi, zb)
      trim.quad(
        [side * hb(ca, ya), ya, ca],
        [side * hb(cb, yb), yb, cb],
        [side * ib(cb, yb), yb, cb],
        [side * ib(ca, ya), ya, ca],
        [0, 1, 0],
        colors.trim,
      )
    }
  }
  if (gap) {
    for (const z of [gap.z0, gap.z1]) {
      const y = rail(z)
      const o = gap.side * hb(z, main)
      const n = gap.side * ib(z, main)
      trim.quad(
        [o, main, z],
        [n, main, z],
        [n, y, z],
        [o, y, z],
        [0, 0, z === gap.z0 ? 1 : -1],
        colors.trim,
      )
    }
  }
  const yr = rail(zStern)
  const zo = sternZ(s, yr)
  const zi = zo + SKIN
  const xo = hb(zo, yr)
  const xi = ib(zi, yr)
  trim.quad([-xo, yr, zo], [xo, yr, zo], [xi, yr, zi], [-xi, yr, zi], [0, 1, 0], colors.trim)

  return { outer, inner, trim }
}

/** The walls the avatar walks along: the skin's mid-surface from the hold floor to the rail,
 *  and the transom, as one trimesh. */
export function hullCollider(lay: ShipLayout, gap: Gap | null): [Float32Array, Uint32Array] {
  const s = lay.shape
  const rail = (z: number) => railY(s, z)
  const zs = stations(s, 40, [...(gap ? [gap.z0, gap.z1] : []), lay.zQ, lay.zF])
  const mid: Skin = {
    breadth: (z, y) => halfBreadth(s, z, y) - SKIN / 2,
    ends: (y) => [sternZ(s, y) + SKIN / 2, bowZ(s, y)],
    outward: 1,
  }
  const { hold, gun, main } = LEVEL
  const bands: Band[] = [
    { y0: hold - DECK, y1: gun, rows: 1 },
    { y0: gun, y1: main, rows: 1 },
    { y0: main, y1: rail, rows: 1, upper: true },
  ]
  const b = new MeshBuilder()
  skin(b, zs, mid, bands, gap, 0, false)
  across(b, bands, (y) => sternZ(s, y) + SKIN / 2, mid.breadth, [0, 0, 1], sternZ(s, TOP))
  return b.trimesh()
}

/** Where a fitting sits flush on the outer skin at (z, y): its position and the turn (Euler
 *  order `YZX`) that points its local +x out of the hull and +y up the topsides. */
export function onHull(s: ShipShape, side: 1 | -1, z: number, y: number, proud = 0) {
  const d = 0.05
  const dz = (halfBreadth(s, z + d, y) - halfBreadth(s, z - d, y)) / (2 * d)
  const dy = (halfBreadth(s, z, y + d) - halfBreadth(s, z, y - d)) / (2 * d)
  const position: V3 = [side * (halfBreadth(s, z, y) + proud), y, z]
  const yaw = side > 0 ? Math.atan(dz) : Math.PI - Math.atan(dz)
  const rotation: V3 = [0, yaw, -Math.atan(dy)]
  return { position, rotation }
}
