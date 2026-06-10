import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { useWorld, type Vec3 } from '@runek/core'

export interface ShelfProps {
  position?: Vec3
  rotation?: Vec3
  width?: number
  height?: number
  depth?: number
  shelves?: number
  /** Defaults to the world palette's `wood` slot. */
  color?: string
}

/** Open shelving unit — frame + planks, no contents (see Bookshelf for a filled variant). */
export function Shelf({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  width = 1,
  height = 1.8,
  depth = 0.3,
  shelves = 4,
  color,
}: ShelfProps) {
  const { unit, palette } = useWorld()
  const frameColor = color ?? palette.wood
  const w = width * unit
  const h = height * unit
  const d = depth * unit
  const plank = 0.03 * unit
  const inner = w - plank * 2
  const gap = (h - plank) / shelves
  const plankYs = Array.from({ length: shelves + 1 }, (_, i) => plank / 2 + gap * i)

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      <CuboidCollider args={[w / 2, h / 2, d / 2]} position={[0, h / 2, 0]} />

      <mesh castShadow receiveShadow position={[-w / 2 + plank / 2, h / 2, 0]}>
        <boxGeometry args={[plank, h, d]} />
        <meshStandardMaterial color={frameColor} />
      </mesh>
      <mesh castShadow receiveShadow position={[w / 2 - plank / 2, h / 2, 0]}>
        <boxGeometry args={[plank, h, d]} />
        <meshStandardMaterial color={frameColor} />
      </mesh>

      {plankYs.map((y) => (
        <mesh key={`plank-${y.toFixed(4)}`} castShadow receiveShadow position={[0, y, 0]}>
          <boxGeometry args={[inner, plank, d]} />
          <meshStandardMaterial color={frameColor} />
        </mesh>
      ))}
    </RigidBody>
  )
}
