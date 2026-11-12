import { type BuildContext, type Built, BuiltView, rng, useBuilt, type Vec3 } from '@runek/core'
import { Color } from 'three'

export interface CrateProps {
  position?: Vec3
  rotation?: Vec3
  /** Edge length, in units. */
  size?: number
  /** Plank color; defaults to the world palette's `wood` slot. */
  color?: string
  seed?: number
}

/** The crate as data: a paneled core inside 12 seeded-shade planks, and one cuboid collider. */
function buildCrate(
  { size = 0.8, color, seed = 1 }: CrateProps,
  { unit, palette }: BuildContext,
): Built {
  const s = size * unit
  const b = 0.09 * s
  const c = s / 2 - b / 2
  const mid = s / 2
  const next = rng(seed)
  const base = new Color(color ?? palette.wood)
  const tint = new Color()
  const plank = (pos: Vec3, box: Vec3): Built['parts'][number] => ({
    shape: { box },
    look: {
      slot: 'wood',
      color: tint
        .copy(base)
        .multiplyScalar(0.82 + next() * 0.32)
        .getStyle(),
      roughness: 0.85,
    },
    position: [pos[0], pos[1] + mid, pos[2]],
    castShadow: true,
    receiveShadow: true,
  })
  const parts: Built['parts'] = [
    {
      shape: { box: [s * 0.9, s * 0.9, s * 0.9] },
      look: { slot: 'wood', color: palette.woodDark, roughness: 0.9 },
      position: [0, mid, 0],
      castShadow: true,
      receiveShadow: true,
    },
  ]
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) parts.push(plank([sx * c, 0, sz * c], [b, s, b]))
  for (const sy of [-1, 1])
    for (const sz of [-1, 1]) parts.push(plank([0, sy * c, sz * c], [s, b, b]))
  for (const sy of [-1, 1])
    for (const sx of [-1, 1]) parts.push(plank([sx * c, sy * c, 0], [b, b, s]))
  return { parts, colliders: [{ cuboid: [mid, mid, mid], position: [0, mid, 0] }] }
}

/** A slatted wooden crate: a paneled core inside a 12-edge plank frame, each plank
 *  seeded a slightly different shade. A clean cube with a cuboid collider, so it
 *  stacks. The world-building staple (see also Barrel). */
export function Crate(props: CrateProps) {
  const built = useBuilt(buildCrate, props)
  return <BuiltView built={built} position={props.position} rotation={props.rotation} />
}

Crate.build = buildCrate
Crate.groundSitting = true
