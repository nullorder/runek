import { useWorld, type WorldComponentProps } from '@runek/core'

export interface RoadProps extends WorldComponentProps {
  /** Length along local Z, in units. */
  length?: number
  /** Width along local X, in units. */
  width?: number
  /** Deck color; defaults to the palette's `stone`. */
  color?: string
  /** Kerb color; defaults to the palette's `woodDark`. */
  kerbColor?: string
}

/**
 * A paved street: a flat stone deck with low kerbs along both edges, laid in the XZ plane and
 * draped just above the ground. Straight along local Z. Decorative, like `Path` — it owns no
 * collider; you walk the terrain beneath it. For a meandering dirt trail, use `Path`.
 */
export function Road({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  length = 12,
  width = 3,
  color,
  kerbColor,
}: RoadProps) {
  const { unit, palette } = useWorld()
  const deck = color ?? palette.stone
  const kerb = kerbColor ?? palette.woodDark
  const L = length * unit
  const W = width * unit
  const kerbW = 0.18 * unit
  const kerbH = 0.12 * unit
  const edge = W / 2 - kerbW / 2

  return (
    <group position={[position[0], position[1] + 0.03 * unit, position[2]]} rotation={rotation}>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W, L]} />
        <meshStandardMaterial color={deck} roughness={1} />
      </mesh>
      <mesh receiveShadow castShadow position={[edge, kerbH / 2, 0]}>
        <boxGeometry args={[kerbW, kerbH, L]} />
        <meshStandardMaterial color={kerb} roughness={1} />
      </mesh>
      <mesh receiveShadow castShadow position={[-edge, kerbH / 2, 0]}>
        <boxGeometry args={[kerbW, kerbH, L]} />
        <meshStandardMaterial color={kerb} roughness={1} />
      </mesh>
    </group>
  )
}
