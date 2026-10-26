import { RigidBody } from '@react-three/rapier'
import { useMaterial, useWorld, type Vec3 } from '@runek/core'
import { useMemo } from 'react'

export type StaircaseForm = 'solid' | 'floating'

export interface StaircaseProps {
  position?: Vec3
  rotation?: Vec3
  /** Accepted for the component contract; this component has no seeded variation yet. */
  seed?: number
  steps?: number
  /** Total rise, in units. Ascends along +y and +z from the origin. */
  totalHeight?: number
  width?: number
  /** Total run (depth), in units. */
  depth?: number
  /**
   * `solid` fills each step down to the origin, a built-in stair that sits on a floor.
   * `floating` lays thin treads on two sloped stringers, open underneath, for a flight that
   * spans a void (an atrium, a loft, a mezzanine).
   */
  form?: StaircaseForm
  /** Defaults to the world palette's `stone` slot. */
  color?: string
}

interface Part {
  key: string
  position: Vec3
  rotation?: Vec3
  size: Vec3
}

/** Per-step boxes, each from the origin up to its tread. */
function solidParts(steps: number, w: number, rise: number, run: number): Part[] {
  return Array.from({ length: steps }, (_, i) => {
    const h = rise * (i + 1)
    return { key: `step-${i}`, position: [0, h / 2, run * (i + 0.5)], size: [w, h, run] }
  })
}

/** Thin treads resting on two stringers that follow the pitch line. */
function floatingParts(steps: number, w: number, rise: number, run: number, unit: number): Part[] {
  const tread = Math.min(0.07 * unit, rise * 0.6)
  const stringerW = 0.08 * unit
  const stringerD = 0.28 * unit
  const treads: Part[] = Array.from({ length: steps }, (_, i) => ({
    key: `tread-${i}`,
    position: [0, rise * (i + 1) - tread / 2, run * (i + 0.5)],
    // A hair of overlap so neighbouring treads read as one flight from below.
    size: [w, tread, run * 1.02],
  }))
  // The stringers' top edge runs under the treads' centers, from the first tread to the last,
  // so neither end pokes above a landing.
  const pitch = Math.atan2(rise, run)
  const length = Math.hypot(rise * (steps - 1), run * (steps - 1))
  const drop = stringerD / 2 / Math.cos(pitch)
  const midY = (rise * steps) / 2 + rise / 2 - tread - drop
  const midZ = (run * steps) / 2
  const stringers: Part[] = [-1, 1].map((side) => ({
    key: `stringer-${side}`,
    position: [side * (w / 2 - stringerW / 2), midY, midZ],
    rotation: [-pitch, 0, 0],
    size: [stringerW, stringerD, length],
  }))
  return [...treads, ...stringers]
}

export function Staircase({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  steps = 6,
  totalHeight = 1.5,
  width = 1.2,
  depth = 2.4,
  form = 'solid',
  color,
}: StaircaseProps) {
  const { unit, palette } = useWorld()
  const stone = useMaterial({ color: color ?? palette.stone })

  const parts = useMemo(() => {
    const w = width * unit
    const rise = (totalHeight * unit) / steps
    const run = (depth * unit) / steps
    return form === 'floating'
      ? floatingParts(steps, w, rise, run, unit)
      : solidParts(steps, w, rise, run)
  }, [steps, totalHeight, width, depth, form, unit])

  return (
    <RigidBody type="fixed" colliders="cuboid" position={position} rotation={rotation}>
      {parts.map((part) => (
        <mesh
          key={part.key}
          material={stone}
          castShadow
          receiveShadow
          position={part.position}
          rotation={part.rotation}
        >
          <boxGeometry args={part.size} />
        </mesh>
      ))}
    </RigidBody>
  )
}
