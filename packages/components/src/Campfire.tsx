import { useFrame } from '@react-three/fiber'
import { Dynamic, rng, useLight, useMaterials, useWorld, type Vec3 } from '@runek/core'
import { useMemo, useRef } from 'react'
import type { Group } from 'three'

export interface CampfireProps {
  position?: Vec3
  rotation?: Vec3
  radius?: number
  /** Log color; defaults to the world palette's `wood` slot. */
  logColor?: string
  flameColor?: string
  intensity?: number
  seed?: number
}

/** A ring of stones, a tepee of logs, and an animated flame with a warm,
 *  flickering light: a night-time focal point that plays off the day/night system.
 *  Decorative (no collider). */
export function Campfire({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  radius = 0.5,
  logColor,
  flameColor = '#ff7a1a',
  intensity = 14,
  seed = 1,
}: CampfireProps) {
  const { unit, palette } = useWorld()
  const m = useMaterials({
    stone: { color: palette.stone, flatShading: true, roughness: 1 },
    log: { color: logColor ?? palette.wood, roughness: 0.9 },
    flame: {
      kind: 'basic',
      color: flameColor,
      transparent: true,
      opacity: 0.85,
      toneMapped: false,
    },
    core: { kind: 'basic', color: '#ffd84d', transparent: true, opacity: 0.9, toneMapped: false },
  })
  const R = radius * unit
  const flameRef = useRef<Group>(null)
  const glow = useLight({ color: '#ff9a3c', intensity, distance: 10 * unit, decay: 2 })

  const stones = useMemo(() => {
    const next = rng(seed)
    return Array.from({ length: 7 }, (_, i) => {
      const a = (i / 7) * Math.PI * 2
      return {
        x: Math.cos(a) * R,
        z: Math.sin(a) * R,
        r: (0.07 + next() * 0.05) * unit,
        rot: next() * Math.PI,
      }
    })
  }, [R, seed, unit])

  const logLen = R * 1.6
  const logs = useMemo(() => Array.from({ length: 4 }, (_, i) => (i / 4) * Math.PI * 2 + 0.4), [])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const n = Math.sin(t * 11) * 0.5 + Math.sin(t * 19 + 1) * 0.3 + Math.sin(t * 7 + 2) * 0.2
    if (flameRef.current) {
      flameRef.current.scale.y = 1 + n * 0.18
      flameRef.current.position.x = n * 0.02 * unit
    }
    glow.intensity = intensity * (1 + n * 0.25)
  })

  return (
    <group position={position} rotation={rotation}>
      {stones.map((s) => (
        <mesh
          key={`stone-${s.x.toFixed(3)}:${s.z.toFixed(3)}`}
          material={m.stone}
          castShadow
          position={[s.x, s.r * 0.6, s.z]}
          rotation={[s.rot, s.rot, 0]}
        >
          <icosahedronGeometry args={[s.r, 0]} />
        </mesh>
      ))}

      {logs.map((a) => (
        <mesh
          key={`log-${a.toFixed(3)}`}
          material={m.log}
          castShadow
          position={[Math.cos(a) * R * 0.4, logLen * 0.4, Math.sin(a) * R * 0.4]}
          rotation={[Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.5]}
        >
          <cylinderGeometry args={[0.05 * unit, 0.06 * unit, logLen, 7]} />
        </mesh>
      ))}

      <Dynamic>
        <group ref={flameRef} position={[0, R * 0.5, 0]}>
          <mesh material={m.flame} position={[0, R * 0.5, 0]}>
            <coneGeometry args={[R * 0.5, R * 1.6, 10]} />
          </mesh>
          <mesh material={m.core} position={[0, R * 0.45, 0]}>
            <coneGeometry args={[R * 0.28, R * 1.1, 10]} />
          </mesh>
        </group>
      </Dynamic>

      <object3D ref={glow.ref} position={[0, R * 0.9, 0]} />
    </group>
  )
}

Campfire.groundSitting = true
