import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { rng, useWorld, type Vec3 } from '@runek/core'
import { useMemo } from 'react'

export interface BridgeProps {
  position?: Vec3
  rotation?: Vec3
  /** Span along local X, in units. */
  length?: number
  /** Walkway width along local Z, in units. */
  width?: number
  /** Arch rise at the center, in units (0 = flat). */
  arch?: number
  /** Side railings. */
  rails?: boolean
  /** Deck color; defaults to the world palette's `wood` slot. */
  color?: string
  seed?: number
}

const archY = (t: number, rise: number) => Math.sin(t * Math.PI) * rise

/** A plank deck that spans a gap, optionally arched, with railings. The deck is
 *  the gameplay surface, so colliders follow it as a few slabs, not one per plank. */
export function Bridge({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  length = 6,
  width = 2,
  arch = 0,
  rails = true,
  color,
  seed = 1,
}: BridgeProps) {
  const { unit, palette } = useWorld()
  const deckColor = color ?? palette.wood
  const railColor = palette.woodDark
  const L = length * unit
  const W = width * unit
  const rise = arch * unit
  const deckT = 0.1 * unit
  const railH = 0.9 * unit

  const plankCount = Math.max(6, Math.round(length / 0.3))
  const planks = useMemo(() => {
    const next = rng(seed)
    const pw = L / plankCount
    return Array.from({ length: plankCount }, (_, i) => {
      const t = (i + 0.5) / plankCount
      return { x: -L / 2 + (i + 0.5) * pw, y: archY(t, rise), w: pw * (0.86 + next() * 0.1) }
    })
  }, [L, plankCount, rise, seed])

  const SLABS = 6
  const colliders = useMemo(
    () =>
      Array.from({ length: SLABS }, (_, i) => {
        const t = (i + 0.5) / SLABS
        return { x: -L / 2 + t * L, y: archY(t, rise) }
      }),
    [L, rise],
  )

  const posts = useMemo(() => {
    if (!rails) return []
    const n = Math.max(2, Math.round(length / 1.2))
    return Array.from({ length: n + 1 }, (_, i) => {
      const t = i / n
      return { x: -L / 2 + t * L, y: archY(t, rise) }
    })
  }, [rails, length, L, rise])

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      {colliders.map((c) => (
        <CuboidCollider
          key={`col-${c.x.toFixed(3)}`}
          args={[L / SLABS / 2, deckT / 2, W / 2]}
          position={[c.x, c.y, 0]}
        />
      ))}

      {planks.map((p) => (
        <mesh key={`plank-${p.x.toFixed(3)}`} castShadow receiveShadow position={[p.x, p.y, 0]}>
          <boxGeometry args={[p.w, deckT, W]} />
          <meshStandardMaterial color={deckColor} roughness={0.85} />
        </mesh>
      ))}

      {posts.map((p) =>
        [-1, 1].map((s) => (
          <mesh
            key={`post-${p.x.toFixed(3)}-${s}`}
            castShadow
            position={[p.x, p.y + railH / 2, (s * W) / 2]}
          >
            <boxGeometry args={[0.08 * unit, railH, 0.08 * unit]} />
            <meshStandardMaterial color={railColor} roughness={0.85} />
          </mesh>
        )),
      )}

      {rails &&
        [-1, 1].map((s) => (
          <mesh key={`toprail-${s}`} castShadow position={[0, rise * 0.5 + railH, (s * W) / 2]}>
            <boxGeometry args={[L, 0.07 * unit, 0.07 * unit]} />
            <meshStandardMaterial color={railColor} roughness={0.85} />
          </mesh>
        ))}
    </RigidBody>
  )
}
