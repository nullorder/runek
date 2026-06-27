import { useFrame } from '@react-three/fiber'
import { CylinderCollider, RigidBody } from '@react-three/rapier'
import { rng, useWorld, type WorldComponentProps } from '@runek/core'
import { useMemo, useRef } from 'react'
import type { Group } from 'three'

export interface WindmillProps extends WorldComponentProps {
  /** Tower height, in units. */
  height?: number
  /** Tower base radius, in units. */
  radius?: number
  /** Sail (blade) length, in units. */
  sailLength?: number
  /** Sail rotation speed, in radians per second. */
  sailSpeed?: number
  /** Tower color (defaults to the world palette's `wall`). */
  color?: string
  /** Cap, door, and sail-frame color (defaults to the world palette's `wood`). */
  trimColor?: string
}

const BLADES = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]

/** A tower windmill with four slowly turning sails. The tower carries a single cylinder
 *  collider; the cap, axle, and sails are decorative. Seeded only for a small starting-phase
 *  offset so a row of windmills doesn't turn in lockstep. */
export function Windmill({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  seed = 1,
  height = 7,
  radius = 2,
  sailLength = 4.5,
  sailSpeed = 0.4,
  color,
  trimColor,
}: WindmillProps) {
  const { unit, palette } = useWorld()
  const wall = color ?? palette.wall
  const wood = trimColor ?? palette.wood
  const roof = palette.roof
  const sails = useRef<Group>(null)

  const H = height * unit
  const R = radius * unit
  const topR = R * 0.66
  const capH = R * 0.9
  const sailL = sailLength * unit
  const sailY = H + capH * 0.3
  const axleZ = topR * 1.1 + 0.4 * unit

  const phase = useMemo(() => rng(seed)() * Math.PI * 2, [seed])

  useFrame((_, delta) => {
    if (sails.current) sails.current.rotation.z += sailSpeed * delta
  })

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      <CylinderCollider args={[H / 2, R]} position={[0, H / 2, 0]} />

      {/* tapered tower */}
      <mesh position={[0, H / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[topR, R, H, 16]} />
        <meshStandardMaterial color={wall} flatShading />
      </mesh>

      {/* conical cap */}
      <mesh position={[0, H + capH / 2, 0]} castShadow>
        <coneGeometry args={[topR * 1.15, capH, 16]} />
        <meshStandardMaterial color={roof} flatShading />
      </mesh>

      {/* door on the front */}
      <mesh position={[0, 1 * unit, R * 0.98]} castShadow>
        <boxGeometry args={[0.9 * unit, 1.8 * unit, 0.12 * unit]} />
        <meshStandardMaterial color={wood} />
      </mesh>

      {/* axle from the cap front out to the sails */}
      <mesh position={[0, sailY, axleZ / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.15 * unit, 0.15 * unit, axleZ, 8]} />
        <meshStandardMaterial color={wood} />
      </mesh>

      {/* four turning sails */}
      <group ref={sails} position={[0, sailY, axleZ]} rotation={[0, 0, phase]}>
        {BLADES.map((a) => (
          <group key={a} rotation={[0, 0, a]}>
            {/* spar */}
            <mesh position={[0, sailL / 2, 0]} castShadow>
              <boxGeometry args={[0.14 * unit, sailL, 0.14 * unit]} />
              <meshStandardMaterial color={wood} />
            </mesh>
            {/* canvas, offset to one side of the spar */}
            <mesh position={[0.5 * unit, sailL * 0.52, 0]} castShadow>
              <boxGeometry args={[0.8 * unit, sailL * 0.82, 0.05 * unit]} />
              <meshStandardMaterial color={wall} />
            </mesh>
          </group>
        ))}
      </group>
    </RigidBody>
  )
}
