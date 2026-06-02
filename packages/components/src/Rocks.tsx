import { RigidBody } from '@react-three/rapier'
import { rng, useWorld, type Vec3 } from '@runek/core'
import { useMemo } from 'react'

export interface RocksProps {
  position?: Vec3
  rotation?: Vec3
  count?: number
  /** Cluster radius, in units. */
  spread?: number
  /** Mean rock radius, in units. */
  size?: number
  hue?: number
  seed?: number
}

interface Rock {
  pos: Vec3
  scale: Vec3
  rot: Vec3
  radius: number
  lightness: number
}

export function Rocks({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  count = 6,
  spread = 3,
  size = 0.6,
  hue = 30,
  seed = 1,
}: RocksProps) {
  const { unit } = useWorld()

  const rocks = useMemo<Rock[]>(() => {
    const next = rng(seed)
    return Array.from({ length: count }, () => {
      const radius = size * unit * (0.6 + next() * 0.8)
      return {
        radius,
        pos: [(next() - 0.5) * spread * unit, radius * 0.3, (next() - 0.5) * spread * unit],
        scale: [0.8 + next() * 0.5, 0.6 + next() * 0.5, 0.8 + next() * 0.5],
        rot: [next() * Math.PI, next() * Math.PI, next() * Math.PI],
        lightness: 30 + next() * 18,
      }
    })
  }, [count, spread, size, seed, unit])

  return (
    <RigidBody type="fixed" colliders="hull" position={position} rotation={rotation}>
      {rocks.map((r) => (
        <mesh
          key={`rock-${r.pos[0].toFixed(3)}:${r.pos[2].toFixed(3)}`}
          castShadow
          receiveShadow
          position={r.pos}
          rotation={r.rot}
          scale={r.scale}
        >
          <icosahedronGeometry args={[r.radius, 0]} />
          <meshStandardMaterial
            color={`hsl(${hue}, 8%, ${r.lightness}%)`}
            flatShading
            roughness={1}
          />
        </mesh>
      ))}
    </RigidBody>
  )
}
