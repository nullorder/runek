import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { pick, range, rng, sub, useWorld, type Vec3, type WorldComponentProps } from '@runek/core'
import { useMemo } from 'react'
import { Color } from 'three'

/** On a center `stand`, on a low media `console`, or flat on a `wall`. */
export type TvMount = 'stand' | 'console' | 'wall'

export interface TvProps extends WorldComponentProps {
  /** Screen width, in units. */
  width?: number
  /** `stand` and `console` are seeded when unset; `wall` must be asked for. On a wall the origin
   *  is the middle of the screen with its back against the wall (local -Z). */
  mount?: TvMount
  /** Showing a seeded picture (a sky, a sun, hills) in this tint, or dark glass when off. */
  on?: boolean
  /** Picture tint. Seeded when unset. */
  screen?: string
  /** Bezel and stand; defaults to the palette's `metal`. */
  color?: string
  /** The console's wood; defaults to the palette's `woodDark`. */
  consoleColor?: string
}

interface Blob {
  pos: Vec3
  r: number
  color: string
}

const TINTS = ['#6fa3d8', '#e3a46a', '#8fc6a8', '#b49be0', '#e07f7f']
const OFF = '#101214'

/**
 * A flat-screen television on a stand, on a low media console, or on a wall. Switched on, its
 * screen glows with a seeded picture drawn from a few flat shapes (no textures), so a lounge has
 * something to look at. One cuboid collider; standing mounts sit on the ground.
 */
export function Tv({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  seed = 1,
  width = 1.2,
  mount,
  on = true,
  screen,
  color,
  consoleColor,
}: TvProps) {
  const { unit, palette } = useWorld()
  const frame = color ?? palette.metal
  const W = width * unit
  const Hs = (W * 9) / 16
  const bezel = 0.015 * unit
  const thick = 0.04 * unit

  const look = useMemo(() => {
    const r = rng(sub(seed, 0))
    const rolled = { mount: pick<TvMount>(r, ['stand', 'console']), tint: pick(r, TINTS) }
    const base = new Color(screen ?? rolled.tint)
    const shade = (k: number, hue = 0) =>
      base.clone().offsetHSL(hue, 0, 0).multiplyScalar(k).getStyle()
    const horizon = range(r, -0.15, 0.1) * Hs
    const blobs: Blob[] = [
      // the sun, then hills (circles mostly below the horizon) in two depths
      {
        pos: [range(r, -0.3, 0.3) * W, horizon + range(r, 0.12, 0.28) * Hs, 0.0006],
        r: 0.07 * W,
        color: '#fff3c4',
      },
    ]
    for (let i = 0; i < 4; i++) {
      const rad = range(r, 0.12, 0.22) * W
      blobs.push({
        pos: [range(r, -0.5, 0.5) * W, horizon - rad * range(r, 0.8, 0.95), 0.001 + i * 0.0002],
        r: rad,
        color: shade(i < 2 ? 0.55 : 0.4, 0.25),
      })
    }
    return {
      mount: mount ?? rolled.mount,
      sky: shade(1.15),
      ground: shade(0.35, 0.25),
      horizon,
      blobs,
    }
  }, [seed, mount, screen, W, Hs])

  const wall = look.mount === 'wall'
  const consoleH = 0.45 * unit
  const standLift = 0.08 * unit
  // Screen center: on a wall it is the origin; standing, it rises above its base.
  const cy = wall
    ? 0
    : (look.mount === 'console' ? consoleH + standLift : 0.75 * unit) + Hs / 2 + bezel
  const cz = wall ? thick / 2 + 0.01 * unit : 0
  const top = cy + Hs / 2 + bezel

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      {wall ? (
        <CuboidCollider args={[W / 2, Hs / 2, thick / 2]} position={[0, 0, cz]} />
      ) : look.mount === 'console' ? (
        <CuboidCollider
          args={[W * 0.62, consoleH / 2, 0.22 * unit]}
          position={[0, consoleH / 2, 0]}
        />
      ) : (
        <CuboidCollider args={[0.25 * unit, top / 2, 0.15 * unit]} position={[0, top / 2, 0]} />
      )}

      <mesh position={[0, cy, cz]} castShadow>
        <boxGeometry args={[W + bezel * 2, Hs + bezel * 2, thick]} />
        <meshStandardMaterial color={frame} roughness={0.4} metalness={0.3} />
      </mesh>
      <group position={[0, cy, cz + thick / 2 + 0.0005 * unit]}>
        {on ? (
          <>
            <mesh position={[0, (Hs / 2 + look.horizon) / 2, 0]}>
              <planeGeometry args={[W, Hs / 2 - look.horizon]} />
              <meshBasicMaterial color={look.sky} toneMapped={false} />
            </mesh>
            <mesh position={[0, (look.horizon - Hs / 2) / 2, 0]}>
              <planeGeometry args={[W, Hs / 2 + look.horizon]} />
              <meshBasicMaterial color={look.ground} toneMapped={false} />
            </mesh>
            {/* shapes are clipped to the screen by keeping them inside it: circles are scaled
                down where they would spill over the edge */}
            {look.blobs.map((b) => (
              <mesh
                key={`${b.pos[0].toFixed(4)}:${b.pos[1].toFixed(4)}`}
                position={[
                  Math.max(-W / 2 + b.r, Math.min(W / 2 - b.r, b.pos[0])),
                  Math.max(-Hs / 2 + Math.min(b.r, Hs / 2), b.pos[1]),
                  b.pos[2] * unit,
                ]}
              >
                <circleGeometry args={[Math.min(b.r, Hs / 2), 24]} />
                <meshBasicMaterial color={b.color} toneMapped={false} />
              </mesh>
            ))}
          </>
        ) : (
          <mesh>
            <planeGeometry args={[W, Hs]} />
            <meshStandardMaterial color={OFF} roughness={0.12} metalness={0.4} />
          </mesh>
        )}
      </group>

      {look.mount === 'stand' && (
        <>
          <mesh position={[0, (cy - Hs / 2) / 2, -thick * 0.2]} castShadow>
            <boxGeometry args={[0.07 * unit, cy - Hs / 2, 0.04 * unit]} />
            <meshStandardMaterial color={frame} roughness={0.5} metalness={0.3} />
          </mesh>
          <mesh position={[0, 0.01 * unit, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.45 * unit, 0.02 * unit, 0.26 * unit]} />
            <meshStandardMaterial color={frame} roughness={0.5} metalness={0.3} />
          </mesh>
        </>
      )}
      {look.mount === 'console' && (
        <>
          <mesh position={[0, consoleH + standLift / 2, 0]} castShadow>
            <boxGeometry args={[0.3 * unit, standLift, 0.18 * unit]} />
            <meshStandardMaterial color={frame} roughness={0.5} metalness={0.3} />
          </mesh>
          <mesh position={[0, consoleH / 2 + 0.04 * unit, 0]} castShadow receiveShadow>
            <boxGeometry args={[W * 1.24, consoleH - 0.08 * unit, 0.44 * unit]} />
            <meshStandardMaterial color={consoleColor ?? palette.woodDark} roughness={0.7} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * W * 0.31, consoleH / 2 + 0.04 * unit, 0.222 * unit]}>
              <planeGeometry args={[W * 0.58, consoleH - 0.14 * unit]} />
              <meshStandardMaterial color={consoleColor ?? palette.wood} roughness={0.6} />
            </mesh>
          ))}
          {[-1, 1].flatMap((sx) =>
            [-1, 1].map((sz) => (
              <mesh key={`${sx}${sz}`} position={[sx * W * 0.58, 0.02 * unit, sz * 0.18 * unit]}>
                <boxGeometry args={[0.04 * unit, 0.04 * unit, 0.04 * unit]} />
                <meshStandardMaterial color={frame} roughness={0.5} />
              </mesh>
            )),
          )}
        </>
      )}
    </RigidBody>
  )
}
