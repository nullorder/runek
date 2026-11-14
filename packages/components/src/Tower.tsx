import { CuboidCollider, RigidBody } from '@react-three/rapier'
import {
  lazyModule,
  shareMaterial,
  useGround,
  useLight,
  useNodeRenderer,
  useWorld,
  type Vec3,
} from '@runek/core'
import { useLayoutEffect, useMemo } from 'react'
import {
  BufferGeometry,
  Float32BufferAttribute,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
} from 'three'
import { useLadder } from './city/glow'
import { KitBuilder } from './city/kit'
import { TOWER_FRAG, TOWER_VERT } from './city/towerFacade'
import {
  buildTower,
  ERAS,
  onFace,
  planTower,
  type TowerEra,
  type TowerFace,
  type TowerWindows,
} from './city/towerGrammar'
import { knotLight, mainShop, towerKit } from './city/towerKit'
import { applyTowerLight, nightFactor, towerUniforms } from './city/towerLight'
import { useKitParts } from './city/useKit'

export type { TowerEra, TowerFace, TowerWindows } from './city/towerGrammar'

// The facade's node (TSL) material, loaded only under a node renderer.
const towerNodes = lazyModule(() => import('./nodes/tower'))

export interface TowerProps {
  /** Position of the tower's base centre [x, y, z] in units (1 unit = 1 m, Y-up). */
  position?: Vec3
  /** Rotation [x, y, z] in radians. Towers stand upright: only the turn about Y is meant to be used. */
  rotation?: Vec3
  /** Seeds the massing, the window pattern, which windows are lit, every prop and sign, and any unset look props. */
  seed?: number
  /** Ground footprint along local X, in units. The podium fills it and the collider matches it. */
  width?: number
  /** Ground footprint along local Z, in units. */
  depth?: number
  /** Height to the roof, in units. Rooftop plant and masts stand above it. */
  height?: number
  /** Window layout: `grid` (apartments), `office` (small dense panes), `ribbon` (continuous bands) or `glass` (curtain wall). Seeded by era when unset. */
  windows?: TowerWindows
  /** Share of windows lit at night, 0 to 1. Seeded when unset. */
  lit?: number
  /** Neon trim along the parapets and crown, and the color of the tower's main sign, lit at the world's `sign` luminance level. `"none"` for a plain tower. Seeded when unset. */
  trim?: string
  /** Also run the trim colour up the corners. */
  cornerStrips?: boolean
  /** Shop bays along the ground floor. */
  shopfronts?: boolean
  /** Wall colour. Defaults to the world palette's `wall`. */
  color?: string
  /** Which era built it: `concrete` (squat, heavy, stencilled), `tenement` (balconies, sign frames, drum lanterns), `glass` (a thin glass slab with a clock in its crown) or `makeshift` (cages, shacks, cable). Seeded among the first, second and last when unset. */
  era?: TowerEra
  /** Podium height in units, for a tower tall and wide enough to have a shaft (at least 34 high and 10 across). Seeded between 15 and 25 when unset. */
  podium?: number
  /** The faces that front a street: `+z`, `+x`, `-z`, `-x` in the tower's own frame. Each gets piers, a fascia, signs and the instanced kit props, and the first one listed carries the tower's big sign. Empty by default, so a tower costs one merged mesh until it is told where the street is. */
  frontage?: TowerFace[]
  /** The shop name on the main sign. Seeded when unset. */
  name?: string
  /** Wall to wall distance across the street in units. Above 0, cables sag across it from the first face in `frontage`. */
  cableSpan?: number
  /** Ask the world for a real light in front of the main shop. Pooled, so only the ones that matter to the view are lit. */
  light?: boolean
}

/**
 * A procedural city tower: a podium, a setback, a shaft and a crown, emitted by a seeded shape
 * grammar as one mesh. A shader draws every facade band (street, service, podium, tower, crown)
 * from per-vertex data in wall metres, so all towers share one material and the static batcher
 * merges them. Faces listed in `frontage` also get real relief and the facade kit: signs, AC
 * units, pipes, vents, awnings, shutters, vending machines and cables, all drawn by the world's
 * shared instanced meshes. At night every emitter takes its brightness from the world's
 * luminance levels (`sign`, `tube`, `screen`). Dark by day. One cuboid collider over the ground footprint, plus one along each street face
 * at the pier line and one per vending machine, so nothing a walker can reach stands outside a
 * collider. Relief above the piers (fascia, awnings, balconies, cornices) has none.
 */
export function Tower({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  seed = 1,
  width = 16,
  depth = 16,
  height = 60,
  windows,
  lit,
  trim,
  cornerStrips,
  shopfronts = true,
  color,
  era,
  podium,
  frontage = NO_FRONTAGE,
  name,
  cableSpan = 0,
  light = false,
}: TowerProps) {
  const { unit, palette, time } = useWorld()
  const w = width * unit
  const d = depth * unit
  const h = height * unit
  const fronts = frontage.join(',')

  const plan = useMemo(
    () =>
      planTower({
        seed,
        width: w,
        depth: d,
        height: h,
        windows,
        lit,
        trim,
        cornerStrips,
        shopfronts,
        era,
        podium: podium === undefined ? undefined : podium * unit,
        frontage: fronts ? (fronts.split(',') as TowerFace[]) : [],
      }),
    [seed, w, h, d, windows, lit, trim, cornerStrips, shopfronts, era, podium, unit, fronts],
  )
  const wallHex = color ?? palette.wall
  const geometry = useMemo(() => {
    const mesh = buildTower(plan, wallHex)
    const g = new BufferGeometry()
    g.setIndex(mesh.index)
    g.setAttribute('position', new Float32BufferAttribute(mesh.position, 3))
    g.setAttribute('normal', new Float32BufferAttribute(mesh.normal, 3))
    g.setAttribute('aUv', new Float32BufferAttribute(mesh.aUv, 2))
    g.setAttribute('aRect', new Float32BufferAttribute(mesh.aRect, 4))
    g.setAttribute('aCell', new Float32BufferAttribute(mesh.aCell, 4))
    g.setAttribute('aWall', new Float32BufferAttribute(mesh.aWall, 3))
    g.setAttribute('aTrim', new Float32BufferAttribute(mesh.aTrim, 3))
    g.setAttribute('aLook', new Float32BufferAttribute(mesh.aLook, 4))
    g.computeBoundingSphere()
    g.computeBoundingBox()
    return g
  }, [plan, wallHex])
  useLayoutEffect(() => () => geometry.dispose(), [geometry])

  // WebGPURenderer (either backend) only draws node materials: use the TSL port there.
  const nodes = useNodeRenderer() ? towerNodes() : null
  const night = Math.round(nightFactor(time.hours) * 10) / 10
  const material = nodes ? nodes.towerNodeMaterial(night) : towerMaterial(night)
  const ladder = useLadder()
  useLayoutEffect(() => applyTowerLight(ladder), [ladder])

  // A glass tower's crown shows the world's time, to the last ten minutes.
  const clock = plan.era === 2 ? clockText(time.hours) : ''
  const span = cableSpan * unit
  // Where the street stands in front of each face: a pavement is a step up from the road, and
  // the light a shop leaves on the ground has to lie on top of it.
  const groundAt = useGround()
  const [px, py, pz] = position
  const turn = rotation[1]
  const street = useMemo(() => {
    const cos = Math.cos(turn)
    const sin = Math.sin(turn)
    return [0, 1, 2, 3]
      .map((face) => {
        const [x, z] = onFace(face, 0, 0, w, d, (face % 2 === 0 ? w : d) / 2, 1.5 * unit)
        const rise = groundAt(px + x * cos + z * sin, pz - x * sin + z * cos) - py
        // A floor a storey up is a roof over the street, not the street.
        return rise > 0 && rise < 0.6 * unit ? Math.round(rise * 1000) / 1000 : 0
      })
      .join(',')
  }, [groundAt, px, py, pz, turn, w, d, unit])
  const parts = useMemo(() => {
    const k = new KitBuilder()
    towerKit(k, plan, { name, cableSpan: span, clock, street: street.split(',').map(Number) })
    return k
  }, [plan, name, span, clock, street])
  const kit = useKitParts(parts, [position, rotation])
  // The kit's solids (the pier line of each street face, vending machines) come out of the same
  // seeded run as its instances. The clock redraws the kit every ten minutes: keep the colliders.
  const solidKey = JSON.stringify(parts.solids)
  const solids = useMemo(() => parts.solids, [solidKey])

  const lightAt = useMemo(() => knotLight(plan), [plan])
  const lamp = plan.trim !== 'none' ? plan.trim : '#ffa64d'
  const emitter = useLight(
    { color: lamp, intensity: 3, distance: 18 * unit, decay: 1.6 },
    light && lightAt !== null,
  )

  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      <mesh geometry={geometry} material={material} receiveShadow />
      <group ref={kit} />
      {lightAt && <object3D ref={emitter.ref} position={lightAt} />}
      <CuboidCollider args={[w / 2, h / 2, d / 2]} position={[0, h / 2, 0]} />
      {solids.map((s, i) => (
        <CuboidCollider key={i} args={s.half} position={s.position} rotation={[0, s.rotY, 0]} />
      ))}
    </RigidBody>
  )
}

Tower.groundSitting = true

const NO_FRONTAGE: TowerFace[] = []

/** What a tower is known by on the street. */
export interface TowerShop {
  /** The name on its main sign. */
  name: string
  /** The era that built it, given or seeded. */
  era: TowerEra
  /** Where that shop's front stands, at the ground: in the tower's own frame, in units. */
  at: Vec3
}

/**
 * The shop a tower is known by, worked out from its props alone, for anything that has to say
 * what a tower is without drawing it. The props mean what they mean to `Tower`, defaults and
 * all. `out` is how far off the wall the point stands, in units. Null for a tower with no shop
 * to name: one with no `frontage`, or none with a named shop in it.
 */
export function towerShop(
  {
    seed = 1,
    width = 16,
    depth = 16,
    height = 60,
    windows,
    lit,
    trim,
    cornerStrips,
    shopfronts = true,
    era,
    podium,
    frontage = NO_FRONTAGE,
    name,
  }: TowerProps,
  unit = 1,
  out = 0,
): TowerShop | null {
  const plan = planTower({
    seed,
    width: width * unit,
    depth: depth * unit,
    height: height * unit,
    windows,
    lit,
    trim,
    cornerStrips,
    shopfronts,
    era,
    podium: podium === undefined ? undefined : podium * unit,
    frontage,
  })
  const shop = mainShop(plan, name, out * unit)
  return (
    shop && { name: shop.name, era: ERAS[plan.era], at: [shop.at[0] / unit, 0, shop.at[2] / unit] }
  )
}

function clockText(hours: number) {
  const t = ((hours % 24) + 24) % 24
  const hh = Math.floor(t)
  const mm = Math.floor(((t - hh) * 60) / 10) * 10
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

const materials = new Map<number, ShaderMaterial>()

/** One shared material per night level. Per-tower looks ride in vertex attributes. */
function towerMaterial(night: number) {
  const key = Math.round(night * 10) / 10
  let m = materials.get(key)
  if (!m) {
    m = new ShaderMaterial({
      uniforms: {
        ...UniformsUtils.merge([UniformsLib.fog, { uNight: { value: key } }]),
        ...towerUniforms,
      },
      vertexShader: TOWER_VERT,
      fragmentShader: TOWER_FRAG,
      fog: true,
    })
    // One material for every tower that draws at this night level: the batcher may merge them.
    m.name = `runek:tower:${key}`
    materials.set(key, shareMaterial(m))
  }
  return m
}
