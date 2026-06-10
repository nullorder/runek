import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { useWorld, type Vec3 } from '@runek/core'

export interface TableProps {
  position?: Vec3
  rotation?: Vec3
  width?: number
  depth?: number
  height?: number
  thickness?: number
  /** Defaults to the world palette's `wood` slot. */
  color?: string
}

export function Table({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  width = 1.2,
  depth = 0.8,
  height = 0.75,
  thickness = 0.05,
  color,
}: TableProps) {
  const { unit, palette } = useWorld()
  const woodColor = color ?? palette.wood
  const w = width * unit
  const d = depth * unit
  const h = height * unit
  const t = thickness * unit
  const leg = 0.06 * unit
  const legH = h - t
  const lx = w / 2 - leg
  const lz = d / 2 - leg
  const legs: Vec3[] = [
    [-lx, legH / 2, -lz],
    [lx, legH / 2, -lz],
    [-lx, legH / 2, lz],
    [lx, legH / 2, lz],
  ]

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      <CuboidCollider args={[w / 2, t / 2, d / 2]} position={[0, h - t / 2, 0]} />
      <mesh castShadow receiveShadow position={[0, h - t / 2, 0]}>
        <boxGeometry args={[w, t, d]} />
        <meshStandardMaterial color={woodColor} />
      </mesh>
      {legs.map((p) => (
        <mesh key={`leg-${p[0].toFixed(3)}:${p[2].toFixed(3)}`} castShadow position={p}>
          <boxGeometry args={[leg, legH, leg]} />
          <meshStandardMaterial color={woodColor} />
        </mesh>
      ))}
    </RigidBody>
  )
}
