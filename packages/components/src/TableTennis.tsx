import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { pick, range, rng, sub, useWorld, type WorldComponentProps } from '@runek/core'
import { useMemo } from 'react'

export interface TableTennisProps extends WorldComponentProps {
  /** The playing top. Seeded (blue or green) when unset. */
  color?: string
  /** White lines along the edges and down the middle. */
  lineColor?: string
  /** Legs and net posts; defaults to the palette's `metal`. */
  frameColor?: string
  /** Two paddles lying on the table. */
  paddles?: boolean
  /** A ball on the table. */
  ball?: boolean
}

const TOPS = ['#1f4f8a', '#1f4f8a', '#2f6b4a', '#2b3a4f']
// Regulation size in meters: 2.74 long (local X), 1.525 wide, the top 0.76 up.
const L = 2.74
const W = 1.525
const H = 0.76
const T = 0.025

/**
 * A table tennis table at regulation size, long along local X: a painted top with its white
 * lines, a net with posts across the middle, a folding undercarriage, and a pair of paddles and a
 * ball left on it at seeded spots. One cuboid collider for the table; it stands on the ground.
 */
export function TableTennis({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  seed = 1,
  color,
  lineColor = '#f4f4f4',
  frameColor,
  paddles = true,
  ball = true,
}: TableTennisProps) {
  const { unit, palette } = useWorld()
  const u = unit
  const frame = frameColor ?? palette.metal

  const look = useMemo(() => {
    const r = rng(sub(seed, 0))
    const side = r() < 0.5 ? -1 : 1
    return {
      top: color ?? pick(r, TOPS),
      paddles: [
        { x: side * range(r, 0.5, 1.1), z: range(r, -0.5, 0.5), turn: r() * Math.PI * 2 },
        { x: -side * range(r, 0.5, 1.1), z: range(r, -0.5, 0.5), turn: r() * Math.PI * 2 },
      ],
      ball: { x: (r() < 0.5 ? -1 : 1) * range(r, 0.15, 1.15), z: range(r, -0.6, 0.6) },
    }
  }, [seed, color])

  const top = H * u
  const line = 0.02 * u
  const lines: { pos: [number, number]; size: [number, number] }[] = [
    { pos: [0, (W / 2 - 0.01) * u], size: [L * u, line] },
    { pos: [0, -(W / 2 - 0.01) * u], size: [L * u, line] },
    { pos: [(L / 2 - 0.01) * u, 0], size: [line, W * u] },
    { pos: [-(L / 2 - 0.01) * u, 0], size: [line, W * u] },
    { pos: [0, 0], size: [L * u, 0.003 * u] },
  ]
  const legX = (L / 2 - 0.35) * u
  const legZ = (W / 2 - 0.12) * u
  const netH = 0.1525 * u
  const netW = (W + 0.3) * u

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      <CuboidCollider args={[(L / 2) * u, top / 2, (W / 2) * u]} position={[0, top / 2, 0]} />
      <mesh position={[0, top - (T * u) / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[L * u, T * u, W * u]} />
        <meshStandardMaterial color={look.top} roughness={0.55} />
      </mesh>
      {lines.map((l) => (
        <mesh
          key={`${l.pos[0]}:${l.pos[1]}`}
          position={[l.pos[0], top + 0.0005 * u, l.pos[1]]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={l.size} />
          <meshStandardMaterial color={lineColor} roughness={0.5} />
        </mesh>
      ))}

      {/* the undercarriage: four legs braced in pairs, and a center rail */}
      {[-1, 1].map((sx) => (
        <group key={sx} position={[sx * legX, 0, 0]}>
          {[-1, 1].map((sz) => (
            <mesh key={sz} position={[0, (top - T * u) / 2, sz * legZ]} castShadow>
              <boxGeometry args={[0.04 * u, top - T * u, 0.04 * u]} />
              <meshStandardMaterial color={frame} metalness={0.4} roughness={0.5} />
            </mesh>
          ))}
          <mesh position={[0, 0.15 * u, 0]}>
            <boxGeometry args={[0.03 * u, 0.03 * u, legZ * 2]} />
            <meshStandardMaterial color={frame} metalness={0.4} roughness={0.5} />
          </mesh>
          {[-1, 1].map((sz) => (
            <mesh key={`w${sz}`} position={[0, 0.03 * u, sz * legZ]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.03 * u, 0.03 * u, 0.025 * u, 12]} />
              <meshStandardMaterial color="#1b1b1e" roughness={0.8} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[0, top - T * u - 0.04 * u, 0]}>
        <boxGeometry args={[legX * 2, 0.05 * u, 0.04 * u]} />
        <meshStandardMaterial color={frame} metalness={0.4} roughness={0.5} />
      </mesh>

      {/* the net: a dark mesh panel with a white tape on top, clamped by two posts */}
      <mesh position={[0, top + netH / 2, 0]}>
        <boxGeometry args={[0.004 * u, netH, netW]} />
        <meshStandardMaterial color="#1a1c22" roughness={0.9} transparent opacity={0.75} />
      </mesh>
      <mesh position={[0, top + netH - 0.008 * u, 0]}>
        <boxGeometry args={[0.006 * u, 0.016 * u, netW]} />
        <meshStandardMaterial color={lineColor} roughness={0.6} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={`post${s}`} position={[0, top + netH / 2 - 0.01 * u, s * (netW / 2)]}>
          <cylinderGeometry args={[0.008 * u, 0.008 * u, netH + 0.02 * u, 8]} />
          <meshStandardMaterial color={frame} metalness={0.5} roughness={0.4} />
        </mesh>
      ))}

      {paddles &&
        look.paddles.map((p, i) => (
          <group
            key={`${p.x.toFixed(3)}:${p.z.toFixed(3)}`}
            position={[p.x * u, top + 0.006 * u, p.z * u]}
            rotation={[0, p.turn, 0]}
          >
            <mesh castShadow>
              <cylinderGeometry args={[0.075 * u, 0.075 * u, 0.008 * u, 24]} />
              <meshStandardMaterial color={i ? '#1b1b1e' : '#c0262d'} roughness={0.7} />
            </mesh>
            <mesh position={[0.1 * u, 0.003 * u, 0]} castShadow>
              <boxGeometry args={[0.1 * u, 0.02 * u, 0.028 * u]} />
              <meshStandardMaterial color="#c9a774" roughness={0.6} />
            </mesh>
          </group>
        ))}
      {ball && (
        <mesh position={[look.ball.x * u, top + 0.02 * u, look.ball.z * u]} castShadow>
          <sphereGeometry args={[0.02 * u, 14, 10]} />
          <meshStandardMaterial color="#f7f4ee" roughness={0.4} />
        </mesh>
      )}
    </RigidBody>
  )
}

TableTennis.groundSitting = true
