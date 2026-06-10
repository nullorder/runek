import { RigidBody } from '@react-three/rapier'
import { useWorld, type Vec3 } from '@runek/core'

export interface FloorProps {
  position?: Vec3
  rotation?: Vec3
  /** `[width, depth]` in units. The top surface sits at the component origin. */
  size?: [number, number]
  thickness?: number
  /** Defaults to the world palette's `floor` slot. */
  color?: string
}

export function Floor({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  size = [8, 8],
  thickness = 0.2,
  color,
}: FloorProps) {
  const { unit, palette } = useWorld()
  const floorColor = color ?? palette.floor
  const w = size[0] * unit
  const d = size[1] * unit
  const t = thickness * unit

  return (
    <RigidBody type="fixed" colliders="cuboid" position={position} rotation={rotation}>
      <mesh receiveShadow position={[0, -t / 2, 0]}>
        <boxGeometry args={[w, t, d]} />
        <meshStandardMaterial color={floorColor} />
      </mesh>
    </RigidBody>
  )
}
