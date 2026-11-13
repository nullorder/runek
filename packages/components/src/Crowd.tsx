import { useFrame } from '@react-three/fiber'
import { Dynamic, rng, skipMirrors, useWorld, type Vec3 } from '@runek/core'
import { useEffect, useMemo, useRef } from 'react'
import {
  BoxGeometry,
  type BufferGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  Float32BufferAttribute,
  type Group,
  type InstancedMesh,
  LatheGeometry,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  SphereGeometry,
  Vector2,
  Vector3,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { emissiveColor, useLadder } from './city/glow'
import { hash2 } from './city/hash'

/** A path a crowd walks, there and back: a height and the corners it goes through, in units. */
export interface CrowdLane {
  /** The ground along it. */
  y: number
  /** Its corners, each [x, z]. */
  points: [number, number][]
}

export interface CrowdProps {
  /** Where the lanes' origin stands [x, y, z] in units: lanes are in the node's own frame. */
  position?: Vec3
  /** Rotation [x, y, z] in radians, turning the lanes with it. */
  rotation?: Vec3
  /** Deals out each walker: which lane, where on it, how fast, how tall, what they wear. */
  seed?: number
  /** How many walk. */
  count?: number
  /** The paths they walk, in the node's frame. A walker keeps to one lane, going to its end and
   *  back. One 16-unit lane along X by default. */
  lanes?: CrowdLane[]
  /** Slowest and fastest a walker goes, in units a second. */
  speed?: [number, number]
  /** How far to either side of its lane a walker keeps, in units, so a crowd is not a queue. */
  spread?: number
  /** How far round the player a walker steps aside, in units. 0 for none. */
  berth?: number
}

/** Coats: dark cloth, as the district wears it. */
const COATS = ['#16141c', '#1d1f22', '#2a120c', '#33363b', '#42464a', '#20242a']
/** The one lit thing each of them carries: a tag at the collar, in a lamp color. */
const TAGS = ['#ffa64d', '#ff6418', '#39ff88', '#b967ff', '#f4f6fb', '#dfe8ff']

interface Walker {
  lane: number
  offset: number
  speed: number
  aside: number
  tall: number
  stride: number
}

interface Path {
  y: number
  /** Corners in world units, and the length walked by each one. */
  x: number[]
  z: number[]
  at: number[]
  length: number
}

/** A box with every vertex painted one shade of grey, for a part the instance color tints. */
function shade<G extends BufferGeometry>(g: G, v: number): G {
  const n = g.attributes.position.count
  g.setAttribute('color', new Float32BufferAttribute(new Float32Array(n * 3).fill(v), 3))
  return g
}

/**
 * A hooded figure in a long coat, a metre and three quarters tall, standing on the ground at
 * the origin and facing +Z: the coat, the hood, the dark where a face would be, and two sleeves.
 * One mesh. The legs are separate, so they can swing.
 */
function coatGeometry(): BufferGeometry {
  const profile = [
    [0.2, 0.34],
    [0.19, 0.6],
    [0.165, 0.98],
    [0.19, 1.3],
    [0.2, 1.4],
    [0.1, 1.47],
    [0.0, 1.48],
  ].map(([r, y]) => new Vector2(r, y))
  const coat = shade(new LatheGeometry(profile, 10).scale(1, 1, 0.72), 1)
  const hood = shade(
    new SphereGeometry(0.135, 10, 8).scale(1, 1.12, 1.05).translate(0, 1.6, -0.01),
    0.82,
  )
  const face = shade(new CircleGeometry(0.085, 10).translate(0, 1.59, 0.128), 0.04)
  const sleeve = (side: number) =>
    shade(new CylinderGeometry(0.05, 0.045, 0.6, 6).translate(side * 0.235, 1.06, 0), 0.9)
  const parts = [coat, hood, face, sleeve(1), sleeve(-1)].map((g) => g.toNonIndexed())
  for (const g of parts) g.deleteAttribute('uv')
  return mergeGeometries(parts)
}

/**
 * People on the street, in bulk: hooded figures in long coats walking their lanes there and back,
 * each with one small light at the collar. Where each one is comes from the world clock and
 * `seed` alone (contract §2), so every player sees the same crowd and nothing is simulated or
 * sent. They are scenery: no collider, nobody to talk to, and the server knows nothing of them.
 * A walker steps aside for the player rather than walk through them.
 *
 * Three instanced draws however many walk (coats, legs, collar lights), left out of the world's
 * mirrors.
 * Lit like any matte surface, so lamps, signs and fog carry them. Built as a far tier: up close
 * they are a shape in a coat with no face under the hood, and a world that wants a face puts a
 * `Person` there.
 */
export function Crowd({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  seed = 1,
  count = 24,
  lanes = DEFAULT_LANES,
  speed = [0.9, 1.5],
  spread = 0.9,
  berth = 1.3,
}: CrowdProps) {
  const { unit, player, now = Date.now } = useWorld()
  const root = useRef<Group>(null)
  const ladder = useLadder()
  const coats = useRef<InstancedMesh>(null)
  const legs = useRef<InstancedMesh>(null)
  const tags = useRef<InstancedMesh>(null)
  const total = Math.max(0, Math.round(count))
  const [slow, fast] = speed
  const lanesKey = JSON.stringify(lanes)

  const paths = useMemo<Path[]>(() => {
    const given = JSON.parse(lanesKey) as CrowdLane[]
    return given
      .filter((lane) => lane.points.length > 1)
      .map((lane) => {
        const x = lane.points.map((p) => p[0] * unit)
        const z = lane.points.map((p) => p[1] * unit)
        const at = [0]
        for (let i = 1; i < x.length; i++)
          at.push(at[i - 1] + Math.hypot(x[i] - x[i - 1], z[i] - z[i - 1]))
        return { y: lane.y * unit, x, z, at, length: at[at.length - 1] }
      })
      .filter((path) => path.length > 0)
  }, [lanesKey, unit])

  const walkers = useMemo<Walker[]>(() => {
    if (!paths.length) return []
    const r = rng(seed)
    const whole = paths.reduce((sum, path) => sum + path.length, 0)
    return Array.from({ length: total }, () => {
      // Longer lanes carry more of the crowd.
      let pick = r() * whole
      let lane = 0
      while (lane < paths.length - 1 && pick > paths[lane].length) pick -= paths[lane++].length
      const tall = 0.92 + r() * 0.14
      return {
        lane,
        offset: r() * paths[lane].length * 2,
        speed: (slow + r() * (fast - slow)) * unit,
        aside: (r() * 2 - 1) * spread * unit,
        tall,
        stride: 1.35 * tall * unit,
      }
    })
  }, [paths, seed, total, slow, fast, spread, unit])

  const made = useMemo(() => {
    const coat = coatGeometry().scale(unit, unit, unit)
    // A leg hangs from its top, so it swings about the hip.
    const leg = shade(
      new BoxGeometry(0.1 * unit, 0.5 * unit, 0.12 * unit).translate(0, -0.25 * unit, 0),
      1,
    )
    const tag = new BoxGeometry(0.05 * unit, 0.03 * unit, 0.02 * unit)
    const cloth = new MeshStandardMaterial({
      color: '#ffffff',
      vertexColors: true,
      roughness: 0.92,
      metalness: 0,
    })
    const light = new MeshBasicMaterial({ color: '#ffffff', toneMapped: false })
    return { coat, leg, tag, cloth, light }
  }, [unit])
  useEffect(
    () => () => {
      for (const part of Object.values(made)) part.dispose()
    },
    [made],
  )

  // What each one wears is dealt once. Only where they are changes from frame to frame.
  useEffect(() => {
    const tint = new Color()
    for (let i = 0; i < walkers.length; i++) {
      const coat = tint.set(COATS[Math.floor(hash2(seed + 11, i) * COATS.length)])
      coats.current?.setColorAt(i, coat)
      // Trousers and shoes: the coat's cloth, darker.
      legs.current?.setColorAt(i * 2, tint.multiplyScalar(0.6))
      legs.current?.setColorAt(i * 2 + 1, tint)
      tags.current?.setColorAt(
        i,
        emissiveColor(TAGS[Math.floor(hash2(seed + 23, i) * TAGS.length)], ladder.signFace[0]),
      )
    }
    for (const mesh of [coats.current, legs.current, tags.current]) {
      if (!mesh) continue
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    }
  }, [walkers, seed, ladder.signFace, made])

  const at = useMemo(() => new Object3D(), [])
  const self = useMemo(() => new Vector3(), [])
  useFrame(() => {
    const coat = coats.current
    const leg = legs.current
    const tag = tags.current
    if (!coat || !leg || !tag) return
    const seconds = now() / 1000
    const anchor = player?.current
    // The player in the crowd's own frame, where the lanes are.
    if (anchor) root.current?.worldToLocal(anchor.getWorldPosition(self))
    for (let i = 0; i < walkers.length; i++) {
      const w = walkers[i]
      const path = paths[w.lane]
      // There and back: a point that runs the lane's length and returns.
      const lap =
        (((w.offset + w.speed * seconds) % (path.length * 2)) + path.length * 2) % (path.length * 2)
      const back = lap > path.length
      const along = back ? path.length * 2 - lap : lap
      let k = 1
      while (k < path.at.length - 1 && path.at[k] < along) k++
      const span = path.at[k] - path.at[k - 1] || 1
      const t = (along - path.at[k - 1]) / span
      const dx = (path.x[k] - path.x[k - 1]) / span
      const dz = (path.z[k] - path.z[k - 1]) / span
      let x = path.x[k - 1] + dx * span * t
      let z = path.z[k - 1] + dz * span * t
      // Turn round at an end over the last half metre, not in a blink.
      const tip = Math.min(along, path.length - along)
      const turned =
        tip < 0.5 * unit
          ? (1 - tip / (0.5 * unit)) * (Math.PI / 2) * (along < path.length / 2 === back ? -1 : 1)
          : 0
      const heading = Math.atan2(dx, dz) + (back ? Math.PI : 0) + turned
      // Keep to one side of the lane, and step round the player.
      let aside = w.aside
      if (anchor && berth > 0) {
        const px = self.x - x
        const pz = self.z - z
        const off = px * dz - pz * dx
        const near = Math.hypot(px, pz)
        const reach = berth * 2.2 * unit
        if (
          near < reach &&
          Math.abs(self.y - path.y) < 2.5 * unit &&
          Math.abs(off - aside) < berth * unit
        ) {
          const push = (1 - near / reach) * berth * unit
          aside += off > aside ? -push : push
        }
      }
      x += dz * aside
      z -= dx * aside
      const phase = (along / w.stride) * Math.PI * 2
      const bob = Math.abs(Math.sin(phase)) * 0.025 * w.tall * unit

      at.position.set(x, path.y + bob, z)
      at.rotation.set(0, heading, 0)
      at.scale.setScalar(w.tall * unit)
      at.updateMatrix()
      coat.setMatrixAt(i, at.matrix)

      const sin = Math.sin(heading)
      const cos = Math.cos(heading)
      at.position.set(
        x + sin * 0.118 * w.tall * unit,
        path.y + bob + 1.36 * w.tall * unit,
        z + cos * 0.118 * w.tall * unit,
      )
      at.updateMatrix()
      tag.setMatrixAt(i, at.matrix)

      for (let side = 0; side < 2; side++) {
        const out = (side ? -0.085 : 0.085) * w.tall * unit
        at.position.set(x + cos * out, path.y + bob + 0.5 * w.tall * unit, z - sin * out)
        at.rotation.set(Math.sin(phase + side * Math.PI) * 0.55, heading, 0, 'YXZ')
        at.updateMatrix()
        leg.setMatrixAt(i * 2 + side, at.matrix)
      }
      at.rotation.order = 'XYZ'
    }
    coat.instanceMatrix.needsUpdate = true
    leg.instanceMatrix.needsUpdate = true
    tag.instanceMatrix.needsUpdate = true
  })

  // Walkers move every frame: a reflection of them would only trail.
  useEffect(() => skipMirrors(root.current), [walkers.length])

  if (!walkers.length) return null
  return (
    <Dynamic>
      <group ref={root} position={position} rotation={rotation}>
        <instancedMesh
          ref={coats}
          args={[made.coat, made.cloth, walkers.length]}
          frustumCulled={false}
        />
        <instancedMesh
          ref={legs}
          args={[made.leg, made.cloth, walkers.length * 2]}
          frustumCulled={false}
        />
        <instancedMesh
          ref={tags}
          args={[made.tag, made.light, walkers.length]}
          frustumCulled={false}
        />
      </group>
    </Dynamic>
  )
}

const DEFAULT_LANES: CrowdLane[] = [
  {
    y: 0,
    points: [
      [-8, 0],
      [8, 0],
    ],
  },
]

Crowd.stream = false
