import { useFrame } from '@react-three/fiber'
import { rng, useWorld, type Vec3 } from '@runek/core'
import { useMemo, useRef } from 'react'
import type { Group } from 'three'

export interface BirdsProps {
  position?: Vec3
  rotation?: Vec3
  count?: number
  /** Orbit spread, in units. */
  area?: number
  height?: number
  speed?: number
  color?: string
  seed?: number
}

interface BirdSpec {
  rx: number
  rz: number
  cx: number
  cz: number
  phase: number
  y: number
  flap: number
  dir: number
}

/** A loose flock circling overhead, each bird flapping on its own seeded orbit.
 *  Motion and life for the sky. Decorative (no collider). */
export function Birds({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  count = 10,
  area = 20,
  height = 12,
  speed = 1,
  color = '#2a2a30',
  seed = 1,
}: BirdsProps) {
  const { unit } = useWorld()
  const A = area * unit
  const hy = height * unit
  const bodyRefs = useRef<(Group | null)[]>([])
  const leftRefs = useRef<(Group | null)[]>([])
  const rightRefs = useRef<(Group | null)[]>([])

  const birds = useMemo<BirdSpec[]>(() => {
    const next = rng(seed)
    return Array.from({ length: count }, () => ({
      rx: A * (0.3 + next() * 0.5),
      rz: A * (0.3 + next() * 0.5),
      cx: (next() - 0.5) * A * 0.4,
      cz: (next() - 0.5) * A * 0.4,
      phase: next() * Math.PI * 2,
      y: hy * (0.8 + next() * 0.4),
      flap: 7 + next() * 4,
      dir: next() < 0.5 ? 1 : -1,
    }))
  }, [A, hy, count, seed])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime * speed
    birds.forEach((b, i) => {
      const g = bodyRefs.current[i]
      if (!g) return
      const ang = b.phase + b.dir * t * 0.3
      g.position.set(
        b.cx + Math.cos(ang) * b.rx,
        b.y + Math.sin(t * 0.8 + b.phase) * 0.4 * unit,
        b.cz + Math.sin(ang) * b.rz,
      )
      const vx = -Math.sin(ang) * b.rx * b.dir
      const vz = Math.cos(ang) * b.rz * b.dir
      g.rotation.y = Math.atan2(vx, vz)
      const flap = Math.sin(t * b.flap) * 0.6
      const l = leftRefs.current[i]
      const r = rightRefs.current[i]
      if (l) l.rotation.z = 0.2 + flap
      if (r) r.rotation.z = -0.2 - flap
    })
  })

  const wingL = 0.35 * unit
  return (
    <group position={position} rotation={rotation}>
      {birds.map((b, i) => (
        <group
          key={`bird-${b.phase.toFixed(4)}`}
          ref={(el) => {
            bodyRefs.current[i] = el
          }}
        >
          <mesh castShadow>
            <sphereGeometry args={[0.06 * unit, 6, 6]} />
            <meshStandardMaterial color={color} />
          </mesh>
          <group
            ref={(el) => {
              leftRefs.current[i] = el
            }}
          >
            <mesh position={[wingL / 2, 0, 0]} castShadow>
              <boxGeometry args={[wingL, 0.01 * unit, 0.12 * unit]} />
              <meshStandardMaterial color={color} />
            </mesh>
          </group>
          <group
            ref={(el) => {
              rightRefs.current[i] = el
            }}
          >
            <mesh position={[-wingL / 2, 0, 0]} castShadow>
              <boxGeometry args={[wingL, 0.01 * unit, 0.12 * unit]} />
              <meshStandardMaterial color={color} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  )
}
