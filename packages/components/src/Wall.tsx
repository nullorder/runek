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
  color?: string
  opening?: WallOpening
}

interface Segment {
  x: number
  y: number
  w: number
  h: number
}

const EPS = 1e-4

function segments(width: number, height: number, opening?: WallOpening): Segment[] {
  if (!opening) return [{ x: 0, y: height / 2, w: width, h: height }]

  const { offset = 0, width: ow, height: oh, sill = 0 } = opening
  const left = offset - ow / 2
  const right = offset + ow / 2
  const top = sill + oh
  const out: Segment[] = []

  const leftW = left + width / 2
  if (leftW > EPS) out.push({ x: (-width / 2 + left) / 2, y: height / 2, w: leftW, h: height })

  const rightW = width / 2 - right
  if (rightW > EPS) out.push({ x: (right + width / 2) / 2, y: height / 2, w: rightW, h: height })

  if (sill > EPS) out.push({ x: offset, y: sill / 2, w: ow, h: sill })

  const topH = height - top
  if (topH > EPS) out.push({ x: offset, y: (top + height) / 2, w: ow, h: topH })

  return out
}

export function Wall({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  width = 4,
  height = 3,
  thickness = 0.2,
  color = '#cfc7ba',
  opening,
}: WallProps) {
  const { unit } = useWorld()
  const w = width * unit
  const h = height * unit
  const t = thickness * unit
  const scaled: WallOpening | undefined = opening && {
    offset: (opening.offset ?? 0) * unit,
    width: opening.width * unit,
    height: opening.height * unit,
    sill: (opening.sill ?? 0) * unit,
  }

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
          <meshStandardMaterial color={color} />
        </mesh>
      ))}
    </RigidBody>
  )
}
