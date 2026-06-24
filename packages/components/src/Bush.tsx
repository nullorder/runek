import { rng, useWorld, type Vec3 } from '@runek/core'
import { useMemo } from 'react'
import * as THREE from 'three'

export interface BushProps {
  position?: Vec3
  rotation?: Vec3
  /** Overall radius, in units. */
  radius?: number
  /** Number of foliage blobs. */
  blobs?: number
  /** Defaults to the world palette's `foliage` slot. */
  color?: string
  seed?: number
}

interface Blob {
  pos: Vec3
  r: number
  color: string
}

/** A clustered shrub of overlapping foliage blobs: the mid-height density between
 *  Grass and Trees. Soft, so decorative (no collider). */
export function Bush({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  radius = 0.6,
  blobs = 7,
  color,
  seed = 1,
}: BushProps) {
  const { unit, palette } = useWorld()
  const foliage = color ?? palette.foliage
  const R = radius * unit

  const items = useMemo<Blob[]>(() => {
    const next = rng(seed)
    const base = new THREE.Color(foliage)
    const tint = new THREE.Color()
    return Array.from({ length: blobs }, () => {
      const br = R * (0.45 + next() * 0.4)
      const a = next() * Math.PI * 2
      const rad = next() * R * 0.5
      const shade = 0.8 + next() * 0.4
      return {
        pos: [Math.cos(a) * rad, br * 0.7 + next() * R * 0.3, Math.sin(a) * rad] as Vec3,
        r: br,
        color: tint.copy(base).multiplyScalar(shade).getStyle(),
      }
    })
  }, [R, blobs, foliage, seed])

  return (
    <group position={position} rotation={rotation}>
      {items.map((b) => (
        <mesh
          key={`blob-${b.pos[0].toFixed(3)}:${b.pos[1].toFixed(3)}`}
          castShadow
          receiveShadow
          position={b.pos}
        >
          <icosahedronGeometry args={[b.r, 0]} />
          <meshStandardMaterial color={b.color} flatShading roughness={0.95} />
        </mesh>
      ))}
    </group>
  )
}
