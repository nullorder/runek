import { useFrame } from '@react-three/fiber'
import { rng, useWorld, type Vec3 } from '@runek/core'
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

export interface CloudsProps {
  position?: Vec3
  rotation?: Vec3
  /** Number of clouds. */
  count?: number
  /** Spread `[width, depth]`, in units. */
  area?: [number, number]
  /** Height above the origin, in units. */
  height?: number
  /** Drift speed along +X, in units/sec (0 holds still). */
  drift?: number
  color?: string
  seed?: number
}

interface Puff {
  pos: Vec3
  r: number
}

/** Drifting clouds built from clustered soft blobs (no textures). Layer above a
 *  `Sky` for depth and motion. Decorative (no collider). */
export function Clouds({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  count = 8,
  area = [80, 80],
  height = 24,
  drift = 0.6,
  color = '#eef2f7',
  seed = 1,
}: CloudsProps) {
  const { unit } = useWorld()
  const w = area[0] * unit
  const d = area[1] * unit
  const hy = height * unit
  const PER = 5
  const total = count * PER
  const ref = useRef<THREE.InstancedMesh>(null)
  const groupRef = useRef<THREE.Group>(null)

  const puffs = useMemo<Puff[]>(() => {
    const next = rng(seed)
    const out: Puff[] = []
    for (let c = 0; c < count; c++) {
      const cx = (next() - 0.5) * w
      const cz = (next() - 0.5) * d
      const cy = hy + (next() - 0.5) * 0.15 * hy
      const scale = 1.4 + next() * 1.6
      for (let p = 0; p < PER; p++) {
        out.push({
          pos: [
            cx + (next() - 0.5) * 4 * scale * unit,
            cy + (next() - 0.5) * 1.2 * scale * unit,
            cz + (next() - 0.5) * 3 * scale * unit,
          ] as Vec3,
          r: (1.0 + next() * 1.2) * scale * unit,
        })
      }
    }
    return out
  }, [count, w, d, hy, seed, unit])

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const dummy = new THREE.Object3D()
    puffs.forEach((p, i) => {
      dummy.position.set(...p.pos)
      dummy.scale.setScalar(p.r)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  }, [puffs])

  useFrame((_, delta) => {
    const g = groupRef.current
    if (!g || drift === 0) return
    g.position.x += drift * unit * delta
    if (g.position.x > w / 2) g.position.x -= w
  })

  return (
    <group position={position} rotation={rotation}>
      <group ref={groupRef}>
        <instancedMesh ref={ref} args={[undefined, undefined, total]}>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial
            color={color}
            roughness={1}
            transparent
            opacity={0.92}
            flatShading
          />
        </instancedMesh>
      </group>
    </group>
  )
}
