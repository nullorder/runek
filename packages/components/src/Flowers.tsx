import { rng, useWorld, type Vec3 } from '@runek/core'
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

export interface FlowersProps {
  position?: Vec3
  rotation?: Vec3
  /** Patch extent `[width, depth]`, in units. */
  area?: [number, number]
  count?: number
  height?: number
  /** Stem color; defaults to the world palette's `foliage` slot. */
  stemColor?: string
  seed?: number
}

interface Bloom {
  x: number
  z: number
  h: number
  hue: number
}

const HUES = [12, 45, 0, 330, 280, 200]

/** Instanced wildflowers scattered over a patch: a green stem plus a colored
 *  head, seeded so the same seed plants the same meadow. Decorative (no collider). */
export function Flowers({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  area = [6, 6],
  count = 60,
  height = 0.4,
  stemColor,
  seed = 1,
}: FlowersProps) {
  const { unit, palette } = useWorld()
  const stem = stemColor ?? palette.foliage
  const w = area[0] * unit
  const d = area[1] * unit
  const h = height * unit
  const stemRef = useRef<THREE.InstancedMesh>(null)
  const headRef = useRef<THREE.InstancedMesh>(null)

  const blooms = useMemo<Bloom[]>(() => {
    const next = rng(seed)
    return Array.from({ length: count }, () => ({
      x: (next() - 0.5) * w,
      z: (next() - 0.5) * d,
      h: h * (0.7 + next() * 0.6),
      hue: next(),
    }))
  }, [w, d, h, count, seed])

  useLayoutEffect(() => {
    const sMesh = stemRef.current
    const hMesh = headRef.current
    if (!sMesh || !hMesh) return
    const dummy = new THREE.Object3D()
    const col = new THREE.Color()
    blooms.forEach((b, i) => {
      dummy.position.set(b.x, b.h / 2, b.z)
      dummy.scale.set(1, b.h / h, 1)
      dummy.updateMatrix()
      sMesh.setMatrixAt(i, dummy.matrix)

      dummy.position.set(b.x, b.h, b.z)
      dummy.scale.set(1, 1, 1)
      dummy.updateMatrix()
      hMesh.setMatrixAt(i, dummy.matrix)
      hMesh.setColorAt(i, col.setHSL(HUES[Math.floor(b.hue * HUES.length)] / 360, 0.7, 0.6))
    })
    sMesh.instanceMatrix.needsUpdate = true
    hMesh.instanceMatrix.needsUpdate = true
    if (hMesh.instanceColor) hMesh.instanceColor.needsUpdate = true
  }, [blooms, h])

  return (
    <group position={position} rotation={rotation}>
      <instancedMesh ref={stemRef} args={[undefined, undefined, count]} castShadow>
        <cylinderGeometry args={[0.01 * unit, 0.012 * unit, h, 5]} />
        <meshStandardMaterial color={stem} />
      </instancedMesh>
      <instancedMesh ref={headRef} args={[undefined, undefined, count]} castShadow>
        <icosahedronGeometry args={[0.05 * unit, 0]} />
        <meshStandardMaterial flatShading roughness={0.8} />
      </instancedMesh>
    </group>
  )
}
