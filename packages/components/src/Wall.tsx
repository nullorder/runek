import { RigidBody } from '@react-three/rapier'
import { useWorld, type Vec3 } from '@runek/core'

/** A rectangular hole cut into a wall, for a door or window. */
export interface WallOpening {
  /** Horizontal center offset from the wall center, in units. */
  offset?: number
  width: number
  height: number
  /** Height of the opening's base above the wall base, in units. */
  sill?: number
}

export interface WallProps {
  position?: Vec3
  rotation?: Vec3
  /** Length along the wall's local X axis, in units. */
  width?: number
  height?: number
  thickness?: number
  /** Defaults to the world palette's `wall` slot. */
  color?: string
  /** Holes cut into the wall (doors, windows). Must not overlap horizontally. */
  openings?: WallOpening[]
}

interface Segment {
  x: number
  y: number
  w: number
  h: number
}

const EPS = 1e-4

function segments(width: number, height: number, openings?: WallOpening[]): Segment[] {
  if (!openings?.length) return [{ x: 0, y: height / 2, w: width, h: height }]

  const sorted = [...openings].sort((a, b) => (a.offset ?? 0) - (b.offset ?? 0))
  const out: Segment[] = []
  // Left edge of the un-emitted remainder; advances past each opening in turn.
  let cursor = -width / 2

  for (const opening of sorted) {
    const { offset = 0, width: ow, height: oh, sill = 0 } = opening
    const left = Math.max(offset - ow / 2, cursor)
    const right = Math.min(offset + ow / 2, width / 2)
    if (right - left <= EPS) continue

    const pierW = left - cursor
    if (pierW > EPS) out.push({ x: cursor + pierW / 2, y: height / 2, w: pierW, h: height })

    const mid = (left + right) / 2
    const clampedW = right - left
    if (sill > EPS) out.push({ x: mid, y: sill / 2, w: clampedW, h: sill })

    const top = sill + oh
    const topH = height - top
    if (topH > EPS) out.push({ x: mid, y: (top + height) / 2, w: clampedW, h: topH })

    cursor = right
  }

  const lastW = width / 2 - cursor
  if (lastW > EPS) out.push({ x: cursor + lastW / 2, y: height / 2, w: lastW, h: height })

  return out
}

export function Wall({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  width = 4,
  height = 3,
  thickness = 0.2,
  color,
  openings,
}: WallProps) {
  const { unit, palette } = useWorld()
  const wallColor = color ?? palette.wall
  const w = width * unit
  const h = height * unit
  const t = thickness * unit
  const scaled = openings?.map((o) => ({
    offset: (o.offset ?? 0) * unit,
    width: o.width * unit,
    height: o.height * unit,
    sill: (o.sill ?? 0) * unit,
  }))

  return (
    <RigidBody type="fixed" colliders="cuboid" position={position} rotation={rotation}>
      {segments(w, h, scaled).map((s) => (
        <mesh
          key={`${s.x.toFixed(3)}:${s.y.toFixed(3)}`}
          castShadow
          receiveShadow
          position={[s.x, s.y, 0]}
        >
          <boxGeometry args={[s.w, s.h, t]} />
          <meshStandardMaterial color={wallColor} />
        </mesh>
      ))}
    </RigidBody>
  )
}
