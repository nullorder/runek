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
  /** A kitchen stove at the +X end: a glass hob with four burners on the worktop and an oven
   *  door in the front below it. */
  hob?: boolean
}

/**
 * A service / bar counter (or, with `hob`, a kitchen stove run): a solid body under a worktop that overhangs the front (local +Z), where
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
  hob = false,
}: CounterProps) {
  const { unit, palette } = useWorld()
  const body = color ?? palette.wood
  const top = topColor ?? palette.woodDark
  const L = length * unit
  const H = height * unit
  const D = depth * unit
  const topT = 0.08 * unit
  const overhang = 0.14 * unit
  const hobW = Math.min(0.6 * unit, L * 0.8)
  const hobX = L / 2 - hobW / 2 - Math.min(0.1 * unit, L * 0.1)
  const burners: [number, number, number][] = [
    [-1, -1, 0.075],
    [1, -1, 0.06],
    [-1, 1, 0.06],
    [1, 1, 0.075],
  ]

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

      {hob && (
        <>
          <group position={[hobX, H + 0.003 * unit, overhang / 2]}>
            <mesh receiveShadow>
              <boxGeometry args={[hobW, 0.006 * unit, Math.min(0.52 * unit, D)]} />
              <meshStandardMaterial color="#141416" roughness={0.12} metalness={0.3} />
            </mesh>
            {burners.map(([sx, sz, r]) => (
              <mesh
                key={`${sx}${sz}`}
                position={[sx * hobW * 0.24, 0.004 * unit, sz * 0.12 * unit]}
                rotation={[-Math.PI / 2, 0, 0]}
              >
                <ringGeometry args={[r * unit * 0.8, r * unit, 32]} />
                <meshStandardMaterial color="#4a4a4f" roughness={0.4} />
              </mesh>
            ))}
          </group>
          {/* the oven: a door with a dark window and a bar handle, on the front face */}
          <group position={[hobX, (H - topT) * 0.48, D / 2 + 0.006 * unit]}>
            <mesh castShadow>
              <boxGeometry args={[hobW, (H - topT) * 0.62, 0.012 * unit]} />
              <meshStandardMaterial color="#2a2a2d" roughness={0.35} metalness={0.4} />
            </mesh>
            <mesh position={[0, -0.03 * unit, 0.0065 * unit]}>
              <planeGeometry args={[hobW * 0.7, (H - topT) * 0.3]} />
              <meshStandardMaterial color="#0c0c0e" roughness={0.1} metalness={0.5} />
            </mesh>
            <mesh
              position={[0, (H - topT) * 0.25, 0.03 * unit]}
              rotation={[0, 0, Math.PI / 2]}
              castShadow
            >
              <cylinderGeometry args={[0.011 * unit, 0.011 * unit, hobW * 0.75, 10]} />
              <meshStandardMaterial color="#b9bdc1" roughness={0.25} metalness={0.8} />
            </mesh>
          </group>
        </>
      )}
    </RigidBody>
  )
}

Counter.groundSitting = true
