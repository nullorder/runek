import { RigidBody, TrimeshCollider } from '@react-three/rapier'
import { useWorld, type Vec3 } from '@runek/core'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import {
  TERRAIN_DEFAULTS,
  type TerrainShape,
  terrainHeight,
  terrainSurface,
} from './surfaces/terrain'

export interface TerrainProps {
  position?: Vec3
  rotation?: Vec3
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
  /** Radial island falloff (0 = off). When set, the ground domes up toward the center and
   *  sinks below the world ground at its rim, so the mesh reads as a landmass surrounded by
   *  water. The value is the fraction of the half-extent that stays land before the coast
   *  (e.g. 0.8 = land out to 80% of the radius, then a shoreline into the sea). */
  falloff?: number
  /** Register a collider (default true). Set false for distant/backdrop terrain the player
   *  never walks, to skip a large trimesh collider. */
  collider?: boolean
  seed?: number
}

/** The displaced ground mesh, raised from the same height field the ground query reads. */
export function terrainGeometry(shape: TerrainShape, unit: number): THREE.PlaneGeometry {
  const { size = TERRAIN_DEFAULTS.size, resolution = TERRAIN_DEFAULTS.resolution } = shape
  const geo = new THREE.PlaneGeometry(size[0] * unit, size[1] * unit, resolution, resolution)
  geo.rotateX(-Math.PI / 2)
  const height = terrainHeight(shape, unit)
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) pos.setY(i, height(pos.getX(i), pos.getZ(i)))
  pos.needsUpdate = true
  geo.computeVertexNormals()
  return geo
}

export function Terrain({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  size = TERRAIN_DEFAULTS.size,
  thickness = 0.4,
  color,
  relief = TERRAIN_DEFAULTS.relief,
  resolution = TERRAIN_DEFAULTS.resolution,
  frequency = TERRAIN_DEFAULTS.frequency,
  flatRadius = TERRAIN_DEFAULTS.flatRadius,
  falloff = TERRAIN_DEFAULTS.falloff,
  collider = true,
  seed = TERRAIN_DEFAULTS.seed,
}: TerrainProps) {
  const { unit, palette } = useWorld()
  const groundColor = color ?? palette.ground
  const width = size[0] * unit
  const depth = size[1] * unit
  const t = thickness * unit

  const [sizeX, sizeZ] = size
  const displaced = useMemo(
    () =>
      relief > 0
        ? terrainGeometry(
            { size: [sizeX, sizeZ], relief, resolution, frequency, flatRadius, falloff, seed },
            unit,
          )
        : null,
    [sizeX, sizeZ, resolution, relief, frequency, flatRadius, falloff, seed, unit],
  )
  useEffect(() => () => displaced?.dispose(), [displaced])

  if (displaced) {
    const mesh = (
      <mesh geometry={displaced} receiveShadow castShadow>
        <meshStandardMaterial color={groundColor} flatShading />
      </mesh>
    )
    // The trimesh is built here rather than with colliders="trimesh", which derives it in an
    // effect one commit after mount: a dynamic body spawned over the terrain could fall through.
    return collider ? (
      <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
        <TrimeshCollider
          args={[
            displaced.attributes.position.array,
            (displaced.index as THREE.BufferAttribute).array,
          ]}
        />
        {mesh}
      </RigidBody>
    ) : (
      <group position={position} rotation={rotation}>
        {mesh}
      </group>
    )
  }

  const flat = (
    <mesh receiveShadow position={[0, -t / 2, 0]}>
      <boxGeometry args={[width, t, depth]} />
      <meshStandardMaterial color={groundColor} />
    </mesh>
  )
  return collider ? (
    <RigidBody type="fixed" colliders="cuboid" position={position} rotation={rotation}>
      {flat}
    </RigidBody>
  ) : (
    <group position={position} rotation={rotation}>
      {flat}
    </group>
  )
}

Terrain.surface = terrainSurface
