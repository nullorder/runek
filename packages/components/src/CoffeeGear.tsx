import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { rng, useMaterials, useWorld, type Vec3 } from '@runek/core'
import { useMemo } from 'react'
import { BoxGeometry, type BufferGeometry, CylinderGeometry, SphereGeometry } from 'three'
import { glowMaterial, mid, useLadder } from './city/glow'

/** What a cafe keeps on its counters, by name. */
export type CoffeeGearKind =
  /** A lever-less espresso machine: `length` sets how many groups (0.3 units each). */
  | 'espresso'
  | 'grinder'
  /** A pour-over bar: a row of cone drippers over servers, one every 0.22 units of `length`. */
  | 'pourover'
  /** An hourglass brewer with a wooden collar. */
  | 'chemex'
  /** A French press. */
  | 'press'
  /** A stovetop moka pot. */
  | 'moka'
  /** A vacuum siphon over a burner. */
  | 'siphon'
  /** A cold drip tower. */
  | 'coldbrew'
  /** A gooseneck kettle. */
  | 'kettle'
  /** A batch brewer with a server under its basket. */
  | 'batch'
  /** A tray of hot sand with two long-handled pots in it. */
  | 'ibrik'
  /** A tap tower for cold brew and nitro. */
  | 'taps'
  /** Milk pitchers in a row along `length`. */
  | 'pitchers'
  /** Jars of beans in a row along `length`, from dark roast to light. */
  | 'jars'
  /** Bags of beans in a row along `length`. */
  | 'bags'
  /** Stacks of cups in a row along `length`. */
  | 'cups'
  /** Wall shelves `length` long, `rows` of them, stocked with bags and jars. */
  | 'shelf'
  /** A drum roaster that stands on the floor. The one kind with a collider. */
  | 'roaster'

export interface CoffeeGearProps {
  /** The middle of its foot: on the counter it stands on. A shelf's is the middle of its lowest board. */
  position?: Vec3
  /** The working side is the kind's own +Z. */
  rotation?: Vec3
  /** Picks the bag colors and how high each stack of cups is. */
  seed?: number
  /** Which piece of gear it is. */
  kind?: CoffeeGearKind
  /** How long a row is, or how wide an espresso machine, in units. */
  length?: number
  /** How many boards a shelf has. */
  rows?: number
  /** The color of its pilot lights and flames, lit at the world's `screen` luminance level. */
  glow?: string
}

type Paint =
  | 'steel'
  | 'dark'
  | 'black'
  | 'coffee'
  | 'roast'
  | 'blonde'
  | 'wood'
  | 'cream'
  | 'glass'
  | 'copper'
  | 'sand'
  | 'bagA'
  | 'bagB'
  | 'bagC'
  | 'bagD'
  | 'glow'
interface Part {
  g: BufferGeometry
  m: Paint
  p: Vec3
  r?: Vec3
}

// Geometry is shared by every piece of the same size, across every piece of gear.
const cache = new Map<string, BufferGeometry>()
function shape<T extends BufferGeometry>(key: string, make: () => T): T {
  let g = cache.get(key) as T | undefined
  if (!g) {
    g = make()
    cache.set(key, g)
  }
  return g
}
const n = (v: number) => v.toFixed(4)

const BAGS: Paint[] = ['bagA', 'bagB', 'bagC', 'bagD', 'black', 'cream']
const ROASTS: Paint[] = ['coffee', 'roast', 'blonde']

/** The parts of one piece of gear, in units scaled by `u`, with its foot at the origin. */
function build(
  kind: CoffeeGearKind,
  length: number,
  rows: number,
  seed: number,
  u: number,
): Part[] {
  const out: Part[] = []
  const box = (w: number, h: number, d: number) =>
    shape(`b:${n(w * u)}:${n(h * u)}:${n(d * u)}`, () => new BoxGeometry(w * u, h * u, d * u))
  const cyl = (top: number, bottom: number, h: number, seg = 14) =>
    shape(
      `c:${n(top * u)}:${n(bottom * u)}:${n(h * u)}:${seg}`,
      () => new CylinderGeometry(top * u, bottom * u, h * u, seg),
    )
  const ball = (r: number) => shape(`s:${n(r * u)}`, () => new SphereGeometry(r * u, 14, 10))
  /** Add a part at (x, y, z) units, shifted by the offset in force. */
  let ox = 0
  let oy = 0
  const add = (g: BufferGeometry, m: Paint, x: number, y: number, z: number, r?: Vec3) =>
    out.push({ g, m, p: [(x + ox) * u, (y + oy) * u, z * u], r })
  const random = rng(seed)

  const jars = (len: number) => {
    const count = Math.max(1, Math.floor(len / 0.16))
    for (let i = 0; i < count; i++) {
      const x = (i - (count - 1) / 2) * 0.16
      add(cyl(0.055, 0.055, 0.16), ROASTS[i % ROASTS.length], x, 0.08, 0)
      add(cyl(0.058, 0.058, 0.02), 'steel', x, 0.17, 0)
      add(box(0.06, 0.04, 0.004), 'cream', x, 0.09, 0.055)
    }
  }
  const bags = (len: number) => {
    const count = Math.max(1, Math.floor(len / 0.17))
    for (let i = 0; i < count; i++) {
      const x = (i - (count - 1) / 2) * 0.17
      const paint = BAGS[Math.floor(random() * BAGS.length)]
      add(box(0.12, 0.2, 0.07), paint, x, 0.1, 0)
      add(box(0.12, 0.03, 0.02), paint, x, 0.215, 0)
      add(box(0.08, 0.07, 0.004), paint === 'cream' ? 'black' : 'cream', x, 0.1, 0.037)
    }
  }

  switch (kind) {
    case 'espresso': {
      const groups = Math.max(1, Math.round(length / 0.3))
      const W = groups * 0.3 + 0.15
      add(box(W, 0.1, 0.5), 'dark', 0, 0.05, 0)
      add(box(W - 0.04, 0.3, 0.22), 'steel', 0, 0.25, -0.14)
      add(box(W, 0.07, 0.5), 'steel', 0, 0.405, 0)
      for (const side of [-1, 1]) {
        add(box(0.02, 0.44, 0.5), 'black', side * (W / 2 + 0.01), 0.22, 0)
        // A steam wand at each end, leaning out over the tray.
        add(cyl(0.006, 0.006, 0.22, 8), 'steel', side * (W / 2 - 0.05), 0.24, 0.13, [
          0.35,
          0,
          side * 0.25,
        ])
      }
      add(box(W - 0.06, 0.012, 0.24), 'steel', 0, 0.106, 0.11)
      for (let i = 0; i < groups; i++) {
        const x = (i - (groups - 1) / 2) * 0.3
        add(cyl(0.04, 0.04, 0.06), 'steel', x, 0.34, 0.08)
        add(cyl(0.036, 0.03, 0.03), 'black', x, 0.295, 0.08)
        add(box(0.024, 0.024, 0.15), 'black', x, 0.295, 0.2)
        add(cyl(0.028, 0.028, 0.01), 'cream', x - 0.08, 0.26, -0.025, [Math.PI / 2, 0, 0])
        add(box(0.03, 0.014, 0.006), 'glow', x + 0.07, 0.26, -0.027)
      }
      // Cups warming on top, mouth down.
      for (let i = 0; i < groups * 3; i++)
        add(cyl(0.03, 0.038, 0.06), 'cream', (i - (groups * 3 - 1) / 2) * 0.095, 0.47, -0.08)
      break
    }
    case 'grinder':
      add(box(0.16, 0.24, 0.22), 'black', 0, 0.12, 0)
      add(box(0.1, 0.06, 0.1), 'steel', 0, 0.27, 0)
      add(cyl(0.085, 0.045, 0.2), 'roast', 0, 0.4, 0)
      add(cyl(0.088, 0.088, 0.014), 'black', 0, 0.507, 0)
      add(box(0.04, 0.05, 0.07), 'steel', 0, 0.19, 0.13)
      add(box(0.09, 0.008, 0.06), 'steel', 0, 0.09, 0.14)
      add(box(0.03, 0.012, 0.006), 'glow', 0, 0.06, 0.112)
      break
    case 'pourover': {
      const count = Math.max(1, Math.floor(length / 0.22))
      const W = count * 0.22 + 0.04
      add(box(W, 0.02, 0.2), 'wood', 0, 0.01, 0)
      add(box(W, 0.014, 0.11), 'wood', 0, 0.26, 0)
      for (const side of [-1, 1])
        add(cyl(0.008, 0.008, 0.25, 8), 'steel', side * (W / 2 - 0.02), 0.135, -0.04)
      for (let i = 0; i < count; i++) {
        const x = (i - (count - 1) / 2) * 0.22
        add(cyl(0.058, 0.02, 0.075), 'cream', x, 0.3, 0)
        add(cyl(0.04, 0.052, 0.09), 'coffee', x, 0.065, 0)
        add(cyl(0.03, 0.04, 0.035), 'glass', x, 0.127, 0)
      }
      break
    }
    case 'chemex':
      add(cyl(0.025, 0.065, 0.12), 'coffee', 0, 0.06, 0)
      add(cyl(0.062, 0.025, 0.1), 'glass', 0, 0.17, 0)
      add(cyl(0.031, 0.031, 0.036), 'wood', 0, 0.12, 0)
      break
    case 'press':
      add(cyl(0.05, 0.05, 0.015), 'steel', 0, 0.0075, 0)
      add(cyl(0.045, 0.045, 0.15), 'coffee', 0, 0.09, 0)
      add(cyl(0.048, 0.048, 0.012), 'steel', 0, 0.165, 0)
      add(cyl(0.045, 0.05, 0.016), 'steel', 0, 0.18, 0)
      add(cyl(0.004, 0.004, 0.07, 6), 'steel', 0, 0.22, 0)
      add(ball(0.014), 'black', 0, 0.26, 0)
      add(box(0.014, 0.11, 0.028), 'black', 0.06, 0.1, 0)
      break
    case 'moka':
      add(cyl(0.035, 0.05, 0.07, 8), 'steel', 0, 0.035, 0)
      add(cyl(0.038, 0.038, 0.012, 8), 'dark', 0, 0.076, 0)
      add(cyl(0.05, 0.036, 0.08, 8), 'steel', 0, 0.122, 0)
      add(cyl(0.018, 0.05, 0.014, 8), 'steel', 0, 0.169, 0)
      add(ball(0.011), 'black', 0, 0.185, 0)
      add(box(0.014, 0.07, 0.028), 'black', 0.066, 0.125, 0)
      break
    case 'siphon':
      add(box(0.16, 0.016, 0.14), 'wood', 0, 0.008, 0)
      add(cyl(0.006, 0.006, 0.36, 8), 'steel', -0.065, 0.19, 0)
      add(box(0.06, 0.008, 0.012), 'steel', -0.04, 0.2, 0)
      add(cyl(0.02, 0.026, 0.03), 'steel', 0, 0.031, 0)
      add(cyl(0.005, 0.012, 0.028, 8), 'glow', 0, 0.06, 0)
      add(ball(0.05), 'glass', 0, 0.13, 0)
      add(cyl(0.012, 0.012, 0.04, 8), 'glass', 0, 0.19, 0)
      add(cyl(0.046, 0.034, 0.11), 'coffee', 0, 0.255, 0)
      add(cyl(0.048, 0.048, 0.008), 'black', 0, 0.314, 0)
      break
    case 'coldbrew':
      add(box(0.28, 0.02, 0.2), 'wood', 0, 0.01, 0)
      for (const side of [-1, 1]) add(box(0.02, 0.86, 0.02), 'wood', side * 0.12, 0.45, -0.06)
      for (const y of [0.34, 0.62, 0.87]) add(box(0.26, 0.014, 0.15), 'wood', 0, y, 0)
      add(ball(0.075), 'glass', 0, 0.72, 0.01)
      add(cyl(0.006, 0.006, 0.05, 6), 'steel', 0, 0.645, 0.01)
      add(cyl(0.04, 0.04, 0.2), 'roast', 0, 0.455, 0.01)
      add(cyl(0.004, 0.004, 0.16, 6), 'steel', 0, 0.26, 0.01)
      add(cyl(0.045, 0.06, 0.13), 'coffee', 0, 0.085, 0.01)
      add(cyl(0.022, 0.032, 0.04), 'glass', 0, 0.17, 0.01)
      break
    case 'kettle':
      add(cyl(0.04, 0.06, 0.1), 'steel', 0, 0.05, 0)
      add(cyl(0.034, 0.04, 0.012), 'steel', 0, 0.106, 0)
      add(ball(0.01), 'black', 0, 0.121, 0)
      add(box(0.012, 0.09, 0.02), 'black', -0.078, 0.07, 0)
      add(box(0.04, 0.012, 0.02), 'black', -0.058, 0.112, 0)
      add(cyl(0.005, 0.008, 0.14, 8), 'steel', 0.085, 0.075, 0, [0, 0, -0.65])
      break
    case 'batch':
      add(box(0.26, 0.03, 0.36), 'black', 0, 0.015, 0)
      add(box(0.26, 0.4, 0.12), 'black', 0, 0.23, -0.12)
      add(box(0.26, 0.09, 0.36), 'steel', 0, 0.445, 0)
      add(cyl(0.06, 0.045, 0.07), 'black', 0, 0.365, 0.05)
      add(cyl(0.065, 0.075, 0.16), 'coffee', 0, 0.11, 0.05)
      add(cyl(0.05, 0.065, 0.02), 'black', 0, 0.2, 0.05)
      add(box(0.014, 0.1, 0.03), 'black', 0.09, 0.11, 0.05)
      add(box(0.03, 0.014, 0.006), 'glow', 0.08, 0.445, 0.182)
      break
    case 'ibrik':
      add(box(0.34, 0.05, 0.24), 'dark', 0, 0.025, 0)
      add(box(0.31, 0.012, 0.21), 'sand', 0, 0.052, 0)
      for (const side of [-1, 1]) {
        add(cyl(0.026, 0.038, 0.065, 10), 'copper', side * 0.075, 0.09, 0)
        add(box(0.012, 0.008, 0.13), 'copper', side * 0.075, 0.112, 0.09)
      }
      break
    case 'taps':
      add(box(0.36, 0.015, 0.18), 'steel', 0, 0.0075, 0.05)
      add(cyl(0.035, 0.035, 0.3), 'steel', 0, 0.165, -0.02)
      add(box(0.32, 0.055, 0.07), 'steel', 0, 0.34, -0.02)
      for (const x of [-0.11, 0, 0.11]) {
        add(cyl(0.008, 0.008, 0.05, 8), 'steel', x, 0.29, 0.03)
        add(box(0.02, 0.11, 0.02), 'black', x, 0.42, 0.02)
      }
      add(box(0.03, 0.014, 0.006), 'glow', 0, 0.34, 0.017)
      break
    case 'pitchers': {
      const count = Math.max(1, Math.floor(length / 0.12))
      for (let i = 0; i < count; i++) {
        const x = (i - (count - 1) / 2) * 0.12
        const s = 1 - 0.18 * (i % 3)
        add(cyl(0.036 * s, 0.042 * s, 0.1 * s), 'steel', x, 0.05 * s, 0)
        add(box(0.012, 0.07 * s, 0.022), 'steel', x, 0.055 * s, -0.05 * s)
      }
      break
    }
    case 'jars':
      jars(length)
      break
    case 'bags':
      bags(length)
      break
    case 'cups': {
      const count = Math.max(1, Math.floor(length / 0.11))
      for (let i = 0; i < count; i++) {
        const stack = 2 + Math.floor(random() * 4)
        for (let j = 0; j < stack; j++)
          add(cyl(0.04, 0.03, 0.07), 'cream', (i - (count - 1) / 2) * 0.11, 0.035 + j * 0.028, 0)
      }
      break
    }
    case 'shelf':
      for (let row = 0; row < Math.max(1, rows); row++) {
        oy = row * 0.42
        add(box(length, 0.03, 0.26), 'wood', 0, -0.015, 0)
        for (const side of [-1, 1])
          add(box(0.03, 0.14, 0.2), 'dark', side * (length / 2 - 0.12), -0.1, -0.03)
        // Bags and jars turn about along each board, half a board of each.
        const half = length / 2 - 0.1
        for (const side of [-1, 1]) {
          ox = (side * length) / 4
          if ((row + (side + 1) / 2) % 2 === 0) bags(half)
          else jars(half)
        }
        ox = 0
      }
      break
    case 'roaster':
      // Legs, the firebox, the drum on its side, a hopper over it and a cooling tray in front.
      for (const x of [-0.3, 0.3])
        for (const z of [-0.3, 0.3]) add(box(0.05, 0.5, 0.05), 'black', x, 0.25, z)
      add(box(0.72, 0.5, 0.7), 'dark', 0, 0.75, -0.02)
      add(cyl(0.3, 0.3, 0.62, 20), 'steel', 0, 1.02, 0, [Math.PI / 2, 0, 0])
      add(cyl(0.31, 0.31, 0.03, 20), 'black', 0, 1.02, 0.32, [Math.PI / 2, 0, 0])
      add(cyl(0.07, 0.07, 0.012, 14), 'glow', 0, 1.02, 0.338, [Math.PI / 2, 0, 0])
      add(cyl(0.2, 0.06, 0.26), 'steel', 0, 1.45, 0.05)
      add(cyl(0.06, 0.06, 1.5, 10), 'black', 0.2, 1.9, -0.25)
      add(cyl(0.34, 0.34, 0.1, 20), 'steel', 0, 0.62, 0.62)
      add(cyl(0.32, 0.32, 0.012, 20), 'roast', 0, 0.672, 0.62)
      add(box(0.06, 0.6, 0.06), 'black', 0, 0.3, 0.62)
      add(box(0.03, 0.03, 0.2), 'black', 0.33, 1.02, 0.4)
      break
  }
  return out
}

/**
 * What a cafe makes coffee with and shows it off in: machines, brewers, a roaster, and the beans
 * in bags and jars. One `kind` to a node, standing on whatever is under its `position`. Scenery:
 * nothing here is glass, so the whole bar merges into the building's static batch, and only the
 * roaster, which stands on the floor, has a collider.
 */
export function CoffeeGear({
  position,
  rotation = [0, 0, 0],
  seed = 0,
  kind = 'espresso',
  length = 0.6,
  rows = 3,
  glow = '#ffa64d',
}: CoffeeGearProps) {
  const { unit, palette, ground } = useWorld()
  const lum = useLadder()
  const paints = useMaterials({
    steel: { slot: 'metal.bare', color: '#9a9ea3', roughness: 0.35, metalness: 0.55 },
    dark: { slot: 'metal.painted', color: palette.metal, roughness: 0.6, metalness: 0.3 },
    black: { color: '#17181b', roughness: 0.7 },
    coffee: { color: '#2a1e18', roughness: 0.4 },
    roast: { color: '#4a3528', roughness: 0.8 },
    blonde: { color: '#7d6248', roughness: 0.8 },
    wood: { slot: 'wood', color: '#5c4636', roughness: 0.85 },
    cream: { slot: 'ceramic', color: '#d6cfc2', roughness: 0.6 },
    glass: { slot: 'glass', color: '#8c9aa0', roughness: 0.15, metalness: 0.2 },
    copper: { slot: 'metal.bare', color: '#9a6a4c', roughness: 0.4, metalness: 0.6 },
    sand: { color: '#a3927a', roughness: 1 },
    bagA: { slot: 'fabric', color: '#7a6450', roughness: 0.9 },
    bagB: { slot: 'fabric', color: '#4d3b36', roughness: 0.9 },
    bagC: { slot: 'fabric', color: '#3d4642', roughness: 0.9 },
    bagD: { slot: 'fabric', color: '#56505c', roughness: 0.9 },
  })
  const lit = glowMaterial(glow, mid(lum.shopGlass))
  const parts = useMemo(
    () => build(kind, Math.abs(length), rows, seed, unit),
    [kind, length, rows, seed, unit],
  )
  return (
    <group position={position ?? [0, ground, 0]} rotation={rotation}>
      {kind === 'roaster' && (
        <RigidBody type="fixed" colliders={false}>
          <CuboidCollider
            args={[0.4 * unit, 0.7 * unit, 0.65 * unit]}
            position={[0, 0.7 * unit, 0.15 * unit]}
          />
        </RigidBody>
      )}
      {parts.map((part, i) => (
        <mesh
          key={i}
          position={part.p}
          rotation={part.r}
          geometry={part.g}
          material={part.m === 'glow' ? lit : paints[part.m]}
        />
      ))}
    </group>
  )
}
