import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { rng, useWorld, type Vec3 } from '@runek/core'
import { useMemo } from 'react'
import * as THREE from 'three'

export interface HedgeProps {
  position?: Vec3
  rotation?: Vec3
  /** Length along local X, in units. */
  length?: number
  height?: number
  depth?: number
  /** Defaults to the world palette's `foliage` slot. */
  color?: string
  seed?: number
}

interface Tuft {
  pos: Vec3
  r: number
  color: string
}

/** A trimmed green wall: a solid clipped box dressed with seeded surface tufts.
 *  It blocks like a Wall, so it owns a cuboid collider. Fence's vegetation cousin. */
export function Hedge({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  length = 4,
  height = 1.2,
  depth = 0.6,
  color,
  seed = 1,
}: HedgeProps) {
  const { unit, palette } = useWorld()
  const foliage = color ?? palette.foliage
  const L = length * unit
  const H = height * unit
  const D = depth * unit

  const tufts = useMemo<Tuft[]>(() => {
    const next = rng(seed)
    const base = new THREE.Color(foliage)
    const tint = new THREE.Color()
    const n = Math.max(10, Math.round(length * 5))
    return Array.from({ length: n }, () => {
      const shade = 0.78 + next() * 0.44
      const side = next() < 0.5 ? 1 : -1
      return {
        pos: [(next() - 0.5) * L, next() * H, (side * D) / 2] as Vec3,
        r: (0.12 + next() * 0.13) * unit,
        color: tint.copy(base).multiplyScalar(shade).getStyle(),
      }
    })
  }, [L, H, D, length, foliage, seed, unit])

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      <CuboidCollider args={[L / 2, H / 2, D / 2]} position={[0, H / 2, 0]} />
      <mesh castShadow receiveShadow position={[0, H / 2, 0]}>
        <boxGeometry args={[L, H, D]} />
        <meshStandardMaterial color={foliage} roughness={0.95} flatShading />
      </mesh>
      {tufts.map((t) => (
        <mesh
          key={`tuft-${t.pos[0].toFixed(3)}:${t.pos[1].toFixed(3)}:${t.pos[2].toFixed(2)}`}
          castShadow
          position={t.pos}
        >
          <icosahedronGeometry args={[t.r, 0]} />
          <meshStandardMaterial color={t.color} flatShading roughness={0.95} />
        </mesh>
      ))}
    </RigidBody>
  )
}
