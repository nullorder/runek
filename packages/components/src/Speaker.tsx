import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { pick, rng, useMaterials, useWorld, type Vec3, type WorldComponentProps } from '@runek/core'
import { DoubleSide, type Material } from 'three'

/** A studio `monitor` on a stand, a floor `pa` cabinet, or a guitar `amp` combo. */
export type SpeakerKind = 'monitor' | 'pa' | 'amp'

export interface SpeakerProps extends WorldComponentProps {
  /** Seeded when unset. */
  kind?: SpeakerKind
  /** The cabinet. Seeded from a few finishes for its kind when unset. */
  color?: string
}

const KINDS: SpeakerKind[] = ['monitor', 'pa', 'amp']
const FINISHES: Record<SpeakerKind, string[]> = {
  monitor: ['#1b1b1d', '#1b1b1d', '#efece6', '#3a3d42'],
  pa: ['#1b1b1d', '#26272a'],
  amp: ['#151515', '#151515', '#e8dcc2', '#7a1f1f', '#2f4858'],
}
// Cabinet [width, height, depth] in meters, and the stand a monitor sits on.
const SIZES: Record<SpeakerKind, Vec3> = {
  monitor: [0.22, 0.34, 0.27],
  pa: [0.56, 1.05, 0.45],
  amp: [0.62, 0.5, 0.26],
}
const STAND = 0.95

/** A cone driver on a cabinet's front face, `r` its radius in meters, facing +Z from `p`: a dark
 *  surround, the cone and a dust cap, each standing a hair proud of the last. */
function Driver({
  r,
  p,
  u,
  m,
}: {
  r: number
  p: Vec3
  u: number
  m: Record<'dark' | 'cone' | 'chrome', Material>
}) {
  return (
    <group position={p} rotation={[Math.PI / 2, 0, 0]} scale={u}>
      <mesh material={m.dark} position={[0, 0.002, 0]}>
        <cylinderGeometry args={[r, r, 0.004, 28]} />
      </mesh>
      <mesh material={m.cone} position={[0, 0.007, 0]}>
        <cylinderGeometry args={[r * 0.3, r * 0.86, 0.006, 28, 1, true]} />
      </mesh>
      <mesh material={m.chrome} position={[0, 0.008, 0]} scale={[1, 0.4, 1]}>
        <sphereGeometry args={[r * 0.3, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
    </group>
  )
}

/**
 * A loudspeaker facing local +Z, in three kinds: a studio `monitor` at ear height on a stand,
 * a woofer under a dome tweeter; a floor `pa` cabinet with two woofers under a horn and steel
 * corners; or a guitar `amp` combo with grille cloth, a strip of knobs and a handle. Seeded:
 * the kind and the finish. One cuboid collider round it.
 */
export function Speaker({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  seed = 1,
  kind,
  color,
}: SpeakerProps) {
  const { unit: u } = useWorld()
  const next = rng(seed)
  const type = kind ?? pick(next, KINDS)
  const finish = color ?? pick(next, FINISHES[type])
  const light = finish === '#e8dcc2' || finish === '#efece6'
  const m = useMaterials({
    cabinet: { color: finish, roughness: type === 'amp' ? 0.85 : 0.6 },
    dark: { color: '#1d1d1f', roughness: 0.5 },
    horn: { color: '#1d1d1f', roughness: 0.5, side: DoubleSide },
    cone: { color: '#1b1b1b', roughness: 0.7 },
    chrome: { color: '#c9ccd1', roughness: 0.3, metalness: 0.8 },
    cloth: { color: light ? '#b9a27a' : '#3a3632', roughness: 1 },
  })
  const [w, h, d] = SIZES[type]
  const base = type === 'monitor' ? STAND : type === 'pa' ? 0.03 : 0
  const at = (x: number, y: number): Vec3 => [x * u, (base + y) * u, (d / 2) * u]
  const total = base + h

  return (
    <group position={position} rotation={rotation}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider
          args={[(Math.max(w, 0.3) / 2) * u, (total / 2) * u, (Math.max(d, 0.3) / 2) * u]}
          position={[0, (total / 2) * u, 0]}
        />
      </RigidBody>
      <mesh material={m.cabinet} castShadow receiveShadow position={[0, (base + h / 2) * u, 0]}>
        <boxGeometry args={[w * u, h * u, d * u]} />
      </mesh>

      {type === 'monitor' && (
        <>
          <mesh material={m.dark} receiveShadow position={[0, 0.015 * u, 0]}>
            <boxGeometry args={[0.3 * u, 0.03 * u, 0.3 * u]} />
          </mesh>
          <mesh material={m.dark} castShadow position={[0, (STAND / 2) * u, 0]}>
            <boxGeometry args={[0.07 * u, STAND * u, 0.07 * u]} />
          </mesh>
          <mesh material={m.dark} position={[0, (STAND - 0.01) * u, 0]}>
            <boxGeometry args={[0.2 * u, 0.02 * u, 0.22 * u]} />
          </mesh>
          <Driver r={0.075} p={at(0, 0.12)} u={u} m={m} />
          <Driver r={0.025} p={at(0, 0.27)} u={u} m={m} />
        </>
      )}

      {type === 'pa' && (
        <>
          <Driver r={0.19} p={at(0, 0.21)} u={u} m={m} />
          <Driver r={0.19} p={at(0, 0.58)} u={u} m={m} />
          <group position={[0, (base + 0.91) * u, (d / 2 + 0.03) * u]} scale={[1.5, 1, 1]}>
            <mesh material={m.horn} rotation={[Math.PI / 2, Math.PI / 4, 0]}>
              <cylinderGeometry args={[0.16 * u, 0.03 * u, 0.06 * u, 4, 1, true]} />
            </mesh>
          </group>
          {[-1, 1].flatMap((sx) =>
            [0, h].map((y) => (
              <mesh
                key={`${sx}${y}`}
                material={m.chrome}
                position={[sx * (w / 2 - 0.02) * u, (base + y) * u, (d / 2 - 0.02) * u]}
              >
                <boxGeometry args={[0.05 * u, 0.05 * u, 0.05 * u]} />
              </mesh>
            )),
          )}
          {[-1, 1].map((sx) => (
            <mesh key={sx} material={m.dark} position={[sx * (w / 2 - 0.08) * u, 0.015 * u, 0]}>
              <boxGeometry args={[0.08 * u, 0.03 * u, (d - 0.06) * u]} />
            </mesh>
          ))}
        </>
      )}

      {type === 'amp' && (
        <>
          <mesh material={m.cloth} position={[0, 0.2 * u, (d / 2 + 0.002) * u]}>
            <boxGeometry args={[(w - 0.06) * u, 0.34 * u, 0.004 * u]} />
          </mesh>
          <mesh material={m.chrome} position={[0, 0.43 * u, (d / 2 + 0.002) * u]}>
            <boxGeometry args={[(w - 0.06) * u, 0.07 * u, 0.004 * u]} />
          </mesh>
          {Array.from({ length: 7 }, (_, i) => (
            <mesh
              key={i}
              material={m.dark}
              position={[(-0.21 + i * 0.06) * u, 0.43 * u, (d / 2 + 0.012) * u]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <cylinderGeometry args={[0.013 * u, 0.015 * u, 0.018 * u, 12]} />
            </mesh>
          ))}
          <mesh material={m.dark} castShadow position={[0, (h + 0.025) * u, 0]}>
            <boxGeometry args={[0.2 * u, 0.025 * u, 0.035 * u]} />
          </mesh>
        </>
      )}
    </group>
  )
}

Speaker.groundSitting = true
