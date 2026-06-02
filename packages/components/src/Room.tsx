import { RigidBody } from '@react-three/rapier'
import { useWorld, type Vec3 } from '@runek/core'

export interface RoomProps {
  position?: Vec3
  /** Interior footprint `[width, depth]`, in units. */
  size?: [number, number]
  height?: number
  thickness?: number
  /** Opening width in the front (+z) wall; set to 0 for a sealed room. */
  doorWidth?: number
  roof?: boolean
  color?: string
}

export function Room({
  position = [0, 0, 0],
  size = [8, 8],
  height = 3,
  thickness = 0.2,
  doorWidth = 1.4,
  roof = false,
  color = '#cfc7ba',
}: RoomProps) {
  const { unit } = useWorld()
  const w = size[0] * unit
  const d = size[1] * unit
  const h = height * unit
  const t = thickness * unit
  const door = Math.min(doorWidth * unit, w)
  const doorHeight = Math.min(2 * unit, h - t)
  const post = (w - door) / 2
  const midY = h / 2

  return (
    <RigidBody type="fixed" colliders="cuboid" position={position}>
      <mesh receiveShadow position={[0, -t / 2, 0]}>
        <boxGeometry args={[w, t, d]} />
        <meshStandardMaterial color={color} />
      </mesh>

      <mesh castShadow receiveShadow position={[0, midY, -d / 2 + t / 2]}>
        <boxGeometry args={[w, h, t]} />
        <meshStandardMaterial color={color} />
      </mesh>

      <mesh castShadow receiveShadow position={[-w / 2 + t / 2, midY, 0]}>
        <boxGeometry args={[t, h, d]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh castShadow receiveShadow position={[w / 2 - t / 2, midY, 0]}>
        <boxGeometry args={[t, h, d]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* front wall: two posts + lintel framing a doorway */}
      <mesh castShadow receiveShadow position={[-(door / 2 + post / 2), midY, d / 2 - t / 2]}>
        <boxGeometry args={[post, h, t]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh castShadow receiveShadow position={[door / 2 + post / 2, midY, d / 2 - t / 2]}>
        <boxGeometry args={[post, h, t]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {h > doorHeight && (
        <mesh castShadow receiveShadow position={[0, (h + doorHeight) / 2, d / 2 - t / 2]}>
          <boxGeometry args={[door, h - doorHeight, t]} />
          <meshStandardMaterial color={color} />
        </mesh>
      )}

      {roof && (
        <mesh receiveShadow position={[0, h + t / 2, 0]}>
          <boxGeometry args={[w, t, d]} />
          <meshStandardMaterial color={color} />
        </mesh>
      )}
    </RigidBody>
  )
}
