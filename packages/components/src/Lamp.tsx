import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { useWorld, type Vec3 } from '@runek/core'
import { useRef } from 'react'
import type { PointLight } from 'three'

export interface LampProps {
  position?: Vec3
  rotation?: Vec3
  height?: number
  /** Base + pole color. Defaults to the world palette's `metal` slot. */
  color?: string
  shadeColor?: string
  lightColor?: string
  intensity?: number
  /** Candle-like intensity flicker, 0–1; 0 holds the light steady. */
  flicker?: number
}

export function Lamp({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  height = 1.6,
  color,
  shadeColor = '#e9d8a6',
  lightColor = '#ffe8c2',
  intensity = 18,
  flicker = 0.08,
}: LampProps) {
  const { unit, palette } = useWorld()
  const metalColor = color ?? palette.metal
  const h = height * unit
  const baseR = 0.16 * unit
  const poleR = 0.02 * unit
  const shadeR = 0.19 * unit
  const shadeH = 0.26 * unit
  const poleH = h - shadeH
  const lightRef = useRef<PointLight>(null)

  useFrame(({ clock }) => {
    if (!lightRef.current || flicker <= 0) return
    const t = clock.elapsedTime
    // layered sines read as a candle without any per-frame randomness
    const n = Math.sin(t * 9.3) * 0.5 + Math.sin(t * 23.7) * 0.3 + Math.sin(t * 41.1) * 0.2
    lightRef.current.intensity = intensity * (1 + n * flicker)
  })

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      <CuboidCollider args={[baseR, h / 2, baseR]} position={[0, h / 2, 0]} />

      <mesh castShadow position={[0, 0.025 * unit, 0]}>
        <cylinderGeometry args={[baseR, baseR, 0.05 * unit, 24]} />
        <meshStandardMaterial color={metalColor} metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh castShadow position={[0, poleH / 2, 0]}>
        <cylinderGeometry args={[poleR, poleR, poleH, 12]} />
        <meshStandardMaterial color={metalColor} metalness={0.4} roughness={0.5} />
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
        ref={lightRef}
        position={[0, h - shadeH, 0]}
        color={lightColor}
        intensity={intensity}
        distance={12 * unit}
        decay={2}
      />
    </RigidBody>
  )
}
