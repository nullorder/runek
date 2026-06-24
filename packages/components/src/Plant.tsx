import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { rng, useWorld, type Vec3 } from '@runek/core'
import { useMemo } from 'react'
import * as THREE from 'three'

export interface PlantProps {
  position?: Vec3
  rotation?: Vec3
  height?: number
  /** Planter color; defaults to the world palette's `wood` slot. */
  potColor?: string
  /** Foliage color; defaults to the world palette's `foliage` slot. */
  foliageColor?: string
  seed?: number
}

interface Leaf {
  pos: Vec3
  r: number
  color: string
}

/** A potted plant: a tapered planter, soil, and a seeded cluster of foliage. Indoor
 *  life. The planter owns a small collider. */
export function Plant({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  height = 0.7,
  potColor,
  foliageColor,
  seed = 1,
}: PlantProps) {
  const { unit, palette } = useWorld()
  const pot = potColor ?? palette.wood
  const foliage = foliageColor ?? palette.foliage
  const H = height * unit
  const potH = H * 0.4
  const potR = 0.18 * unit

  const leaves = useMemo<Leaf[]>(() => {
    const next = rng(seed)
    const base = new THREE.Color(foliage)
    const tint = new THREE.Color()
    return Array.from({ length: 6 }, () => {
      const a = next() * Math.PI * 2
      const rad = next() * potR * 0.8
      return {
        pos: [Math.cos(a) * rad, potH + 0.1 * unit + next() * H * 0.4, Math.sin(a) * rad] as Vec3,
        r: (0.1 + next() * 0.1) * unit,
        color: tint
          .copy(base)
          .multiplyScalar(0.8 + next() * 0.4)
          .getStyle(),
      }
    })
  }, [potR, potH, H, foliage, seed, unit])

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      <CuboidCollider args={[potR, potH / 2, potR]} position={[0, potH / 2, 0]} />
      <mesh castShadow receiveShadow position={[0, potH / 2, 0]}>
        <cylinderGeometry args={[potR, potR * 0.78, potH, 16]} />
        <meshStandardMaterial color={pot} roughness={0.9} />
      </mesh>
      <mesh position={[0, potH - 0.01 * unit, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[potR * 0.92, 16]} />
        <meshStandardMaterial color="#3a2a1a" roughness={1} />
      </mesh>
      {leaves.map((l) => (
        <mesh
          key={`leaf-${l.pos[0].toFixed(3)}:${l.pos[1].toFixed(3)}`}
          castShadow
          position={l.pos}
        >
          <icosahedronGeometry args={[l.r, 0]} />
          <meshStandardMaterial color={l.color} flatShading roughness={0.9} />
        </mesh>
      ))}
    </RigidBody>
  )
}
