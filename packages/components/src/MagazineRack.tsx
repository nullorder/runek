import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { int, range, rng, useMaterial, useWorld, type WorldComponentProps } from '@runek/core'
import { useMemo } from 'react'
import { Euler, ExtrudeGeometry, Matrix4, Shape } from 'three'
import { frame, MAGAZINE, magazine, newspaper, PAPER, type Sheet, Sheets } from './Newspapers'

export interface MagazineRackProps extends WorldComponentProps {
  /** Across, in units. */
  width?: number
  /** Sloped tiers of magazines, 1 to 4. */
  tiers?: number
  /** Defaults to the world palette's `woodDark` slot. */
  color?: string
}

const LEAN = 0.18
const PITCH = 0.3
const FIRST = 0.3
const SIDE = 0.018
const FRONT = 0.2
const DEPTH = 0.36
const FOOT = 0.05

/**
 * A freestanding magazine rack for a lounge or a waiting room, facing local +Z: two side
 * panels and a back leaning back, sloped tiers with a lip, each holding magazines leaning
 * back with their covers out, and folded newspapers lying on the foot. It shares its covers
 * with `Newspapers`. Seeded: the covers and how many on each tier. One cuboid collider.
 */
export function MagazineRack({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  seed = 1,
  width = 0.6,
  tiers = 3,
  color,
}: MagazineRackProps) {
  const { unit: u, palette } = useWorld()
  const wood = useMaterial({ color: color ?? palette.woodDark, roughness: 0.85 })
  const n = Math.max(1, Math.min(4, Math.round(tiers)))
  const W = width
  const inner = W - SIDE * 2
  const back = FIRST + n * PITCH + 0.02
  const H = back * Math.cos(LEAN)
  const foot = FRONT - DEPTH
  const top = foot - H * Math.tan(LEAN)
  const shelves = Array.from({ length: n }, (_, i) => FIRST + i * PITCH)

  const side = useMemo(() => {
    const s = new Shape()
    s.moveTo(FRONT, 0)
    s.lineTo(FRONT, 0.09)
    s.lineTo(top + 0.1, H)
    s.lineTo(top - 0.02, H)
    s.lineTo(foot - 0.02, 0)
    s.closePath()
    const g = new ExtrudeGeometry(s, { depth: SIDE, bevelEnabled: false })
    g.rotateY(-Math.PI / 2)
    return g
  }, [H, top, foot])

  const sheets = useMemo(() => {
    const next = rng(seed)
    const out: Sheet[] = []
    const lean = frame(1, 0, 0, foot, new Euler(-LEAN, 0, 0))
    const stand = new Matrix4().makeRotationX(Math.PI / 2)
    for (let i = 0; i < n; i++) {
      const s = FIRST + i * PITCH
      const count = int(next, 2, 3)
      for (let k = 0; k < count; k++) {
        const x = (-0.5 + (k + 0.5) / count) * (inner - MAGAZINE[0]) * 1.1
        const at = lean
          .clone()
          .multiply(frame(1, x, s + MAGAZINE[2] / 2 + 0.002, 0.004 + k * 0.009))
          .multiply(stand)
          .multiply(new Matrix4().makeRotationY(range(next, -0.04, 0.04)))
        out.push(...magazine(at, next))
      }
    }
    for (let i = 0; i < 2; i++) {
      const turn = new Euler(0, Math.PI / 2 + range(next, -0.08, 0.08), 0)
      const z = (foot + FRONT) / 2 + 0.01
      out.push(
        ...newspaper(
          frame(1, range(next, -0.04, 0.04), FOOT + 0.0075 + i * (PAPER[1] + 0.003), z, turn),
          next,
        ),
      )
    }
    return out
  }, [seed, n, inner, foot])

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      <CuboidCollider
        args={[(W / 2) * u, (H / 2) * u, ((FRONT - top + 0.02) / 2) * u]}
        position={[0, (H / 2) * u, ((FRONT + top - 0.02) / 2) * u]}
      />
      <group scale={u}>
        {[W / 2, -W / 2 + SIDE].map((x) => (
          <mesh
            key={x}
            material={wood}
            geometry={side}
            castShadow
            receiveShadow
            position={[x, 0, 0]}
          />
        ))}
        <mesh material={wood} receiveShadow position={[0, FOOT, (foot + FRONT) / 2]}>
          <boxGeometry args={[inner, 0.015, DEPTH]} />
        </mesh>
        <mesh material={wood} castShadow position={[0, (FOOT + 0.09) / 2, FRONT - 0.0075]}>
          <boxGeometry args={[inner, 0.09 - FOOT, 0.015]} />
        </mesh>
        <group position={[0, 0, foot]} rotation={[-LEAN, 0, 0]}>
          <mesh material={wood} castShadow receiveShadow position={[0, back / 2, -0.006]}>
            <boxGeometry args={[inner, back, 0.012]} />
          </mesh>
          {shelves.map((s) => (
            <group key={s} position={[0, s, 0]}>
              <mesh material={wood} receiveShadow position={[0, -0.0075, 0.04]}>
                <boxGeometry args={[inner, 0.015, 0.08]} />
              </mesh>
              <mesh material={wood} castShadow position={[0, 0.0075, 0.074]}>
                <boxGeometry args={[inner, 0.045, 0.012]} />
              </mesh>
            </group>
          ))}
        </group>
        <Sheets sheets={sheets} />
      </group>
    </RigidBody>
  )
}

MagazineRack.groundSitting = true
