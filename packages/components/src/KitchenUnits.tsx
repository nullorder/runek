import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { pick, rng, sub, useMaterials, useWorld, type WorldComponentProps } from '@runek/core'
import { useMemo } from 'react'
import type { Material } from 'three'

export interface KitchenUnitsProps extends WorldComponentProps {
  /** Length along local X, in units, rounded to whole units. */
  length?: number
  /** One unit's width, in units. */
  unitWidth?: number
  /** Worktop height, in units. */
  height?: number
  /** Depth along local Z, in units. The fronts face +Z. */
  depth?: number
  /** Which unit, counted from the -X end, holds the sink. */
  sink?: number
  /** Which unit holds the hob, with the oven under it and the hood over it. */
  hob?: number
  /** Wall units over the run, with a hood over the hob. */
  wall?: boolean
  /** How far the worktop reaches past the back, in units: knee room for stools along an
   *  island. */
  overhang?: number
  /** Fronts. Seeded from a few kitchen finishes when unset. */
  color?: string
  /** The worktop. */
  topColor?: string
  /** Handles, sink, tap and hood. */
  metalColor?: string
}

const FINISHES = ['#2f3e46', '#e9e5dc', '#4a6b5d', '#1f2a36', '#8c6e54']
const KICK = 0.1
const TOP = 0.04
// The wall units' bottom and top over the floor, and their depth.
const WALL_FROM = 1.5
const WALL_TO = 2.3
const WALL_D = 0.35
const BURNERS: [number, number, number][] = [
  [-1, -1, 0.075],
  [1, -1, 0.06],
  [-1, 1, 0.06],
  [1, 1, 0.075],
]

type Front = 'door' | 'doors' | 'drawers'

/**
 * A fitted kitchen run: base units on a kickboard under one worktop, lying along local X on
 * their origin and fronted toward +Z, each a door, a pair of doors or a stack of drawers with
 * bar handles. One unit can hold a sink with a tap, and one a hob over an oven. With `wall`,
 * units hang over the run and a steel hood takes their place over the hob. An `overhang` past
 * the back makes an island to sit at. Seeded: the finish and which fronts are drawers. One
 * cuboid collider round the base.
 */
export function KitchenUnits({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  seed = 1,
  length = 3,
  unitWidth = 0.6,
  height = 0.9,
  depth = 0.6,
  sink,
  hob,
  wall = false,
  overhang = 0,
  color,
  topColor = '#d9d5cc',
  metalColor = '#b9bdc1',
}: KitchenUnitsProps) {
  const { unit } = useWorld()
  const finish = color ?? pick(rng(seed), FINISHES)
  const m = useMaterials({
    kick: { color: '#3a3a3c', roughness: 0.8 },
    carcass: { color: finish, roughness: 0.6 },
    front: { color: finish, roughness: 0.5 },
    top: { color: topColor, roughness: 0.35 },
    handle: { color: metalColor, roughness: 0.25, metalness: 0.8 },
    tap: { color: metalColor, roughness: 0.2, metalness: 0.9 },
    hood: { color: metalColor, roughness: 0.3, metalness: 0.75 },
    bowl: { color: '#5d6166', roughness: 0.3, metalness: 0.7 },
    oven: { color: '#2a2a2d', roughness: 0.35, metalness: 0.4 },
    ovenGlass: { color: '#0c0c0e', roughness: 0.1, metalness: 0.5 },
    hob: { color: '#141416', roughness: 0.12, metalness: 0.3 },
    burner: { color: '#4a4a4f', roughness: 0.4 },
  })
  const count = Math.max(1, Math.round(length / unitWidth))
  const U = unitWidth * unit
  const L = count * U
  const H = height * unit
  const D = depth * unit
  const kick = KICK * unit
  const top = TOP * unit
  const body = H - top - kick
  const gap = 0.004 * unit
  const wallH = (WALL_TO - WALL_FROM) * unit

  const fronts = useMemo<Front[]>(() => {
    const next = rng(sub(seed, 2))
    return Array.from({ length: count }, (_, i) =>
      i === sink ? 'doors' : i === hob ? 'drawers' : next() < 0.4 ? 'drawers' : 'door',
    )
  }, [seed, count, sink, hob])

  const xOf = (i: number) => -L / 2 + U * (i + 0.5)
  const panel = { face: m.front, metal: m.handle, unit }

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      <CuboidCollider args={[L / 2, H / 2, D / 2]} position={[0, H / 2, 0]} />
      <mesh material={m.kick} receiveShadow position={[0, kick / 2, -0.03 * unit]}>
        <boxGeometry args={[L, kick, D - 0.06 * unit]} />
      </mesh>
      {/* The carcass in the finish too, so an island's back is panelled like its front. */}
      <mesh
        material={m.carcass}
        castShadow
        receiveShadow
        position={[0, kick + body / 2, -0.01 * unit]}
      >
        <boxGeometry args={[L, body, D - 0.02 * unit]} />
      </mesh>
      <mesh
        material={m.top}
        castShadow
        receiveShadow
        position={[0, H - top / 2, (0.01 - overhang / 2) * unit]}
      >
        <boxGeometry args={[L + 0.02 * unit, top, D + (0.02 + overhang) * unit]} />
      </mesh>

      {fronts.map((front, i) => {
        const x = xOf(i)
        const z = D / 2 - 0.005 * unit
        const w = U - gap * 2
        if (i === hob) {
          const drawer = body * 0.22
          const ovenH = body - drawer
          return (
            <group key={x}>
              <FrontPanel
                {...panel}
                x={x}
                y={H - top - drawer / 2 - gap}
                z={z}
                w={w}
                h={drawer - gap * 2}
              />
              <group position={[x, kick + ovenH / 2, z + 0.006 * unit]}>
                <mesh material={m.oven} castShadow>
                  <boxGeometry args={[w, ovenH - gap * 2, 0.012 * unit]} />
                </mesh>
                <mesh material={m.ovenGlass} position={[0, -0.02 * unit, 0.007 * unit]}>
                  <planeGeometry args={[w * 0.72, ovenH * 0.45]} />
                </mesh>
                <mesh
                  material={m.handle}
                  castShadow
                  position={[0, ovenH * 0.36, 0.03 * unit]}
                  rotation={[0, 0, Math.PI / 2]}
                >
                  <cylinderGeometry args={[0.01 * unit, 0.01 * unit, w * 0.7, 10]} />
                </mesh>
              </group>
            </group>
          )
        }
        if (front === 'drawers') {
          let y = H - top
          return (
            <group key={x}>
              {[0.24, 0.34, 0.42].map((share) => {
                const h = body * share
                y -= h
                return (
                  <FrontPanel
                    key={share}
                    {...panel}
                    x={x}
                    y={y + h / 2}
                    z={z}
                    w={w}
                    h={h - gap * 2}
                  />
                )
              })}
            </group>
          )
        }
        if (front === 'doors') {
          return (
            <group key={x}>
              {[-1, 1].map((s) => (
                <FrontPanel
                  key={s}
                  {...panel}
                  x={x + (s * U) / 4}
                  y={kick + body / 2}
                  z={z}
                  w={U / 2 - gap * 2}
                  h={body - gap * 2}
                  handle="side"
                  side={-s}
                />
              ))}
            </group>
          )
        }
        return (
          <FrontPanel key={x} {...panel} x={x} y={kick + body / 2} z={z} w={w} h={body - gap * 2} />
        )
      })}

      {sink !== undefined && sink < count && (
        <group position={[xOf(sink), H, 0.02 * unit]}>
          <mesh material={m.handle} receiveShadow position={[0, 0.002 * unit, 0]}>
            <boxGeometry args={[U * 0.82, 0.004 * unit, D * 0.66]} />
          </mesh>
          <mesh material={m.bowl} position={[0, 0.0045 * unit, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[U * 0.7, D * 0.52]} />
          </mesh>
          <group position={[0, 0, -D * 0.4]}>
            <mesh material={m.tap} castShadow position={[0, 0.15 * unit, 0]}>
              <cylinderGeometry args={[0.015 * unit, 0.02 * unit, 0.3 * unit, 12]} />
            </mesh>
            <mesh
              material={m.tap}
              castShadow
              position={[0, 0.3 * unit, 0.09 * unit]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <cylinderGeometry args={[0.012 * unit, 0.012 * unit, 0.19 * unit, 10]} />
            </mesh>
          </group>
        </group>
      )}

      {hob !== undefined && hob < count && (
        <group position={[xOf(hob), H + 0.003 * unit, 0.02 * unit]}>
          <mesh material={m.hob} receiveShadow>
            <boxGeometry args={[U * 0.9, 0.006 * unit, D * 0.84]} />
          </mesh>
          {BURNERS.map(([sx, sz, r]) => (
            <mesh
              key={`${sx}${sz}`}
              material={m.burner}
              position={[sx * U * 0.22, 0.004 * unit, sz * 0.12 * unit]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <ringGeometry args={[r * unit * 0.8, r * unit, 32]} />
            </mesh>
          ))}
        </group>
      )}

      {wall &&
        fronts.map((_, i) => {
          const x = xOf(i)
          const z = -D / 2 + (WALL_D / 2) * unit
          if (i === hob) {
            return (
              <group key={`wall${x}`} position={[x, WALL_FROM * unit, z]}>
                <mesh material={m.hood} castShadow position={[0, 0.06 * unit, 0.04 * unit]}>
                  <boxGeometry args={[U * 0.98, 0.12 * unit, WALL_D * 1.25 * unit]} />
                </mesh>
                <mesh
                  material={m.hood}
                  castShadow
                  position={[0, wallH / 2 + 0.06 * unit, -0.02 * unit]}
                >
                  <boxGeometry args={[U * 0.4, wallH - 0.12 * unit, WALL_D * 0.6 * unit]} />
                </mesh>
              </group>
            )
          }
          return (
            <group key={`wall${x}`}>
              <mesh
                material={m.carcass}
                castShadow
                receiveShadow
                position={[x, WALL_FROM * unit + wallH / 2, z - 0.01 * unit]}
              >
                <boxGeometry args={[U, wallH, WALL_D * unit - 0.02 * unit]} />
              </mesh>
              <FrontPanel
                {...panel}
                x={x}
                y={WALL_FROM * unit + wallH / 2}
                z={z + (WALL_D / 2) * unit - 0.01 * unit}
                w={U - gap * 2}
                h={wallH - gap * 2}
                handle="bottom"
              />
            </group>
          )
        })}
    </RigidBody>
  )
}

/** One door or drawer front, with its bar handle along the top, the bottom or a side. */
function FrontPanel({
  x,
  y,
  z,
  w,
  h,
  face,
  metal,
  unit,
  handle = 'top',
  side = 1,
}: {
  x: number
  y: number
  z: number
  w: number
  h: number
  face: Material
  metal: Material
  unit: number
  handle?: 'top' | 'bottom' | 'side'
  side?: number
}) {
  const bar = 0.008 * unit
  const vertical = handle === 'side'
  const length = vertical ? Math.min(h * 0.3, 0.2 * unit) : Math.min(w * 0.5, 0.22 * unit)
  const at: [number, number, number] = vertical
    ? [side * (w / 2 - 0.04 * unit), h * 0.3, 0.015 * unit]
    : [0, (handle === 'top' ? 1 : -1) * (h / 2 - 0.04 * unit), 0.015 * unit]
  return (
    <group position={[x, y, z]}>
      <mesh material={face} castShadow receiveShadow>
        <boxGeometry args={[w, h, 0.018 * unit]} />
      </mesh>
      <mesh
        material={metal}
        castShadow
        position={at}
        rotation={vertical ? [0, 0, 0] : [0, 0, Math.PI / 2]}
      >
        <cylinderGeometry args={[bar, bar, length, 8]} />
      </mesh>
    </group>
  )
}

KitchenUnits.groundSitting = true
