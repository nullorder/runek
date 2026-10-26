import { RigidBody } from '@react-three/rapier'
import { useMaterial, useWorld, type Vec3 } from '@runek/core'
import { shoreSurface } from './surfaces/shore'

export interface ShoreProps {
  position?: Vec3
  rotation?: Vec3
  /** Accepted for the component contract; this component has no seeded variation yet. */
  seed?: number
  /** `[width, depth]` in units. The sandy top sits at the component origin. */
  size?: [number, number]
  thickness?: number
  /** Defaults to the world palette's `sand` slot. */
  color?: string
}

export function Shore({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  size = [24, 24],
  thickness = 0.3,
  color,
}: ShoreProps) {
  const { unit, palette } = useWorld()
  const sand = useMaterial({ color: color ?? palette.sand, roughness: 1 })
  const w = size[0] * unit
  const d = size[1] * unit
  const t = thickness * unit

  return (
    <RigidBody type="fixed" colliders="cuboid" position={position} rotation={rotation}>
      <mesh material={sand} receiveShadow position={[0, -t / 2, 0]}>
        <boxGeometry args={[w, t, d]} />
      </mesh>
    </RigidBody>
  )
}

Shore.surface = shoreSurface
