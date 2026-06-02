import { rng, useWorld, type Vec3 } from '@runek/core'
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

export interface GrassProps {
  position?: Vec3
  rotation?: Vec3
  /** Patch extent `[width, depth]`, in units. */
  area?: [number, number]
  count?: number
  height?: number
  color?: string
  seed?: number
}

interface Blade {
  x: number
  z: number
  rot: number
  scale: number
  shade: number
}

/** Decorative instanced blades — no collider. */
export function Grass({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  area = [10, 10],
  count = 600,
  height = 0.35,
  color = '#5f8a3a',
  seed = 1,
}: GrassProps) {
  const { unit } = useWorld()
  const w = area[0] * unit
  const d = area[1] * unit
  const h = height * unit
  const ref = useRef<THREE.InstancedMesh>(null)

  const blades = useMemo<Blade[]>(() => {
    const next = rng(seed)
    return Array.from({ length: count }, () => ({
      x: (next() - 0.5) * w,
      z: (next() - 0.5) * d,
      rot: next() * Math.PI,
      scale: 0.6 + next() * 0.8,
      shade: 0.8 + next() * 0.4,
    }))
  }, [w, d, count, seed])

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const dummy = new THREE.Object3D()
    const base = new THREE.Color(color)
    const tint = new THREE.Color()
    blades.forEach((b, i) => {
      dummy.position.set(b.x, (h * b.scale) / 2, b.z)
      dummy.rotation.set(0, b.rot, 0)
      dummy.scale.set(1, b.scale, 1)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      mesh.setColorAt(i, tint.copy(base).multiplyScalar(b.shade))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [blades, h, color])

  return (
    <group position={position} rotation={rotation}>
      <instancedMesh ref={ref} args={[undefined, undefined, count]} castShadow receiveShadow>
        <coneGeometry args={[0.015 * unit, h, 4]} />
        <meshStandardMaterial />
      </instancedMesh>
    </group>
  )
}
