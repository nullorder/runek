import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { useWorld, type Vec3 } from '@runek/core'

export interface BenchProps {
  position?: Vec3
  rotation?: Vec3
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
  const wood = color ?? palette.wood
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
          <mesh key={`slat-${i}`} castShadow receiveShadow position={[0, sh, z]}>
            <boxGeometry args={[L, slatT, slatD]} />
            <meshStandardMaterial color={wood} roughness={0.85} />
          </mesh>
        )
      })}

      {legs.map((p) => (
        <mesh key={`leg-${p[0].toFixed(3)}:${p[2].toFixed(3)}`} castShadow position={p}>
          <boxGeometry args={[legW, sh, legW]} />
          <meshStandardMaterial color={wood} roughness={0.85} />
        </mesh>
      ))}

      {back && (
        <>
          {[-1, 1].map((s) => (
            <mesh
              key={`support-${s}`}
              castShadow
              position={[s * lx, sh + backH / 2, -D / 2 + legW]}
            >
              <boxGeometry args={[legW, backH, legW]} />
              <meshStandardMaterial color={wood} roughness={0.85} />
            </mesh>
          ))}
          {[0.55, 0.9].map((f) => (
            <mesh key={`backslat-${f}`} castShadow position={[0, sh + backH * f, -D / 2 + legW]}>
              <boxGeometry args={[L, slatT, slatD * 0.8]} />
              <meshStandardMaterial color={wood} roughness={0.85} />
            </mesh>
          ))}
        </>
      )}
    </RigidBody>
  )
}
