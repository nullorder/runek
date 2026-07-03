import { CylinderCollider, RigidBody } from '@react-three/rapier'
import { useWorld, type WorldComponentProps } from '@runek/core'

export interface StoolProps extends WorldComponentProps {
  /** Seat height above the ground, in units. */
  height?: number
  /** Seat radius, in units. */
  radius?: number
  /** Color; defaults to the palette's `wood`. */
  color?: string
}

const LEGS = [0, 1, 2].map((i) => (i / 3) * Math.PI * 2)

/** A round bar stool: a disc seat on three splayed legs. A thin cylinder collider. */
export function Stool({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  height = 0.95,
  radius = 0.24,
  color,
}: StoolProps) {
  const { unit, palette } = useWorld()
  const wood = color ?? palette.wood
  const H = height * unit
  const R = radius * unit
  const seatT = 0.07 * unit
  const legR = 0.035 * unit
  const spread = R * 0.78

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      <CylinderCollider args={[H / 2, R * 0.6]} position={[0, H / 2, 0]} />

      {/* seat */}
      <mesh position={[0, H - seatT / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[R, R, seatT, 16]} />
        <meshStandardMaterial color={wood} roughness={0.7} />
      </mesh>

      {/* legs */}
      {LEGS.map((a) => (
        <mesh
          key={`leg-${a.toFixed(3)}`}
          position={[Math.cos(a) * spread, (H - seatT) / 2, Math.sin(a) * spread]}
          castShadow
        >
          <cylinderGeometry args={[legR, legR, H - seatT, 6]} />
          <meshStandardMaterial color={wood} roughness={0.8} />
        </mesh>
      ))}
    </RigidBody>
  )
}
