import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { pick, rng, useMaterials, useWorld, type Vec3, type WorldComponentProps } from '@runek/core'

export interface BeachChairProps extends WorldComponentProps {
  /** Along local Z, in units. */
  length?: number
  width?: number
  /** To the top of the cushion on the bed, in units. */
  height?: number
  /** How far the back is raised from flat, in radians. */
  recline?: number
  /** The cushion. Seeded from beach colours when unset. */
  color?: string
  /** The frame. Seeded teak or white when unset. */
  frameColor?: string
}

const CUSHIONS = ['#f4f1ea', '#2a9d8f', '#e76f51', '#264653', '#e9c46a', '#7fb7be', '#d1495b']
const FRAMES = ['#9a6b3f', '#9a6b3f', '#f2f0eb']
const BACK = 0.62
const CUSHION = 0.06

/**
 * A sun lounger for a beach or a pool deck: a slatted frame on four legs lying along local Z,
 * a flat bed, and a back raised on a hinge at the -Z end, with a cushion over both. A
 * `Person` in the `lie` pose lies along it at `height`, head toward the back (lower `recline`
 * to lay the back flat). Seeded: the cushion and the frame. One cuboid collider round the bed.
 */
export function BeachChair({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  seed = 1,
  length = 1.9,
  width = 0.66,
  height = 0.36,
  recline = 0.7,
  color,
  frameColor,
}: BeachChairProps) {
  const { unit: u } = useWorld()
  const next = rng(seed)
  const cushion = color ?? pick(next, CUSHIONS)
  const frame = frameColor ?? pick(next, FRAMES)
  const m = useMaterials({
    frame: { color: frame, roughness: 0.75 },
    cushion: { color: cushion, roughness: 0.95 },
  })
  const L = length * u
  const W = width * u
  const top = height * u
  const c = CUSHION * u
  const bed = top - c
  const rail = 0.04 * u
  const back = Math.min(BACK * u, L * 0.4)
  const hinge = -L / 2 + back
  const leg = 0.05 * u
  const lx = W / 2 - leg / 2
  const legs: Vec3[] = [
    [-lx, (bed - rail) / 2, -L / 2 + leg],
    [lx, (bed - rail) / 2, -L / 2 + leg],
    [-lx, (bed - rail) / 2, L / 2 - leg],
    [lx, (bed - rail) / 2, L / 2 - leg],
  ]
  const bedL = L / 2 - hinge

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      <CuboidCollider
        args={[W / 2, top / 2, bedL / 2]}
        position={[0, top / 2, (hinge + L / 2) / 2]}
      />

      {[-1, 1].map((s) => (
        <mesh
          key={`rail${s}`}
          material={m.frame}
          castShadow
          position={[s * (W / 2 - rail / 2), bed - rail / 2, 0]}
        >
          <boxGeometry args={[rail, rail, L]} />
        </mesh>
      ))}
      {legs.map((p) => (
        <mesh key={p.join()} material={m.frame} castShadow position={p}>
          <boxGeometry args={[leg, bed - rail, leg]} />
        </mesh>
      ))}
      {Array.from({ length: 7 }, (_, i) => (
        <mesh
          key={`slat${i}`}
          material={m.frame}
          receiveShadow
          position={[0, bed - 0.01 * u, hinge + (bedL * (i + 0.5)) / 7]}
        >
          <boxGeometry args={[W - rail * 2, 0.02 * u, (bedL / 7) * 0.7]} />
        </mesh>
      ))}
      <mesh
        material={m.cushion}
        castShadow
        receiveShadow
        position={[0, bed + c / 2, (hinge + L / 2) / 2]}
      >
        <boxGeometry args={[W - rail * 0.5, c, bedL - 0.01 * u]} />
      </mesh>

      <group position={[0, bed, hinge]} rotation={[recline, 0, 0]}>
        <mesh material={m.frame} castShadow position={[0, -0.01 * u, -back / 2]}>
          <boxGeometry args={[W - rail * 2, 0.02 * u, back]} />
        </mesh>
        <mesh material={m.cushion} castShadow receiveShadow position={[0, c / 2, -back / 2]}>
          <boxGeometry args={[W - rail * 0.5, c, back - 0.01 * u]} />
        </mesh>
      </group>
      {recline > 0.05 &&
        [-1, 1].map((s) => {
          // A prop from the frame up to the underside of the raised back, two thirds along it.
          const along = back * 0.66
          const y = Math.sin(recline) * along
          const z = hinge - Math.cos(recline) * along
          const foot = hinge - back * 0.9
          const dz = z - foot
          return (
            <mesh
              key={`prop${s}`}
              material={m.frame}
              castShadow
              position={[s * (W / 2 - rail * 1.5), bed + y / 2 - 0.02 * u, (z + foot) / 2]}
              rotation={[Math.atan2(dz, y), 0, 0]}
            >
              <boxGeometry args={[0.025 * u, Math.hypot(y, dz), 0.025 * u]} />
            </mesh>
          )
        })}
    </RigidBody>
  )
}

BeachChair.groundSitting = true
