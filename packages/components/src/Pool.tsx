import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { useWorld, type WorldComponentProps } from '@runek/core'

export interface PoolProps extends WorldComponentProps {
  /** Water surface `[width, depth]`, in units. */
  size?: [number, number]
  /** Basin depth below the deck, in units. */
  depth?: number
  /** Coping ledge width around the rim, in units. */
  coping?: number
  /** Build exit steps into one corner of the basin. */
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
  const rim = copingColor ?? palette.wall
  const water = waterColor ?? palette.waterShallow
  const w = size[0] * unit
  const d = size[1] * unit
  const dep = depth * unit
  const c = coping * unit
  const lip = 0.07 * unit
  const wallT = 0.12 * unit
  const halfW = w / 2
  const halfD = d / 2

  const copingRun = [
    // [x, z, length, depth-extent, rotY] — four ledge boxes framing the water
    { x: 0, z: -halfD - c / 2, w: w + c * 2, d: c },
    { x: 0, z: halfD + c / 2, w: w + c * 2, d: c },
    { x: -halfW - c / 2, z: 0, w: c, d },
    { x: halfW + c / 2, z: 0, w: c, d },
  ]

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      {copingRun.map((s) => (
        <mesh
          key={`${s.x.toFixed(3)}:${s.z.toFixed(3)}`}
          castShadow
          receiveShadow
          position={[s.x, 0, s.z]}
        >
          <boxGeometry args={[s.w, lip * 2, s.d]} />
          <meshStandardMaterial color={rim} />
        </mesh>
      ))}
      {/* basin walls */}
      {[
        { x: 0, z: -halfD + wallT / 2, w, d: wallT },
        { x: 0, z: halfD - wallT / 2, w, d: wallT },
        { x: -halfW + wallT / 2, z: 0, w: wallT, d },
        { x: halfW - wallT / 2, z: 0, w: wallT, d },
      ].map((s) => (
        <mesh
          key={`b${s.x.toFixed(3)}:${s.z.toFixed(3)}`}
          receiveShadow
          position={[s.x, -dep / 2, s.z]}
        >
          <boxGeometry args={[s.w, dep, s.d]} />
          <meshStandardMaterial color={basinColor} />
        </mesh>
      ))}
      {/* basin floor */}
      <mesh receiveShadow position={[0, -dep + wallT / 2, 0]}>
        <boxGeometry args={[w, wallT, d]} />
        <meshStandardMaterial color={basinColor} />
      </mesh>
      {/* water, just under the lip */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.14 * unit, 0]}>
        <planeGeometry args={[w - wallT * 2, d - wallT * 2]} />
        <meshStandardMaterial color={water} transparent opacity={0.55} roughness={0.05} />
      </mesh>
      {steps &&
        [0, 1, 2].map((i) => {
          // Corner stack descending into the basin: tread i tops out at -stepH·(i+1)
          // and drops to the floor, so each box doubles as its own riser.
          const stepH = dep / 4
          const run = 0.4 * unit
          const top = -stepH * (i + 1)
          const boxH = dep - stepH * (i + 1)
          const x = halfW - wallT - run * (i + 0.5)
          const z = halfD - wallT - run
          return (
            <group key={`s${i}`}>
              <mesh receiveShadow position={[x, top - boxH / 2, z]}>
                <boxGeometry args={[run, boxH, run * 2]} />
                <meshStandardMaterial color={basinColor} />
              </mesh>
              <CuboidCollider args={[run / 2, boxH / 2, run]} position={[x, top - boxH / 2, z]} />
            </group>
          )
        })}
      <CuboidCollider args={[w / 2, wallT / 2, d / 2]} position={[0, -dep + wallT / 2, 0]} />
      <CuboidCollider args={[w / 2 + c, lip, c / 2]} position={[0, 0, -halfD - c / 2]} />
      <CuboidCollider args={[w / 2 + c, lip, c / 2]} position={[0, 0, halfD + c / 2]} />
      <CuboidCollider args={[c / 2, lip, d / 2]} position={[-halfW - c / 2, 0, 0]} />
      <CuboidCollider args={[c / 2, lip, d / 2]} position={[halfW + c / 2, 0, 0]} />
    </RigidBody>
  )
}
