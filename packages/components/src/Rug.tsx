import { rng, useWorld, type Vec3 } from '@runek/core'
import { useMemo } from 'react'

export interface RugProps {
  position?: Vec3
  rotation?: Vec3
  /** `[width, depth]` in units. */
  size?: [number, number]
  /** Defaults to the world palette's `fabric` slot. */
  baseColor?: string
  /** Defaults to the world palette's `accent` slot. */
  borderColor?: string
  accentColor?: string
  seed?: number
}

interface Stripe {
  x: number
  width: number
}

/** Decorative — flat, no collider; walk over it. */
export function Rug({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  size = [3, 2],
  baseColor,
  borderColor,
  accentColor = '#9c5252',
  seed = 1,
}: RugProps) {
  const { unit, palette } = useWorld()
  const baseCol = baseColor ?? palette.fabric
  const borderCol = borderColor ?? palette.accent
  const w = size[0] * unit
  const d = size[1] * unit
  const t = 0.02 * unit
  const border = 0.12 * unit

  const stripes = useMemo<Stripe[]>(() => {
    const next = rng(seed)
    const span = w - border * 2
    const count = 3 + Math.floor(next() * 4)
    return Array.from({ length: count }, () => ({
      x: (next() - 0.5) * span,
      width: (0.04 + next() * 0.08) * unit,
    }))
  }, [w, border, seed, unit])

  return (
    <group position={position} rotation={rotation}>
      <mesh receiveShadow position={[0, t / 2, 0]}>
        <boxGeometry args={[w, t, d]} />
        <meshStandardMaterial color={borderCol} />
      </mesh>
      <mesh position={[0, t + 0.001 * unit, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w - border * 2, d - border * 2]} />
        <meshStandardMaterial color={baseCol} />
      </mesh>
      {stripes.map((s) => (
        <mesh
          key={`stripe-${s.x.toFixed(3)}`}
          position={[s.x, t + 0.002 * unit, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[s.width, d - border * 2]} />
          <meshStandardMaterial color={accentColor} />
        </mesh>
      ))}
    </group>
  )
}
