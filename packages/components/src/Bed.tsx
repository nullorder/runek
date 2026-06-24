import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { useWorld, type Vec3 } from '@runek/core'

export interface BedProps {
  position?: Vec3
  rotation?: Vec3
  width?: number
  length?: number
  /** Frame color; defaults to the world palette's `wood` slot. */
  color?: string
  /** Bedding color; defaults to the world palette's `fabric` slot. */
  beddingColor?: string
}

/** A bed: frame, mattress, pillows, and a headboard (at local -Z). Finishes a
 *  bedroom. Solid, so it owns one cuboid collider. */
export function Bed({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  width = 1.4,
  length = 2,
  color,
  beddingColor,
}: BedProps) {
  const { unit, palette } = useWorld()
  const wood = color ?? palette.wood
  const bedding = beddingColor ?? palette.fabric
  const W = width * unit
  const L = length * unit
  const frameH = 0.3 * unit
  const mattH = 0.22 * unit
  const headH = 0.9 * unit
  const topY = frameH + mattH

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      <CuboidCollider args={[W / 2, topY / 2, L / 2]} position={[0, topY / 2, 0]} />

      <mesh castShadow receiveShadow position={[0, frameH / 2, 0]}>
        <boxGeometry args={[W, frameH, L]} />
        <meshStandardMaterial color={wood} roughness={0.85} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, frameH + mattH / 2, 0]}>
        <boxGeometry args={[W * 0.96, mattH, L * 0.94]} />
        <meshStandardMaterial color={bedding} roughness={0.9} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh
          key={`pillow-${s}`}
          castShadow
          position={[s * W * 0.24, topY + 0.04 * unit, -L / 2 + 0.28 * unit]}
        >
          <boxGeometry args={[W * 0.4, 0.1 * unit, 0.32 * unit]} />
          <meshStandardMaterial color="#f2ede2" roughness={0.95} />
        </mesh>
      ))}
      <mesh castShadow receiveShadow position={[0, headH / 2, -L / 2 - 0.04 * unit]}>
        <boxGeometry args={[W, headH, 0.1 * unit]} />
        <meshStandardMaterial color={wood} roughness={0.85} />
      </mesh>
    </RigidBody>
  )
}
