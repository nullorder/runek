import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { rng, useWorld, type Vec3 } from '@runek/core'
import { useMemo } from 'react'
import * as THREE from 'three'

export interface CrateProps {
  position?: Vec3
  rotation?: Vec3
  /** Edge length, in units. */
  size?: number
  /** Plank color; defaults to the world palette's `wood` slot. */
  color?: string
  seed?: number
}

interface Beam {
  pos: Vec3
  size: Vec3
  color: string
}

/** A slatted wooden crate: a paneled core inside a 12-edge plank frame, each plank
 *  seeded a slightly different shade. A clean cube with a cuboid collider, so it
 *  stacks. The world-building staple (see also Barrel). */
export function Crate({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  size = 0.8,
  color,
  seed = 1,
}: CrateProps) {
  const { unit, palette } = useWorld()
  const wood = color ?? palette.wood
  const s = size * unit
  const b = 0.09 * s
  const c = s / 2 - b / 2

  const beams = useMemo<Beam[]>(() => {
    const next = rng(seed)
    const base = new THREE.Color(wood)
    const tint = new THREE.Color()
    const shade = () =>
      tint
        .copy(base)
        .multiplyScalar(0.82 + next() * 0.32)
        .getStyle()
    const out: Beam[] = []
    for (const sx of [-1, 1])
      for (const sz of [-1, 1])
        out.push({ pos: [sx * c, 0, sz * c], size: [b, s, b], color: shade() })
    for (const sy of [-1, 1])
      for (const sz of [-1, 1])
        out.push({ pos: [0, sy * c, sz * c], size: [s, b, b], color: shade() })
    for (const sy of [-1, 1])
      for (const sx of [-1, 1])
        out.push({ pos: [sx * c, sy * c, 0], size: [b, b, s], color: shade() })
    return out
  }, [s, b, c, wood, seed])

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      <CuboidCollider args={[s / 2, s / 2, s / 2]} position={[0, s / 2, 0]} />
      <group position={[0, s / 2, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[s * 0.9, s * 0.9, s * 0.9]} />
          <meshStandardMaterial color={palette.woodDark} roughness={0.9} />
        </mesh>
        {beams.map((bm) => (
          <mesh
            key={`beam-${bm.pos[0].toFixed(2)}:${bm.pos[1].toFixed(2)}:${bm.pos[2].toFixed(2)}`}
            castShadow
            receiveShadow
            position={bm.pos}
          >
            <boxGeometry args={bm.size} />
            <meshStandardMaterial color={bm.color} roughness={0.85} />
          </mesh>
        ))}
      </group>
    </RigidBody>
  )
}
