import { useWorld, type Vec3 } from '@runek/core'

export interface WindowProps {
  position?: Vec3
  rotation?: Vec3
  width?: number
  height?: number
  /** Frame bar thickness, in units. */
  frame?: number
  depth?: number
  color?: string
  glassColor?: string
}

/** Decorative — the surrounding wall opening owns the collision. */
export function Window({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  width = 1.2,
  height = 1.2,
  frame = 0.08,
  depth = 0.1,
  color = '#e8e2d6',
  glassColor = '#acd4e6',
}: WindowProps) {
  const { unit } = useWorld()
  const w = width * unit
  const h = height * unit
  const f = frame * unit
  const d = depth * unit

  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, h - f / 2, 0]}>
        <boxGeometry args={[w, f, d]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, f / 2, 0]}>
        <boxGeometry args={[w, f, d]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[-w / 2 + f / 2, h / 2, 0]}>
        <boxGeometry args={[f, h, d]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[w / 2 - f / 2, h / 2, 0]}>
        <boxGeometry args={[f, h, d]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w - f, h - f, d * 0.3]} />
        <meshStandardMaterial color={glassColor} transparent opacity={0.35} roughness={0.1} />
      </mesh>
    </group>
  )
}
