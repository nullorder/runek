// Tower's shape grammar: a pure function from props and seed to a massing plan (podium, setback,
// shaft, crown), the facade bands on every face, and the state of every shop bay. The mesh
// builder and the kit emitter both read the plan, so the shader's bays and the props hung on
// them always agree.

import { pick, range, rng } from '@runek/core'
import { Color } from 'three'
import { emissiveColor } from './glow'
import { TRIM_NEON } from './towerLight'

export type TowerWindows = 'grid' | 'office' | 'ribbon' | 'glass'
export type TowerEra = 'concrete' | 'tenement' | 'glass' | 'makeshift'
export type TowerFace = '+z' | '+x' | '-z' | '-x'

/** Faces in the order the grammar walks them: each is a quarter turn about Y from the last. */
export const FACES: TowerFace[] = ['+z', '+x', '-z', '-x']
export const ERAS: TowerEra[] = ['concrete', 'tenement', 'glass', 'makeshift']
const STYLES: TowerWindows[] = ['grid', 'office', 'ribbon', 'glass']

/** Storey heights, a street-level shop floor, and the podium and setback a tower is seeded with, in metres. */
const STOREY = { residential: 3.1, office: 3.8 }
const SHOP_FLOOR = 4.5
const PODIUM: [number, number] = [15, 25]
const SETBACK: [number, number] = [3, 6]

/** Per window style: cell width, storey height, and the pane's place in its cell (x0, x1, y0, y1 as shares). The facade shader carries the same pane table. */
export const WINDOW_CELLS = [
  { w: 2.4, storey: STOREY.residential, pane: [0.2, 0.8, 0.29, 0.76] },
  { w: 1.5, storey: STOREY.office, pane: [0.1, 0.9, 0.3, 0.8] },
  { w: 3.0, storey: 3.4, pane: [0, 1, 0.3, 0.74] },
  { w: 3.0, storey: STOREY.office, pane: [0.03, 0.97, 0.05, 0.95] },
] as const

/** Facade band kinds, as the shader numbers them. */
export const BAND = {
  plain: 0,
  street: 1,
  service: 2,
  podium: 3,
  tower: 4,
  crown: 5,
  roof: 6,
} as const
/** Shop bay states. */
export const BAY = { shop: 0, shutter: 1, dark: 2, door: 3 } as const
/** The piers between street bays: how far they stand off the wall and how high they reach, in metres. */
export const PIER = { proud: 0.3, top: 3.5 } as const

export interface WindowBand {
  y0: number
  y1: number
  storey: number
  rows: number
}

export interface FacePlan {
  /** 0 to 3, an index into FACES. */
  index: number
  /** Whether this face fronts a street and carries kit props. */
  front: boolean
  /** Width at the ground. */
  width: number
  bays: number
  bayW: number
  /** One BAY state per bay, left to right as seen from the street. */
  states: number[]
  /** Bays that anchor a knot of detail: a lit shop with its signs. */
  knots: number[]
  seed: number
}

export interface TowerPlan {
  seed: number
  w: number
  d: number
  h: number
  era: number
  /** Window style of the shaft, and of the podium under it. */
  style: number
  podStyle: number
  lit: number
  /** Trim hex, or `none`. */
  trim: string
  strips: boolean
  shopfronts: boolean
  /** Podium height. Equals `h` when the tower has no shaft. */
  podium: number
  hasShaft: boolean
  /** Setback of the shaft from the podium edge, along X and along Z. */
  inset: [number, number]
  streetH: number
  pod: WindowBand | null
  shaftBand: WindowBand | null
  /** Height of the service band at the podium top and at the shaft base. */
  serviceH: number
  crownH: number
  faces: FacePlan[]
  /** Index of the main street face (the first one listed in `frontage`), or -1. It carries the big sign, the light and the cables. */
  main: number
  /** 0 to 1, the per-tower random the shader mixes into its hashes. */
  sd: number
}

export interface TowerPlanInput {
  seed: number
  width: number
  depth: number
  height: number
  windows?: TowerWindows
  lit?: number
  trim?: string
  cornerStrips?: boolean
  shopfronts: boolean
  era?: TowerEra
  /** Podium height in metres, for a tower with a shaft. Seeded when unset. */
  podium?: number
  frontage: TowerFace[]
}

function fit(y0: number, y1: number, storey: number): WindowBand | null {
  if (y1 - y0 < 2.6) return null
  const rows = Math.max(1, Math.round((y1 - y0) / storey))
  return { y0, y1, storey: (y1 - y0) / rows, rows }
}

/** The largest setback a side of `size` metres allows while leaving a shaft at least 7 m wide. */
function insetFor(size: number, want: number) {
  const most = (size - 7) / 2
  if (most < 1.5) return 0
  return Math.min(want, most)
}

/** Every seeded decision about one tower. Pure: the same input always gives the same plan. */
export function planTower(p: TowerPlanInput): TowerPlan {
  const r = rng(p.seed)
  const seededStyle = pick(r, STYLES)
  const lit = p.lit ?? range(r, 0.08, 0.3)
  const trim = p.trim ?? (r() < 0.45 ? pick(r, TRIM_NEON) : 'none')
  const strips = p.cornerStrips ?? (trim !== 'none' && r() < 0.3)
  const sd = r()
  // A seed builds a concrete block, a tenement or a makeshift tower. A glass slab stands out, so
  // it is only ever asked for.
  const eraName = p.era ?? pick(r, ['concrete', 'tenement', 'tenement', 'makeshift'] as TowerEra[])
  const era = ERAS.indexOf(eraName)

  // Each era has its own glazing: punched windows on a concrete block, curtain wall on a glass slab.
  let styleName = p.windows ?? seededStyle
  if (!p.windows) {
    if (eraName === 'glass') styleName = 'glass'
    else if (eraName === 'concrete' && styleName === 'glass') styleName = 'grid'
    else if (eraName === 'tenement' && styleName === 'glass') styleName = 'ribbon'
    else if (eraName === 'makeshift' && styleName === 'glass') styleName = 'office'
  }
  const style = STYLES.indexOf(styleName)
  const podStyle = style === 3 ? 1 : style

  const { width: w, depth: d, height: h } = p
  const streetH = p.shopfronts ? Math.min(SHOP_FLOOR, h * 0.5) : 0
  const hasShaft = h >= 34 && Math.min(w, d) >= 10
  let podium = h
  let inset: [number, number] = [0, 0]
  const podiumWant =
    eraName === 'concrete' ? range(r, 20, PODIUM[1]) : range(r, PODIUM[0], PODIUM[1])
  const setWant = range(r, SETBACK[0], SETBACK[1])
  const slab = r()
  if (hasShaft) {
    podium =
      p.podium !== undefined
        ? Math.min(Math.max(p.podium, 8), h - 12)
        : Math.min(podiumWant, h * 0.5)
    // A glass slab is thin one way. Everything else steps back evenly, a concrete block the least.
    const want = eraName === 'concrete' ? SETBACK[0] : setWant
    inset = [insetFor(w, want), insetFor(d, want)]
    if (eraName === 'glass')
      inset = slab < 0.5 ? [insetFor(w, 6), insetFor(d, 3)] : [insetFor(w, 3), insetFor(d, 6)]
  }

  const serviceH = podium >= 12 ? 1.4 : 0
  const parapet = 1.0
  const pod = fit(streetH, podium - serviceH - parapet, WINDOW_CELLS[podStyle].storey)
  const crownH = hasShaft ? [5.2, 3.6, 6.4, 3.0][era] : 0
  const shaftBand = hasShaft
    ? fit(podium + serviceH, h - crownH - 0.8, WINDOW_CELLS[style].storey)
    : null

  const faces: FacePlan[] = FACES.map((face, index) => {
    const width = index % 2 === 0 ? w : d
    const bays = Math.min(11, Math.max(1, Math.round(width / 5)))
    const front = p.frontage.includes(face)
    const seed = r()
    const states: number[] = []
    const knots: number[] = []
    if (front) {
      // One knot per 10 m of frontage: a lit shop, with the door beside it when there is room.
      const count = Math.max(1, Math.round(width / 10))
      for (let b = 0; b < bays; b++) states.push(-1)
      for (let k = 0; k < count; k++) {
        const at = Math.min(bays - 1, Math.floor(((k + 0.15 + r() * 0.7) * bays) / count))
        if (states[at] === -1) {
          states[at] = BAY.shop
          knots.push(at)
        }
      }
      const first = knots[0]
      const door = first + 1 < bays && states[first + 1] === -1 ? first + 1 : first - 1
      if (bays >= 3 && door >= 0 && states[door] === -1) states[door] = BAY.door
      for (let b = 0; b < bays; b++) {
        if (states[b] !== -1) continue
        const q = r()
        states[b] = q < 0.22 ? BAY.shop : q < 0.62 ? BAY.shutter : BAY.dark
      }
    } else {
      for (let b = 0; b < bays; b++) {
        const q = r()
        states.push(q < 0.4 ? BAY.shop : q < 0.72 ? BAY.shutter : q < 0.9 ? BAY.dark : BAY.door)
      }
    }
    return { index, front, width, bays, bayW: width / bays, states, knots, seed }
  })

  return {
    seed: p.seed,
    w,
    d,
    h,
    era,
    style,
    podStyle,
    lit,
    trim,
    strips,
    shopfronts: p.shopfronts,
    podium,
    hasShaft,
    inset,
    streetH,
    pod,
    shaftBand,
    serviceH,
    crownH,
    faces,
    main: p.frontage.length ? FACES.indexOf(p.frontage[0]) : -1,
    sd,
  }
}

// ---------------------------------------------------------------------------------------------
// Mesh

/** The tower mesh's vertex data. Every attribute is a plain float array, so towers merge in the static batcher. */
export class FacadeMesh {
  position: number[] = []
  normal: number[] = []
  aUv: number[] = []
  aRect: number[] = []
  aCell: number[] = []
  aWall: number[] = []
  aTrim: number[] = []
  aLook: number[] = []
  index: number[] = []

  /** One quad. Corners run counter-clockwise seen from outside, starting bottom left. */
  quad(
    corners: number[][],
    n: number[],
    uv: number[][],
    rect: number[],
    cell: number[],
    wall: Color,
    trim: Color,
    look: number[],
  ) {
    const base = this.position.length / 3
    for (let i = 0; i < 4; i++) {
      this.position.push(corners[i][0], corners[i][1], corners[i][2])
      this.normal.push(n[0], n[1], n[2])
      this.aUv.push(uv[i][0], uv[i][1])
      this.aRect.push(rect[0], rect[1], rect[2], rect[3])
      this.aCell.push(cell[0], cell[1], cell[2], cell[3])
      this.aWall.push(wall.r, wall.g, wall.b)
      this.aTrim.push(trim.r, trim.g, trim.b)
      this.aLook.push(look[0], look[1], look[2], look[3])
    }
    this.index.push(base, base + 1, base + 2, base, base + 2, base + 3)
  }
}

interface Band {
  y0: number
  y1: number
  kind: number
  /** Flags: 1 corner strips, 2 a trim line under the top edge, 4 a tube over lit shop bays. */
  flags?: number
  cell?: (face: number, width: number) => number[]
}

const NORMALS = [
  [0, 0, 1],
  [1, 0, 0],
  [0, 0, -1],
  [-1, 0, 0],
]
const ZERO = [0, 0, 0, 0]
const BLACK = new Color(0, 0, 0)

/** A point on side `face` of a box centred (cx, cz) sized (w, d): `u` metres along it, `out` metres proud of it. */
export function onFace(
  face: number,
  cx: number,
  cz: number,
  w: number,
  d: number,
  u: number,
  out = 0,
): [number, number] {
  if (face === 0) return [cx - w / 2 + u, cz + d / 2 + out]
  if (face === 1) return [cx + w / 2 + out, cz + d / 2 - u]
  if (face === 2) return [cx + w / 2 - u, cz - d / 2 - out]
  return [cx - w / 2 - out, cz - d / 2 + u]
}

/** Build the tower's merged mesh from its plan. */
export function buildTower(plan: TowerPlan, wallHex: string): FacadeMesh {
  const mesh = new FacadeMesh()
  const { w, d, h, podium, inset, era, sd } = plan
  const trim = plan.trim === 'none' ? BLACK : emissiveColor(plan.trim, 1)
  const wall = new Color(wallHex)
  // The shaft is a shade apart from its podium. A glass slab is cold and dark.
  const shaftWall =
    era === 2
      ? wall.clone().lerp(new Color('#262b33'), 0.7)
      : wall.clone().multiplyScalar(era === 0 ? 0.86 : 0.92)
  const dark = wall.clone().multiplyScalar(0.8)
  const strips = plan.strips ? 1 : 0
  const fseed = (face: number) => plan.faces[face].seed

  /** The four walls of a volume, one quad per band per face. */
  const walls = (cx: number, cz: number, vw: number, vd: number, bands: Band[], color: Color) => {
    for (let f = 0; f < 4; f++) {
      const width = f % 2 === 0 ? vw : vd
      for (const b of bands) {
        if (b.y1 - b.y0 < 0.01) continue
        const [ax, az] = onFace(f, cx, cz, vw, vd, 0)
        const [bx, bz] = onFace(f, cx, cz, vw, vd, width)
        mesh.quad(
          [
            [ax, b.y0, az],
            [bx, b.y0, bz],
            [bx, b.y1, bz],
            [ax, b.y1, az],
          ],
          NORMALS[f],
          [
            [0, b.y0],
            [width, b.y0],
            [width, b.y1],
            [0, b.y1],
          ],
          [width, b.y0, b.y1, b.kind],
          b.cell ? b.cell(f, width) : ZERO,
          color,
          trim,
          [sd, era, fseed(f), b.flags ?? 0],
        )
      }
    }
  }

  /** A flat top at height y: a roof, or the plain top of a slab. */
  const top = (
    x0: number,
    x1: number,
    z0: number,
    z1: number,
    y: number,
    kind: number,
    color: Color,
    flags = 0,
  ) => {
    const roof = kind === BAND.roof
    mesh.quad(
      [
        [x0, y, z1],
        [x1, y, z1],
        [x1, y, z0],
        [x0, y, z0],
      ],
      [0, 1, 0],
      roof
        ? [
            [0, z1 - z0],
            [x1 - x0, z1 - z0],
            [x1 - x0, 0],
            [0, 0],
          ]
        : [
            [0, y],
            [0, y],
            [0, y],
            [0, y],
          ],
      roof ? [x1 - x0, z1 - z0, 0, kind] : [x1 - x0, y - 0.1, y, kind],
      ZERO,
      color,
      trim,
      [sd, era, 0, flags],
    )
  }

  /** A plain box: slabs, cornices, piers, balconies, rooftop plant. `skip` names faces to leave out (0 to 3 sides, 4 top, 5 bottom). */
  const block = (
    x0: number,
    x1: number,
    y0: number,
    y1: number,
    z0: number,
    z1: number,
    color: Color,
    skip: number[] = [],
    flags = 0,
    roofTop = false,
  ) => {
    const cx = (x0 + x1) / 2
    const cz = (z0 + z1) / 2
    for (let f = 0; f < 4; f++) {
      if (skip.includes(f)) continue
      const width = f % 2 === 0 ? x1 - x0 : z1 - z0
      const [ax, az] = onFace(f, cx, cz, x1 - x0, z1 - z0, 0)
      const [bx, bz] = onFace(f, cx, cz, x1 - x0, z1 - z0, width)
      mesh.quad(
        [
          [ax, y0, az],
          [bx, y0, bz],
          [bx, y1, bz],
          [ax, y1, az],
        ],
        NORMALS[f],
        [
          [0, y0],
          [width, y0],
          [width, y1],
          [0, y1],
        ],
        [width, y0, y1, BAND.plain],
        ZERO,
        color,
        trim,
        [sd, era, 0, flags],
      )
    }
    if (!skip.includes(4)) top(x0, x1, z0, z1, y1, roofTop ? BAND.roof : BAND.plain, color)
    if (!skip.includes(5)) {
      mesh.quad(
        [
          [x0, y0, z0],
          [x1, y0, z0],
          [x1, y0, z1],
          [x0, y0, z1],
        ],
        [0, -1, 0],
        [
          [0, y0],
          [0, y0],
          [0, y0],
          [0, y0],
        ],
        [x1 - x0, y0, y0 + 0.1, BAND.plain],
        ZERO,
        color,
        trim,
        [sd, era, 0, 0],
      )
    }
  }

  /** A box set against side `face` of the ground footprint: from u0 to u1 along it, `out` metres proud. */
  const onWall = (
    face: number,
    u0: number,
    u1: number,
    y0: number,
    y1: number,
    out: number,
    color: Color,
    skip: number[] = [],
  ) => {
    const [ax, az] = onFace(face, 0, 0, w, d, u0, 0)
    const [bx, bz] = onFace(face, 0, 0, w, d, u1, out)
    // Never draw the side that sits against the wall.
    block(Math.min(ax, bx), Math.max(ax, bx), y0, y1, Math.min(az, bz), Math.max(az, bz), color, [
      (face + 2) % 4,
      ...skip,
    ])
  }

  const windowCell =
    (style: number, band: WindowBand, share: number) => (_f: number, width: number) => {
      const cols = Math.max(1, Math.round(width / WINDOW_CELLS[style].w))
      return [width / cols, band.storey, share, style]
    }
  const streetCell = (f: number) => {
    const face = plan.faces[f]
    let bits = 0
    face.states.forEach((s, i) => {
      bits += s * 4 ** i
    })
    return [face.bayW, bits, 0, 0]
  }

  // Podium (or the whole building when it has no shaft).
  const podTop = podium - 1.0
  const bands: Band[] = []
  if (plan.streetH > 0)
    bands.push({ y0: 0, y1: plan.streetH, kind: BAND.street, cell: streetCell, flags: 4 })
  if (plan.pod) {
    bands.push({
      y0: plan.pod.y0,
      y1: plan.pod.y1,
      kind: BAND.podium,
      cell: windowCell(plan.podStyle, plan.pod, plan.lit),
      flags: plan.hasShaft ? 0 : strips,
    })
    if (plan.serviceH > 0) bands.push({ y0: plan.pod.y1, y1: podTop, kind: BAND.service })
  } else {
    bands.push({ y0: plan.streetH, y1: podTop, kind: BAND.plain })
  }
  bands.push({ y0: podTop, y1: podium, kind: BAND.plain, flags: 2 })
  walls(0, 0, w, d, bands, wall)
  top(-w / 2, w / 2, -d / 2, d / 2, podium, BAND.roof, wall, plan.hasShaft ? 0 : 2)
  // A cornice under the parapet gives the podium a shadow line.
  if (podium >= 12)
    block(-w / 2 - 0.25, w / 2 + 0.25, podTop - 0.3, podTop, -d / 2 - 0.25, d / 2 + 0.25, dark)

  const sw = w - inset[0] * 2
  const sdp = d - inset[1] * 2
  if (plan.hasShaft && plan.shaftBand) {
    const sb = plan.shaftBand
    const crown0 = h - plan.crownH - 0.8
    walls(
      0,
      0,
      sw,
      sdp,
      [
        { y0: podium, y1: sb.y0, kind: BAND.service },
        {
          y0: sb.y0,
          y1: sb.y1,
          kind: BAND.tower,
          cell: windowCell(plan.style, sb, plan.lit),
          flags: strips,
        },
        {
          y0: crown0,
          y1: h - 0.8,
          kind: BAND.crown,
          cell: (_f, width) => [
            width / Math.max(1, Math.round(width / (era === 2 ? 3 : 2.2))),
            plan.crownH,
            0.55,
            era === 2 ? 3 : 0,
          ],
          flags: strips,
        },
        { y0: h - 0.8, y1: h, kind: BAND.plain, flags: 2 },
      ],
      shaftWall,
    )
    top(-sw / 2, sw / 2, -sdp / 2, sdp / 2, h, BAND.roof, shaftWall, 2)
    // A slab between shaft and crown. Heavy on a concrete block, a thin fin on a glass slab.
    const over = [0.6, 0.3, 0.12, 0.2][era]
    block(
      -sw / 2 - over,
      sw / 2 + over,
      crown0 - 0.35,
      crown0,
      -sdp / 2 - over,
      sdp / 2 + over,
      dark,
    )
  }

  // What stands on the roof, by era.
  const r = rng(plan.seed * 31 + 7)
  const roofY = h
  const rw = plan.hasShaft ? sw : w
  const rd = plan.hasShaft ? sdp : d
  if (era === 0 && plan.hasShaft) {
    // Concrete: a stepped block, the crown stepping in again.
    block(
      -rw / 2 + 1.5,
      rw / 2 - 1.5,
      roofY,
      roofY + 3.2,
      -rd / 2 + 1.5,
      rd / 2 - 1.5,
      shaftWall,
      [5],
      2,
      true,
    )
  } else if (era === 2) {
    // Glass: a plant screen and a mast.
    block(-rw * 0.3, rw * 0.3, roofY, roofY + 2.2, -rd * 0.3, rd * 0.3, shaftWall, [5], 0, true)
    const mx = range(r, -rw * 0.2, rw * 0.2)
    block(mx - 0.25, mx + 0.25, roofY + 2.2, roofY + range(r, 11, 20), -0.25, 0.25, dark, [5])
  } else {
    // Tenement and makeshift: plant rooms and shacks, off centre.
    const shacks = era === 3 ? 3 : 1 + Math.floor(r() * 2)
    for (let i = 0; i < shacks; i++) {
      const bw = range(r, 2.5, Math.max(3, rw * 0.4))
      const bd = range(r, 2.5, Math.max(3, rd * 0.4))
      const bx = range(r, -rw / 2 + bw / 2 + 0.6, rw / 2 - bw / 2 - 0.6)
      const bz = range(r, -rd / 2 + bd / 2 + 0.6, rd / 2 - bd / 2 - 0.6)
      block(
        bx - bw / 2,
        bx + bw / 2,
        roofY,
        roofY + range(r, 2.2, 4.4),
        bz - bd / 2,
        bz + bd / 2,
        i % 2 ? dark : shaftWall,
        [5],
        0,
        true,
      )
    }
  }

  // Street faces get real relief: piers between the bays, a fascia over them, balconies above.
  for (const face of plan.faces) {
    if (!face.front || plan.streetH < 4) continue
    const f = face.index
    for (let b = 0; b <= face.bays; b++) {
      const u = b * face.bayW
      onWall(
        f,
        Math.max(0, u - 0.28),
        Math.min(face.width, u + 0.28),
        0,
        PIER.top,
        PIER.proud,
        dark,
        [4, 5],
      )
    }
    onWall(f, 0, face.width, PIER.top, plan.streetH, 0.45, dark)
    if (era === 1 && plan.pod) {
      // Tenement: stacked balconies with solid fronts, one run per storey.
      const rows = Math.min(plan.pod.rows, 6)
      for (let row = 1; row < rows; row++) {
        const y = plan.pod.y0 + row * plan.pod.storey
        const lead = range(r, 0.6, 2.4)
        const tail = range(r, 0.6, 2.4)
        if (face.width - lead - tail > 3)
          onWall(f, lead, face.width - tail, y - 0.12, y + 0.92, 1.0, row % 2 ? wall : dark)
      }
    }
  }
  return mesh
}
