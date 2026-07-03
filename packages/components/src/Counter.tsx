import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { useWorld, type WorldComponentProps } from '@runek/core'

export interface CounterProps extends WorldComponentProps {
  /** Length along local X, in units. */
  length?: number
  /** Counter height, in units. */
  height?: number
  /** Depth along local Z, in units. */
  depth?: number
  /** Body color; defaults to the palette's `wood`. */
  color?: string
  /** Worktop color; defaults to the palette's `woodDark`. */
  topColor?: string
}

/**
 * A service / bar counter: a solid body under a worktop that overhangs the front (local +Z), where
 * stools tuck in. One cuboid collider — you can't walk through it. Pair with `Stool` and a `Shelf`.
 */
export function Counter({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  length = 3,
  height = 1.1,
  depth = 0.6,
  color,
  topColor,
}: CounterProps) {
  const { unit, palette } = useWorld()
  const body = color ?? palette.wood
  const top = topColor ?? palette.woodDark
  const L = length * unit
  const H = height * unit
  const D = depth * unit
  const topT = 0.08 * unit
  const overhang = 0.14 * unit

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      <CuboidCollider args={[L / 2, H / 2, D / 2]} position={[0, H / 2, 0]} />

      {/* body */}
      <mesh position={[0, (H - topT) / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[L, H - topT, D]} />
        <meshStandardMaterial color={body} roughness={0.8} />
      </mesh>

      {/* worktop, overhanging the front (+Z) for knee room */}
      <mesh position={[0, H - topT / 2, overhang / 2]} castShadow receiveShadow>
        <boxGeometry args={[L + 0.06 * unit, topT, D + overhang]} />
        <meshStandardMaterial color={top} roughness={0.55} />
      </mesh>
    </RigidBody>
  )
}
