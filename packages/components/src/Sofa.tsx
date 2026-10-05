import { RoundedBox } from '@react-three/drei'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { pick, range, rng, sub, useWorld, type Vec3, type WorldComponentProps } from '@runek/core'
import { useMemo } from 'react'
import { Color } from 'three'

/** `square` box arms, `rolled` arms with a bolster on top, `slim` thin arms, or `none`. */
export type SofaArms = 'square' | 'rolled' | 'slim' | 'none'
/** One cushion per seat (`split`), or a single long `bench` cushion. */
export type SofaCushions = 'split' | 'bench'
/** Short turned `pegs` at the corners, or a recessed `plinth`. */
export type SofaLegs = 'pegs' | 'plinth'

export interface SofaProps extends WorldComponentProps {
  /** Seats across, 1 to 4. */
  seats?: number
  /** Depth along local Z, in units. Seats face +Z. */
  depth?: number
  /** Top of the seat cushions, in units. */
  seatHeight?: number
  /** Seeded when unset. */
  arms?: SofaArms
  /** Seeded when unset. */
  cushions?: SofaCushions
  /** Seeded when unset. */
  legs?: SofaLegs
  /** Throw pillows, 0 to 2. Seeded when unset. */
  pillows?: number
  /** Upholstery; defaults to the palette's `fabric`. */
  color?: string
  /** Throw pillows; defaults to the palette's `accent`. */
  pillowColor?: string
  /** Legs; defaults to the palette's `woodDark`. */
  legColor?: string
}

interface Cushion {
  pos: Vec3
  size: Vec3
  tilt: number
  color: string
}

const ARMS: SofaArms[] = ['square', 'rolled', 'slim', 'square']
const SEAT = 0.62
const BACK_H = 0.82

/**
 * A sofa: an upholstered frame, seat and back cushions, arms, and legs, seating one to four. Arm
 * style, cushions, legs, and throw pillows come from the seed unless you pin them, and every
 * cushion takes a slightly different shade of the fabric so it reads soft. Two cuboid colliders
 * (the seat block and the back). Seats face local +Z, evenly spaced between the arms.
 */
export function Sofa({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  seed = 1,
  seats = 3,
  depth = 0.9,
  seatHeight = 0.44,
  arms,
  cushions,
  legs,
  pillows,
  color,
  pillowColor,
  legColor,
}: SofaProps) {
  const { unit, palette } = useWorld()
  const fabric = color ?? palette.fabric
  const legTone = legColor ?? palette.woodDark

  const build = useMemo(() => {
    const r = rng(sub(seed, 0))
    const rolled = {
      arms: pick(r, ARMS),
      cushions: pick<SofaCushions>(r, ['split', 'split', 'bench']),
      legs: pick<SofaLegs>(r, ['pegs', 'plinth']),
      pillows: pick(r, [0, 1, 2, 2]),
      pillowSide: r() < 0.5 ? -1 : 1,
    }
    const n = Math.min(Math.max(Math.round(seats), 1), 4)
    const style = {
      arms: arms ?? rolled.arms,
      cushions: cushions ?? rolled.cushions,
      legs: legs ?? rolled.legs,
      pillows: Math.min(Math.max(Math.round(pillows ?? rolled.pillows), 0), 2),
    }
    const base = new Color(fabric)
    const shade = () =>
      base
        .clone()
        .multiplyScalar(range(r, 0.92, 1.06))
        .getStyle()

    const u = unit
    const armW = (style.arms === 'none' ? 0 : style.arms === 'slim' ? 0.09 : 0.17) * u
    const seatW = SEAT * u
    const W = n * seatW + armW * 2
    const D = depth * u
    const legH = (style.legs === 'pegs' ? 0.1 : 0.04) * u
    const cushionT = 0.13 * u
    const frameTop = seatHeight * u - cushionT
    const backT = 0.17 * u
    const backH = BACK_H * u
    const armH = (style.arms === 'slim' ? 0.56 : style.arms === 'rolled' ? 0.54 : 0.62) * u
    const seatD = D - backT - 0.02 * u

    const parts: Cushion[] = []
    const seatZ = D / 2 - seatD / 2
    if (style.cushions === 'bench') {
      parts.push({
        pos: [0, frameTop + cushionT / 2, seatZ],
        size: [n * seatW - 0.01 * u, cushionT, seatD],
        tilt: 0,
        color: shade(),
      })
    } else {
      for (let i = 0; i < n; i++)
        parts.push({
          pos: [-W / 2 + armW + seatW * (i + 0.5), frameTop + cushionT / 2, seatZ],
          size: [seatW - 0.012 * u, cushionT, seatD],
          tilt: 0,
          color: shade(),
        })
    }
    const backCushionH = backH - frameTop - cushionT - 0.04 * u
    for (let i = 0; i < n; i++)
      parts.push({
        pos: [
          -W / 2 + armW + seatW * (i + 0.5),
          frameTop + cushionT + backCushionH / 2,
          -D / 2 + backT + 0.07 * u,
        ],
        size: [seatW - 0.015 * u, backCushionH, 0.15 * u],
        tilt: -0.14,
        color: shade(),
      })
    for (let i = 0; i < style.pillows; i++) {
      const side = i === 0 ? rolled.pillowSide : -rolled.pillowSide
      parts.push({
        pos: [
          side * (W / 2 - armW - 0.2 * u),
          frameTop + cushionT + 0.17 * u,
          -D / 2 + backT + 0.2 * u,
        ],
        size: [0.36 * u, 0.34 * u, 0.12 * u],
        tilt: -0.3,
        color: pillowColor ?? palette.accent,
      })
    }

    return { style, W, D, legH, frameTop, backT, backH, armW, armH, parts }
  }, [
    seed,
    seats,
    depth,
    seatHeight,
    arms,
    cushions,
    legs,
    pillows,
    fabric,
    pillowColor,
    palette,
    unit,
  ])

  const { style, W, D, legH, frameTop, backT, backH, armW, armH, parts } = build
  const frameH = frameTop - legH
  const u = unit

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      <CuboidCollider
        args={[W / 2, seatHeight * u * 0.5, D / 2]}
        position={[0, seatHeight * u * 0.5, 0]}
      />
      <CuboidCollider
        args={[W / 2, (backH - seatHeight * u) / 2, backT / 2]}
        position={[0, (backH + seatHeight * u) / 2, -D / 2 + backT / 2]}
      />

      {/* frame: the base under the seat, and the back */}
      <RoundedBox
        args={[W, frameH, D]}
        radius={0.03 * u}
        smoothness={2}
        position={[0, legH + frameH / 2, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={fabric} roughness={0.95} />
      </RoundedBox>
      <RoundedBox
        args={[W, backH - legH, backT]}
        radius={0.04 * u}
        smoothness={2}
        position={[0, legH + (backH - legH) / 2, -D / 2 + backT / 2]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={fabric} roughness={0.95} />
      </RoundedBox>

      {parts.map((c) => (
        <RoundedBox
          key={`${c.pos[0].toFixed(3)}:${c.pos[1].toFixed(3)}:${c.pos[2].toFixed(3)}`}
          args={c.size}
          radius={Math.min(c.size[1], c.size[2]) * 0.3}
          smoothness={3}
          position={c.pos}
          rotation={[c.tilt, 0, 0]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color={c.color} roughness={0.95} />
        </RoundedBox>
      ))}

      {style.arms !== 'none' &&
        [-1, 1].map((s) => (
          <group key={`arm${s}`} position={[s * (W / 2 - armW / 2), 0, 0]}>
            <RoundedBox
              args={[armW, armH - legH, D]}
              radius={Math.min(0.04 * u, armW * 0.45)}
              smoothness={2}
              position={[0, legH + (armH - legH) / 2, 0]}
              castShadow
              receiveShadow
            >
              <meshStandardMaterial color={fabric} roughness={0.95} />
            </RoundedBox>
            {style.arms === 'rolled' && (
              <mesh
                position={[s * 0.02 * u, armH, 0.01 * u]}
                rotation={[Math.PI / 2, 0, 0]}
                castShadow
              >
                <cylinderGeometry args={[armW * 0.62, armW * 0.62, D, 18]} />
                <meshStandardMaterial color={fabric} roughness={0.95} />
              </mesh>
            )}
          </group>
        ))}

      {style.legs === 'pegs' ? (
        [-1, 1].flatMap((sx) =>
          [-1, 1].map((sz) => (
            <mesh
              key={`leg${sx}${sz}`}
              position={[sx * (W / 2 - 0.06 * u), legH / 2, sz * (D / 2 - 0.06 * u)]}
              castShadow
            >
              <cylinderGeometry args={[0.022 * u, 0.016 * u, legH, 10]} />
              <meshStandardMaterial color={legTone} roughness={0.6} />
            </mesh>
          )),
        )
      ) : (
        <mesh position={[0, legH / 2, 0]} receiveShadow>
          <boxGeometry args={[W - 0.08 * u, legH, D - 0.08 * u]} />
          <meshStandardMaterial color={legTone} roughness={0.8} />
        </mesh>
      )}
    </RigidBody>
  )
}

Sofa.groundSitting = true
