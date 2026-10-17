import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { int, pick, type Rng, rng, sub, useWorld, type WorldComponentProps } from '@runek/core'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { Color, ExtrudeGeometry, type InstancedMesh, Object3D, Shape } from 'three'

/** The game on the screen: a row of `invaders` over a ship, falling `blocks` in a well, a `maze`
 *  of dots with a runner and ghosts, a `snake` after its food, or a `paddle` duel. */
export type ArcadeGame = 'invaders' | 'blocks' | 'maze' | 'snake' | 'paddle'

export interface ArcadeCabinetProps extends WorldComponentProps {
  /** Cabinet width, in units. */
  width?: number
  /** Body color. Seeded when unset. */
  color?: string
  /** Side-art stripe and marquee glow. Seeded when unset. */
  accent?: string
  /** Lit screen showing the game; off, dark glass. */
  on?: boolean
  /** Which game is running; each is laid out from the seed. Invaders when unset. */
  game?: ArcadeGame
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

/** A lit square on the screen, in screen-local meters, with its size as a share of a pixel. */
interface Cell {
  x: number
  y: number
  color: string
  scale?: number
}

const BLOCK_COLORS = ['#38c6f4', '#f0c419', '#b05ce6', '#7bd34f', '#e4405f', '#3f6fe0', '#f08a24']
// The seven four-square pieces, as (column, row) offsets.
const PIECES: [number, number][][] = [
  [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
  ],
  [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ],
  [
    [0, 0],
    [1, 0],
    [2, 0],
    [1, 1],
  ],
  [
    [1, 0],
    [2, 0],
    [0, 1],
    [1, 1],
  ],
  [
    [0, 0],
    [1, 0],
    [1, 1],
    [2, 1],
  ],
  [
    [0, 0],
    [0, 1],
    [1, 0],
    [2, 0],
  ],
  [
    [0, 0],
    [1, 0],
    [2, 0],
    [2, 1],
  ],
]

/** A game laid out on a grid of `cols` by `rows` pixels, as lit (column, row) cells, row 0 at the
 *  bottom. Deterministic from `r`. */
function layout(game: Exclude<ArcadeGame, 'invaders'>, r: Rng, cols: number, rows: number) {
  const cells: { c: number; r: number; color: string; scale?: number }[] = []
  const lit = (c: number, row: number, color: string, scale?: number) => {
    if (c >= 0 && c < cols && row >= 0 && row < rows) cells.push({ c, r: row, color, scale })
  }
  if (game === 'blocks') {
    const well = 10
    const left = Math.floor((cols - well) / 2)
    const wall = '#6a6f7a'
    for (let row = 0; row < rows - 1; row++) {
      lit(left - 1, row, wall)
      lit(left + well, row, wall)
    }
    for (let c = left - 1; c <= left + well; c++) lit(c, 0, wall)
    const height = int(r, 3, Math.max(4, Math.floor(rows * 0.4)))
    for (let row = 1; row <= height; row++) {
      const gap = int(r, 0, well - 1)
      for (let c = 0; c < well; c++) {
        if (c === gap || (row > height - 2 && r() < 0.4)) continue
        lit(left + c, row, pick(r, BLOCK_COLORS))
      }
    }
    const k = int(r, 0, PIECES.length - 1)
    const px = left + int(r, 0, well - 4)
    const py = rows - 4 - int(r, 0, 3)
    for (const [dc, dr] of PIECES[k]) lit(px + dc, py + dr, BLOCK_COLORS[k])
    return cells
  }
  if (game === 'maze') {
    // a maze carved on odd cells by a seeded depth-first walk, then dotted
    const w = cols % 2 ? cols : cols - 1
    const h = rows % 2 ? rows : rows - 1
    const open = new Set<string>()
    const key = (c: number, row: number) => `${c},${row}`
    const stack: [number, number][] = [[1, 1]]
    open.add(key(1, 1))
    while (stack.length) {
      const [c, row] = stack[stack.length - 1]
      const next = (
        [
          [2, 0],
          [-2, 0],
          [0, 2],
          [0, -2],
        ] as [number, number][]
      ).filter(([dc, dr]) => {
        const nc = c + dc
        const nr = row + dr
        return nc > 0 && nc < w - 1 && nr > 0 && nr < h - 1 && !open.has(key(nc, nr))
      })
      if (!next.length) {
        stack.pop()
        continue
      }
      const [dc, dr] = next[Math.floor(r() * next.length)]
      open.add(key(c + dc / 2, row + dr / 2))
      open.add(key(c + dc, row + dr))
      stack.push([c + dc, row + dr])
    }
    // knock out a few extra walls so the maze has loops, like the arcade ones
    for (let i = 0; i < (w * h) / 20; i++) {
      const c = int(r, 1, w - 2)
      const row = int(r, 1, h - 2)
      if ((c + row) % 2) open.add(key(c, row))
    }
    const off = Math.floor((cols - w) / 2)
    const free: [number, number][] = []
    for (let c = 0; c < w; c++) {
      for (let row = 0; row < h; row++) {
        if (open.has(key(c, row))) free.push([c, row])
        else lit(off + c, row, '#2b4fd8')
      }
    }
    const actors = new Set<string>()
    const place = (color: string, scale: number) => {
      const [c, row] = free[Math.floor(r() * free.length)]
      actors.add(key(c, row))
      lit(off + c, row, color, scale)
    }
    place('#f0d419', 1.15)
    for (const ghost of ['#e4405f', '#f49ac1', '#38c6f4']) place(ghost, 1.05)
    for (const [c, row] of free) {
      if (!actors.has(key(c, row)) && r() < 0.7) lit(off + c, row, '#f5d9b8', 0.3)
    }
    return cells
  }
  if (game === 'snake') {
    const wall = '#3a6b3a'
    for (let c = 0; c < cols; c++) {
      lit(c, 0, wall)
      lit(c, rows - 1, wall)
    }
    for (let row = 1; row < rows - 1; row++) {
      lit(0, row, wall)
      lit(cols - 1, row, wall)
    }
    const body: [number, number][] = [[int(r, 4, cols - 5), int(r, 4, rows - 5)]]
    const taken = new Set([body[0].join()])
    let dir: [number, number] = [1, 0]
    const length = int(r, 8, 22)
    for (let i = 1; i < length; i++) {
      if (r() < 0.3) dir = r() < 0.5 ? [-dir[1], dir[0]] : [dir[1], -dir[0]]
      const [c, row] = body[body.length - 1]
      const step: [number, number] = [c + dir[0], row + dir[1]]
      if (step[0] < 1 || step[0] > cols - 2 || step[1] < 1 || step[1] > rows - 2) {
        dir = [-dir[1], dir[0]]
        continue
      }
      if (taken.has(step.join())) break
      taken.add(step.join())
      body.push(step)
    }
    body.forEach(([c, row], i) => {
      lit(c, row, i === body.length - 1 ? '#c8ff7a' : '#7bd34f', 0.88)
    })
    let food: [number, number] = [int(r, 1, cols - 2), int(r, 1, rows - 2)]
    while (taken.has(food.join())) food = [int(r, 1, cols - 2), int(r, 1, rows - 2)]
    lit(food[0], food[1], '#e4405f', 0.8)
    return cells
  }
  const ink = '#f2f2f2'
  for (let row = 1; row < rows - 1; row += 2) lit(Math.floor(cols / 2), row, ink, 0.5)
  for (const [c, len] of [
    [2, 4],
    [cols - 3, 4],
  ]) {
    const y0 = int(r, 2, rows - len - 2)
    for (let i = 0; i < len; i++) lit(c, y0 + i, ink)
  }
  lit(int(r, 5, cols - 6), int(r, 3, rows - 4), ink)
  return cells
}

/**
 * An upright arcade cabinet: side panels cut to the classic profile, a lit marquee, a joystick
 * and buttons on the control panel, and a glowing screen running a pixel game laid out from the
 * seed: invaders by default, or falling blocks, a maze, a snake, or a paddle duel, drawn as
 * instanced squares. One cuboid collider.
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
  game = 'invaders',
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
    const out: Cell[] = []
    const px = screenW / 30
    if (game === 'invaders') {
      const draw = (art: boolean[][], cx: number, cy: number) => {
        art.forEach((row, y) => {
          row.forEach((on, x) => {
            if (on) out.push({ x: cx + (x - 2) * px, y: cy - (y - 2) * px, color: look.ink })
          })
        })
      }
      for (let i = 0; i < SPRITES; i++) {
        draw(look.invader, (i - 1) * screenW * 0.28, screenH * 0.22)
      }
      draw(look.ship, 0, -screenH * 0.3)
      return { list: out, px }
    }
    const cols = 30
    const rows = Math.floor(screenH / px)
    for (const c of layout(game, rng(sub(seed, 1)), cols, rows)) {
      out.push({
        x: (c.c - (cols - 1) / 2) * px,
        y: (c.r - (rows - 1) / 2) * px,
        color: c.color,
        scale: c.scale,
      })
    }
    return { list: out, px }
  }, [look, game, seed, screenW, screenH])
  useLayoutEffect(() => {
    const mesh = pixels.current
    if (!mesh) return
    const o = new Object3D()
    const tint = new Color()
    cells.list.forEach((c, i) => {
      const s = cells.px * 0.92 * (c.scale ?? 1)
      o.position.set(c.x, c.y, 0)
      o.scale.set(s, s, 1)
      o.updateMatrix()
      mesh.setMatrixAt(i, o.matrix)
      mesh.setColorAt(i, tint.set(c.color))
    })
    mesh.count = cells.list.length
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
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
            <meshBasicMaterial toneMapped={false} />
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
