import type { Color } from 'three'
import {
  type Box,
  DECK,
  DOOR,
  deckSpan,
  innerBreadth,
  LEVEL,
  type ShipLayout,
  type ShipShape,
} from '../surfaces/ship'
import { hash01, type MeshBuilder } from './mesh'

export interface DeckSpec {
  y: number
  z0: number
  z1: number
  hole?: Box
  /** Ends that stand open to the waist, so their edge shows. */
  open?: { aft?: boolean; fore?: boolean }
}

interface Piece {
  z0: number
  z1: number
  /** 0 spans the hull; ±1 is the strip beside a hatch on that side. */
  side: 0 | 1 | -1
  hw: number
}

const PLANK = 0.26
const BUTT = 3.6

/** A deck as convex pieces: the whole width, or, around a hatch, aft, fore and two strips. */
function pieces(d: DeckSpec): Piece[] {
  const h = d.hole
  if (!h) return [{ z0: d.z0, z1: d.z1, side: 0, hw: 0 }]
  return [
    { z0: d.z0, z1: h.z0, side: 0, hw: 0 },
    { z0: h.z1, z1: d.z1, side: 0, hw: 0 },
    { z0: h.z0, z1: h.z1, side: 1, hw: h.w / 2 },
    { z0: h.z0, z1: h.z1, side: -1, hw: h.w / 2 },
  ]
}

const samples = (z0: number, z1: number, step: number) => {
  const n = Math.max(1, Math.ceil((z1 - z0) / step))
  return Array.from({ length: n + 1 }, (_, i) => z0 + ((z1 - z0) * i) / n)
}

function limits(s: ShipShape, y: number, p: Piece, z: number): [number, number] {
  const w = innerBreadth(s, z, y)
  if (p.side === 0) return [-w, w]
  const edge = Math.max(w, p.hw)
  return p.side > 0 ? [p.hw, edge] : [-edge, -p.hw]
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** Planked top (a seeded shade per plank length, butts staggered), plain underside, and the
 *  edges that show round a hatch or an open castle end. */
export function buildDeck(
  b: MeshBuilder,
  s: ShipShape,
  d: DeckSpec,
  top: Color,
  under: Color,
  seed: number,
) {
  const { y } = d
  const yb = y - DECK
  for (const p of pieces(d)) {
    if (p.z1 - p.z0 < 0.01) continue
    const zs = samples(p.z0, p.z1, 0.8)
    const lims = zs.map((z) => limits(s, y, p, z))
    const lo = Math.min(...lims.map((l) => l[0]))
    const hi = Math.max(...lims.map((l) => l[1]))
    for (let k = Math.floor(lo / PLANK); k < Math.ceil(hi / PLANK); k++) {
      const xa = k * PLANK
      const xb = xa + PLANK
      const stagger = hash01(k, 7, seed) * BUTT
      for (let i = 0; i < zs.length - 1; i++) {
        const [la, ha] = lims[i]
        const [lb, hb] = lims[i + 1]
        const a0 = clamp(xa, la, ha)
        const a1 = clamp(xb, la, ha)
        const b0 = clamp(xa, lb, hb)
        const b1 = clamp(xb, lb, hb)
        if (a1 - a0 < 1e-4 && b1 - b0 < 1e-4) continue
        const seg = Math.floor(((zs[i] + zs[i + 1]) / 2 + stagger) / BUTT)
        const shade = top.clone().multiplyScalar(0.86 + 0.22 * hash01(k, seg, seed))
        b.quad(
          [a0, y, zs[i]],
          [a1, y, zs[i]],
          [b1, y, zs[i + 1]],
          [b0, y, zs[i + 1]],
          [0, 1, 0],
          shade,
        )
      }
    }
    for (let i = 0; i < zs.length - 1; i++) {
      const [la, ha] = lims[i]
      const [lb, hb] = lims[i + 1]
      b.quad(
        [la, yb, zs[i]],
        [ha, yb, zs[i]],
        [hb, yb, zs[i + 1]],
        [lb, yb, zs[i + 1]],
        [0, -1, 0],
        under,
      )
    }
  }
  const edge = (x0: number, z0: number, x1: number, z1: number, hint: [number, number, number]) =>
    b.quad([x0, yb, z0], [x1, yb, z1], [x1, y, z1], [x0, y, z0], hint, under)
  const h = d.hole
  if (h) {
    const w = h.w / 2
    edge(-w, h.z0, w, h.z0, [0, 0, 1])
    edge(-w, h.z1, w, h.z1, [0, 0, -1])
    edge(w, h.z0, w, h.z1, [-1, 0, 0])
    edge(-w, h.z0, -w, h.z1, [1, 0, 0])
  }
  const w0 = innerBreadth(s, d.z0, y)
  const w1 = innerBreadth(s, d.z1, y)
  if (d.open?.aft) edge(-w0, d.z0, w0, d.z0, [0, 0, -1])
  if (d.open?.fore) edge(-w1, d.z1, w1, d.z1, [0, 0, 1])
}

/** Each deck piece's corner points, for a convex-hull collider. */
export function deckHulls(s: ShipShape, d: DeckSpec): Float32Array[] {
  const out: Float32Array[] = []
  for (const p of pieces(d)) {
    if (p.z1 - p.z0 < 0.05) continue
    const pts: number[] = []
    for (const z of samples(p.z0, p.z1, 1.5)) {
      const [l, h] = limits(s, d.y, p, z)
      if (h - l < 0.05) continue
      pts.push(l, d.y, z, h, d.y, z, l, d.y - DECK, z, h, d.y - DECK, z)
    }
    if (pts.length >= 24) out.push(new Float32Array(pts))
  }
  return out
}

/** Beams under a deck, across the hull, clear of the hatch the stair climbs through. */
export function deckBeams(s: ShipShape, d: DeckSpec, spacing = 1.25) {
  const out: { z: number; w: number }[] = []
  const y = d.y - DECK - 0.11
  for (let z = d.z0 + 0.6; z < d.z1 - 0.3; z += spacing) {
    if (d.hole && z > d.hole.z0 - 0.2 && z < d.hole.z1 + 0.2) continue
    const w = 2 * innerBreadth(s, z, y)
    if (w > 0.6) out.push({ z, w })
  }
  return { y, beams: out }
}

/** The ship's five floors: hold, gun deck, main deck (under the castles too), quarterdeck and
 *  forecastle. */
export function shipDecks(lay: ShipLayout): DeckSpec[] {
  const s = lay.shape
  const span = (y: number) => deckSpan(s, y)
  const { hold, gun, main, quarter, fore } = LEVEL
  return [
    { y: hold, z0: span(hold)[0], z1: span(hold)[1] },
    { y: gun, z0: span(gun)[0], z1: span(gun)[1], hole: lay.hatchB },
    { y: main, z0: span(main)[0], z1: span(main)[1], hole: lay.hatchA },
    { y: quarter, z0: span(quarter)[0], z1: lay.zQ, open: { fore: true } },
    { y: fore, z0: lay.zF, z1: span(fore)[1], open: { aft: true } },
  ]
}

export interface Bulkhead {
  z: number
  y0: number
  y1: number
  /** Inner hull half-width at the bulkhead's foot and head. */
  w0: number
  w1: number
}

/** The two castle breaks: a wall from the main deck up to the castle deck, a door in its
 *  middle. */
export function bulkheads(lay: ShipLayout): Bulkhead[] {
  const s = lay.shape
  const { main } = LEVEL
  return [
    { z: lay.zQ, y1: LEVEL.quarter - DECK },
    { z: lay.zF, y1: LEVEL.fore - DECK },
  ].map(({ z, y1 }) => ({
    z,
    y0: main,
    y1,
    w0: innerBreadth(s, z, main),
    w1: innerBreadth(s, z, y1),
  }))
}

const BOARD = 0.3
const WALL = 0.05

/** Vertical boards both faces of a bulkhead, with the doorway left open and its jambs faced. */
export function buildBulkhead(b: MeshBuilder, h: Bulkhead, color: Color, seed: number) {
  const door = DOOR.width / 2
  const wMax = Math.max(h.w0, h.w1)
  for (let k = Math.floor(-wMax / BOARD); k < Math.ceil(wMax / BOARD); k++) {
    let x0 = k * BOARD
    let x1 = x0 + BOARD
    if (x1 > -door && x0 < door) {
      if (x0 < -door) x1 = -door
      else if (x1 > door) x0 = door
      else continue
    }
    const shade = color.clone().multiplyScalar(0.88 + 0.2 * hash01(k, 31, seed))
    const lo = (x: number) => clamp(x, -h.w0, h.w0)
    const hi = (x: number) => clamp(x, -h.w1, h.w1)
    if (lo(x1) - lo(x0) < 1e-4 && hi(x1) - hi(x0) < 1e-4) continue
    for (const f of [-1, 1]) {
      const z = h.z + f * WALL
      b.quad(
        [lo(x0), h.y0, z],
        [lo(x1), h.y0, z],
        [hi(x1), h.y1, z],
        [hi(x0), h.y1, z],
        [0, 0, f],
        shade,
      )
    }
  }
  for (const x of [-door, door]) {
    b.quad(
      [x, h.y0, h.z - WALL],
      [x, h.y0, h.z + WALL],
      [x, h.y1, h.z + WALL],
      [x, h.y1, h.z - WALL],
      [-Math.sign(x), 0, 0],
      color,
    )
  }
}
