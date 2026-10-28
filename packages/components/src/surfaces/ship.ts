import type { SurfaceDef } from '@runek/core'

// The ship's shape and layout, in metres with the origin on the waterline at midships and the
// bow at +z. Pure, so the mesh, the colliders and `runek check-world` all read one hull.

/** Floor heights of each level above the waterline. */
export const LEVEL = { keel: -3.6, hold: 0.4, gun: 2.6, main: 4.8, fore: 7, quarter: 7 }
export const DECK = 0.15
export const SKIN = 0.2
export const BULWARK = 1.05
/** Each hatch's opening; its stair runs the length of it, 0.2 short at the foot. */
export const HATCH = { width: 1.5, length: 5 }
export const STAIR = { width: 1.2, run: 4.8 }
export const CASTLE_STAIR = { width: 1.1, quarterRun: 4.4, foreRun: 4.4 }
export const DOOR = { width: 1.2, height: 2 }
export const GANGWAY = { width: 1.2, gap: 1.6, slope: 0.38 }

export const TOP = LEVEL.quarter + BULWARK
const STEM = 0.15

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const smooth = (v: number) => {
  const t = clamp01(v)
  return t * t * (3 - 2 * t)
}

export interface ShipShape {
  length: number
  beam: number
}

export function shipShape(length = 36, beam = 10): ShipShape {
  return {
    length: Math.min(60, Math.max(30, length)),
    beam: Math.min(16, Math.max(8, beam)),
  }
}

const heightFrac = (y: number) => clamp01((y - LEVEL.keel) / (TOP - LEVEL.keel))

/** Where the stem is at height y: raked forward toward the rail. */
export const bowZ = (s: ShipShape, y: number) => (s.length / 2) * (0.8 + 0.2 * heightFrac(y) ** 0.8)

/** Where the stern is at height y: the transom overhangs above the waterline. */
export const sternZ = (s: ShipShape, y: number) =>
  -(s.length / 2) * (0.86 + 0.14 * smooth(heightFrac(y)))

/** Half the outer hull's breadth at (z, y): full midships, a fine entry at the bow, a wide
 *  transom aft above the waterline narrowing to the sternpost below it, a little tumblehome. */
export function halfBreadth(s: ShipShape, z: number, y: number): number {
  const zb = bowZ(s, y)
  const zs = sternZ(s, y)
  if (z > zb || z < zs) return 0
  let plan: number
  let fine: number
  if (z >= 0) {
    const u = z / zb
    plan = 1 - u ** 2.3
    fine = u ** 1.5
  } else {
    const a = z / zs
    const transom = 0.62 * smooth((y + 1.2) / 4.2)
    plan = transom + (1 - transom) * (1 - a ** 2.6) ** 0.6
    fine = a * a * 0.6
  }
  let section: number
  if (y < 0) {
    const q = clamp01((y - LEVEL.keel) / -LEVEL.keel)
    const full = 1 - (1 - q) ** 2.6
    section = full + (q ** 0.9 - full) * fine
  } else {
    section = 1 - 0.1 * clamp01(y / TOP) ** 1.6
  }
  return Math.max((s.beam / 2) * plan * section, STEM)
}

export const innerBreadth = (s: ShipShape, z: number, y: number) =>
  Math.max(0, halfBreadth(s, z, y) - SKIN)

/** The z span a deck at height y covers: from inside the transom to where the bow gets too
 *  narrow to stand in. */
export function deckSpan(s: ShipShape, y: number): [number, number] {
  const aft = sternZ(s, y) + SKIN
  let lo = 0
  let hi = bowZ(s, y)
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2
    if (innerBreadth(s, mid, y) > 0.05) lo = mid
    else hi = mid
  }
  return [aft, lo]
}

const ease = (v: number) => smooth(v)

/** Top of the bulwark at z: a castle's rail over the quarterdeck and forecastle, the waist's
 *  rail between, eased up over 1.5 m outside each castle. */
export function railY(s: ShipShape, z: number): number {
  const { zQ, zF } = breaks(s)
  const q = (LEVEL.quarter - LEVEL.main) * ease((zQ + 1.5 - z) / 1.5)
  const f = (LEVEL.fore - LEVEL.main) * ease((z - (zF - 1.5)) / 1.5)
  return LEVEL.main + BULWARK + q + f
}

/** The quarterdeck (aft of zQ) and forecastle (fore of zF) breaks. */
export function breaks(s: ShipShape) {
  const h = s.length / 2
  return { zQ: -h + 0.3 * s.length, zF: h - 0.2 * s.length }
}

export interface Box {
  z0: number
  z1: number
  x: number
  w: number
}

export interface ShipLayout {
  shape: ShipShape
  zQ: number
  zF: number
  masts: { fore: number; main: number; mizzen: number }
  /** Main deck to gun deck: the stair rises aft, its head at `z0`. */
  hatchA: Box
  /** Gun deck to hold: the stair rises forward, its head at `z1`. */
  hatchB: Box
  /** Waist to quarterdeck, port and starboard: rising aft, head at zQ. */
  quarterStairs: Box[]
  /** Waist to forecastle: rising forward, head at zF. */
  foreStairs: Box[]
  gangway: { z: number; side: 1 | -1 }
}

/** Every place the ship's levels, masts, hatches and stairs go, from length and beam. */
export function shipLayout(s: ShipShape, gangwaySide: 1 | -1 = -1): ShipLayout {
  const h = s.length / 2
  const { zQ, zF } = breaks(s)
  const masts = { fore: 0.52 * h, main: -0.05 * h, mizzen: -0.62 * h }
  const a0 = masts.main + 2.1
  const hatchA = { z0: a0, z1: a0 + HATCH.length, x: 0, w: HATCH.width }
  const b1 = masts.main - 1.5
  const hatchB = { z0: b1 - HATCH.length, z1: b1, x: 0, w: HATCH.width }
  const w = CASTLE_STAIR.width
  const qz1 = zQ + CASTLE_STAIR.quarterRun
  const qx = Math.min(innerBreadth(s, zQ, LEVEL.quarter), innerBreadth(s, qz1, LEVEL.main)) - 0.7
  const fz0 = zF - CASTLE_STAIR.foreRun
  const fx = Math.min(innerBreadth(s, zF, LEVEL.fore), innerBreadth(s, zF, LEVEL.main)) - 0.7
  return {
    shape: s,
    zQ,
    zF,
    masts,
    hatchA,
    hatchB,
    quarterStairs: [-1, 1].map((side) => ({ z0: zQ, z1: qz1, x: side * qx, w })),
    foreStairs: [-1, 1].map((side) => ({ z0: fz0, z1: zF, x: side * fx, w })),
    gangway: { z: (qz1 + fz0) / 2, side: gangwaySide },
  }
}

/** The gangplank's horizontal reach for a given drop to the shore end. */
export const gangwayReach = (drop: number) => Math.max(2, drop / GANGWAY.slope)

/** Tread top of a `Staircase` flight (floating form) at distance `d` from its foot. */
function treadAt(d: number, run: number, rise: number, steps: number): number | null {
  if (d < 0 || d > run) return null
  const i = Math.min(steps - 1, Math.floor((d / run) * steps))
  return (rise / steps) * (i + 1)
}

export const STEPS = { main: 12, quarter: 12, fore: 12 }

const inBox = (b: Box, x: number, z: number) =>
  z >= b.z0 && z <= b.z1 && Math.abs(x - b.x) <= b.w / 2

interface ShipSurfaceProps {
  length?: number
  beam?: number
  gangway?: 'port' | 'starboard' | 'none'
  gangwayDrop?: number
  collider?: boolean
}

/** The ship's weather decks: the waist, the quarterdeck and forecastle, their stairs, and the
 *  gangplank, the highest walkable top at a point. Below-deck floors are covered. */
export const shipSurface: SurfaceDef = {
  kind: 'deck',
  build(props, { unit }) {
    const p = props as ShipSurfaceProps
    if (p.collider === false) return () => null
    const s = shipShape(p.length, p.beam)
    const side = p.gangway === 'port' ? 1 : -1
    const lay = shipLayout(s, side)
    const drop = p.gangwayDrop ?? 3.8
    const reach = gangwayReach(drop)
    const [, bowMain] = deckSpan(s, LEVEL.main)
    const [aftQ] = deckSpan(s, LEVEL.quarter)
    const [, bowF] = deckSpan(s, LEVEL.fore)
    return (ux, uz) => {
      const x = ux / unit
      const z = uz / unit
      const at = (y: number) => y * unit
      if (p.gangway !== 'none') {
        const out = side * x - halfBreadth(s, lay.gangway.z, LEVEL.main)
        if (Math.abs(z - lay.gangway.z) <= GANGWAY.width / 2 && out >= 0 && out <= reach)
          return at(LEVEL.main - (out / reach) * drop)
      }
      for (const b of lay.quarterStairs) {
        if (!inBox(b, x, z)) continue
        const t = treadAt(
          b.z1 - z,
          CASTLE_STAIR.quarterRun,
          LEVEL.quarter - LEVEL.main,
          STEPS.quarter,
        )
        if (t !== null) return at(LEVEL.main + t)
      }
      for (const b of lay.foreStairs) {
        if (!inBox(b, x, z)) continue
        const t = treadAt(z - b.z0, CASTLE_STAIR.foreRun, LEVEL.fore - LEVEL.main, STEPS.fore)
        if (t !== null) return at(LEVEL.main + t)
      }
      if (z <= lay.zQ) {
        if (z < aftQ || Math.abs(x) > innerBreadth(s, z, LEVEL.quarter)) return null
        return at(LEVEL.quarter)
      }
      if (z >= lay.zF) {
        if (z > bowF || Math.abs(x) > innerBreadth(s, z, LEVEL.fore)) return null
        return at(LEVEL.fore)
      }
      if (z > bowMain || Math.abs(x) > innerBreadth(s, z, LEVEL.main)) return null
      if (inBox(lay.hatchA, x, z)) {
        const t = treadAt(
          lay.hatchA.z0 + STAIR.run - z,
          STAIR.run,
          LEVEL.main - LEVEL.gun,
          STEPS.main,
        )
        return at(LEVEL.gun + (t ?? 0))
      }
      return at(LEVEL.main)
    }
  },
}
