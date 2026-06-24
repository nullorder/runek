import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { useWorld, type Vec3 } from '@runek/core'
import { useRef } from 'react'
import type { Mesh } from 'three'

export interface FountainProps {
  position?: Vec3
  rotation?: Vec3
  radius?: number
  /** Stone color; defaults to the world palette's `stone` slot. */
  color?: string
  /** Water color; defaults to the world palette's `waterShallow` slot. */
  waterColor?: string
}

/** A two-tier stone fountain with gently rippling water (a light per-frame bob,
 *  no textures). A plaza centerpiece. The basin is solid, so it owns a collider. */
export function Fountain({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  radius = 1.6,
  color,
  waterColor,
}: FountainProps) {
  const { unit, palette } = useWorld()
  const stone = color ?? palette.stone
  const water = waterColor ?? palette.waterShallow
  const R = radius * unit
  const basinH = 0.5 * unit
  const topY = basinH + 1.0 * unit
  const lowWater = useRef<Mesh>(null)
  const topWater = useRef<Mesh>(null)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (lowWater.current)
      lowWater.current.position.y = basinH * 0.7 + Math.sin(t * 1.6) * 0.01 * unit
    if (topWater.current) topWater.current.position.y = topY + Math.sin(t * 2.1 + 1) * 0.008 * unit
  })

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      <CuboidCollider args={[R, basinH / 2, R]} position={[0, basinH / 2, 0]} />

      <mesh castShadow receiveShadow position={[0, basinH / 2, 0]}>
        <cylinderGeometry args={[R, R * 1.05, basinH, 28, 1, true]} />
        <meshStandardMaterial color={stone} roughness={0.92} side={2} />
      </mesh>
      <mesh receiveShadow position={[0, 0.05 * unit, 0]}>
        <cylinderGeometry args={[R, R, 0.1 * unit, 28]} />
        <meshStandardMaterial color={stone} roughness={0.92} />
      </mesh>
      <mesh ref={lowWater} position={[0, basinH * 0.7, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[R * 0.92, 28]} />
        <meshStandardMaterial
          color={water}
          transparent
          opacity={0.8}
          roughness={0.2}
          metalness={0.1}
        />
      </mesh>

      <mesh castShadow position={[0, basinH + 0.5 * unit, 0]}>
        <cylinderGeometry args={[0.16 * unit, 0.22 * unit, 1.0 * unit, 16]} />
        <meshStandardMaterial color={stone} roughness={0.92} />
      </mesh>
      <mesh castShadow position={[0, topY, 0]}>
        <cylinderGeometry args={[R * 0.5, R * 0.35, 0.18 * unit, 24, 1, true]} />
        <meshStandardMaterial color={stone} roughness={0.92} side={2} />
      </mesh>
      <mesh ref={topWater} position={[0, topY, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[R * 0.46, 24]} />
        <meshStandardMaterial color={water} transparent opacity={0.85} roughness={0.2} />
      </mesh>
      <mesh castShadow position={[0, topY + 0.2 * unit, 0]}>
        <sphereGeometry args={[0.1 * unit, 12, 12]} />
        <meshStandardMaterial color={stone} roughness={0.9} />
      </mesh>
    </RigidBody>
  )
}
