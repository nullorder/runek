import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { useWorld, type Vec3 } from '@runek/core'

export interface LampProps {
  position?: Vec3
  rotation?: Vec3
  height?: number
  color?: string
  shadeColor?: string
  lightColor?: string
  intensity?: number
}

export function Lamp({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  height = 1.6,
  color = '#39383a',
  shadeColor = '#e9d8a6',
  lightColor = '#ffe8c2',
  intensity = 18,
}: LampProps) {
  const { unit } = useWorld()
  const h = height * unit
  const baseR = 0.16 * unit
  const poleR = 0.02 * unit
  const shadeR = 0.19 * unit
  const shadeH = 0.26 * unit
  const poleH = h - shadeH

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      <CuboidCollider args={[baseR, h / 2, baseR]} position={[0, h / 2, 0]} />

      <mesh castShadow position={[0, 0.025 * unit, 0]}>
        <cylinderGeometry args={[baseR, baseR, 0.05 * unit, 24]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh castShadow position={[0, poleH / 2, 0]}>
        <cylinderGeometry args={[poleR, poleR, poleH, 12]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh castShadow position={[0, h - shadeH / 2, 0]}>
        <coneGeometry args={[shadeR, shadeH, 24, 1, true]} />
        <meshStandardMaterial
          color={shadeColor}
          emissive={shadeColor}
          emissiveIntensity={0.4}
          side={2}
        />
      </mesh>

      <pointLight
        position={[0, h - shadeH, 0]}
        color={lightColor}
        intensity={intensity}
        distance={12 * unit}
        decay={2}
      />
    </RigidBody>
  )
}
