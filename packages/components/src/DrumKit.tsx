import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { pick, rng, useMaterials, useWorld, type Vec3, type WorldComponentProps } from '@runek/core'

export interface DrumKitProps extends WorldComponentProps {
  /** The shells. Seeded from a few finishes when unset. */
  color?: string
}

const SHELLS = ['#8e1b1b', '#14213d', '#1b1b1b', '#e5e5e5', '#2a6f4e', '#6b3fa0']
const LEG_ANGLES = [0, 1, 2].map((i) => (i * 2 * Math.PI) / 3)

/**
 * A five-piece kit facing local +Z with the throne behind it: a bass drum on its side, a
 * snare, two toms on the bass drum and a floor tom, a hi-hat, and crash and ride cymbals on
 * stands, laid out for a right-handed player sitting at the throne. Seeded: the shell finish.
 * One cuboid collider round the drums; the throne has none, so a `Person` can sit on it.
 */
export function DrumKit({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  seed = 1,
  color,
}: DrumKitProps) {
  const { unit: u } = useWorld()
  const m = useMaterials({
    shell: { color: color ?? pick(rng(seed), SHELLS), roughness: 0.25, metalness: 0.2 },
    head: { color: '#efe9dc', roughness: 0.6 },
    chrome: { color: '#c9ccd1', roughness: 0.3, metalness: 0.8 },
    bronze: { color: '#c9a24a', roughness: 0.25, metalness: 0.8 },
    seat: { color: '#1b1b1b', roughness: 0.7 },
  })
  const at = (p: Vec3): Vec3 => [p[0] * u, p[1] * u, p[2] * u]

  const drum = (key: string, r: number, h: number, p: Vec3, tilt: Vec3 = [0, 0, 0]) => (
    <group key={key} position={at(p)} rotation={tilt}>
      <mesh material={m.shell} castShadow receiveShadow>
        <cylinderGeometry args={[r * u, r * u, h * u, 24]} />
      </mesh>
      {[1, -1].map((s) => (
        <mesh key={s} material={s > 0 ? m.head : m.chrome} position={[0, (s * h * u) / 2, 0]}>
          <cylinderGeometry args={[r * 1.03 * u, r * 1.03 * u, 0.012 * u, 24]} />
        </mesh>
      ))}
    </group>
  )
  const stand = (key: string, x: number, z: number, h: number) => (
    <group key={`stand-${key}`} position={[x * u, 0, z * u]}>
      <mesh material={m.chrome} position={[0, (h / 2) * u, 0]}>
        <cylinderGeometry args={[0.012 * u, 0.012 * u, h * u, 8]} />
      </mesh>
      {LEG_ANGLES.map((a) => (
        <mesh
          key={a}
          material={m.chrome}
          position={[Math.sin(a) * 0.12 * u, 0.06 * u, Math.cos(a) * 0.12 * u]}
          rotation={[0, a, 0.9]}
        >
          <cylinderGeometry args={[0.008 * u, 0.008 * u, 0.28 * u, 6]} />
        </mesh>
      ))}
    </group>
  )
  const cymbal = (key: string, r: number, p: Vec3, tilt: number) => (
    <mesh
      key={`cymbal-${key}`}
      material={m.bronze}
      castShadow
      position={at(p)}
      rotation={[tilt, 0, tilt * 0.4]}
    >
      <cylinderGeometry args={[r * u, 0.02 * u, 0.02 * u, 28]} />
    </mesh>
  )

  return (
    <group position={position} rotation={rotation}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[0.7 * u, 0.4 * u, 0.45 * u]} position={[0, 0.4 * u, 0.05 * u]} />
      </RigidBody>
      {drum('bass', 0.28, 0.42, [0, 0.29, 0.15], [Math.PI / 2, 0, 0])}
      {drum('snare', 0.18, 0.14, [0.22, 0.62, -0.22], [-0.12, 0, 0.08])}
      {drum('tom-1', 0.13, 0.2, [-0.13, 0.78, 0.08], [-0.35, 0, -0.15])}
      {drum('tom-2', 0.14, 0.22, [0.17, 0.79, 0.08], [-0.35, 0, 0.15])}
      {drum('floor-tom', 0.2, 0.38, [-0.5, 0.45, -0.12])}
      {stand('floor-tom', -0.5, -0.12, 0.26)}
      {stand('snare', 0.22, -0.22, 0.55)}
      {stand('hi-hat', 0.5, -0.25, 0.86)}
      {cymbal('hi-hat-bottom', 0.18, [0.5, 0.84, -0.25], 0)}
      {cymbal('hi-hat-top', 0.18, [0.5, 0.87, -0.25], 0)}
      {stand('crash', 0.5, 0.3, 1.32)}
      {cymbal('crash', 0.22, [0.5, 1.33, 0.3], -0.3)}
      {stand('ride', -0.72, 0.25, 1.2)}
      {cymbal('ride', 0.27, [-0.72, 1.21, 0.25], -0.25)}
      <group position={[0, 0, -0.62 * u]}>
        <mesh material={m.seat} castShadow position={[0, 0.5 * u, 0]}>
          <cylinderGeometry args={[0.18 * u, 0.17 * u, 0.08 * u, 20]} />
        </mesh>
        {stand('throne', 0, 0, 0.46)}
      </group>
    </group>
  )
}

DrumKit.groundSitting = true
