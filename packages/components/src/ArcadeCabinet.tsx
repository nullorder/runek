import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { pick, rng, sub, useWorld, type WorldComponentProps } from '@runek/core'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { Color, ExtrudeGeometry, type InstancedMesh, Object3D, Shape } from 'three'

export interface ArcadeCabinetProps extends WorldComponentProps {
  /** Cabinet width, in units. */
  width?: number
  /** Body color. Seeded when unset. */
  color?: string
  /** Side-art stripe and marquee glow. Seeded when unset. */
  accent?: string
  /** Lit screen showing a seeded game; off, dark glass. */
  on?: boolean
  /** Control sets on the panel (one or two players). Seeded when unset. */
  players?: 1 | 2
}

const BODIES = ['#1f2a44', '#2b2b2e', '#5a1f2b', '#16303a']
const NEON = ['#f0c419', '#e4405f', '#38c6f4', '#7bd34f']
const SPRITES = 3

// The side profile, (z, y) in meters: kick, control panel lip, screen slope, marquee, top, back.
const PROFILE: [number, number][] = [
  [-0.36, 0],
  [0.24, 0],
  [0.24, 0.82],
  [0.4, 0.92],
  [0.36, 0.98],
  [0.2, 1.02],
  [0.06, 1.5],
  [0.16, 1.54],
  [0.16, 1.82],
  [-0.36, 1.82],
]

/** A 5×5 invader-style sprite, mirrored left to right: seeded, so every cabinet runs its own game. */
function sprite(r: () => number): boolean[][] {
  const rows: boolean[][] = []
  for (let y = 0; y < 5; y++) {
    const half = [r() < 0.55, r() < 0.55, r() < 0.65]
    rows.push([half[0], half[1], half[2], half[1], half[0]])
  }
  return rows
}

/**
 * An upright arcade cabinet: side panels cut to the classic profile, a lit marquee, a joystick
 * and buttons on the control panel, and a glowing screen running a seeded pixel game (a row of
 * invaders over a ship, drawn as instanced squares). One cuboid collider.
 */
export function ArcadeCabinet({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  seed = 1,
  width = 0.66,
  color,
  accent,
  on = true,
  players,
}: ArcadeCabinetProps) {
  const { unit } = useWorld()
  const u = unit
  const W = width * u

  const look = useMemo(() => {
    const r = rng(sub(seed, 0))
    const rolled = {
      body: pick(r, BODIES),
      neon: pick(r, NEON),
      players: (r() < 0.5 ? 1 : 2) as 1 | 2,
      invader: sprite(r),
      ship: sprite(r),
      hue: r(),
    }
    return {
      body: color ?? rolled.body,
      neon: accent ?? rolled.neon,
      players: players ?? rolled.players,
      invader: rolled.invader,
      ship: rolled.ship,
      ink: new Color().setHSL(rolled.hue, 0.8, 0.62).getStyle(),
    }
  }, [seed, color, accent, players])

  const side = useMemo(() => {
    const s = new Shape()
    PROFILE.forEach(([z, y], i) => {
      if (i) s.lineTo(z * u, y * u)
      else s.moveTo(z * u, y * u)
    })
    s.closePath()
    return new ExtrudeGeometry(s, { depth: 0.03 * u, bevelEnabled: false })
  }, [u])

  // Screen: from the panel's top edge up the slope.
  const [z0, y0] = PROFILE[5]
  const [z1, y1] = PROFILE[6]
  const slope = Math.hypot(z1 - z0, y1 - y0) * u
  const tilt = -Math.atan2(z0 - z1, y1 - y0)
  const screenW = W - 0.1 * u
  const screenH = slope - 0.06 * u

  const pixels = useRef<InstancedMesh>(null)
  const cells = useMemo(() => {
    const out: [number, number][] = []
    const px = screenW / 30
    const draw = (art: boolean[][], cx: number, cy: number) => {
      art.forEach((row, y) => {
        row.forEach((lit, x) => {
          if (lit) out.push([cx + (x - 2) * px, cy - (y - 2) * px])
        })
      })
    }
    for (let i = 0; i < SPRITES; i++) draw(look.invader, (i - 1) * screenW * 0.28, screenH * 0.22)
    draw(look.ship, 0, -screenH * 0.3)
    return { list: out, px }
  }, [look, screenW, screenH])
  useLayoutEffect(() => {
    const mesh = pixels.current
    if (!mesh) return
    const o = new Object3D()
    cells.list.forEach(([x, y], i) => {
      o.position.set(x, y, 0)
      o.scale.set(cells.px * 0.92, cells.px * 0.92, 1)
      o.updateMatrix()
      mesh.setMatrixAt(i, o.matrix)
    })
    mesh.count = cells.list.length
    mesh.instanceMatrix.needsUpdate = true
  }, [cells])

  const controls = look.players === 1 ? [0] : [-W * 0.22, W * 0.22]

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      <CuboidCollider args={[W / 2, 0.91 * u, 0.38 * u]} position={[0, 0.91 * u, 0.02 * u]} />
      {/* side panels, extruded from the profile and turned to stand on their edge */}
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          geometry={side}
          position={[s > 0 ? W / 2 : -W / 2 + 0.03 * u, 0, 0]}
          rotation={[0, -Math.PI / 2, 0]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color={look.body} roughness={0.6} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh
          key={`art${s}`}
          position={[s * (W / 2 + 0.001 * u), 1.1 * u, -0.1 * u]}
          rotation={[0, (s * Math.PI) / 2, 0]}
        >
          <planeGeometry args={[0.5 * u, 0.06 * u]} />
          <meshBasicMaterial color={look.neon} toneMapped={false} />
        </mesh>
      ))}
      {/* the inner body between the panels: a back block behind the screen, the lower front
          under the panel, and the marquee box */}
      <mesh position={[0, 0.91 * u, -0.16 * u]} castShadow>
        <boxGeometry args={[W - 0.06 * u, 1.82 * u, 0.4 * u]} />
        <meshStandardMaterial color={look.body} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.41 * u, 0.14 * u]} castShadow>
        <boxGeometry args={[W - 0.06 * u, 0.82 * u, 0.2 * u]} />
        <meshStandardMaterial color={look.body} roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.66 * u, 0.1 * u]} castShadow>
        <boxGeometry args={[W - 0.06 * u, 0.32 * u, 0.12 * u]} />
        <meshStandardMaterial color={look.body} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.41 * u, 0.245 * u]}>
        <planeGeometry args={[W - 0.06 * u, 0.82 * u]} />
        <meshStandardMaterial color="#141416" roughness={0.7} />
      </mesh>
      {/* control panel */}
      <mesh position={[0, 0.94 * u, 0.3 * u]} rotation={[0.35, 0, 0]} castShadow>
        <boxGeometry args={[W - 0.06 * u, 0.03 * u, 0.24 * u]} />
        <meshStandardMaterial color="#1b1b1e" roughness={0.5} />
      </mesh>
      {controls.map((x) => (
        <group key={x} position={[x, 0.97 * u, 0.3 * u]} rotation={[0.35, 0, 0]}>
          <mesh position={[-0.06 * u, 0.03 * u, 0]}>
            <cylinderGeometry args={[0.006 * u, 0.006 * u, 0.06 * u, 8]} />
            <meshStandardMaterial color="#222" />
          </mesh>
          <mesh position={[-0.06 * u, 0.065 * u, 0]}>
            <sphereGeometry args={[0.018 * u, 12, 10]} />
            <meshStandardMaterial color="#d23b3b" roughness={0.3} />
          </mesh>
          {[0, 1, 2].map((b) => (
            <mesh
              key={b}
              position={[0.02 * u + b * 0.035 * u, 0.008 * u, (b === 1 ? -0.015 : 0.01) * u]}
            >
              <cylinderGeometry args={[0.012 * u, 0.012 * u, 0.012 * u, 12]} />
              <meshBasicMaterial
                color={NEON[(b + look.players) % NEON.length]}
                toneMapped={false}
              />
            </mesh>
          ))}
        </group>
      ))}
      {/* screen on the slope */}
      <group
        position={[0, ((y0 + y1) / 2) * u, ((z0 + z1) / 2) * u + 0.002 * u]}
        rotation={[tilt, 0, 0]}
      >
        <mesh>
          <planeGeometry args={[W - 0.06 * u, slope]} />
          <meshStandardMaterial color="#0b0b0d" roughness={0.3} />
        </mesh>
        <mesh position={[0, 0, 0.001 * u]}>
          <planeGeometry args={[screenW, screenH]} />
          {on ? (
            <meshBasicMaterial color="#05060c" toneMapped={false} />
          ) : (
            <meshStandardMaterial color="#101214" roughness={0.1} metalness={0.4} />
          )}
        </mesh>
        {on && (
          <instancedMesh
            key={cells.list.length}
            ref={pixels}
            args={[undefined, undefined, cells.list.length]}
            position={[0, 0, 0.002 * u]}
          >
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial color={look.ink} toneMapped={false} />
          </instancedMesh>
        )}
      </group>
      {/* marquee */}
      <mesh position={[0, 1.68 * u, 0.161 * u]}>
        <planeGeometry args={[W - 0.06 * u, 0.22 * u]} />
        <meshBasicMaterial color={look.neon} toneMapped={false} />
      </mesh>
    </RigidBody>
  )
}

ArcadeCabinet.groundSitting = true
