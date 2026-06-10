import { RigidBody } from '@react-three/rapier'
import { useWorld, type Vec3 } from '@runek/core'
import { useMemo } from 'react'
import * as THREE from 'three'

export interface TerrainProps {
  position?: Vec3
  /** Ground extent `[width, depth]`, in units. */
  size?: [number, number]
  thickness?: number
  /** Defaults to the world palette's `ground` slot. */
  color?: string
  /** Vertical relief amplitude, in units. 0 keeps the ground flat. */
  relief?: number
  /** Grid subdivisions for displaced ground. */
  resolution?: number
  /** Noise frequency. */
  frequency?: number
  /** Radius from center kept flat (for a build pad), in units. */
  flatRadius?: number
  seed?: number
}

function valueNoise(seed: number) {
  const hash = (x: number, y: number) => {
    let h = (seed ^ Math.imul(x, 374761393) ^ Math.imul(y, 668265263)) >>> 0
    h = Math.imul(h ^ (h >>> 13), 1274126177)
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296
  }
  return (x: number, y: number) => {
    const x0 = Math.floor(x)
    const y0 = Math.floor(y)
    const fx = x - x0
    const fy = y - y0
    const sx = fx * fx * (3 - 2 * fx)
    const sy = fy * fy * (3 - 2 * fy)
    const top = hash(x0, y0) + (hash(x0 + 1, y0) - hash(x0, y0)) * sx
    const bot = hash(x0, y0 + 1) + (hash(x0 + 1, y0 + 1) - hash(x0, y0 + 1)) * sx
    return top + (bot - top) * sy
  }
}

function fbm(noise: (x: number, y: number) => number, x: number, y: number) {
  let value = 0
  let amp = 0.5
  let freq = 1
  for (let octave = 0; octave < 4; octave++) {
    value += amp * noise(x * freq, y * freq)
    amp *= 0.5
    freq *= 2
  }
  return value
}

export function Terrain({
  position = [0, 0, 0],
  size = [40, 40],
  thickness = 0.4,
  color,
  relief = 0,
  resolution = 64,
  frequency = 0.04,
  flatRadius = 0,
  seed = 1,
}: TerrainProps) {
  const { unit, palette } = useWorld()
  const groundColor = color ?? palette.ground
  const width = size[0] * unit
  const depth = size[1] * unit
  const t = thickness * unit

  const displaced = useMemo(() => {
    if (relief <= 0) return null
    const geo = new THREE.PlaneGeometry(width, depth, resolution, resolution)
    geo.rotateX(-Math.PI / 2)
    const noise = valueNoise(seed)
    const fr = flatRadius * unit
    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      let h = (fbm(noise, x * frequency, z * frequency) - 0.5) * 2 * relief * unit
      if (fr > 0) h *= THREE.MathUtils.smoothstep(Math.hypot(x, z), fr, fr + 8 * unit)
      pos.setY(i, h)
    }
    pos.needsUpdate = true
    geo.computeVertexNormals()
    return geo
  }, [width, depth, resolution, relief, frequency, flatRadius, seed, unit])

  if (displaced) {
    return (
      <RigidBody type="fixed" colliders="trimesh" position={position}>
        <mesh geometry={displaced} receiveShadow castShadow>
          <meshStandardMaterial color={groundColor} flatShading />
        </mesh>
      </RigidBody>
    )
  }

  return (
    <RigidBody type="fixed" colliders="cuboid" position={position}>
      <mesh receiveShadow position={[0, -t / 2, 0]}>
        <boxGeometry args={[width, t, depth]} />
        <meshStandardMaterial color={groundColor} />
      </mesh>
    </RigidBody>
  )
}
