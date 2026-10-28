import {
  DECK,
  deckSpan,
  halfBreadth,
  innerBreadth,
  LEVEL,
  railY,
  type ShipLayout,
  sternZ,
} from '../surfaces/ship'
import type { Gap } from './hull'
import { hash01, type V3 } from './mesh'

export interface Gun {
  side: 1 | -1
  x: number
  y: number
  z: number
  /** Height of the port's centre on the hull. */
  portY: number
  open: boolean
}

const GUN_PITCH = 1.7

function row(z0: number, z1: number, n: number): number[] {
  const fit = Math.min(n, Math.floor((z1 - z0) / GUN_PITCH) + 1)
  if (fit <= 0) return []
  if (fit === 1) return [(z0 + z1) / 2]
  return Array.from({ length: fit }, (_, i) => z0 + ((z1 - z0) * i) / (fit - 1))
}

/** Cannons run out at a port each: `count` a side on the gun deck, fewer along the waist, none
 *  in the gangway's way. Which lids stand open is seeded. */
export function gunLayout(lay: ShipLayout, count: number, gap: Gap | null, seed: number): Gun[] {
  if (count <= 0) return []
  const s = lay.shape
  const { gun, main } = LEVEL
  const [za, zb] = deckSpan(s, gun)
  const out: Gun[] = []
  const place = (
    zs: number[],
    y: number,
    portY: number,
    skip?: (side: number, z: number) => boolean,
  ) => {
    for (const side of [1, -1] as const)
      for (const z of zs) {
        if (skip?.(side, z)) continue
        const x = side * (innerBreadth(s, z, y + 0.6) - 0.95)
        out.push({ side, x, y, z, portY, open: hash01(Math.round(z * 10), side, seed) < 0.75 })
      }
  }
  place(row(za + 3.2, zb - 4.5, Math.round(count)), gun, gun + 0.75)
  const waist = Math.max(2, Math.round(count * 0.4))
  const zw = row(lay.quarterStairs[0].z1 + 0.9, lay.foreStairs[0].z0 - 0.9, waist)
  place(
    zw,
    main,
    main + 0.6,
    (side, z) => !!gap && side === gap.side && Math.abs(z - lay.gangway.z) < 1.4,
  )
  return out
}

export interface Hammock {
  x: number
  y: number
  z: number
  sag: number
  tint: number
}

/** Hammocks slung fore and aft in rows: the gun deck's berth forward of the main hatch, and
 *  the crew quarters under the forecastle. Clear of the guns, the foremast, and head height. */
export function hammockLayout(lay: ShipLayout, foremast: number | null, seed: number): Hammock[] {
  const s = lay.shape
  const out: Hammock[] = []
  const zones = [
    { y: LEVEL.gun, z0: lay.hatchA.z1 + 1.1, z1: deckSpan(s, LEVEL.gun)[1] - 1.6, margin: 2.1 },
    { y: LEVEL.main, z0: lay.zF + 1.2, z1: deckSpan(s, LEVEL.main)[1] - 1.2, margin: 0.9 },
  ]
  let n = 0
  for (const zone of zones) {
    for (let z = zone.z0; z <= zone.z1; z += 2.2) {
      const reach = innerBreadth(s, z, zone.y + 1.95) - zone.margin
      for (let x = -Math.floor(reach / 0.85) * 0.85; x <= reach; x += 0.85) {
        if (foremast !== null && Math.abs(x) < 0.8 && Math.abs(z - foremast) < 1.4) continue
        n++
        out.push({
          x,
          y: zone.y + 1.95,
          z,
          sag: 0.85 + 0.3 * hash01(n, 1, seed),
          tint: 0.85 + 0.2 * hash01(n, 2, seed),
        })
      }
    }
  }
  return out
}

export interface Cargo {
  kind: 'crate' | 'barrel'
  position: V3
  stacked: boolean
  seed: number
}

const MAX_CARGO = 28

/** Cargo stowed along both sides of the hold, leaving a centre aisle to the stair. */
export function cargoLayout(lay: ShipLayout, seed: number): Cargo[] {
  const s = lay.shape
  const y = LEVEL.hold
  const [za, zb] = deckSpan(s, y)
  const slots: (Cargo & { order: number })[] = []
  let n = 0
  for (const side of [1, -1] as const)
    for (let z = za + 1.4; z < zb - 2.2; z += 1.6)
      for (const col of [0, 1]) {
        n++
        const x = side * (innerBreadth(s, z, y + 0.6) - 0.65 - col * 1.0)
        if (Math.abs(x) < 1.4) continue
        const r = hash01(n, 11, seed)
        if (r < 0.3) continue
        const kind = r < 0.68 ? 'crate' : 'barrel'
        slots.push({
          kind,
          position: [x, y, z],
          stacked: kind === 'crate' && hash01(n, 12, seed) < 0.4,
          seed: n,
          order: hash01(n, 13, seed),
        })
      }
  return slots
    .sort((a, b) => a.order - b.order)
    .slice(0, MAX_CARGO)
    .map(({ order: _, ...c }) => c)
}

export interface Lamp {
  position: V3
  /** A big stern lantern on the taffrail rather than one hung from a beam. */
  stern?: boolean
}

/** Lanterns: two in the hold, two on the gun deck, one in each cabin, two at the stern. */
export function lanternLayout(lay: ShipLayout, tableZ: number): Lamp[] {
  const s = lay.shape
  const L = s.length
  const { gun, main, quarter, fore } = LEVEL
  const hang = (deck: number) => deck - DECK - 0.55
  const [, gunBow] = deckSpan(s, gun)
  const [, mainBow] = deckSpan(s, main)
  const yr = railY(s, sternZ(s, quarter + 1))
  const zs = sternZ(s, yr) + 0.35
  const xs = halfBreadth(s, zs, yr) - 0.55
  return [
    { position: [0, hang(gun), -0.22 * L] },
    { position: [0, hang(gun), 0.2 * L] },
    { position: [0, hang(main), (lay.hatchA.z1 + gunBow) / 2] },
    { position: [0, hang(main), lay.hatchB.z0 - 1] },
    { position: [0, hang(quarter), tableZ] },
    { position: [0, hang(fore), (lay.zF + mainBow) / 2] },
    { position: [xs, yr, zs], stern: true },
    { position: [-xs, yr, zs], stern: true },
  ]
}

export type Piece =
  | { type: 'Table'; position: V3; rotation?: V3; width: number; depth: number; height: number }
  | { type: 'Chair'; position: V3; rotation: V3 }
  | { type: 'Bed'; position: V3; rotation?: V3 }
  | { type: 'Crate'; position: V3; size: number; rotation?: V3 }
  | { type: 'Barrel'; position: V3 }

/** Where the captain's table goes: aft of the mizzen, clear of the transom. */
export function cabinTable(lay: ShipLayout, mizzen: number | null): number {
  const aft = deckSpan(lay.shape, LEVEL.main)[0]
  if (mizzen === null) return (aft + lay.zQ) / 2 - 0.5
  const z = mizzen - 2.5
  return z - 1.6 > aft + 0.4 ? z : (aft + mizzen) / 2
}

/** The furniture each room is fitted with: the captain's cabin, the gun deck's mess, the crew
 *  quarters, and a little deck cargo. The hold's cargo comes from `cargoLayout`. */
export function furnishLayout(
  lay: ShipLayout,
  masts: { main: number; fore: number | null; mizzen: number | null },
): Piece[] {
  const s = lay.shape
  const { gun, main } = LEVEL
  const out: Piece[] = []
  const t = cabinTable(lay, masts.mizzen)
  out.push({ type: 'Table', position: [0, main, t], width: 1.2, depth: 2.4, height: 0.76 })
  for (const dz of [-0.55, 0.55]) {
    out.push({ type: 'Chair', position: [0.95, main, t + dz], rotation: [0, -Math.PI / 2, 0] })
    out.push({ type: 'Chair', position: [-0.95, main, t + dz], rotation: [0, Math.PI / 2, 0] })
  }
  out.push({ type: 'Chair', position: [0, main, t - 1.55], rotation: [0, 0, 0] })
  const zb = lay.zQ - 1.5
  const wb = innerBreadth(s, zb, main + 0.5)
  out.push({ type: 'Bed', position: [wb - 0.8, main, zb] })
  out.push({ type: 'Crate', position: [wb - 0.6, main, zb - 1.5], size: 0.55 })
  out.push({
    type: 'Table',
    position: [-(wb - 0.55), main, zb],
    rotation: [0, Math.PI / 2, 0],
    width: 1.3,
    depth: 0.7,
    height: 0.8,
  })
  out.push({ type: 'Chair', position: [-(wb - 1.25), main, zb], rotation: [0, -Math.PI / 2, 0] })

  const depth = 2.2
  let mess = lay.hatchB.z0 - 1.4 - depth / 2
  if (masts.mizzen !== null && Math.abs(mess - masts.mizzen) < depth / 2 + 0.7)
    mess = masts.mizzen - 0.8 - depth / 2
  out.push({ type: 'Table', position: [0, gun, mess], width: 0.9, depth, height: 0.72 })
  for (const sx of [-1, 1])
    for (const dz of [-0.55, 0.55])
      out.push({ type: 'Crate', position: [sx * 0.8, gun, mess + dz], size: 0.42 })
  for (const sx of [-1, 1]) {
    const x = sx * (innerBreadth(s, masts.main, gun + 0.5) - 2.7)
    out.push({ type: 'Barrel', position: [x, gun, masts.main] })
  }

  for (const sx of [-1, 1])
    for (const k of [0, 1]) {
      const z = lay.zF + 1 + k * 1.3
      out.push({
        type: 'Crate',
        position: [sx * (innerBreadth(s, z, main + 0.3) - 0.45), main, z],
        size: 0.5,
      })
    }
  out.push({
    type: 'Barrel',
    position: [innerBreadth(s, lay.zF + 3.6, main + 0.5) - 0.6, main, lay.zF + 3.6],
  })

  if (masts.fore !== null)
    for (const sx of [-1, 1])
      out.push({ type: 'Barrel', position: [sx * 1, main, masts.fore - 1.1] })
  out.push({ type: 'Crate', position: [1.3, main, masts.main - 1.3], size: 0.8 })
  out.push({
    type: 'Crate',
    position: [1.3, main + 0.8, masts.main - 1.3],
    size: 0.6,
    rotation: [0, 0.4, 0],
  })
  return out
}
