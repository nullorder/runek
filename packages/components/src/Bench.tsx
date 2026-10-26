import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { useMaterial, useWorld, type Vec3 } from '@runek/core'

export interface BenchProps {
  position?: Vec3
  rotation?: Vec3
  /** Accepted for the component contract; this component has no seeded variation yet. */
  seed?: number
  length?: number
  depth?: number
  seatHeight?: number
  /** Include a backrest. */
  back?: boolean
  /** Defaults to the world palette's `wood` slot. */
  color?: string
}

/** A slatted bench, with an optional backrest. Indoor or outdoor seating. */
export function Bench({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  length = 1.6,
  depth = 0.5,
  seatHeight = 0.45,
  back = true,
  color,
}: BenchProps) {
  const { unit, palette } = useWorld()
  const wood = useMaterial({ color: color ?? palette.wood, roughness: 0.85 })
  const L = length * unit
  const D = depth * unit
  const sh = seatHeight * unit
  const slatT = 0.04 * unit
  const legW = 0.07 * unit
  const SEAT_SLATS = 3
  const slatD = (D / SEAT_SLATS) * 0.82
  const backH = 0.5 * unit
  const lx = L / 2 - legW
  const lz = D / 2 - legW

  const legs: Vec3[] = [
    [-lx, sh / 2, -lz],
    [lx, sh / 2, -lz],
    [-lx, sh / 2, lz],
    [lx, sh / 2, lz],
  ]

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      <CuboidCollider args={[L / 2, sh / 2, D / 2]} position={[0, sh / 2, 0]} />

      {Array.from({ length: SEAT_SLATS }, (_, i) => {
        const z = -D / 2 + (i + 0.5) * (D / SEAT_SLATS)
        return (
          <mesh key={`slat-${i}`} material={wood} castShadow receiveShadow position={[0, sh, z]}>
            <boxGeometry args={[L, slatT, slatD]} />
          </mesh>
        )
      })}

      {legs.map((p) => (
        <mesh
          key={`leg-${p[0].toFixed(3)}:${p[2].toFixed(3)}`}
          material={wood}
          castShadow
          position={p}
        >
          <boxGeometry args={[legW, sh, legW]} />
        </mesh>
      ))}

      {back && (
        <>
          {[-1, 1].map((s) => (
            <mesh
              key={`support-${s}`}
              material={wood}
              castShadow
              position={[s * lx, sh + backH / 2, -D / 2 + legW]}
            >
              <boxGeometry args={[legW, backH, legW]} />
            </mesh>
          ))}
          {[0.55, 0.9].map((f) => (
            <mesh
              key={`backslat-${f}`}
              material={wood}
              castShadow
              position={[0, sh + backH * f, -D / 2 + legW]}
            >
              <boxGeometry args={[L, slatT, slatD * 0.8]} />
            </mesh>
          ))}
        </>
      )}
    </RigidBody>
  )
}

Bench.groundSitting = true
