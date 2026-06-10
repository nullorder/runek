import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { useWorld, type Vec3 } from '@runek/core'

export interface ChairProps {
  position?: Vec3
  rotation?: Vec3
  width?: number
  depth?: number
  seatHeight?: number
  backHeight?: number
  /** Defaults to the world palette's `wood` slot. */
  color?: string
}

export function Chair({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  width = 0.45,
  depth = 0.45,
  seatHeight = 0.45,
  backHeight = 0.5,
  color,
}: ChairProps) {
  const { unit, palette } = useWorld()
  const woodColor = color ?? palette.wood
  const w = width * unit
  const d = depth * unit
  const seatY = seatHeight * unit
  const backH = backHeight * unit
  const t = 0.04 * unit
  const leg = 0.04 * unit
  const lx = w / 2 - leg
  const lz = d / 2 - leg
  const legs: Vec3[] = [
    [-lx, seatY / 2, -lz],
    [lx, seatY / 2, -lz],
    [-lx, seatY / 2, lz],
    [lx, seatY / 2, lz],
  ]

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      <CuboidCollider args={[w / 2, t, d / 2]} position={[0, seatY, 0]} />
      <mesh castShadow receiveShadow position={[0, seatY, 0]}>
        <boxGeometry args={[w, t, d]} />
        <meshStandardMaterial color={woodColor} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, seatY + backH / 2, -d / 2 + t / 2]}>
        <boxGeometry args={[w, backH, t]} />
        <meshStandardMaterial color={woodColor} />
      </mesh>
      {legs.map((p) => (
        <mesh key={`leg-${p[0].toFixed(3)}:${p[2].toFixed(3)}`} castShadow position={p}>
          <boxGeometry args={[leg, seatY, leg]} />
          <meshStandardMaterial color={woodColor} />
        </mesh>
      ))}
    </RigidBody>
  )
}
