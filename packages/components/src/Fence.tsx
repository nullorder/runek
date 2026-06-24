import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { rng, useWorld, type Vec3 } from '@runek/core'
import { useMemo } from 'react'

export interface FenceProps {
  position?: Vec3
  rotation?: Vec3
  /** Total length along local X, in units. */
  length?: number
  height?: number
  /** Spacing between posts, in units. */
  postSpacing?: number
  /** Number of horizontal rails. */
  rails?: number
  /** Defaults to the world palette's `wood` slot. */
  color?: string
  seed?: number
}

interface Post {
  x: number
  /** Small seeded lean, for a weathered look. */
  lean: number
}

/** A run of posts and rails. One footprint collider, not one body per post. */
export function Fence({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  length = 6,
  height = 1.1,
  postSpacing = 1.5,
  rails = 2,
  color,
  seed = 1,
}: FenceProps) {
  const { unit, palette } = useWorld()
  const woodColor = color ?? palette.wood
  const L = length * unit
  const h = height * unit
  const postW = 0.1 * unit
  const railT = 0.06 * unit
  const depth = 0.08 * unit

  const posts = useMemo<Post[]>(() => {
    const next = rng(seed)
    const span = postSpacing * unit
    const n = Math.max(2, Math.round(L / span) + 1)
    const step = L / (n - 1)
    return Array.from({ length: n }, (_, i) => ({
      x: -L / 2 + i * step,
      lean: (next() - 0.5) * 0.05,
    }))
  }, [L, postSpacing, seed, unit])

  const railYs = useMemo(
    () => Array.from({ length: rails }, (_, i) => h * (0.85 - i * 0.42)),
    [rails, h],
  )

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      <CuboidCollider args={[L / 2 + postW, h / 2, depth / 2]} position={[0, h / 2, 0]} />
      {posts.map((p) => (
        <mesh
          key={`post-${p.x.toFixed(3)}`}
          castShadow
          receiveShadow
          position={[p.x, h / 2, 0]}
          rotation={[0, 0, p.lean]}
        >
          <boxGeometry args={[postW, h, depth]} />
          <meshStandardMaterial color={woodColor} roughness={0.85} />
        </mesh>
      ))}
      {railYs.map((y) => (
        <mesh key={`rail-${y.toFixed(3)}`} castShadow receiveShadow position={[0, y, 0]}>
          <boxGeometry args={[L, railT, railT]} />
          <meshStandardMaterial color={woodColor} roughness={0.85} />
        </mesh>
      ))}
    </RigidBody>
  )
}
