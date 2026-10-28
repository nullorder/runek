import { useLight, useMaterials, useWorld, type WorldComponentProps } from '@runek/core'

export interface NeonStripProps extends WorldComponentProps {
  /** Length along local X, in units, centred on the origin. */
  length?: number
  /** The glow. */
  color?: string
  /** Tube diameter, in units. */
  thickness?: number
  /** Cast real light as well as glowing, from the middle of the tube. Leave it off on most
   *  strips: the world lends real lights to only a few emitters at a time. */
  light?: boolean
  intensity?: number
}

/**
 * A neon tube along local X: a white-hot core in a coloured sleeve with a soft halo, unlit by
 * the scene so it reads as light at any hour, for cove lighting, a desk's edge or a line round
 * a room. `light` also washes nearby walls in its colour. Decorative: no collider.
 */
export function NeonStrip({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  length = 2,
  color = '#ff2fb3',
  thickness = 0.03,
  light = false,
  intensity = 3,
}: NeonStripProps) {
  const { unit } = useWorld()
  const L = length * unit
  const r = (thickness / 2) * unit
  const glow = useLight({ color, intensity, distance: (length + 3) * unit, decay: 1.6 }, light)
  const m = useMaterials({
    core: { kind: 'basic', color: '#ffffff', toneMapped: false },
    sleeve: { kind: 'basic', color, transparent: true, opacity: 0.85, toneMapped: false },
    halo: {
      kind: 'basic',
      color,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
      toneMapped: false,
    },
  })

  return (
    <group position={position} rotation={rotation}>
      <group rotation={[0, 0, Math.PI / 2]}>
        <mesh material={m.core}>
          <cylinderGeometry args={[r * 0.55, r * 0.55, L, 8]} />
        </mesh>
        <mesh material={m.sleeve}>
          <cylinderGeometry args={[r, r, L, 12]} />
        </mesh>
        <mesh material={m.halo}>
          <cylinderGeometry args={[r * 2.6, r * 2.6, L, 12]} />
        </mesh>
      </group>
      <object3D ref={glow.ref} />
    </group>
  )
}
