import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { useWorld, type Vec3 } from '@runek/core'

export interface WellProps {
  position?: Vec3
  rotation?: Vec3
  radius?: number
  wallHeight?: number
  /** Stone color; defaults to the world palette's `stone` slot. */
  color?: string
  /** Roof + frame color; defaults to the world palette's `wood` slot. */
  roofColor?: string
}

/** A stone well: ring wall, a dark pool, two posts carrying a little pyramid roof,
 *  and a bucket on a rope. A village focal point. */
export function Well({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  radius = 0.7,
  wallHeight = 0.8,
  color,
  roofColor,
}: WellProps) {
  const { unit, palette } = useWorld()
  const stone = color ?? palette.stone
  const wood = roofColor ?? palette.wood
  const R = radius * unit
  const wh = wallHeight * unit
  const postX = R * 0.92
  const postH = wh + 1.0 * unit
  const roofH = 0.5 * unit

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      <CuboidCollider args={[R, wh / 2, R]} position={[0, wh / 2, 0]} />

      <mesh castShadow receiveShadow position={[0, wh / 2, 0]}>
        <cylinderGeometry args={[R, R * 1.05, wh, 20]} />
        <meshStandardMaterial color={stone} roughness={0.95} />
      </mesh>
      <mesh castShadow position={[0, wh, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[R, 0.06 * unit, 8, 20]} />
        <meshStandardMaterial color={stone} roughness={0.9} />
      </mesh>
      <mesh position={[0, wh - 0.08 * unit, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[R * 0.8, 20]} />
        <meshStandardMaterial color="#0c1a22" roughness={1} />
      </mesh>

      {[-1, 1].map((s) => (
        <mesh key={`post-${s}`} castShadow position={[s * postX, postH / 2, 0]}>
          <boxGeometry args={[0.1 * unit, postH, 0.1 * unit]} />
          <meshStandardMaterial color={wood} roughness={0.85} />
        </mesh>
      ))}
      <mesh castShadow position={[0, postH, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.04 * unit, 0.04 * unit, postX * 2, 8]} />
        <meshStandardMaterial color={wood} roughness={0.85} />
      </mesh>

      <mesh castShadow position={[0, postH + roofH / 2, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[R * 1.6, roofH, 4]} />
        <meshStandardMaterial color={wood} roughness={0.8} flatShading />
      </mesh>

      <mesh position={[R * 0.3, postH - 0.4 * unit, 0]}>
        <cylinderGeometry args={[0.008 * unit, 0.008 * unit, 0.75 * unit, 6]} />
        <meshStandardMaterial color="#5a4a32" />
      </mesh>
      <mesh castShadow position={[R * 0.3, postH - 0.85 * unit, 0]}>
        <cylinderGeometry args={[0.1 * unit, 0.08 * unit, 0.16 * unit, 12]} />
        <meshStandardMaterial color={wood} roughness={0.8} />
      </mesh>
    </RigidBody>
  )
}
