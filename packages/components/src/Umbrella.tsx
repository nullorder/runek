import { CylinderCollider, RigidBody } from '@react-three/rapier'
import { pick, rng, useMaterials, useWorld, type WorldComponentProps } from '@runek/core'
import { useMemo } from 'react'
import { BufferGeometry, DoubleSide, Float32BufferAttribute, Quaternion, Vector3 } from 'three'

export interface UmbrellaProps extends WorldComponentProps {
  /** Canopy radius, in units. */
  radius?: number
  /** From the ground to the canopy's rim, in units. */
  height?: number
  /** Lean toward local +Z, in radians, from the foot of the pole. */
  tilt?: number
  /** Every other panel. Seeded from beach colours when unset. */
  color?: string
  /** The panels between. */
  stripeColor?: string
  /** Canopy panels, rounded to an even count so the stripes alternate all the way round. */
  panels?: number
}

const CANVAS = ['#d1495b', '#00798c', '#edae49', '#30638e', '#2a9d8f', '#e76f51', '#3c8d5a']
const UP = new Vector3(0, 1, 0)
const RADIAL = 6
const ACROSS = 6

/** How high the canopy stands over its rim at `t` of the way out along a rib, 0 to 1. */
const profile = (t: number, rise: number) => rise * (1 - t ** 1.3)

/** Every other panel of the canopy, starting at `first`, as one geometry around the pole,
 *  with its rim at y = 0. The canvas sags a little between the ribs. */
function panelGeometry(R: number, rise: number, count: number, first: number) {
  const pos: number[] = []
  const index: number[] = []
  const step = (Math.PI * 2) / count
  for (let k = first; k < count; k += 2) {
    const base = pos.length / 3
    for (let i = 0; i <= RADIAL; i++) {
      const t = i / RADIAL
      for (let j = 0; j <= ACROSS; j++) {
        const f = j / ACROSS
        const a = (k + f) * step
        const dip = Math.sin(Math.PI * f)
        const r = t * R * (1 - 0.03 * dip)
        pos.push(Math.sin(a) * r, profile(t, rise) - 0.06 * R * t * dip, Math.cos(a) * r)
      }
    }
    for (let i = 0; i < RADIAL; i++) {
      for (let j = 0; j < ACROSS; j++) {
        const p00 = base + i * (ACROSS + 1) + j
        const p10 = p00 + ACROSS + 1
        index.push(p00, p10, p00 + 1, p10, p10 + 1, p00 + 1)
      }
    }
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.setIndex(index)
  g.computeVertexNormals()
  return g
}

/** A rod's centre, turn and length to run from `a` to `b`. */
function rod(a: Vector3, b: Vector3) {
  const d = b.clone().sub(a)
  return {
    position: a.clone().add(b).multiplyScalar(0.5),
    quaternion: new Quaternion().setFromUnitVectors(UP, d.clone().normalize()),
    length: d.length(),
  }
}

/**
 * A beach umbrella: a weighted base, a wooden pole, and a canopy of panels in alternating
 * colours stretched over ribs, sagging a little between them, with a finial on top. `tilt`
 * leans the pole and canopy from its foot to shade against a low sun; the pole is thin enough
 * to run up through a `Table`. Seeded: the canvas colour. One cylinder collider round the pole.
 */
export function Umbrella({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  seed = 1,
  radius = 1.1,
  height = 2.1,
  tilt = 0,
  color,
  stripeColor = '#f4f1ea',
  panels = 8,
}: UmbrellaProps) {
  const { unit: u, palette } = useWorld()
  const m = useMaterials({
    canvas: { color: color ?? pick(rng(seed), CANVAS), roughness: 0.9, side: DoubleSide },
    stripe: { color: stripeColor, roughness: 0.9, side: DoubleSide },
    wood: { color: palette.wood, roughness: 0.85 },
    base: { color: palette.stone, roughness: 0.9 },
  })
  const R = radius * u
  const H = height * u
  const rise = 0.3 * R
  const count = Math.max(6, Math.round(panels / 2) * 2)
  const pole = 0.02 * u
  const top = H + rise

  const { canvas, stripe, ribs } = useMemo(() => {
    const ribs = Array.from({ length: count }, (_, k) => {
      const a = (k * Math.PI * 2) / count
      const out = (t: number, drop: number) =>
        new Vector3(Math.sin(a) * t * R, H + profile(t, rise) - drop, Math.cos(a) * t * R)
      return [
        rod(out(0.03, 0.02 * u), out(0.99, 0.015 * u)),
        rod(new Vector3(0, H - 0.25 * R, 0), out(0.5, 0.06 * R)),
      ]
    }).flat()
    return {
      canvas: panelGeometry(R, rise, count, 0),
      stripe: panelGeometry(R, rise, count, 1),
      ribs,
    }
  }, [R, H, rise, count, u])

  return (
    <group position={position} rotation={rotation}>
      <RigidBody type="fixed" colliders={false}>
        <CylinderCollider
          args={[top / 2, pole * 2]}
          position={[0, (Math.cos(tilt) * top) / 2, (Math.sin(tilt) * top) / 2]}
          rotation={[tilt, 0, 0]}
        />
      </RigidBody>
      <mesh material={m.base} castShadow receiveShadow position={[0, 0.04 * u, 0]}>
        <cylinderGeometry args={[0.18 * u, 0.22 * u, 0.08 * u, 20]} />
      </mesh>
      <group rotation={[tilt, 0, 0]}>
        <mesh material={m.wood} castShadow position={[0, top / 2, 0]}>
          <cylinderGeometry args={[pole, pole, top, 8]} />
        </mesh>
        <mesh material={m.canvas} geometry={canvas} castShadow position={[0, H, 0]} />
        <mesh material={m.stripe} geometry={stripe} castShadow position={[0, H, 0]} />
        {ribs.map((r) => (
          <mesh
            key={r.position.toArray().join()}
            material={m.wood}
            position={r.position}
            quaternion={r.quaternion}
          >
            <cylinderGeometry args={[0.006 * u, 0.006 * u, r.length, 5]} />
          </mesh>
        ))}
        <mesh material={m.wood} position={[0, H - 0.25 * R, 0]}>
          <cylinderGeometry args={[pole * 1.8, pole * 1.8, 0.08 * u, 10]} />
        </mesh>
        <mesh material={m.wood} castShadow position={[0, top + 0.04 * u, 0]}>
          <sphereGeometry args={[0.035 * u, 12, 8]} />
        </mesh>
      </group>
    </group>
  )
}

Umbrella.groundSitting = true
