import { pick, rng, useMaterials, useWorld, type WorldComponentProps } from '@runek/core'

export interface AcousticPanelProps extends WorldComponentProps {
  width?: number
  height?: number
  /** Out from the wall, in units. */
  depth?: number
  /** The fabric. Seeded from muted studio colours when unset. */
  color?: string
}

const FABRICS = ['#3b4a5a', '#4a5a48', '#5e4b3c', '#6b3b3b', '#2f2f35', '#7a7268', '#3d4f63']

/**
 * A fabric-wrapped absorber panel: a slab of foam in cloth, standing proud of a slim frame
 * that shows round its edge. Its origin is the middle of its back, against the wall (local
 * -Z), like `Poster`; turned to face down, it hangs from a ceiling as a cloud. Seeded: the
 * fabric. Decorative: no collider.
 */
export function AcousticPanel({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  seed = 1,
  width = 0.6,
  height = 1.2,
  depth = 0.05,
  color,
}: AcousticPanelProps) {
  const { unit } = useWorld()
  const m = useMaterials({
    fabric: { color: color ?? pick(rng(seed), FABRICS), roughness: 1 },
    frame: { color: '#1d1d1f', roughness: 0.5 },
  })
  const W = width * unit
  const H = height * unit
  const D = depth * unit
  const f = 0.012 * unit

  return (
    <group position={position} rotation={rotation}>
      <mesh material={m.frame} position={[0, 0, D * 0.4]}>
        <boxGeometry args={[W, H, D * 0.8]} />
      </mesh>
      <mesh material={m.fabric} castShadow receiveShadow position={[0, 0, D / 2 + f / 2]}>
        <boxGeometry args={[W - f * 2, H - f * 2, D]} />
      </mesh>
    </group>
  )
}
