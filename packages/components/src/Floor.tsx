import { RigidBody } from '@react-three/rapier'
import { useWorld, type Vec3 } from '@runek/core'

/** A rectangular hole in the slab, e.g. a stairwell. */
export interface FloorOpening {
  /** Hole center offset from the slab center along X, in units. */
  x?: number
  /** Hole center offset from the slab center along Z, in units. */
  z?: number
  width: number
  depth: number
}

export interface FloorProps {
  position?: Vec3
  rotation?: Vec3
  /** `[width, depth]` in units. The top surface sits at the component origin. */
  size?: [number, number]
  thickness?: number
  /** A hole in the slab (stairwell); the slab splits into strips around it. */
  opening?: FloorOpening
  /** Defaults to the world palette's `floor` slot. */
  color?: string
}

interface Slab {
  x: number
  z: number
  w: number
  d: number
}

const EPS = 1e-4

function slabs(w: number, d: number, opening?: FloorOpening): Slab[] {
  if (!opening) return [{ x: 0, z: 0, w, d }]

  const { x = 0, z = 0, width, depth } = opening
  const left = Math.max(x - width / 2, -w / 2)
  const right = Math.min(x + width / 2, w / 2)
  const near = Math.max(z - depth / 2, -d / 2)
  const far = Math.min(z + depth / 2, d / 2)
  if (right - left <= EPS || far - near <= EPS) return [{ x: 0, z: 0, w, d }]

  const out: Slab[] = []
  // Full-depth strips either side of the hole, short strips before/behind it.
  const leftW = left + w / 2
  if (leftW > EPS) out.push({ x: -w / 2 + leftW / 2, z: 0, w: leftW, d })
  const rightW = w / 2 - right
  if (rightW > EPS) out.push({ x: right + rightW / 2, z: 0, w: rightW, d })
  const holeW = right - left
  const nearD = near + d / 2
  if (nearD > EPS) out.push({ x: (left + right) / 2, z: -d / 2 + nearD / 2, w: holeW, d: nearD })
  const farD = d / 2 - far
  if (farD > EPS) out.push({ x: (left + right) / 2, z: far + farD / 2, w: holeW, d: farD })
  return out
}

export function Floor({
  position,
  rotation = [0, 0, 0],
  size = [8, 8],
  thickness = 0.2,
  opening,
  color,
}: FloorProps) {
  const { unit, palette, ground } = useWorld()
  const floorColor = color ?? palette.floor
  const w = size[0] * unit
  const d = size[1] * unit
  const t = thickness * unit
  const scaled = opening && {
    x: (opening.x ?? 0) * unit,
    z: (opening.z ?? 0) * unit,
    width: opening.width * unit,
    depth: opening.depth * unit,
  }
  // Top surface sits at the world ground baseline by default; explicit position wins.
  const pos = position ?? [0, ground, 0]

  return (
    <RigidBody type="fixed" colliders="cuboid" position={pos} rotation={rotation}>
      {slabs(w, d, scaled).map((s) => (
        <mesh
          key={`${s.x.toFixed(3)}:${s.z.toFixed(3)}`}
          receiveShadow
          position={[s.x, -t / 2, s.z]}
        >
          <boxGeometry args={[s.w, t, s.d]} />
          <meshStandardMaterial color={floorColor} />
        </mesh>
      ))}
    </RigidBody>
  )
}
