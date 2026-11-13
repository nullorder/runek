import { CuboidCollider, RigidBody } from '@react-three/rapier'
import {
  lazyModule,
  useLight,
  useLuminance,
  useMaterial,
  useNodeRenderer,
  useWorld,
  type Vec3,
} from '@runek/core'
import { useMemo } from 'react'
import { BoxGeometry, CylinderGeometry, Matrix4, PlaneGeometry } from 'three'
import { emissiveColor, glowMaterial, mid, useLadder } from './city/glow'
import { coneMaterial, poolMaterial } from './city/haze'
import { useInstances } from './city/instances'

// The haze's node (TSL) materials, loaded only under a node renderer.
const hazeNodes = lazyModule(() => import('./nodes/haze'))

export interface StreetLampProps {
  /** Base of the pole [x, y, z] in units. The arm reaches along local +X. */
  position?: Vec3
  /** Rotation [x, y, z] in radians. */
  rotation?: Vec3
  /** Accepted for the component contract; this component has no seeded variation. */
  seed?: number
  /** Pole height to the arm, in units. */
  height?: number
  /** How far the arm reaches out from the pole, in units. */
  arm?: number
  /** Lamp color. A cool white by default: the city lights its streets like day. */
  color?: string
  /** Pole, arm and head color. Defaults to the world palette's `metal`. */
  poleColor?: string
  /** Candela toward the street, when the world lends this lamp a real light. */
  intensity?: number
  /** Ask the world's light pool for a real light. The lens, cone and pool glow either way. */
  light?: boolean
  /** Draw the haze cone under the head. */
  cone?: boolean
  /** Peak luminance of the haze cone (scene-linear), times the world's `lamp` level. */
  haze?: number
  /** Draw the soft pool on the street under the head, for lamps the pool has no light for. */
  pool?: boolean
  /** Radius of that pool, in units. */
  poolRadius?: number
  /** What the pool lies on. `ground` is the world's ground, for a lamp on a pavement whose arm
   *  reaches out over the street below it. `base` is whatever the lamp itself stands on: a plaza,
   *  a lawn, a roof. */
  poolOn?: 'ground' | 'base'
}

/**
 * A street lamp on an arm: a pole, a hot lens at the world's `lamp` luminance level, a haze cone
 * under the head, and a soft pool on the street. The real light comes only from the world's
 * light pool (`useLight`), which lends it to the lamps that matter most to the view; every other
 * lamp still reads through its lens, cone, pool, bloom and fog. The pool fades in with distance
 * so it does not double the real light on the nearest lamps. One thin collider for the pole.
 */
export function StreetLamp({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  height = 8,
  arm = 2.4,
  color = '#dfe8ff',
  poleColor,
  intensity = 350,
  light = true,
  cone = true,
  haze = 0.06,
  pool = true,
  poolRadius = 6,
  poolOn = 'ground',
}: StreetLampProps) {
  const { unit, palette, ground } = useWorld()
  const ladder = useLadder()
  const lamp = useLuminance().lamp
  const nodes = useNodeRenderer() ? hazeNodes() : null
  const h = height * unit
  const a = arm * unit
  const metal = useMaterial({
    slot: 'metal.painted',
    color: poleColor ?? palette.metal,
    roughness: 0.55,
    metalness: 0.15,
  })
  const lens = glowMaterial(color, mid(ladder.lampLens))
  const lit = haze * lamp
  const coneMat = useMemo(() => {
    const c = emissiveColor(color, lit)
    return nodes ? nodes.coneNodeMaterial(c) : coneMaterial(c)
  }, [color, lit, nodes])
  const poolMat = useMemo(() => {
    const c = emissiveColor(color, ladder.streetUnderSign[0])
    return nodes
      ? nodes.poolNodeMaterial(c, 20 * unit, 45 * unit)
      : poolMaterial(c, 20 * unit, 45 * unit)
  }, [color, ladder.streetUnderSign, unit, nodes])
  const emitter = useLight({ color, intensity, distance: 26 * unit, decay: 2 }, light)
  const coneH = h - 0.3 * unit
  // The pool lies a little above the world's ground (the street), whatever the base height, or
  // a little above what the lamp stands on.
  const poolY = poolOn === 'base' ? 0.045 * unit : ground + 0.045 * unit - position[1]
  // Every lamp's cone is an instance in one mesh and every pool in another (`useInstances`):
  // both are see-through, so static batching leaves them alone, and a city lit by a hundred
  // lamps would be two hundred draws of haze.
  const coneAt = useMemo(
    () => (cone ? [new Matrix4().makeTranslation(a, h - 0.25 * unit - coneH / 2, 0)] : []),
    [cone, a, h, coneH, unit],
  )
  const poolAt = useMemo(
    () => (pool ? [new Matrix4().makeRotationX(-Math.PI / 2).setPosition(a, poolY, 0)] : []),
    [pool, a, poolY],
  )
  const place = [position, rotation]
  const root = useInstances(
    `lamp-cone:${coneMat.name}:${coneH}`,
    () => ({ geometry: coneGeometry(coneH, unit), material: coneMat, renderOrder: 2 }),
    coneAt,
    null,
    place,
  )
  const pools = useInstances(
    `lamp-pool:${poolMat.name}:${poolRadius}`,
    () => ({ geometry: plane(poolRadius * 2 * unit), material: poolMat, renderOrder: 1 }),
    poolAt,
    null,
    place,
  )

  return (
    <group ref={root} position={position} rotation={rotation}>
      <group ref={pools} />
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[0.1 * unit, h / 2, 0.1 * unit]} position={[0, h / 2, 0]} />
      </RigidBody>
      <mesh position={[0, h / 2, 0]} material={metal} geometry={poleGeometry(h, unit)} />
      <mesh
        position={[a / 2, h - 0.1 * unit, 0]}
        material={metal}
        geometry={box(a, 0.1 * unit, 0.12 * unit)}
      />
      <mesh
        position={[a, h - 0.12 * unit, 0]}
        material={metal}
        geometry={box(0.8 * unit, 0.16 * unit, 0.36 * unit)}
      />
      <mesh
        position={[a, h - 0.21 * unit, 0]}
        material={lens}
        geometry={box(0.62 * unit, 0.02 * unit, 0.24 * unit)}
      />
      <object3D ref={emitter.ref} position={[a, h - 0.45 * unit, 0]} />
    </group>
  )
}

// Shared geometry: lamps along a street repeat the same few shapes.
const geometries = new Map<string, BoxGeometry | CylinderGeometry | PlaneGeometry>()
function cached<G extends BoxGeometry | CylinderGeometry | PlaneGeometry>(
  key: string,
  make: () => G,
): G {
  let g = geometries.get(key) as G | undefined
  if (!g) {
    g = make()
    geometries.set(key, g)
  }
  return g
}
const box = (w: number, h: number, d: number) =>
  cached(`box:${w}:${h}:${d}`, () => new BoxGeometry(w, h, d))
const poleGeometry = (h: number, unit: number) =>
  cached(`pole:${h}:${unit}`, () => new CylinderGeometry(0.07 * unit, 0.11 * unit, h, 12))
const coneGeometry = (h: number, unit: number) =>
  cached(`cone:${h}:${unit}`, () => new CylinderGeometry(0.25 * unit, 3.4 * unit, h, 24, 1, true))
const plane = (size: number) => cached(`plane:${size}`, () => new PlaneGeometry(size, size))

StreetLamp.groundSitting = true
