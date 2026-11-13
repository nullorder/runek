import { rng, skipMirrors, useWorld, type Vec3 } from '@runek/core'
import { useEffect, useMemo, useRef } from 'react'
import {
  BufferGeometry,
  Color,
  DataTexture,
  DoubleSide,
  Float32BufferAttribute,
  type Group,
  LinearFilter,
  MeshBasicMaterial,
  NearestFilter,
  RepeatWrapping,
  RGBAFormat,
  SRGBColorSpace,
} from 'three'
import { emissiveColor, useLadder } from './city/glow'

export interface SkylineProps {
  /** Where the skyline is seen from [x, y, z] in units: the middle of the place it rings. */
  position?: Vec3
  /** Accepted for the component contract. Turn a skyline with `bearing`. */
  rotation?: Vec3
  /** Deals out every tower: where it stands, how tall, how wide, which windows are lit. */
  seed?: number
  /** Compass bearing of the middle of the district, in degrees: 0 is +Z, 90 is +X. */
  bearing?: number
  /** How many degrees of the horizon it takes up. */
  spread?: number
  /** How far off its nearest towers stand, in units. Keep it and `depth` under the camera's far plane. */
  distance?: number
  /** How far back the district goes behind that, in units. */
  depth?: number
  /** How many towers. */
  count?: number
  /** Shortest and tallest tower, in units. */
  heights?: [number, number]
  /** What stands over the district: a stepped `spire` with a lit collar, a `dome` in rings, or a squat `stack` with chimneys. */
  landmark?: 'spire' | 'dome' | 'stack'
  /** How tall the landmark is, in units. */
  landmarkHeight?: number
  /** The color of the landmark's lights. */
  accent?: string
  /** Haze color: the world's fog, so the district sinks into the horizon at its foot. */
  haze?: string
}

/** The window pattern every skyline shares: a grid of rooms, some of them lit. */
let rooms: DataTexture | null = null
function windowTexture(): DataTexture {
  if (rooms) return rooms
  const N = 64
  const r = rng(4242)
  const lit = [
    new Color('#ffcf9a'),
    new Color('#dfe8ff'),
    new Color('#ffa64d'),
    new Color('#f4f6fb'),
  ]
  const data = new Uint8Array(N * N * 4)
  for (let i = 0; i < N * N; i++) {
    const on = r() < 0.11
    const c = on ? lit[Math.floor(r() * lit.length)] : null
    // A dark room is a quarter as bright as a lit one, and takes the haze's blue: at this
    // distance a tower is a shape a little darker than the sky, not a black one.
    const k = on ? 0.7 + 0.3 * r() : 0.25
    // Lit rooms are washed out by the air between: half their color, half white.
    const tone = (v: number | undefined, dark: number) => (v === undefined ? dark : 0.5 + 0.5 * v)
    data.set(
      [
        Math.round(255 * k * tone(c?.r, 0.62)),
        Math.round(255 * k * tone(c?.g, 0.74)),
        Math.round(255 * k * tone(c?.b, 1)),
        255,
      ],
      i * 4,
    )
  }
  rooms = new DataTexture(data, N, N, RGBAFormat)
  rooms.colorSpace = SRGBColorSpace
  rooms.wrapS = rooms.wrapT = RepeatWrapping
  rooms.magFilter = NearestFilter
  rooms.minFilter = LinearFilter
  rooms.needsUpdate = true
  return rooms
}

/** One room of the window pattern is this wide and this tall, in units. */
const ROOM = { wide: 5, tall: 4.5 }

interface Mass {
  positions: number[]
  uvs: number[]
  colors: number[]
}

/**
 * A box standing on the ground at (x, z), turned to `yaw`, from `y0` up to `y1`: four walls and
 * a roof. Walls are lit from the foot by haze, so `foot` and `head` tint them from bottom to top.
 */
function tower(
  m: Mass,
  x: number,
  z: number,
  yaw: number,
  w: number,
  d: number,
  y0: number,
  y1: number,
  foot: Color,
  head: Color,
  shift: number,
) {
  const c = Math.cos(yaw)
  const s = Math.sin(yaw)
  const corner = (lx: number, lz: number): [number, number] => [
    x + lx * c + lz * s,
    z - lx * s + lz * c,
  ]
  const ring = [
    corner(-w / 2, -d / 2),
    corner(w / 2, -d / 2),
    corner(w / 2, d / 2),
    corner(-w / 2, d / 2),
  ]
  const lengths = [w, d, w, d]
  let along = shift
  for (let i = 0; i < 4; i++) {
    const a = ring[i]
    const b = ring[(i + 1) % 4]
    const u0 = along / ROOM.wide / 64
    along += lengths[i]
    const u1 = along / ROOM.wide / 64
    const v0 = (y0 / ROOM.tall + shift) / 64
    const v1 = (y1 / ROOM.tall + shift) / 64
    // Two triangles, wound to face outward.
    m.positions.push(
      a[0],
      y0,
      a[1],
      a[0],
      y1,
      a[1],
      b[0],
      y1,
      b[1],
      a[0],
      y0,
      a[1],
      b[0],
      y1,
      b[1],
      b[0],
      y0,
      b[1],
    )
    m.uvs.push(u0, v0, u0, v1, u1, v1, u0, v0, u1, v1, u1, v0)
    for (const tint of [foot, head, head, foot, head, foot]) m.colors.push(tint.r, tint.g, tint.b)
  }
  // The roof: dark, one texel of the pattern, whatever it holds.
  const [p0, p1, p2, p3] = ring
  m.positions.push(
    p0[0],
    y1,
    p0[1],
    p2[0],
    y1,
    p2[1],
    p1[0],
    y1,
    p1[1],
    p0[0],
    y1,
    p0[1],
    p3[0],
    y1,
    p3[1],
    p2[0],
    y1,
    p2[1],
  )
  for (let k = 0; k < 6; k++) {
    m.uvs.push(0.004, 0.004)
    m.colors.push(head.r * 0.5, head.g * 0.5, head.b * 0.5)
  }
}

/**
 * A district seen from far off: towers standing in the haze across the water, with a few rooms
 * lit and one landmark over them. It is scenery only, out past anywhere a body can reach, and
 * it is what tells a small world that it is part of a city.
 *
 * Two draws: every tower in one merged mesh, and the landmark's lights in another. Neither takes
 * the scene's fog, since fog would hide them outright. Each tower is tinted toward `haze` at its
 * foot instead, and its dark rooms sit just under the brightness of a night sky's horizon, so it
 * reads as a silhouette with windows. Both are left out of the world's mirrors. No colliders.
 * Plain `MeshBasicMaterial`s, so it draws the same under `WebGPURenderer`.
 */
export function Skyline({
  position = [0, 0, 0],
  seed = 1,
  bearing = 180,
  spread = 70,
  distance = 620,
  depth = 180,
  count = 60,
  heights = [50, 170],
  landmark,
  landmarkHeight = 380,
  accent = '#3d5bff',
  haze = '#1a2238',
}: SkylineProps) {
  const { unit } = useWorld()
  const ladder = useLadder()

  const built = useMemo(() => {
    const r = rng(seed)
    const body: Mass = { positions: [], uvs: [], colors: [] }
    const glow: number[] = []
    const mid = (bearing * Math.PI) / 180
    const half = ((spread / 2) * Math.PI) / 180
    const white = new Color(1, 1, 1)
    // Haze lifts and blues the foot of every tower toward the horizon's own color.
    const tint = new Color(haze)
    const peak = Math.max(tint.r, tint.g, tint.b, 1e-3)
    const foot = tint.clone().multiplyScalar(1.5 / peak)
    for (let i = 0; i < count; i++) {
      const a = mid + (r() * 2 - 1) * half
      const far = distance + r() * depth
      // Tall in the middle of the district, low at its edges.
      const centred = 1 - Math.abs(a - mid) / Math.max(half, 1e-3)
      const h = heights[0] + (heights[1] - heights[0]) * r() ** 1.6 * (0.45 + 0.55 * centred)
      const w = 20 + r() * 26
      const d = 20 + r() * 26
      tower(
        body,
        Math.sin(a) * far,
        Math.cos(a) * far,
        a + (r() - 0.5) * 0.5,
        w,
        d,
        -6,
        h,
        foot,
        white,
        r() * 64,
      )
      // A stepped head on some.
      if (r() < 0.35)
        tower(
          body,
          Math.sin(a) * far,
          Math.cos(a) * far,
          a,
          w * 0.55,
          d * 0.55,
          h,
          h * 1.18,
          white,
          white,
          r() * 64,
        )
    }
    if (landmark) {
      const far = distance + depth * 0.5
      const x = Math.sin(mid) * far
      const z = Math.cos(mid) * far
      const H = landmarkHeight
      // A bar of light: a thin box, `wide` round the landmark, at height `y`.
      const band = (y: number, wide: number, tall: number) => {
        const m: Mass = { positions: [], uvs: [], colors: [] }
        tower(m, x, z, mid, wide, wide, y, y + tall, white, white, 0)
        glow.push(...m.positions)
      }
      if (landmark === 'spire') {
        // The Regulator: three steps to a point, a lit collar where a clock would be, a lamp on top.
        tower(body, x, z, mid, 64, 64, -6, H * 0.45, foot, white, 3)
        tower(body, x, z, mid, 44, 44, H * 0.45, H * 0.78, white, white, 9)
        tower(body, x, z, mid, 22, 22, H * 0.78, H * 0.96, white, white, 17)
        tower(body, x, z, mid, 5, 5, H * 0.96, H * 1.12, white, white, 0)
        band(H * 0.8, 50, 4)
        band(H * 0.455, 68, 2.5)
        band(H * 1.12, 7, 6)
      } else if (landmark === 'dome') {
        // The Orrery: rings stepping in to a crown, each edged in light.
        const steps = 7
        for (let k = 0; k < steps; k++) {
          const t0 = k / steps
          const t1 = (k + 1) / steps
          const wide = 150 * Math.cos((t0 * Math.PI) / 2) + 14
          tower(
            body,
            x,
            z,
            mid + k * 0.2,
            wide,
            wide,
            k === 0 ? -6 : H * Math.sin((t0 * Math.PI) / 2),
            H * Math.sin((t1 * Math.PI) / 2),
            k === 0 ? foot : white,
            white,
            k * 7,
          )
          if (k % 2 === 1) band(H * Math.sin((t1 * Math.PI) / 2), wide + 4, 1.8)
        }
      } else {
        // Pump One: a squat hall and three chimneys with lit tips.
        tower(body, x, z, mid, 170, 90, -6, H * 0.4, foot, white, 5)
        for (const off of [-52, 0, 52]) {
          const cx = x + Math.cos(mid) * off
          const cz = z - Math.sin(mid) * off
          tower(body, cx, cz, mid, 16, 16, H * 0.4, H, white, white, off)
          const m: Mass = { positions: [], uvs: [], colors: [] }
          tower(m, cx, cz, mid, 19, 19, H, H + 3, white, white, 0)
          glow.push(...m.positions)
        }
      }
    }
    const scale = (list: number[]) =>
      new Float32BufferAttribute(
        list.map((v) => v * unit),
        3,
      )
    const towers = new BufferGeometry()
    towers.setAttribute('position', scale(body.positions))
    towers.setAttribute('uv', new Float32BufferAttribute(body.uvs, 2))
    towers.setAttribute('color', new Float32BufferAttribute(body.colors, 3))
    const lights = new BufferGeometry()
    lights.setAttribute('position', scale(glow))
    return { towers, lights: glow.length ? lights : null }
  }, [seed, bearing, spread, distance, depth, count, heights, landmark, landmarkHeight, haze, unit])

  const materials = useMemo(() => {
    // A dark room lands at about two thirds of the horizon's glow, so a tower is a shape just
    // darker than the sky behind it, and a lit one at the foot of the window rung.
    const walls = new MeshBasicMaterial({
      map: windowTexture(),
      vertexColors: true,
      fog: false,
      toneMapped: false,
      side: DoubleSide,
    })
    walls.color.setScalar((ladder.skyDome[1] * 0.68) / 0.25)
    const lit = new MeshBasicMaterial({
      color: emissiveColor(accent, ladder.signFace[0]),
      fog: false,
      toneMapped: false,
      side: DoubleSide,
    })
    return { walls, lit }
  }, [ladder.windowLit, ladder.signFace, accent])
  useEffect(
    () => () => {
      built.towers.dispose()
      built.lights?.dispose()
    },
    [built],
  )
  useEffect(
    () => () => {
      materials.walls.dispose()
      materials.lit.dispose()
    },
    [materials],
  )

  // Too far off to reflect, and two big draws a reflection would only repeat.
  const root = useRef<Group>(null)
  useEffect(() => skipMirrors(root.current), [])

  return (
    <group ref={root} position={position}>
      <mesh geometry={built.towers} material={materials.walls} frustumCulled={false} />
      {built.lights && (
        <mesh geometry={built.lights} material={materials.lit} frustumCulled={false} />
      )}
    </group>
  )
}

Skyline.stream = false
