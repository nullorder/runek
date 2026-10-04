import { RoundedBox } from '@react-three/drei'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { pick, rng, sub, useWorld, type WorldComponentProps } from '@runek/core'
import { useMemo } from 'react'

/** A `low` back that stops at the shoulder blades, or a `high` one up to the head. */
export type OfficeChairBack = 'low' | 'high'

export interface OfficeChairProps extends WorldComponentProps {
  /** Top of the seat cushion, in units. */
  seatHeight?: number
  /** Seeded when unset. */
  back?: OfficeChairBack
  /** Armrests. Seeded when unset. */
  arms?: boolean
  /** Seat and back; defaults to the palette's `fabric`. */
  color?: string
  /** Base, column, and arms; defaults to the palette's `metal`. */
  frameColor?: string
}

const LEGS = 5

/**
 * A swivel office chair: a five-star base on casters, a gas column, a padded seat, and a back,
 * with or without arms. Seat faces local +Z, so `pose="sit"` or `pose="type"` on a `Person` at the
 * same position and rotation sits in it. One cuboid collider for the seat.
 */
export function OfficeChair({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  seed = 1,
  seatHeight = 0.47,
  back,
  arms,
  color,
  frameColor,
}: OfficeChairProps) {
  const { unit, palette } = useWorld()
  const cloth = color ?? palette.fabric
  const frame = frameColor ?? palette.metal
  const u = unit

  const look = useMemo(() => {
    const r = rng(sub(seed, 0))
    const rolled = { back: pick<OfficeChairBack>(r, ['low', 'high', 'high']), arms: r() < 0.7 }
    return { back: back ?? rolled.back, arms: arms ?? rolled.arms }
  }, [seed, back, arms])

  const seatY = seatHeight * u
  const cushion = 0.08 * u
  const base = 0.09 * u
  const backH = (look.back === 'high' ? 0.68 : 0.46) * u
  const legs = Array.from({ length: LEGS }, (_, i) => (i / LEGS) * Math.PI * 2)

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      <CuboidCollider args={[0.26 * u, seatY / 2, 0.26 * u]} position={[0, seatY / 2, 0]} />

      {/* five-star base on casters */}
      {legs.map((a) => (
        <group key={a} rotation={[0, a, 0]}>
          <mesh position={[0, base, 0.17 * u]} rotation={[0.12, 0, 0]} castShadow>
            <boxGeometry args={[0.04 * u, 0.03 * u, 0.32 * u]} />
            <meshStandardMaterial color={frame} roughness={0.4} metalness={0.5} />
          </mesh>
          <mesh position={[0, 0.03 * u, 0.31 * u]} castShadow>
            <sphereGeometry args={[0.03 * u, 10, 8]} />
            <meshStandardMaterial color="#1c1c1e" roughness={0.6} />
          </mesh>
        </group>
      ))}
      {/* gas column */}
      <mesh position={[0, (base + seatY - cushion) / 2, 0]} castShadow>
        <cylinderGeometry args={[0.028 * u, 0.034 * u, seatY - cushion - base, 12]} />
        <meshStandardMaterial color={frame} roughness={0.3} metalness={0.7} />
      </mesh>
      {/* seat */}
      <RoundedBox
        args={[0.5 * u, cushion, 0.48 * u]}
        radius={0.03 * u}
        smoothness={3}
        position={[0, seatY - cushion / 2, 0.01 * u]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={cloth} roughness={0.9} />
      </RoundedBox>
      {/* back, on a spine up from under the seat, reclined a touch */}
      <mesh position={[0, seatY + 0.06 * u, -0.25 * u]} castShadow>
        <boxGeometry args={[0.05 * u, 0.22 * u, 0.025 * u]} />
        <meshStandardMaterial color={frame} roughness={0.4} metalness={0.5} />
      </mesh>
      <RoundedBox
        args={[0.46 * u, backH, 0.07 * u]}
        radius={0.03 * u}
        smoothness={3}
        position={[0, seatY + 0.1 * u + backH / 2, -0.28 * u]}
        rotation={[-0.12, 0, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={cloth} roughness={0.9} />
      </RoundedBox>
      {look.arms &&
        [-1, 1].map((s) => (
          <group key={s} position={[s * 0.27 * u, seatY, -0.02 * u]}>
            <mesh position={[0, 0.1 * u, 0]} castShadow>
              <boxGeometry args={[0.03 * u, 0.2 * u, 0.03 * u]} />
              <meshStandardMaterial color={frame} roughness={0.4} metalness={0.5} />
            </mesh>
            <mesh position={[0, 0.21 * u, 0.02 * u]} castShadow>
              <boxGeometry args={[0.06 * u, 0.03 * u, 0.26 * u]} />
              <meshStandardMaterial color="#232326" roughness={0.7} />
            </mesh>
          </group>
        ))}
    </RigidBody>
  )
}

OfficeChair.groundSitting = true
