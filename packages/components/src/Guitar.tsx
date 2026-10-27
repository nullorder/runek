import { pick, rng, useMaterials, useWorld, type WorldComponentProps } from '@runek/core'

export type GuitarKind = 'acoustic' | 'electric' | 'bass'

export interface GuitarProps extends WorldComponentProps {
  /** Seeded when unset. */
  kind?: GuitarKind
  /** The body. Seeded from a few finishes for its kind when unset. */
  color?: string
}

const KINDS: GuitarKind[] = ['acoustic', 'electric', 'bass']
const FINISHES: Record<GuitarKind, string[]> = {
  acoustic: ['#c98b4a', '#8a5a2b', '#e0b07a', '#3b2416'],
  electric: ['#b3001b', '#f2efe8', '#101010', '#1f6fb2', '#f2a541', '#2e8b57'],
  bass: ['#101010', '#7a1f1f', '#c98b4a', '#2f4858'],
}
const BODY_TOP = 0.62

/**
 * A guitar leaning back on a floor stand, its front toward local +Z: an acoustic with a round
 * sound hole, an electric with pickups, or a bass with its longer neck, each with a
 * fretboard, a headstock and tuning pegs. Seeded: the kind and the finish. Decorative: no
 * collider.
 */
export function Guitar({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  seed = 1,
  kind,
  color,
}: GuitarProps) {
  const { unit: u } = useWorld()
  const next = rng(seed)
  const type = kind ?? pick(next, KINDS)
  const finish = color ?? pick(next, FINISHES[type])
  const acoustic = type === 'acoustic'
  const m = useMaterials({
    stand: { color: '#1d1d1f', roughness: 0.5 },
    body: { color: finish, roughness: 0.25 },
    hole: { color: '#120c08', roughness: 1 },
    pickup: { color: '#202020', roughness: 0.4 },
    neck: { color: '#3a2414', roughness: 0.6 },
    head: { color: acoustic ? '#3a2414' : finish, roughness: 0.4 },
    peg: { color: '#c9ccd1', roughness: 0.3, metalness: 0.8 },
  })
  const depth = acoustic ? 0.1 : 0.045
  const lower = acoustic ? 0.2 : 0.17
  const upper = acoustic ? 0.155 : 0.135
  const neck = type === 'bass' ? 0.72 : 0.5

  return (
    <group position={position} rotation={rotation}>
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          material={m.stand}
          castShadow
          position={[s * 0.13 * u, 0.04 * u, 0.06 * u]}
          rotation={[0, s * 0.4, 0]}
        >
          <boxGeometry args={[0.02 * u, 0.02 * u, 0.3 * u]} />
        </mesh>
      ))}
      <mesh
        material={m.stand}
        castShadow
        position={[0, 0.45 * u, -0.12 * u]}
        rotation={[-0.25, 0, 0]}
      >
        <cylinderGeometry args={[0.01 * u, 0.01 * u, 0.9 * u, 6]} />
      </mesh>
      <group position={[0, 0.1 * u, 0]} rotation={[-0.22, 0, 0]}>
        <mesh
          material={m.body}
          castShadow
          position={[0, (0.12 + lower) * u, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[1, 1, 1.12]}
        >
          <cylinderGeometry args={[lower * u, lower * u, depth * u, 28]} />
        </mesh>
        <mesh
          material={m.body}
          castShadow
          position={[0, (BODY_TOP - upper * 0.55) * u, 0]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry args={[upper * u, upper * u, depth * u, 28]} />
        </mesh>
        {acoustic ? (
          <mesh
            material={m.hole}
            position={[0, (BODY_TOP - upper * 0.95) * u, (depth / 2 + 0.002) * u]}
          >
            <circleGeometry args={[0.045 * u, 24]} />
          </mesh>
        ) : (
          [0.25, 0.4].map((y) => (
            <mesh key={y} material={m.pickup} position={[0, y * u, (depth / 2 + 0.004) * u]}>
              <boxGeometry args={[0.08 * u, 0.025 * u, 0.008 * u]} />
            </mesh>
          ))
        )}
        <mesh
          material={m.neck}
          castShadow
          position={[0, (BODY_TOP - 0.08 + neck / 2) * u, 0.01 * u]}
        >
          <boxGeometry args={[0.05 * u, neck * u, 0.025 * u]} />
        </mesh>
        <mesh
          material={m.head}
          castShadow
          position={[0, (BODY_TOP - 0.08 + neck + 0.08) * u, 0.005 * u]}
          rotation={[0.12, 0, 0]}
        >
          <boxGeometry args={[0.075 * u, 0.17 * u, 0.018 * u]} />
        </mesh>
        {[-1, 1].flatMap((s) =>
          [0, 1, 2].map((i) => (
            <mesh
              key={`${s}${i}`}
              material={m.peg}
              position={[s * 0.045 * u, (BODY_TOP + neck + 0.04 * i) * u, 0]}
              rotation={[0, 0, Math.PI / 2]}
            >
              <cylinderGeometry args={[0.008 * u, 0.008 * u, 0.03 * u, 6]} />
            </mesh>
          )),
        )}
      </group>
    </group>
  )
}

Guitar.groundSitting = true
