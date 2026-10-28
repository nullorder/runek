import {
  ConvexHullCollider,
  CuboidCollider,
  CylinderCollider,
  RigidBody,
  TrimeshCollider,
} from '@react-three/rapier'
import { useMaterials, useWorld, type WorldComponentProps } from '@runek/core'
import { useEffect, useMemo } from 'react'
import { BoxGeometry, Color, DoubleSide, Euler, Matrix4, Quaternion, Vector3 } from 'three'
import { Flag } from './Flag'
import { buildBulkhead, buildDeck, bulkheads, deckBeams, deckHulls, shipDecks } from './ship/decks'
import { Furnishing, Stairs } from './ship/Furnishing'
import {
  cabinTable,
  cargoLayout,
  furnishLayout,
  gunLayout,
  hammockLayout,
  lanternLayout,
} from './ship/fittings'
import { buildHull, gangwayGap, hullCollider } from './ship/hull'
import { MeshBuilder, type V3 } from './ship/mesh'
import {
  Anchors,
  Bell,
  CannonColliders,
  Cannons,
  Capstan,
  Gangway,
  GangwayColliders,
  gangwayPlan,
  Hammocks,
  Instanced,
  Lantern,
  type Mats,
  Ports,
  Rudder,
  Wheel,
  WheelColliders,
} from './ship/parts'
import { Rig } from './ship/Rig'
import { rigLayout, type SailPlan } from './ship/rigging'
import {
  gangwayReach,
  innerBreadth,
  LEVEL,
  type ShipLayout,
  SKIN,
  shipLayout,
  shipShape,
  shipSurface,
  sternZ,
} from './surfaces/ship'

export interface ShipProps extends WorldComponentProps {
  /** Hull length from stern to stem, in units (30 to 60). Deck heights, stairs and doors keep
   *  human scale; the length spreads the layout. */
  length?: number
  /** Hull breadth at its widest, in units (8 to 16). */
  beam?: number
  /** 3 for fore, main and mizzen; 2 drops the mizzen; 1 keeps only the main. */
  masts?: number
  /** Sails set and drawing, furled on their yards, or bare spars. */
  sails?: SailPlan
  /** Cannons a side on the gun deck (0 for none); the waist carries a few more. */
  guns?: number
  /** Which side the boarding plank runs out from, or none. */
  gangway?: 'starboard' | 'port' | 'none'
  /** How far below the main deck the plank's shore end sits, in units: a dock deck's height
   *  under the main deck (which stands 4.8 above the waterline). */
  gangwayDrop?: number
  /** Fit out the cabin, crew quarters, mess and hold with furniture and cargo. */
  furnish?: boolean
  /** Hang lit lanterns below decks and on the stern. */
  lanterns?: boolean
  /** Fly a flag from the main truck. */
  flag?: boolean
  /** The hull, decks and fittings are solid (board it and walk the decks). Off, they are a bare
   *  visual; the stairs and furniture it is fitted out with keep their own colliders. */
  collider?: boolean
  /** Topsides colour; defaults to the world palette's `woodDark`. */
  hullColor?: string
  /** The painted band along the gunports. */
  bandColor?: string
  /** Deck planking; defaults to the palette's `floor`. */
  deckColor?: string
  sailColor?: string
  flagColor?: string
}

const compose = (p: V3, r: V3 = [0, 0, 0], s: V3 = [1, 1, 1]) =>
  new Matrix4().compose(
    new Vector3(...p),
    new Quaternion().setFromEuler(new Euler(...r)),
    new Vector3(...s),
  )

interface Rail {
  key: string
  y: number
  x0: number
  z0: number
  x1: number
  z1: number
}

/** Rails round each hatch (open at the stair's head) and along each castle's break. */
function rails(lay: ShipLayout): Rail[] {
  const { main, gun, quarter, fore } = LEVEL
  const out: Rail[] = []
  const hatch = (key: string, y: number, h: ShipLayout['hatchA'], end: number) => {
    const w = h.w / 2 + 0.05
    out.push({ key: `${key}p`, y, x0: w, z0: h.z0, x1: w, z1: h.z1 })
    out.push({ key: `${key}s`, y, x0: -w, z0: h.z0, x1: -w, z1: h.z1 })
    out.push({ key: `${key}e`, y, x0: -w, z0: end, x1: w, z1: end })
  }
  hatch('a', main, lay.hatchA, lay.hatchA.z1)
  hatch('b', gun, lay.hatchB, lay.hatchB.z0)
  const qx = Math.abs(lay.quarterStairs[0].x) - lay.quarterStairs[0].w / 2 - 0.05
  out.push({ key: 'q', y: quarter, x0: -qx, z0: lay.zQ - 0.05, x1: qx, z1: lay.zQ - 0.05 })
  const fx = Math.abs(lay.foreStairs[0].x) - lay.foreStairs[0].w / 2 - 0.05
  out.push({ key: 'f', y: fore, x0: -fx, z0: lay.zF + 0.05, x1: fx, z1: lay.zF + 0.05 })
  return out
}

/**
 * A big three-masted sailing ship you can board and walk through. A plank runs up from the dock
 * to the waist; hatches drop to the gun deck (a cannon at every port, hammocks slung forward, a
 * mess table) and on down to the cargo hold. Stairs climb to the quarterdeck (the wheel) and
 * the forecastle (the bell, the bowsprit), and doors at each break open into the captain's
 * cabin under the stern windows and the crew quarters in the bow. Lanterns light the decks
 * below. The hull is lofted from one shape that the decks, the colliders and the deck surface
 * all share; the seed varies the planking, the sails, the open gunport lids and the cargo.
 * Moored and steady: the origin is the waterline at midships, the bow at +Z.
 */
export function Ship({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  seed = 1,
  length = 36,
  beam = 10,
  masts = 3,
  sails = 'set',
  guns = 8,
  gangway = 'starboard',
  gangwayDrop = 3.8,
  furnish = true,
  lanterns = true,
  flag = true,
  collider = true,
  hullColor,
  bandColor = '#a8742c',
  deckColor,
  sailColor = '#e9e0c8',
  flagColor = '#1b1b1b',
}: ShipProps) {
  const { unit: U, palette } = useWorld()
  const hullC = hullColor ?? palette.woodDark
  const deckC = deckColor ?? palette.floor
  const m = useMaterials({
    painted: {
      color: '#ffffff',
      vertexColors: true,
      flatShading: true,
      roughness: 0.85,
      side: DoubleSide,
    },
    wood: { color: palette.wood, roughness: 0.8 },
    dark: { color: '#2b211a', roughness: 0.8 },
    spar: { color: palette.woodDark, roughness: 0.75 },
    iron: { color: '#2a2a2d', metalness: 0.55, roughness: 0.45 },
    port: { color: '#15110e', roughness: 1 },
    lid: { color: hullC, roughness: 0.85 },
    canvas: { color: '#d6cbad', roughness: 1, side: DoubleSide },
    sail: { color: sailColor, roughness: 0.95, side: DoubleSide },
    glass: { color: '#ffd28a', emissive: '#ffae45', emissiveIntensity: 1.4, roughness: 0.3 },
    window: { color: '#26323a', emissive: '#d49a52', emissiveIntensity: 0.3, roughness: 0.15 },
    brass: { color: '#b08d3c', metalness: 0.7, roughness: 0.35 },
    rope: { color: '#4a3b2a', roughness: 1 },
  })
  const mats: Mats = m

  const shape = useMemo(() => shipShape(length, beam), [length, beam])
  const side = gangway === 'port' ? 1 : -1
  const lay = useMemo(() => shipLayout(shape, side), [shape, side])
  const open = gangway !== 'none'
  const gap = useMemo(() => gangwayGap(lay, open), [lay, open])
  const rig = useMemo(() => rigLayout(lay, masts), [lay, masts])
  const mastZ = useMemo(() => {
    const z = (k: string) => rig.masts.find((mt) => mt.key === k)?.z ?? null
    return { main: lay.masts.main, fore: z('fore'), mizzen: z('mizzen') }
  }, [rig, lay])

  const hull = useMemo(() => {
    const colors = {
      hull: new Color(hullC),
      band: new Color(bandColor),
      bottom: new Color('#3b2a21'),
      trim: new Color(hullC).multiplyScalar(0.5),
      inner: new Color(palette.wood),
    }
    const { outer, inner, trim } = buildHull(lay, colors, gap, seed)
    const b = new MeshBuilder()
    for (const part of [outer, inner, trim]) b.append(part)
    const top = new Color(deckC)
    const under = new Color(palette.wood).multiplyScalar(0.8)
    const decks = shipDecks(lay)
    decks.forEach((d, i) => {
      buildDeck(b, shape, d, top, under, seed + 10 + i)
    })
    for (const h of bulkheads(lay)) buildBulkhead(b, h, colors.inner, seed + 20)
    return { geometry: b.geometry(), decks }
  }, [lay, shape, gap, seed, hullC, bandColor, deckC, palette.wood])
  useEffect(() => () => hull.geometry.dispose(), [hull])

  const solid = useMemo(() => {
    if (!collider) return null
    return {
      walls: hullCollider(lay, gap),
      decks: hull.decks.flatMap((d) => deckHulls(shape, d)),
    }
  }, [collider, lay, gap, hull, shape])

  const beams = useMemo(
    () =>
      hull.decks.slice(1).flatMap((d) => {
        const { y, beams: bs } = deckBeams(shape, d)
        return bs.map((b) => compose([0, y, b.z], [0, 0, 0], [b.w, 1, 1]))
      }),
    [hull, shape],
  )

  const windows = useMemo(() => {
    const y = LEVEL.main + 1.25
    const z = sternZ(shape, y) + SKIN / 2
    const tilt = Math.atan((sternZ(shape, y + 0.1) - sternZ(shape, y - 0.1)) / 0.2)
    const span = innerBreadth(shape, z, y) * 1.6
    const panes = Array.from({ length: 5 }, (_, i) =>
      compose([((i - 2) * span) / 5, y, z], [tilt, 0, 0]),
    )
    return {
      pane: new BoxGeometry(0.62, 0.78, SKIN + 0.08),
      bar: new BoxGeometry(0.66, 0.05, SKIN + 0.12),
      panes,
    }
  }, [shape])
  const beamBox = useMemo(() => new BoxGeometry(1, 0.22, 0.2), [])

  const guns_ = useMemo(() => gunLayout(lay, guns, gap, seed), [lay, guns, gap, seed])
  const hammocks = useMemo(
    () => (furnish ? hammockLayout(lay, mastZ.fore, seed) : []),
    [furnish, lay, mastZ, seed],
  )
  const pieces = useMemo(() => (furnish ? furnishLayout(lay, mastZ) : []), [furnish, lay, mastZ])
  const cargo = useMemo(() => (furnish ? cargoLayout(lay, seed) : []), [furnish, lay, seed])
  const tableZ = cabinTable(lay, mastZ.mizzen)
  const lamps = useMemo(() => lanternLayout(lay, tableZ), [lay, tableZ])
  const plan = useMemo(
    () => gangwayPlan(shape, lay.gangway.z, side, gangwayDrop, gangwayReach(gangwayDrop)),
    [shape, lay, side, gangwayDrop],
  )
  const railList = useMemo(() => rails(lay), [lay])
  const wheelZ = mastZ.mizzen !== null ? mastZ.mizzen + 1.7 : lay.zQ - 2.2
  const capstanZ = mastZ.main - 3
  const bellZ = lay.zF + 0.7
  const main = rig.masts.find((mt) => mt.key === 'main') ?? rig.masts[0]

  const visual = (
    <>
      <mesh geometry={hull.geometry} material={m.painted} castShadow receiveShadow />
      <Instanced geometry={beamBox} material={m.dark} matrices={beams} />
      <Instanced geometry={windows.pane} material={m.window} matrices={windows.panes} />
      <Instanced geometry={windows.bar} material={m.dark} matrices={windows.panes} />
      {railList.map((r) => (
        <RailMesh key={r.key} rail={r} m={mats} />
      ))}
      <Rig
        lay={lay}
        rig={rig}
        sails={sails}
        seed={seed}
        spar={m.spar}
        sail={m.sail}
        rope="#2a2118"
      />
      <Cannons guns={guns_} m={mats} />
      <Ports guns={guns_} shape={shape} m={mats} />
      {hammocks.length > 0 && <Hammocks items={hammocks} m={mats} />}
      <Wheel z={wheelZ} m={mats} />
      <Capstan z={capstanZ} m={mats} />
      <Bell z={bellZ} m={mats} />
      <Anchors shape={shape} m={mats} />
      <Rudder shape={shape} m={mats} />
      {open && <Gangway plan={plan} m={mats} />}
      {lanterns &&
        lamps.map((l) => (
          <Lantern key={l.position.join()} position={l.position} stern={l.stern} m={mats} />
        ))}
    </>
  )

  const at = (p: V3): V3 => [p[0] * U, p[1] * U, p[2] * U]

  return (
    <group position={position} rotation={rotation}>
      <group scale={U}>
        {solid ? (
          <RigidBody type="fixed" colliders={false}>
            <TrimeshCollider args={solid.walls} />
            {solid.decks.map((pts, i) => (
              <ConvexHullCollider key={i} args={[pts]} />
            ))}
            {bulkheads(lay).flatMap((h) => {
              const w = Math.min(h.w0, h.w1) + 0.1
              const d = 0.6
              const half = (w - d) / 2
              return [-1, 1].map((s) => (
                <CuboidCollider
                  key={`${h.z}:${s}`}
                  args={[half, (h.y1 - h.y0) / 2, 0.05]}
                  position={[s * (d + half), (h.y0 + h.y1) / 2, h.z]}
                />
              ))
            })}
            {railList.map((r) => {
              const len = Math.hypot(r.x1 - r.x0, r.z1 - r.z0)
              return (
                <CuboidCollider
                  key={r.key}
                  args={[r.x0 === r.x1 ? 0.04 : len / 2, 0.5, r.x0 === r.x1 ? len / 2 : 0.04]}
                  position={[(r.x0 + r.x1) / 2, r.y + 0.5, (r.z0 + r.z1) / 2]}
                />
              )
            })}
            {rig.masts.map((mt) => {
              const top = mt.key === 'main' ? LEVEL.main + 3 : LEVEL.quarter + 3
              return (
                <CylinderCollider
                  key={mt.key}
                  args={[(top - LEVEL.hold) / 2, mt.r]}
                  position={[0, (top + LEVEL.hold) / 2, mt.z]}
                />
              )
            })}
            <CylinderCollider args={[0.55, 0.58]} position={[0, LEVEL.main + 0.55, capstanZ]} />
            <CuboidCollider args={[0.45, 0.75, 0.1]} position={[0, LEVEL.fore + 0.75, bellZ]} />
            <WheelColliders z={wheelZ} />
            <CannonColliders guns={guns_} />
            {open && <GangwayColliders plan={plan} />}
            {visual}
          </RigidBody>
        ) : (
          visual
        )}
      </group>
      <Stairs lay={lay} unit={U} color={deckC} />
      {furnish && <Furnishing pieces={pieces} cargo={cargo} unit={U} seed={seed} />}
      {flag && (
        <Flag
          position={at([0, main.truck + 0.1, main.z])}
          rotation={[0, Math.PI / 2, 0]}
          poleHeight={2.2}
          fly={3.2}
          drop={2}
          color={flagColor}
          seed={seed}
        />
      )}
    </group>
  )
}

Ship.surface = shipSurface

function RailMesh({ rail, m }: { rail: Rail; m: Mats }) {
  const len = Math.hypot(rail.x1 - rail.x0, rail.z1 - rail.z0)
  const along = rail.x0 === rail.x1 ? Math.PI / 2 : 0
  const cx = (rail.x0 + rail.x1) / 2
  const cz = (rail.z0 + rail.z1) / 2
  const posts = Math.max(2, Math.round(len / 0.9) + 1)
  return (
    <group position={[cx, rail.y, cz]} rotation={[0, along, 0]}>
      <mesh material={m.dark} position={[0, 1, 0]} castShadow>
        <boxGeometry args={[len + 0.08, 0.08, 0.1]} />
      </mesh>
      <mesh material={m.dark} position={[0, 0.5, 0]}>
        <boxGeometry args={[len, 0.05, 0.05]} />
      </mesh>
      {Array.from({ length: posts }, (_, i) => (
        <mesh key={i} material={m.dark} position={[-len / 2 + (len * i) / (posts - 1), 0.5, 0]}>
          <boxGeometry args={[0.07, 1, 0.07]} />
        </mesh>
      ))}
    </group>
  )
}
