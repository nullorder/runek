import { pick, rng, useMaterials, useWorld, type WorldComponentProps } from '@runek/core'

export interface BassTrapProps extends WorldComponentProps {
  /** Floor to ceiling, in units. */
  height?: number
  /** How far its face runs along each wall from the corner, in units. */
  size?: number
  /** The foam. Seeded from muted studio colours when unset. */
  color?: string
}

// The same muted colours as `AcousticPanel`, so a seed treats a room in one fabric.
const FOAMS = ['#3b4a5a', '#4a5a48', '#5e4b3c', '#6b3b3b', '#2f2f35', '#7a7268', '#3d4f63']

/**
 * A floor-to-ceiling bass trap: a column of absorbent foam filling a room's corner, with a
 * dark plinth and cap. Its origin is on the corner, with the room toward local +X and +Z. It
 * is drawn as a square column turned 45° about the corner, so the three quarters inside the
 * walls never show and the visible face meets each wall `size` out from the corner. Seeded:
 * the foam. Decorative: no collider.
 */
export function BassTrap({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  seed = 1,
  height = 3,
  size = 0.3,
  color,
}: BassTrapProps) {
  const { unit } = useWorld()
  const m = useMaterials({
    foam: { color: color ?? pick(rng(seed), FOAMS), roughness: 1 },
    trim: { color: '#1d1d1f', roughness: 0.5 },
  })
  const H = height * unit
  const side = size * Math.SQRT2 * unit
  const trim = Math.min(0.08 * unit, H / 8)

  return (
    <group position={position} rotation={rotation}>
      <group rotation={[0, Math.PI / 4, 0]}>
        <mesh material={m.foam} receiveShadow position={[0, H / 2, 0]}>
          <boxGeometry args={[side, H - trim * 2, side]} />
        </mesh>
        {[trim / 2, H - trim / 2].map((y) => (
          <mesh key={y} material={m.trim} position={[0, y, 0]}>
            <boxGeometry args={[side * 1.04, trim, side * 1.04]} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

BassTrap.groundSitting = true
