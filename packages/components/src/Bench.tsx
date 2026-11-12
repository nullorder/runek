import { type BuildContext, type Built, BuiltView, useBuilt, type Vec3 } from '@runek/core'

export interface BenchProps {
  position?: Vec3
  rotation?: Vec3
  /** Accepted for the component contract; this component has no seeded variation yet. */
  seed?: number
  length?: number
  depth?: number
  seatHeight?: number
  /** Include a backrest. */
  back?: boolean
  /** Defaults to the world palette's `wood` slot. */
  color?: string
}

const SEAT_SLATS = 3

/** The bench as data: seat slats, legs, an optional backrest, and one cuboid collider. */
function buildBench(
  { length = 1.6, depth = 0.5, seatHeight = 0.45, back = true, color }: BenchProps,
  { unit, palette }: BuildContext,
): Built {
  const look = { slot: 'wood', color: color ?? palette.wood, roughness: 0.85 }
  const L = length * unit
  const D = depth * unit
  const sh = seatHeight * unit
  const slatT = 0.04 * unit
  const legW = 0.07 * unit
  const slatD = (D / SEAT_SLATS) * 0.82
  const backH = 0.5 * unit
  const lx = L / 2 - legW
  const lz = D / 2 - legW
  const parts: Built['parts'] = []
  for (let i = 0; i < SEAT_SLATS; i++) {
    const z = -D / 2 + (i + 0.5) * (D / SEAT_SLATS)
    parts.push({
      shape: { box: [L, slatT, slatD] },
      look,
      position: [0, sh, z],
      castShadow: true,
      receiveShadow: true,
    })
  }
  for (const [x, z] of [
    [-lx, -lz],
    [lx, -lz],
    [-lx, lz],
    [lx, lz],
  ]) {
    parts.push({
      shape: { box: [legW, sh, legW] },
      look,
      position: [x, sh / 2, z],
      castShadow: true,
    })
  }
  if (back) {
    for (const s of [-1, 1]) {
      parts.push({
        shape: { box: [legW, backH, legW] },
        look,
        position: [s * lx, sh + backH / 2, -D / 2 + legW],
        castShadow: true,
      })
    }
    for (const f of [0.55, 0.9]) {
      parts.push({
        shape: { box: [L, slatT, slatD * 0.8] },
        look,
        position: [0, sh + backH * f, -D / 2 + legW],
        castShadow: true,
      })
    }
  }
  return { parts, colliders: [{ cuboid: [L / 2, sh / 2, D / 2], position: [0, sh / 2, 0] }] }
}

/** A slatted bench, with an optional backrest. Indoor or outdoor seating. */
export function Bench(props: BenchProps) {
  const built = useBuilt(buildBench, props)
  return <BuiltView built={built} position={props.position} rotation={props.rotation} />
}

Bench.build = buildBench
Bench.groundSitting = true
