import { RigidBody } from '@react-three/rapier'
import { useWorld, type Vec3 } from '@runek/core'

export type RoofStyle = 'flat' | 'gable'

export interface RoofProps {
  position?: Vec3
  rotation?: Vec3
  /** `[width, depth]` in units. The roof rests with its base at the component origin. */
  size?: [number, number]
  style?: RoofStyle
  /** Ridge height for a gable roof, in units. */
  peak?: number
  thickness?: number
  overhang?: number
  color?: string
}

export function Roof({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  size = [8, 8],
  style = 'gable',
  peak = 1.6,
  thickness = 0.18,
  overhang = 0.3,
  color = '#8a5a44',
}: RoofProps) {
  const { unit } = useWorld()
  const w = size[0] * unit + overhang * 2 * unit
  const d = size[1] * unit + overhang * 2 * unit
  const t = thickness * unit

  if (style === 'flat') {
    return (
      <RigidBody type="fixed" colliders="cuboid" position={position} rotation={rotation}>
        <mesh castShadow receiveShadow position={[0, t / 2, 0]}>
          <boxGeometry args={[w, t, d]} />
          <meshStandardMaterial color={color} />
        </mesh>
      </RigidBody>
    )
  }

  const ridge = peak * unit
  const slope = Math.hypot(d / 2, ridge)
  const angle = Math.atan2(ridge, d / 2)

  return (
    <RigidBody type="fixed" colliders="cuboid" position={position} rotation={rotation}>
      <mesh castShadow receiveShadow position={[0, ridge / 2, d / 4]} rotation={[angle, 0, 0]}>
        <boxGeometry args={[w, t, slope]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, ridge / 2, -d / 4]} rotation={[-angle, 0, 0]}>
        <boxGeometry args={[w, t, slope]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </RigidBody>
  )
}
