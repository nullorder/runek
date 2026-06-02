import { RigidBody } from '@react-three/rapier'
import { useWorld, type Vec3 } from '@runek/core'

export interface TerrainProps {
  position?: Vec3
  /** Ground extent `[width, depth]`, in units. */
  size?: [number, number]
  thickness?: number
  color?: string
}

export function Terrain({
  position = [0, 0, 0],
  size = [40, 40],
  thickness = 0.4,
  color = '#3a4a3f',
}: TerrainProps) {
  const { unit } = useWorld()
  const width = size[0] * unit
  const depth = size[1] * unit
  const t = thickness * unit

  return (
    <RigidBody type="fixed" colliders="cuboid" position={position}>
      <mesh receiveShadow position={[0, -t / 2, 0]}>
        <boxGeometry args={[width, t, depth]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </RigidBody>
  )
}
