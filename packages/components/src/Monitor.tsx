import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { pick, range, rng, sub, useWorld, type Vec3, type WorldComponentProps } from '@runek/core'
import { useMemo } from 'react'
import { Color } from 'three'

/** A round `foot` with a neck, a flat `plate` with a neck, or two splayed `legs`. */
export type MonitorStand = 'foot' | 'plate' | 'legs'

export interface MonitorProps extends WorldComponentProps {
  /** Screen width, in units. */
  width?: number
  /** Width over height. */
  aspect?: number
  /** Seeded when unset. */
  stand?: MonitorStand
  /** The screen's glow when on. Seeded from a few calm tints when unset. */
  screen?: string
  /** Lit, showing a few seeded windows; off, a dark glass. */
  on?: boolean
  /** Bezel and stand; defaults to the palette's `metal`. */
  color?: string
}

interface Panel {
  pos: Vec3
  size: [number, number]
  color: string
}

const STANDS: MonitorStand[] = ['foot', 'plate', 'legs']
const TINTS = ['#7fa8d6', '#8cc7b8', '#b3a6e0', '#e0c58f', '#9ab8c9']
const OFF = '#121417'

/**
 * A desk monitor: a thin screen in a bezel on a stand, its origin at the foot so it sits on a
 * `Desk` top. Switched on, the screen glows in its `screen` color with a few seeded windows and
 * lines of text on it, all geometry (no textures), so a busy office can light up desk by desk.
 * One small cuboid collider; not ground-standing.
 */
export function Monitor({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  seed = 1,
  width = 0.6,
  aspect = 16 / 9,
  stand,
  screen,
  on = true,
  color,
}: MonitorProps) {
  const { unit, palette } = useWorld()
  const frame = color ?? palette.metal
  const W = width * unit
  const Hs = W / aspect
  const bezel = 0.012 * unit
  const thick = 0.025 * unit
  const lift = 0.1 * unit + Hs * 0.1

  const look = useMemo(() => {
    const r = rng(sub(seed, 0))
    const rolled = { stand: pick(r, STANDS), tint: pick(r, TINTS) }
    const glow = screen ?? rolled.tint
    const base = new Color(glow)
    const shade = (k: number) => base.clone().multiplyScalar(k).getStyle()
    // A couple of windows, each with a title bar and a few lines of "text".
    const panels: Panel[] = []
    const count = 1 + Math.floor(r() * 3)
    for (let i = 0; i < count; i++) {
      const w = range(r, 0.35, 0.7) * W
      const h = range(r, 0.4, 0.75) * Hs
      const x = range(r, -W / 2 + w / 2 + 0.02 * W, W / 2 - w / 2 - 0.02 * W)
      const y = range(r, -Hs / 2 + h / 2 + 0.04 * Hs, Hs / 2 - h / 2 - 0.04 * Hs)
      const z = 0.0006 * unit * (i + 1)
      panels.push({ pos: [x, y, z], size: [w, h], color: shade(1.35) })
      panels.push({
        pos: [x, y + h / 2 - 0.05 * h, z + 0.0002 * unit],
        size: [w, 0.1 * h],
        color: shade(0.75),
      })
      const lines = 2 + Math.floor(r() * 4)
      for (let l = 0; l < lines; l++) {
        const lw = range(r, 0.3, 0.85) * w * 0.85
        panels.push({
          pos: [x - w * 0.42 + lw / 2, y + h * 0.28 - l * h * 0.14, z + 0.0002 * unit],
          size: [lw, 0.045 * h],
          color: shade(0.6),
        })
      }
    }
    return { stand: stand ?? rolled.stand, glow, panels }
  }, [seed, stand, screen, W, Hs, unit])

  const cy = lift + Hs / 2 + bezel
  const total = cy + Hs / 2 + bezel

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      <CuboidCollider args={[W / 2 + bezel, total / 2, 0.09 * unit]} position={[0, total / 2, 0]} />
      {/* screen: bezel shell, then the glass just proud of it */}
      <mesh position={[0, cy, 0]} castShadow>
        <boxGeometry args={[W + bezel * 2, Hs + bezel * 2, thick]} />
        <meshStandardMaterial color={frame} roughness={0.45} metalness={0.3} />
      </mesh>
      <group position={[0, cy, thick / 2 + 0.0005 * unit]}>
        <mesh>
          <planeGeometry args={[W, Hs]} />
          {on ? (
            <meshBasicMaterial color={look.glow} toneMapped={false} />
          ) : (
            <meshStandardMaterial color={OFF} roughness={0.15} metalness={0.4} />
          )}
        </mesh>
        {on &&
          look.panels.map((p) => (
            <mesh
              key={`${p.pos[0].toFixed(4)}:${p.pos[1].toFixed(4)}:${p.pos[2].toFixed(5)}`}
              position={p.pos}
            >
              <planeGeometry args={p.size} />
              <meshBasicMaterial color={p.color} toneMapped={false} />
            </mesh>
          ))}
      </group>
      {/* stand */}
      <mesh position={[0, (lift + Hs * 0.3) / 2, -thick]} castShadow>
        <boxGeometry args={[0.05 * unit, lift + Hs * 0.3, 0.025 * unit]} />
        <meshStandardMaterial color={frame} roughness={0.5} metalness={0.3} />
      </mesh>
      {look.stand === 'foot' && (
        <mesh position={[0, 0.006 * unit, -thick]} castShadow receiveShadow>
          <cylinderGeometry args={[0.11 * unit, 0.12 * unit, 0.012 * unit, 24]} />
          <meshStandardMaterial color={frame} roughness={0.5} metalness={0.3} />
        </mesh>
      )}
      {look.stand === 'plate' && (
        <mesh position={[0, 0.005 * unit, -thick]} castShadow receiveShadow>
          <boxGeometry args={[0.24 * unit, 0.01 * unit, 0.17 * unit]} />
          <meshStandardMaterial color={frame} roughness={0.5} metalness={0.3} />
        </mesh>
      )}
      {look.stand === 'legs' &&
        [-1, 1].map((s) => (
          <mesh
            key={s}
            position={[s * 0.08 * unit, 0.008 * unit, -thick + 0.02 * unit]}
            rotation={[0, s * 0.5, 0]}
            castShadow
          >
            <boxGeometry args={[0.025 * unit, 0.016 * unit, 0.2 * unit]} />
            <meshStandardMaterial color={frame} roughness={0.5} metalness={0.3} />
          </mesh>
        ))}
    </RigidBody>
  )
}
