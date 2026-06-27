import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { rng, useWorld, type WorldComponentProps } from '@runek/core'
import { useMemo } from 'react'

export interface DockProps extends WorldComponentProps {
  /** How far the jetty reaches out from the shore (local +Z), in units. */
  length?: number
  /** Walkway width (local X), in units. */
  width?: number
  /** How deep the pilings sink below the deck surface, in units. */
  depth?: number
  /** Deck color; defaults to the world palette's `wood`. */
  color?: string
}

/** A plank jetty on pilings that reaches out over water. The deck is the gameplay surface
 *  (a few collider slabs, not one per plank, like `Bridge`); the pilings, side stringers, and
 *  the two seaward mooring posts are decorative. The local origin sits at the deck surface on
 *  the shore end, so `position` is where the jetty meets land and it runs out along local +Z. */
export function Dock({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  seed = 1,
  length = 10,
  width = 3,
  depth = 4,
  color,
}: DockProps) {
  const { unit, palette } = useWorld()
  const deckColor = color ?? palette.wood
  const postColor = palette.woodDark
  const L = length * unit
  const W = width * unit
  const D = depth * unit
  const deckT = 0.12 * unit
  const deckY = -deckT / 2
  const postX = W / 2 - 0.25 * unit
  const postR = 0.16 * unit

  const plankCount = Math.max(6, Math.round(length / 0.4))
  const planks = useMemo(() => {
    const next = rng(seed)
    const pd = L / plankCount
    return Array.from({ length: plankCount }, (_, i) => ({
      z: (i + 0.5) * pd,
      d: pd * (0.84 + next() * 0.1),
    }))
  }, [L, plankCount, seed])

  const SLABS = 5
  const slabLen = L / SLABS

  // rows of pilings ("bents") along the jetty, including both ends
  const bents = useMemo(() => {
    const n = Math.max(2, Math.round(length / 3))
    return Array.from({ length: n + 1 }, (_, i) => (i / n) * L)
  }, [length, L])

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      {/* deck collider slabs */}
      {Array.from({ length: SLABS }, (_, i) => (i + 0.5) * slabLen).map((z) => (
        <CuboidCollider
          key={`col-${z.toFixed(3)}`}
          args={[W / 2, deckT / 2, slabLen / 2]}
          position={[0, deckY, z]}
        />
      ))}

      {/* cross planks */}
      {planks.map((p) => (
        <mesh key={`plank-${p.z.toFixed(3)}`} castShadow receiveShadow position={[0, deckY, p.z]}>
          <boxGeometry args={[W, deckT, p.d]} />
          <meshStandardMaterial color={deckColor} roughness={0.85} />
        </mesh>
      ))}

      {/* side stringers under the deck */}
      {[-1, 1].map((s) => (
        <mesh key={`stringer-${s}`} position={[s * (W / 2 - 0.1 * unit), deckY - deckT, L / 2]}>
          <boxGeometry args={[0.12 * unit, 0.2 * unit, L]} />
          <meshStandardMaterial color={postColor} roughness={0.85} />
        </mesh>
      ))}

      {/* pilings, sunk into the water */}
      {bents.map((z) =>
        [-1, 1].map((s) => (
          <mesh key={`pile-${z.toFixed(3)}-${s}`} castShadow position={[s * postX, -D / 2, z]}>
            <cylinderGeometry args={[postR, postR, D, 8]} />
            <meshStandardMaterial color={postColor} roughness={0.9} />
          </mesh>
        )),
      )}

      {/* seaward mooring posts */}
      {[-1, 1].map((s) => (
        <mesh key={`bollard-${s}`} castShadow position={[s * postX, 0.25 * unit, L - 0.3 * unit]}>
          <cylinderGeometry args={[0.18 * unit, 0.2 * unit, 0.8 * unit, 8]} />
          <meshStandardMaterial color={postColor} roughness={0.9} />
        </mesh>
      ))}
    </RigidBody>
  )
}
