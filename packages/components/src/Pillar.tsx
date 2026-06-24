import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { useWorld, type Vec3 } from '@runek/core'

export interface PillarProps {
  position?: Vec3
  rotation?: Vec3
  height?: number
  /** Shaft radius at the base, in units. */
  radius?: number
  /** Vertical flutes around the shaft; 0 = smooth. */
  flutes?: number
  /** Defaults to the world palette's `stone` slot. */
  color?: string
}

/** A column: square plinth, tapered shaft, square capital. `flutes` facets the
 *  shaft (a fluted look) when set; 0 leaves it smooth. Builds porches, colonnades,
 *  and ruins. */
export function Pillar({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  height = 3,
  radius = 0.28,
  flutes = 0,
  color,
}: PillarProps) {
  const { unit, palette } = useWorld()
  const stone = color ?? palette.stone
  const r = radius * unit
  const h = height * unit
  const plinthH = 0.08 * h
  const capH = 0.1 * h
  const shaftH = h - plinthH - capH
  const seg = flutes > 0 ? flutes : 24

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      <CuboidCollider args={[r, h / 2, r]} position={[0, h / 2, 0]} />

      <mesh castShadow receiveShadow position={[0, plinthH / 2, 0]}>
        <boxGeometry args={[r * 2.4, plinthH, r * 2.4]} />
        <meshStandardMaterial color={stone} roughness={0.92} />
      </mesh>

      <mesh castShadow receiveShadow position={[0, plinthH + shaftH / 2, 0]}>
        <cylinderGeometry args={[r * 0.85, r, shaftH, seg]} />
        <meshStandardMaterial color={stone} roughness={0.92} flatShading={flutes > 0} />
      </mesh>

      <mesh castShadow receiveShadow position={[0, h - capH, 0]}>
        <cylinderGeometry args={[r * 1.05, r * 0.85, capH * 0.5, 24]} />
        <meshStandardMaterial color={stone} roughness={0.92} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, h - capH * 0.25, 0]}>
        <boxGeometry args={[r * 2.3, capH * 0.5, r * 2.3]} />
        <meshStandardMaterial color={stone} roughness={0.92} />
      </mesh>
    </RigidBody>
  )
}
