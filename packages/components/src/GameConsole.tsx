import {
  pick,
  range,
  rng,
  sub,
  useMaterial,
  useMaterials,
  useWorld,
  type WorldComponentProps,
} from '@runek/core'
import { useMemo } from 'react'

/** Standing upright (`tower`), lying flat (`slab`), or a small `cube`. */
export type GameConsoleStyle = 'tower' | 'slab' | 'cube'

export interface GameConsoleProps extends WorldComponentProps {
  /** Seeded when unset. */
  style?: GameConsoleStyle
  /** Controllers laid out in front of the console, 0 to 4. Seeded (1 or 2) when unset. */
  controllers?: number
  /** Console and controllers. Seeded (black or white) when unset. */
  color?: string
  /** Power light and trim. Seeded when unset. */
  accent?: string
  /** Powered on: the light glows. */
  on?: boolean
}

const STYLES: GameConsoleStyle[] = ['tower', 'slab', 'cube']
const BODIES = ['#18191c', '#18191c', '#eceef0', '#2a2d33']
const LIGHTS = ['#38c6f4', '#7bd34f', '#e4405f', '#f0f0f0']
const BUTTONS = ['#7bd34f', '#e4405f', '#38c6f4', '#f0c419']

// Body size in meters, [width, height, depth].
const SIZES: Record<GameConsoleStyle, [number, number, number]> = {
  tower: [0.1, 0.33, 0.26],
  slab: [0.36, 0.07, 0.26],
  cube: [0.17, 0.15, 0.17],
}

function Controller({ color, accent, u }: { color: string; accent: string; u: number }) {
  const m = useMaterials({
    shell: { color, roughness: 0.5 },
    stick: { color: '#2a2a2e', roughness: 0.8 },
    select: { color: '#2a2a2e' },
    light: { kind: 'basic', color: accent, toneMapped: false },
  })
  const buttons = useMaterials(BUTTONS.map((c) => ({ color: c, roughness: 0.3 })))
  return (
    <group>
      <mesh material={m.shell} position={[0, 0.02 * u, 0]} castShadow>
        <boxGeometry args={[0.1 * u, 0.025 * u, 0.055 * u]} />
      </mesh>
      {/* grips: two rounded handles swept back toward the player */}
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          material={m.shell}
          position={[s * 0.052 * u, 0.018 * u, 0.025 * u]}
          rotation={[Math.PI / 2 - 0.3, 0, s * 0.35]}
          castShadow
        >
          <capsuleGeometry args={[0.017 * u, 0.04 * u, 4, 10]} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`stick${s}`} material={m.stick} position={[s * 0.022 * u, 0.04 * u, 0.012 * u]}>
          <cylinderGeometry args={[0.008 * u, 0.007 * u, 0.012 * u, 12]} />
        </mesh>
      ))}
      {BUTTONS.map((c, i) => {
        const a = (i / 4) * Math.PI * 2
        return (
          <mesh
            key={c}
            material={buttons[i]}
            position={[
              0.042 * u + Math.cos(a) * 0.008 * u,
              0.034 * u,
              -0.008 * u + Math.sin(a) * 0.008 * u,
            ]}
          >
            <sphereGeometry args={[0.004 * u, 8, 6]} />
          </mesh>
        )
      })}
      <mesh material={m.select} position={[-0.042 * u, 0.034 * u, -0.008 * u]}>
        <boxGeometry args={[0.018 * u, 0.004 * u, 0.006 * u]} />
      </mesh>
      <mesh material={m.light} position={[0, 0.0331 * u, -0.02 * u]}>
        <boxGeometry args={[0.012 * u, 0.001 * u, 0.004 * u]} />
      </mesh>
    </group>
  )
}

/**
 * A games console with its controllers, to sit on the media console under a `Tv`: an upright
 * `tower`, a flat `slab`, or a small `cube`, with a power light and a vent, and up to four
 * controllers laid out in front of it (local +Z). Its origin is the console's foot. Decorative:
 * no collider.
 */
export function GameConsole({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  seed = 1,
  style,
  controllers,
  color,
  accent,
  on = true,
}: GameConsoleProps) {
  const { unit } = useWorld()
  const u = unit

  const look = useMemo(() => {
    const r = rng(sub(seed, 0))
    const rolled = {
      style: pick(r, STYLES),
      count: r() < 0.5 ? 1 : 2,
      body: pick(r, BODIES),
      light: pick(r, LIGHTS),
    }
    const count = Math.max(0, Math.min(4, Math.round(controllers ?? rolled.count)))
    const pads = Array.from({ length: count }, (_, i) => ({
      x: (i - (count - 1) / 2) * 0.16 * u + range(r, -0.015, 0.015) * u,
      z: (0.23 + range(r, -0.02, 0.03)) * u,
      turn: range(r, -0.35, 0.35),
    }))
    return {
      style: style ?? rolled.style,
      body: color ?? rolled.body,
      light: accent ?? rolled.light,
      pads,
    }
  }, [seed, style, controllers, color, accent, u])

  const [w, h, d] = SIZES[look.style].map((v) => v * u)
  const trim = look.body === '#eceef0' ? '#18191c' : '#3a3d44'
  const m = useMaterials({
    base: { color: trim, roughness: 0.6 },
    body: { color: look.body, roughness: 0.35, metalness: 0.1 },
    vent: { color: trim, roughness: 0.8 },
  })
  const power = useMaterial(
    on ? { kind: 'basic', color: look.light, toneMapped: false } : { color: '#333' },
  )

  return (
    <group position={position} rotation={rotation}>
      {look.style === 'tower' && (
        <mesh material={m.base} position={[0, 0.006 * u, 0]} receiveShadow>
          <boxGeometry args={[w * 1.6, 0.012 * u, d * 0.7]} />
        </mesh>
      )}
      <group position={[0, (look.style === 'tower' ? 0.012 * u : 0) + h / 2, 0]}>
        <mesh material={m.body} castShadow receiveShadow>
          <boxGeometry args={[w, h, d]} />
        </mesh>
        {/* a dark vent band across the front, and the power light */}
        <mesh
          material={m.vent}
          position={[0, look.style === 'slab' ? 0 : h * 0.3, d / 2 + 0.0005 * u]}
        >
          <planeGeometry args={[w * 0.92, look.style === 'slab' ? h * 0.3 : h * 0.08]} />
        </mesh>
        <mesh
          material={power}
          position={[
            look.style === 'slab' ? w * 0.4 : 0,
            look.style === 'slab' ? 0 : -h * 0.35,
            d / 2 + 0.001 * u,
          ]}
        >
          <circleGeometry args={[0.006 * u, 12]} />
        </mesh>
      </group>
      {look.pads.map((p) => (
        <group
          key={`${p.x.toFixed(4)}:${p.z.toFixed(4)}`}
          position={[p.x, 0, p.z]}
          rotation={[0, p.turn, 0]}
        >
          <Controller color={look.body} accent={look.light} u={u} />
        </group>
      ))}
    </group>
  )
}
