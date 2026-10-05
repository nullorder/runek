import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { pick, range, rng, sub, useWorld, type WorldComponentProps } from '@runek/core'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { Color, type InstancedMesh, Object3D } from 'three'

/** Balls `racked` in a triangle with the cue ball opposite, `scattered` mid-game, or `none`. */
export type PoolBalls = 'racked' | 'scattered' | 'none'

export interface PoolTableProps extends WorldComponentProps {
  /** Outer length along local X, in units. */
  length?: number
  /** Outer width along local Z, in units. */
  width?: number
  /** Height of the playing surface, in units. */
  height?: number
  /** Seeded when unset. */
  balls?: PoolBalls
  /** The cloth. Seeded from a few classic colors when unset. */
  color?: string
  /** Rails and legs; defaults to the palette's `wood`. */
  frameColor?: string
}

const CLOTHS = ['#2f6b4a', '#2f6b4a', '#2b4f7a', '#7a2f3a']
// Cue ball, then 1 to 15 (the eight is black). Fixed colors: the game's own, no palette slot fits.
const BALL_COLORS = [
  '#f4f1e8',
  '#f2c230',
  '#2357b5',
  '#d23b2f',
  '#5b2d8c',
  '#e8772b',
  '#1f7a45',
  '#7a2a22',
  '#151515',
  '#f2c230',
  '#2357b5',
  '#d23b2f',
  '#5b2d8c',
  '#e8772b',
  '#1f7a45',
  '#7a2a22',
]
const BALL_R = 0.028

/**
 * A pool table: wooden rails over cushioned cloth, six pockets, and solid legs, with the balls
 * racked in a triangle (the cue ball on the head spot) or scattered as if mid-game, all sixteen in
 * one instanced mesh. One cuboid collider for the table.
 */
export function PoolTable({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  seed = 1,
  length = 2.5,
  width = 1.4,
  height = 0.8,
  balls,
  color,
  frameColor,
}: PoolTableProps) {
  const { unit, palette } = useWorld()
  const u = unit
  const L = length * u
  const Wd = width * u
  const H = height * u
  const wood = frameColor ?? palette.wood
  const rail = 0.12 * u
  const bedL = L - rail * 2
  const bedW = Wd - rail * 2
  const r = BALL_R * u

  const look = useMemo(() => {
    const rr = rng(sub(seed, 0))
    const rolled = {
      cloth: pick(rr, CLOTHS),
      balls: pick<PoolBalls>(rr, ['racked', 'scattered', 'scattered']),
    }
    const mode = balls ?? rolled.balls
    const at: [number, number][] = []
    if (mode === 'racked') {
      at.push([-bedL / 4, 0])
      // Rows of 1 to 5 behind the foot spot, the eight in the middle of the third row.
      const order = [1, 9, 2, 10, 8, 3, 11, 4, 12, 5, 13, 6, 14, 7, 15]
      let k = 0
      const pos: [number, number][] = []
      for (let row = 0; row < 5; row++)
        for (let i = 0; i <= row; i++)
          pos.push([bedL / 4 + row * r * 1.75, (i - row / 2) * r * 2.02])
      for (const n of order) {
        at[n] = pos[k++]
      }
    } else if (mode === 'scattered') {
      for (let n = 0; n < 16; n++) {
        let p: [number, number] = [0, 0]
        for (let tries = 0; tries < 40; tries++) {
          p = [range(rr, -0.45, 0.45) * bedL, range(rr, -0.42, 0.42) * bedW]
          if (at.every((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) > r * 2.2)) break
        }
        at.push(p)
      }
    }
    return { cloth: color ?? rolled.cloth, at }
  }, [seed, balls, color, bedL, bedW, r])

  const ballMesh = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const mesh = ballMesh.current
    if (!mesh) return
    const o = new Object3D()
    const c = new Color()
    look.at.forEach(([x, z], i) => {
      o.position.set(x, H + r, z)
      o.updateMatrix()
      mesh.setMatrixAt(i, o.matrix)
      mesh.setColorAt(i, c.set(BALL_COLORS[i]))
    })
    mesh.count = look.at.length
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [look, H, r])

  const pockets: [number, number][] = [-1, 0, 1].flatMap((x) =>
    [-1, 1].map((z) => [x * (bedL / 2), z * (bedW / 2)] as [number, number]),
  )
  const apron = 0.18 * u

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      <CuboidCollider
        args={[L / 2, (H + 0.04 * u) / 2, Wd / 2]}
        position={[0, (H + 0.04 * u) / 2, 0]}
      />
      {/* bed and cloth */}
      <mesh position={[0, H - apron / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[L - 0.04 * u, apron, Wd - 0.04 * u]} />
        <meshStandardMaterial color={wood} roughness={0.55} />
      </mesh>
      <mesh position={[0, H + 0.001 * u, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[bedL, bedW]} />
        <meshStandardMaterial color={look.cloth} roughness={0.95} />
      </mesh>
      {/* cushions, then the wooden rails around them */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[0, H + 0.02 * u, s * (bedW / 2 + 0.02 * u)]} castShadow>
            <boxGeometry args={[bedL - 0.1 * u, 0.04 * u, 0.04 * u]} />
            <meshStandardMaterial color={look.cloth} roughness={0.95} />
          </mesh>
          <mesh position={[s * (bedL / 2 + 0.02 * u), H + 0.02 * u, 0]} castShadow>
            <boxGeometry args={[0.04 * u, 0.04 * u, bedW - 0.1 * u]} />
            <meshStandardMaterial color={look.cloth} roughness={0.95} />
          </mesh>
          <mesh
            position={[0, H + 0.025 * u, s * (Wd / 2 - (rail - 0.04 * u) / 2)]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[L, 0.05 * u, rail - 0.04 * u]} />
            <meshStandardMaterial color={wood} roughness={0.45} />
          </mesh>
          <mesh
            position={[s * (L / 2 - (rail - 0.04 * u) / 2), H + 0.025 * u, 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[rail - 0.04 * u, 0.05 * u, Wd]} />
            <meshStandardMaterial color={wood} roughness={0.45} />
          </mesh>
        </group>
      ))}
      {pockets.map(([x, z]) => (
        <mesh key={`${x}:${z}`} position={[x, H + 0.03 * u, z]}>
          <cylinderGeometry args={[0.055 * u, 0.05 * u, 0.062 * u, 16]} />
          <meshStandardMaterial color="#0d0d0e" roughness={0.9} />
        </mesh>
      ))}
      {/* legs */}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh
            key={`${sx}${sz}`}
            position={[sx * (L / 2 - 0.2 * u), (H - apron) / 2, sz * (Wd / 2 - 0.16 * u)]}
            castShadow
          >
            <boxGeometry args={[0.14 * u, H - apron, 0.14 * u]} />
            <meshStandardMaterial color={wood} roughness={0.55} />
          </mesh>
        )),
      )}
      {look.at.length > 0 && (
        <instancedMesh
          key={look.at.length}
          ref={ballMesh}
          args={[undefined, undefined, look.at.length]}
          castShadow
        >
          <sphereGeometry args={[r, 16, 12]} />
          <meshPhysicalMaterial roughness={0.15} clearcoat={1} />
        </instancedMesh>
      )}
    </RigidBody>
  )
}

PoolTable.groundSitting = true
