import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { useWorld, type Vec3 } from '@runek/core'
import { useMemo } from 'react'

export interface ArchProps {
  position?: Vec3
  rotation?: Vec3
  /** Clear opening width, in units. */
  width?: number
  /** Height to the springline (top of the piers), in units. */
  height?: number
  depth?: number
  /** Pier thickness, in units. */
  thickness?: number
  /** Voussoir blocks forming the semicircular arch. */
  blocks?: number
  /** Defaults to the world palette's `stone` slot. */
  color?: string
}

/** A freestanding gateway: two piers and a semicircular arch of voussoirs.
 *  Composes with `Wall` for an entrance. The piers carry the colliders; the
 *  arch crown sits overhead. */
export function Arch({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  width = 2.4,
  height = 2.6,
  depth = 0.6,
  thickness = 0.4,
  blocks = 9,
  color,
}: ArchProps) {
  const { unit, palette } = useWorld()
  const stone = color ?? palette.stone
  const w = width * unit
  const h = height * unit
  const d = depth * unit
  const th = thickness * unit
  const pierX = w / 2 + th / 2
  const rMid = w / 2 + th / 2

  const voussoirs = useMemo(() => {
    const arc = ((Math.PI * rMid) / blocks) * 1.06
    return Array.from({ length: blocks }, (_, i) => {
      const a = ((i + 0.5) / blocks) * Math.PI
      return { x: rMid * Math.cos(a), y: h + rMid * Math.sin(a), rot: a, arc }
    })
  }, [rMid, blocks, h])

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      <CuboidCollider args={[th / 2, h / 2, d / 2]} position={[-pierX, h / 2, 0]} />
      <CuboidCollider args={[th / 2, h / 2, d / 2]} position={[pierX, h / 2, 0]} />

      {[-1, 1].map((s) => (
        <mesh key={`pier-${s}`} castShadow receiveShadow position={[s * pierX, h / 2, 0]}>
          <boxGeometry args={[th, h, d]} />
          <meshStandardMaterial color={stone} roughness={0.9} />
        </mesh>
      ))}

      {voussoirs.map((v) => (
        <mesh
          key={`v-${v.x.toFixed(3)}:${v.y.toFixed(3)}`}
          castShadow
          receiveShadow
          position={[v.x, v.y, 0]}
          rotation={[0, 0, v.rot]}
        >
          <boxGeometry args={[th, v.arc, d]} />
          <meshStandardMaterial color={stone} roughness={0.9} />
        </mesh>
      ))}
    </RigidBody>
  )
}
