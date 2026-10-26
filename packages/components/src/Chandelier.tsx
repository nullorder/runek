import {
  int,
  rng,
  sub,
  useLight,
  useMaterials,
  useSun,
  useWorld,
  type WorldComponentProps,
} from '@runek/core'
import { type ReactNode, useLayoutEffect, useMemo, useRef } from 'react'
import {
  CubicBezierCurve3,
  type InstancedMesh,
  LatheGeometry,
  type Material,
  Matrix4,
  Quaternion,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three'

export interface ChandelierProps extends WorldComponentProps {
  /** Arms on the lower tier. Seeded (5 to 8) when unset. */
  arms?: number
  /** One ring of arms, or two (the upper one smaller). Seeded when unset. */
  tiers?: 1 | 2
  /** Reach of the lower arms from the center, in units. */
  radius?: number
  /** Chain length from the ceiling to the body, in units. */
  drop?: number
  /** Glass drops hanging from the arms. Seeded when unset. */
  crystals?: boolean
  /** Frame, arms, and cups; defaults to the palette's `accent` (brass). */
  color?: string
  /** The light and the glowing bulb. */
  lightColor?: string
  /** Light strength. */
  intensity?: number
  /** Switched on. */
  on?: boolean
  /** Light only while the world's sun is down. */
  nightOnly?: boolean
}

interface Tier {
  y: number
  r: number
  arms: number
  offset: number
}

/** One draw call for every copy of a part: the matrices are set once per layout. */
function Instanced({
  matrices,
  material,
  children,
  castShadow,
}: {
  matrices: Matrix4[]
  material: Material
  children: ReactNode
  castShadow?: boolean
}) {
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    matrices.forEach((m, i) => {
      mesh.setMatrixAt(i, m)
    })
    mesh.instanceMatrix.needsUpdate = true
  }, [matrices])
  return (
    <instancedMesh
      key={matrices.length}
      ref={ref}
      args={[undefined, undefined, matrices.length]}
      material={material}
      castShadow={castShadow}
    >
      {children}
    </instancedMesh>
  )
}

const UP = new Vector3(0, 1, 0)

/**
 * A hanging chandelier, its origin at the ceiling: a chain, a turned brass body, and one or two
 * rings of curved arms each ending in a cup and a candle bulb, with optional glass drops. Every
 * repeated part is instanced and the whole fitting shares one light, so a ballroom of them stays
 * cheap. `nightOnly` lights it with the world's dusk. Decorative: no collider.
 */
export function Chandelier({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  seed = 1,
  arms,
  tiers,
  radius = 0.45,
  drop = 0.4,
  crystals,
  color,
  lightColor = '#ffd9a0',
  intensity = 22,
  on = true,
  nightOnly = false,
}: ChandelierProps) {
  const { unit, palette } = useWorld()
  const sun = useSun()
  const lit = on && (!nightOnly || !sun.day)
  const brass = color ?? palette.accent
  const R = radius * unit
  const D = drop * unit
  const bodyH = R * 0.75

  const look = useMemo(() => {
    const r = rng(sub(seed, 0))
    const n = Math.max(3, Math.round(arms ?? int(r, 5, 8)))
    const t = tiers ?? (r() < 0.45 ? 2 : 1)
    const list: Tier[] = [{ y: -D - bodyH * 0.72, r: R, arms: n, offset: 0 }]
    if (t === 2)
      list.push({
        y: -D - bodyH * 0.3,
        r: R * 0.6,
        arms: Math.max(3, Math.round(n * 0.6)),
        offset: Math.PI / n,
      })
    return { tiers: list, crystals: crystals ?? r() < 0.6 }
  }, [seed, arms, tiers, crystals, R, D, bodyH])

  const parts = useMemo(() => {
    const arm: Matrix4[] = []
    const cup: Matrix4[] = []
    const bulb: Matrix4[] = []
    const drops: Matrix4[] = []
    const q = new Quaternion()
    const one = new Vector3(1, 1, 1)
    for (const tier of look.tiers) {
      for (let i = 0; i < tier.arms; i++) {
        const a = tier.offset + (i / tier.arms) * Math.PI * 2
        q.setFromAxisAngle(UP, -a)
        const s = tier.r
        arm.push(new Matrix4().compose(new Vector3(0, tier.y, 0), q, new Vector3(s, s, s)))
        const tip = new Vector3(Math.cos(a) * s, tier.y + 0.12 * s + 0.02 * unit, Math.sin(a) * s)
        cup.push(new Matrix4().compose(tip, q, one))
        bulb.push(new Matrix4().compose(tip.clone().add(new Vector3(0, 0.07 * unit, 0)), q, one))
        if (look.crystals) {
          // under the arm's lowest point (the curve at t = 0.5)
          const mid = new Vector3(
            Math.cos(a) * s * 0.62,
            tier.y - 0.27 * s - 0.045 * unit,
            Math.sin(a) * s * 0.62,
          )
          drops.push(new Matrix4().compose(mid, q, one))
        }
      }
    }
    return { arm, cup, bulb, drops }
  }, [look, unit])

  // Arms are built at unit reach and scaled per tier: they dip below the body and rise to the cup.
  const armGeometry = useMemo(() => {
    const curve = new CubicBezierCurve3(
      new Vector3(0.05, 0, 0),
      new Vector3(0.35, -0.4, 0),
      new Vector3(0.95, -0.35, 0),
      new Vector3(1, 0.12, 0),
    )
    return new TubeGeometry(curve, 24, 0.022, 6, false)
  }, [])

  const bodyGeometry = useMemo(() => {
    const k = bodyH
    const profile = [
      [0, 0],
      [0.02, 0],
      [0.03, 0.08],
      [0.09, 0.2],
      [0.12, 0.32],
      [0.05, 0.45],
      [0.04, 0.62],
      [0.08, 0.75],
      [0.03, 0.9],
      [0.015, 1],
      [0, 1],
    ].map(([x, y]) => new Vector2(x * k * 1.2, -y * k))
    return new LatheGeometry(profile, 20)
  }, [bodyH])

  const cupR = 0.035 * unit
  const glow = useLight({ color: lightColor, intensity, distance: 14 * unit, decay: 2 }, lit)
  const m = useMaterials({
    metal: { color: brass, metalness: 0.75, roughness: 0.3 },
    bulb: {
      color: '#fff3d6',
      emissive: lightColor,
      emissiveIntensity: lit ? 2.2 : 0,
      toneMapped: !lit,
    },
    // Faceted, glossy, see-through glass. Real refraction (`transmission`) would make three draw
    // every solid object in the world once more each frame.
    glass: {
      color: '#e8f2ff',
      roughness: 0.05,
      metalness: 0.4,
      transparent: true,
      opacity: 0.75,
      emissive: lightColor,
      emissiveIntensity: lit ? 0.35 : 0,
    },
  })

  return (
    <group position={position} rotation={rotation}>
      <mesh material={m.metal} position={[0, -0.015 * unit, 0]}>
        <cylinderGeometry args={[0.05 * unit, 0.08 * unit, 0.03 * unit, 20]} />
      </mesh>
      <mesh material={m.metal} position={[0, -D / 2, 0]}>
        <cylinderGeometry args={[0.006 * unit, 0.006 * unit, D, 6]} />
      </mesh>
      <mesh material={m.metal} position={[0, -D, 0]} geometry={bodyGeometry} castShadow />
      <Instanced matrices={parts.arm} material={m.metal} castShadow>
        <primitive object={armGeometry} attach="geometry" />
      </Instanced>
      <Instanced matrices={parts.cup} material={m.metal}>
        <cylinderGeometry args={[cupR, cupR * 0.4, 0.04 * unit, 12]} />
      </Instanced>
      <Instanced matrices={parts.bulb} material={m.bulb}>
        <sphereGeometry args={[0.022 * unit, 10, 8]} />
      </Instanced>
      {parts.drops.length > 0 && (
        <Instanced matrices={parts.drops} material={m.glass}>
          <octahedronGeometry args={[0.03 * unit, 0]} />
        </Instanced>
      )}
      <object3D ref={glow.ref} position={[0, look.tiers[0].y + 0.1 * R, 0]} />
    </group>
  )
}
