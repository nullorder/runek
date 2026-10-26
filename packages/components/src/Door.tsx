import { RigidBody } from '@react-three/rapier'
import { useMaterials, useWorld, type Vec3 } from '@runek/core'

export interface DoorProps {
  position?: Vec3
  rotation?: Vec3
  /** Accepted for the component contract; this component has no seeded variation yet. */
  seed?: number
  width?: number
  height?: number
  thickness?: number
  /** Hinge angle in radians; 0 is closed. */
  openAngle?: number
  /** Defaults to the world palette's `wood` slot. */
  color?: string
}

export function Door({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  width = 0.9,
  height = 2,
  thickness = 0.05,
  openAngle = 0,
  color,
}: DoorProps) {
  const { unit, palette } = useWorld()
  const m = useMaterials({
    door: { color: color ?? palette.wood },
    knob: { color: palette.accent, metalness: 0.6, roughness: 0.3 },
  })
  const w = width * unit
  const h = height * unit
  const t = thickness * unit

  return (
    <RigidBody type="fixed" colliders="cuboid" position={position} rotation={rotation}>
      <group position={[-w / 2, 0, 0]} rotation={[0, openAngle, 0]}>
        <mesh material={m.door} castShadow receiveShadow position={[w / 2, h / 2, 0]}>
          <boxGeometry args={[w, h, t]} />
        </mesh>
        <mesh material={m.knob} position={[w - 0.08 * unit, h / 2, t]}>
          <sphereGeometry args={[0.03 * unit, 12, 12]} />
        </mesh>
      </group>
    </RigidBody>
  )
}
