import { rng, useWorld, type Vec3 } from '@runek/core'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

export interface PathProps {
  position?: Vec3
  rotation?: Vec3
  /** Length along local Z, in units. */
  length?: number
  width?: number
  /** Lateral meander amplitude, in units. */
  meander?: number
  /** Total height climbed from the near end (local −Z) to the far end (+Z), in units. For a
   *  trail that gains height as it winds; the ribbon rises linearly along its length. */
  rise?: number
  /** Explicit elevation profile, in units: evenly spaced samples from the near end (local −Z)
   *  to the far end (+Z), linearly interpolated along the ribbon. Overrides `rise`. Author it
   *  from the terrain the trail crosses so the ribbon hugs the ground it climbs. */
  heights?: number[]
  /** Defaults to the world palette's `ground` slot. */
  color?: string
  segments?: number
  seed?: number
}

/** A meandering ribbon trail laid flat in the XZ plane, draped just above the
 *  ground. Decorative: you walk on the terrain beneath it, so it owns no collider. */
export function Path({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  length = 12,
  width = 1.4,
  meander = 1.2,
  rise = 0,
  heights,
  color,
  segments = 48,
  seed = 1,
}: PathProps) {
  const { unit, palette } = useWorld()
  const pathColor = color ?? palette.ground
  const L = length * unit
  const W = width * unit
  const amp = meander * unit
  const Rise = rise * unit

  const geometry = useMemo(() => {
    const next = rng(seed)
    const p1 = next() * Math.PI * 2
    const p2 = next() * Math.PI * 2
    const f1 = 1.2 + next() * 0.6
    const f2 = 2.6 + next() * 1.0
    const centerX = (t: number) =>
      amp * (Math.sin(t * Math.PI * f1 + p1) * 0.6 + Math.sin(t * Math.PI * f2 + p2) * 0.4)
    const profile = heights && heights.length > 1 ? heights : null
    const elevation = (t: number) => {
      if (!profile) return t * Rise
      const s = t * (profile.length - 1)
      const i = Math.min(profile.length - 2, Math.floor(s))
      return (profile[i] + (profile[i + 1] - profile[i]) * (s - i)) * unit
    }

    const positions: number[] = []
    const indices: number[] = []
    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      const z = -L / 2 + t * L
      const cx = centerX(t)
      const dt = 1 / segments
      const tx = centerX(Math.min(1, t + dt)) - cx
      const tz = dt * L
      const tl = Math.hypot(tx, tz) || 1
      const nx = -tz / tl
      const nz = tx / tl
      const y = elevation(t)
      positions.push(cx + (nx * W) / 2, y, z + (nz * W) / 2)
      positions.push(cx - (nx * W) / 2, y, z - (nz * W) / 2)
    }
    for (let i = 0; i < segments; i++) {
      const a = i * 2
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    g.setIndex(indices)
    g.computeVertexNormals()
    return g
  }, [L, W, amp, Rise, heights, unit, segments, seed])

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <mesh
      geometry={geometry}
      position={[position[0], position[1] + 0.02 * unit, position[2]]}
      rotation={rotation}
      receiveShadow
    >
      <meshStandardMaterial color={pathColor} roughness={1} side={THREE.DoubleSide} />
    </mesh>
  )
}
