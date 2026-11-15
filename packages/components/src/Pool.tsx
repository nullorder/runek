import { ConvexHullCollider, CuboidCollider, RigidBody } from '@react-three/rapier'
import { useMaterials, useWorld, type WorldComponentProps } from '@runek/core'
import { useMemo } from 'react'

export interface PoolProps extends WorldComponentProps {
  /** Water surface `[width, depth]`, in units. */
  size?: [number, number]
  /** Basin depth below the deck, in units. */
  depth?: number
  /** Coping ledge width around the rim, in units. */
  coping?: number
  /** Build exit steps into one corner of the basin, walkable from the floor up onto the coping. */
  steps?: boolean
  /** Coping color; defaults to the world palette's `wall` slot. */
  copingColor?: string
  /** Basin plaster color. */
  basinColor?: string
  /** Defaults to the world palette's `waterShallow` slot. */
  waterColor?: string
}

/**
 * A built swimming pool, flush with the deck: a raised coping rim, a plastered basin you can
 * walk (and jump) into, and a still translucent water surface just below the lip. The rim's top
 * ledge sits at the component origin, so it drops into any `Slab`/`Floor` terrace at deck Y.
 * For natural water, use `Lake`; for open sea, `Ocean`.
 */
export function Pool({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  size = [6, 3.5],
  depth = 1.6,
  coping = 0.35,
  steps = true,
  copingColor,
  basinColor = '#bfe0e6',
  waterColor,
}: PoolProps) {
  const { unit, palette } = useWorld()
  const m = useMaterials({
    rim: { slot: 'stone', color: copingColor ?? palette.wall },
    basin: { slot: 'ceramic', color: basinColor },
    water: {
      color: waterColor ?? palette.waterShallow,
      transparent: true,
      opacity: 0.55,
      roughness: 0.05,
    },
  })
  const w = size[0] * unit
  const d = size[1] * unit
  const dep = depth * unit
  const c = coping * unit
  const lip = 0.07 * unit
  const wallT = 0.12 * unit
  const halfW = w / 2
  const halfD = d / 2

  // The exit flight climbs one wall from the floor to the coping. Its treads are a riser apart
  // down from the coping, each standing on the floor so it doubles as its own riser. One wedge
  // over their nosings carries the avatar: a capsule floating on a spring stalls at a riser
  // taller than its float height, and walks straight up a slope.
  const flight = useMemo(() => {
    if (!steps) return null
    const floorTop = -dep + wallT
    const rise = lip - floorTop
    const riser = 0.25 * unit
    // A 0.4 tread to each riser pitches it at 32°, steeper only where the basin is too short.
    const length = Math.min((rise / riser) * 0.4 * unit, w - wallT)
    const run = (length * riser) / rise
    const width = Math.min(0.8 * unit, d - wallT * 2)
    const z = halfD - wallT - width / 2
    // The lowest riser takes up what is left: half a riser to one and a half.
    const count = Math.max(0, Math.round(rise / riser) - 1)
    const treads = Array.from({ length: count }, (_, i) => {
      const top = lip - riser * (i + 1)
      const front = halfW - run * (i + 1)
      const back = Math.min(front + run, halfW - wallT)
      return { x: (front + back) / 2, y: (top + floorTop) / 2, w: back - front, h: top - floorTop }
    }).filter((t) => t.w > 0)
    const profile = [
      [halfW - length, floorTop],
      [halfW, floorTop],
      [halfW, lip],
    ]
    const ramp = new Float32Array(
      [z - width / 2, z + width / 2].flatMap((side) => profile.flatMap(([x, y]) => [x, y, side])),
    )
    return { treads, ramp, z, width }
  }, [steps, w, d, dep, lip, wallT, halfW, halfD, unit])

  const copingRun = [
    // [x, z, length, depth-extent, rotY] — four ledge boxes framing the water
    { x: 0, z: -halfD - c / 2, w: w + c * 2, d: c },
    { x: 0, z: halfD + c / 2, w: w + c * 2, d: c },
    { x: -halfW - c / 2, z: 0, w: c, d },
    { x: halfW + c / 2, z: 0, w: c, d },
  ]
  const walls = [
    { x: 0, z: -halfD + wallT / 2, w, d: wallT },
    { x: 0, z: halfD - wallT / 2, w, d: wallT },
    { x: -halfW + wallT / 2, z: 0, w: wallT, d },
    { x: halfW - wallT / 2, z: 0, w: wallT, d },
  ]

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      {copingRun.map((s) => (
        <mesh
          key={`${s.x.toFixed(3)}:${s.z.toFixed(3)}`}
          material={m.rim}
          castShadow
          receiveShadow
          position={[s.x, 0, s.z]}
        >
          <boxGeometry args={[s.w, lip * 2, s.d]} />
        </mesh>
      ))}
      {walls.map((s) => (
        <mesh
          key={`b${s.x.toFixed(3)}:${s.z.toFixed(3)}`}
          material={m.basin}
          receiveShadow
          position={[s.x, -dep / 2, s.z]}
        >
          <boxGeometry args={[s.w, dep, s.d]} />
        </mesh>
      ))}
      {/* basin floor */}
      <mesh material={m.basin} receiveShadow position={[0, -dep + wallT / 2, 0]}>
        <boxGeometry args={[w, wallT, d]} />
      </mesh>
      {/* water, just under the lip */}
      <mesh material={m.water} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.14 * unit, 0]}>
        <planeGeometry args={[w - wallT * 2, d - wallT * 2]} />
      </mesh>
      {flight?.treads.map((t) => (
        <mesh
          key={`s${t.x.toFixed(3)}`}
          material={m.basin}
          receiveShadow
          position={[t.x, t.y, flight.z]}
        >
          <boxGeometry args={[t.w, t.h, flight.width]} />
        </mesh>
      ))}
      {flight && <ConvexHullCollider args={[flight.ramp]} />}
      <CuboidCollider args={[w / 2, wallT / 2, d / 2]} position={[0, -dep + wallT / 2, 0]} />
      {walls.map((s) => (
        <CuboidCollider
          key={`w${s.x.toFixed(3)}:${s.z.toFixed(3)}`}
          args={[s.w / 2, dep / 2, s.d / 2]}
          position={[s.x, -dep / 2, s.z]}
        />
      ))}
      <CuboidCollider args={[w / 2 + c, lip, c / 2]} position={[0, 0, -halfD - c / 2]} />
      <CuboidCollider args={[w / 2 + c, lip, c / 2]} position={[0, 0, halfD + c / 2]} />
      <CuboidCollider args={[c / 2, lip, d / 2]} position={[-halfW - c / 2, 0, 0]} />
      <CuboidCollider args={[c / 2, lip, d / 2]} position={[halfW + c / 2, 0, 0]} />
    </RigidBody>
  )
}
