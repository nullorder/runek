// What Tower hangs on its street faces, at the district's density rules: per 10 m of frontage
// one shop bay with two to four sign elements, AC units under the windows above it, and a cable
// crossing every 10 to 15 m. Detail gathers in knots around the lit shops and the door beside
// them. The bays between stay calm: a shutter, dark glass, a painted code.

import { pick, range, rng } from '@runek/core'
import { GLOW, type KitBuilder } from './kit'
import {
  acUnit,
  awning,
  bladeSign,
  bladeWord,
  cableSag,
  cableY,
  drumLantern,
  fasciaSign,
  pipeRun,
  rollerShutter,
  roofSign,
  stencilCode,
  vendingMachine,
  vent,
} from './kitParts'
import { BAY, onFace, PIER, type TowerPlan, WINDOW_CELLS } from './towerGrammar'
import { shopLamp } from './towerLight'

/** Sign lamps by era. */
const ERA_LAMPS = [
  ['#ff9326', '#ff6418'],
  ['#ffa64d', '#39ff88', '#b967ff', '#ff6418'],
  ['#f4f6fb', '#ffcf9a'],
  ['#b8e8c8', '#7a3cff', '#f6f2ea', '#39ff88'],
]
const AWNINGS = ['#5a2a1c', '#2f3a2c', '#3a2f45', '#4a3a28', '#3d2224']
const MACHINES = ['#3a2f45', '#40332a', '#2c3530', '#4a2a22']

const WHO = [
  'DOT',
  'MARA',
  'TULLY',
  'VESK',
  'IONA',
  'BRAM',
  'NELL',
  'PIKE',
  'OMA',
  'LUCE',
  'HARL',
  'QUILL',
  'SABLE',
  'ORRIN',
  'WREN',
  'CASS',
]
const WHAT = [
  'NOODLE',
  'FIXES',
  'TEA',
  'PAWN',
  'KEYS',
  'LAMPS',
  'BUNKS',
  'SOUP',
  'TAILOR',
  'CELLS',
  'RADIO',
  'PARTS',
  'LOCKS',
  'CUTS',
  'COILS',
  'DICE',
  'BROTH',
  'TUBES',
  'SHOES',
  'SCRAP',
]
const NOTES = [
  'ALL WINDOWS',
  'OPEN LATE',
  'BY THE HOUR',
  'UPSTAIRS',
  'NO CREDIT',
  'BACK ROOM',
  'ASK INSIDE',
]
const SECTORS = 'LKRSNG'
/** How far over the ground light on the street is drawn: clear of a pavement's top and of a wet street's deck. */
const STREET = 0.045
const DIGITS = '01234568'

/** A shop name: proprietor, then offer. */
export function shopName(r: () => number) {
  return `${pick(r, WHO)} ${pick(r, WHAT)}`
}

/** A painted block code, like `K3-08`. The stencil set has no seven. */
export function sectorCode(r: () => number) {
  const d = () => DIGITS[Math.floor(r() * DIGITS.length)]
  return `${SECTORS[Math.floor(r() * SECTORS.length)]}${d()}-${d()}${d()}`
}

export interface TowerKitOptions {
  /** The shop name on the tower's main sign. Seeded when unset. */
  name?: string
  /** Wall to wall distance across the street, for cable crossings. 0 for none. */
  cableSpan: number
  /** The time a glass tower's crown shows, like `21:40`. */
  clock: string
  /** How far the ground in front of each face stands above the tower's base (a pavement is a step up from the road), by face. Light on the street lies on it. */
  street?: readonly number[]
}

/** The name on a tower's main sign: the one it was given, or one from its seed. */
const nameOf = (plan: TowerPlan, name?: string) => name ?? shopName(rng(plan.seed * 13 + 5))

/** A tower's faces with the main one first, so the tower's name lands on it. */
const mainFirst = (plan: TowerPlan) =>
  [...plan.faces].sort((a, b) => Number(b.index === plan.main) - Number(a.index === plan.main))

/**
 * The shop a tower is known by: the name on its main sign, and where that shop's front stands in
 * the tower's local space, at the ground and `out` metres off the wall. It walks the faces the way
 * `towerKit` does, so the two agree on which shop that is. Null when no shop carries the name.
 */
export function mainShop(
  plan: TowerPlan,
  name?: string,
  out = 0,
): { name: string; at: [number, number, number] } | null {
  if (plan.streetH < 4) return null
  for (const face of mainFirst(plan)) {
    if (!face.front) continue
    const bay = face.knots.find((b) => face.states[b] === BAY.shop)
    if (bay === undefined) continue
    const [x, z] = onFace(face.index, 0, 0, plan.w, plan.d, (bay + 0.5) * face.bayW, out)
    return { name: nameOf(plan, name), at: [x, 0, z] }
  }
  return null
}

/** Add every prop and sign of one tower to `kit`, in the tower's local space. */
export function towerKit(kit: KitBuilder, plan: TowerPlan, o: TowerKitOptions) {
  const { w, d, era } = plan
  const lamps = ERA_LAMPS[era]
  const main = plan.trim !== 'none' ? plan.trim : lamps[0]
  const mainName = nameOf(plan, o.name)
  let named = false

  for (const face of mainFirst(plan)) {
    if (!face.front || plan.streetH < 4) continue
    const r = rng(plan.seed * 17 + face.index * 101 + 3)
    const [ox, oz] = onFace(face.index, 0, 0, w, d, 0)
    kit.push(ox, 0, oz, (face.index * Math.PI) / 2)
    const { bayW, bays, width } = face
    const proud = 0.45 // the fascia stands this far off the wall
    const street = (o.street?.[face.index] ?? 0) + STREET
    // The piers stand 0.3 m off the wall up to the fascia. One slab along the face at that depth,
    // so a walker slides along the pier line instead of catching on each pier.
    kit.solid(width / 2, PIER.top / 2, PIER.proud / 2, width, PIER.top, PIER.proud)

    for (let b = 0; b < bays; b++) {
      const state = face.states[b]
      const u0 = b * bayW
      const uc = u0 + bayW / 2
      const knot = face.knots.includes(b)
      // What a lit shop's glass leaves on the pavement: its own lamp colour, brighter for a
      // brighter shop, less with the shutter part way down.
      const shopLight = (open: number) => {
        const lamp = shopLamp(plan.sd, face.seed, b)
        kit.lightSplat(uc, street, PIER.proud, bayW + 1.6, 3.6, lamp.color, {
          t: (0.3 + 0.5 * lamp.level) * open,
        })
      }
      if (state === BAY.shop && knot) {
        const name = named ? shopName(r) : mainName
        const color = named ? pick(r, lamps) : main
        named = true
        // The name on the fascia, a tube under it, and the blade sign that carries it down the street.
        // The board may spill over a calm bay next door, never over another shop's fascia, and
        // it stays clear of the face ends so two names never collide on a corner.
        const spill = (n: number) =>
          n >= 0 && n < bays && face.states[n] !== BAY.shop ? bayW * 0.35 : 0
        const lo = Math.max(0.7, u0 - spill(b - 1))
        const hi = Math.min(width - 0.7, u0 + bayW + spill(b + 1))
        const fit = hi - lo - 0.3
        const cx = (lo + hi) / 2
        fasciaSign(kit, cx, 4.0, proud, name, {
          letter: range(r, 0.45, 0.6),
          color,
          fit,
          tube: era === 1 && r() < 0.35,
        })
        kit.box(false, uc, 3.44, proud - 0.04, bayW - 0.7, 0.05, 0.05, color, {
          glow: GLOW.tube,
          t: 0.08,
        })
        shopLight(1)
        const bladeU = r() < 0.5 ? u0 + 0.05 : u0 + bayW - 0.05
        const top = Math.max(8, plan.podium - 1.5)
        const letter = Math.min(
          range(r, 0.55, 0.75),
          (top - 5.2) / (bladeWord(name).length * 1.28 + 0.3),
        )
        if (letter > 0.3)
          bladeSign(kit, Math.min(width - 0.1, Math.max(0.1, bladeU)), 4.9, 0, bladeWord(name), {
            letter,
            color,
            gap: era === 1 ? 1.15 : 0.45,
          })
        if (r() < 0.65)
          awning(kit, uc, range(r, 2.95, 3.2), 0.3, bayW - 0.8, {
            depth: range(r, 1.1, 1.5),
            color: pick(r, AWNINGS),
            stripes: r() < 0.6,
          })
        // A small tube notice in the window.
        kit.text(pick(r, NOTES), uc + range(r, -0.6, 0.6), 2.82, 0.04, 0.17, pick(r, lamps), {
          outline: false,
          glow: GLOW.tube,
          t: 0.02,
        })
        // A machine against the calm bay next door.
        const side =
          b + 1 < bays && face.states[b + 1] !== BAY.shop
            ? 1
            : b > 0 && face.states[b - 1] !== BAY.shop
              ? -1
              : 0
        if (side !== 0 && face.states[b + side] !== BAY.door && r() < 0.7) {
          vendingMachine(kit, uc + side * (bayW / 2 + 1.0), 0, 0.02, {
            seed: r(),
            color: pick(r, MACHINES),
            lamp: pick(r, ['#ffcf9a', '#b8e8c8', '#ffa64d']),
          })
        }
      } else if (state === BAY.shop) {
        if (r() < 0.6)
          fasciaSign(kit, uc, 4.0, proud, shopName(r), {
            letter: 0.38,
            color: pick(r, lamps),
            fit: bayW - 0.6,
          })
        let open = 1
        // Two draws in turn: a shutter part way down, or failing that an awning.
        const shutter = r() < 0.3
        if (shutter) {
          open = range(r, 0.4, 0.7)
          rollerShutter(kit, uc, 0.38, 0.0, bayW - 0.76, 2.92, { open })
        } else if (r() < 0.3) awning(kit, uc, 3.1, 0.3, bayW - 0.8, { color: pick(r, AWNINGS) })
        shopLight(open)
      } else if (state === BAY.shutter) {
        kit.box(true, uc, 3.42, 0.1, bayW - 0.7, 0.2, 0.18, '#4a4844')
        if (r() < 0.45)
          stencilCode(kit, uc + range(r, -0.5, 0.5), range(r, 1.6, 2.3), 0, sectorCode(r))
        if (r() < 0.3) vent(kit, u0 + 0.9, 2.7, 0, { width: 0.5, height: 0.36 })
      } else if (state === BAY.door) {
        // The service knot: a lamp over the door, its code, a riser and a meter.
        kit.box(false, uc, 2.86, 0.06, 0.6, 0.07, 0.1, '#ffa64d', { glow: GLOW.tube, t: 0.02 })
        kit.lightSplat(uc, street, 0.06, 2.4, 1.7, '#ffa64d', { t: 0.25 })
        stencilCode(kit, uc, 3.12, 0, sectorCode(r))
        const pipeU = uc - Math.min(1.5, bayW / 2 - 0.55)
        pipeRun(kit, pipeU, 0.15, 0, 3.3)
        pipeRun(kit, pipeU, plan.streetH, 0, Math.max(1, plan.podium - 1.0 - plan.streetH))
        if (era === 3)
          pipeRun(
            kit,
            pipeU + 0.2,
            plan.streetH + 0.2,
            0,
            Math.max(1, plan.podium - 3 - plan.streetH),
            { radius: 0.04, color: '#5a4234' },
          )
        const meterU = uc + Math.min(1.5, bayW / 2 - 0.6)
        kit.box(true, meterU, 1.45, 0.08, 0.45, 0.6, 0.16, '#6b6f70', { detail: 6 })
        kit.box(true, meterU, 0.75, 0.06, 0.34, 0.4, 0.12, '#4a4844', { detail: 6 })
        vent(kit, meterU, 2.5, 0, { width: 0.55, height: 0.4 })
      }
    }

    // Tenement: a drum lantern at the lot line.
    if (era === 1)
      drumLantern(kit, 0.32, 3.1, 0.3, { color: pick(r, ['#ffa64d', '#ffa64d', '#ff6418']) })
    // Concrete: the block's number, painted large on its podium.
    if (era === 0 && plan.pod && plan.pod.rows >= 2) {
      stencilCode(
        kit,
        Math.min(width - 2.5, 3.2),
        plan.pod.y1 - plan.pod.storey * 0.5,
        0,
        sectorCode(r).slice(0, 2),
        { letter: Math.min(2.2, plan.pod.storey * 0.6), color: '#8a8478' },
      )
    }

    // AC units under the windows above each knot, a few strays elsewhere.
    if (plan.pod) {
      const cell = WINDOW_CELLS[plan.podStyle]
      const cols = Math.max(1, Math.round(width / cell.w))
      const cw = width / cols
      const rows = Math.min(plan.pod.rows, 5)
      for (let row = 0; row < rows; row++) {
        for (let c = 0; c < cols; c++) {
          const u = (c + 0.5) * cw
          const overKnot = face.knots.some((k) => u > k * bayW - 0.2 && u < (k + 1) * bayW + 0.2)
          const chance = (overKnot ? 0.62 : 0.1) + (era === 3 ? 0.15 : 0) - row * 0.06
          const q = r()
          const q2 = r()
          if (q > chance) continue
          // On a balconied front the unit hangs off the balcony.
          const balcony = era === 1 && row >= 1 && u > 2.5 && u < width - 2.5
          const y =
            plan.pod.y0 +
            row * plan.pod.storey +
            (balcony ? 0.05 : Math.max(0.1, cell.pane[2] * plan.pod.storey - 0.68))
          acUnit(kit, u + (q2 - 0.5) * cw * 0.3, y, balcony ? 1.0 : 0, {
            seed: q2,
            cage: era === 3 && q2 < 0.6,
          })
        }
      }
    }

    // Cable crossings from the main face, one every 10 to 15 m. A tenement street hangs lanterns on some of them.
    if (o.cableSpan > 0 && face.index === plan.main) {
      const count = Math.max(1, Math.round(width / 12.5))
      for (let k = 0; k < count; k++) {
        const u = ((k + 0.25 + r() * 0.5) * width) / count
        const y = Math.min(range(r, 6.5, 11), Math.max(5.5, plan.podium - 2))
        const drop = range(r, -1.2, 1.2)
        const sag = o.cableSpan * range(r, 0.035, 0.07)
        cableSag(kit, u, y, 0, o.cableSpan, { sag, drop })
        const strands = era === 3 ? 2 : r() < 0.4 ? 1 : 0
        for (let s = 0; s < strands; s++)
          cableSag(kit, u + range(r, -0.5, 0.5), y + range(r, -0.6, 0.4), 0, o.cableSpan, {
            sag: sag * range(r, 0.7, 1.5),
            drop: drop + range(r, -0.5, 0.5),
            thickness: 0.03,
          })
        if (era === 1 && r() < 0.6) {
          const color = pick(r, lamps)
          for (const t of [0.3, 0.5, 0.7]) {
            const ly = y + cableY(t, sag, drop) - 0.34
            kit.box(false, u, ly, t * o.cableSpan, 0.34, 0.44, 0.34, color, {
              glow: GLOW.sign,
              t: 0.18,
            })
            kit.box(true, u, ly + 0.25, t * o.cableSpan, 0.4, 0.06, 0.4, '#141110')
          }
        }
      }
    }

    // One large sign per tower, on its main street face: letters tall enough to read from 100 m.
    if (face.index === plan.main) {
      const text = mainName
      const set = face.index % 2 === 0 ? plan.inset[1] : plan.inset[0]
      if (era === 1 || era === 3) {
        if (plan.hasShaft && set >= 2)
          roofSign(kit, width / 2, plan.podium, -0.5, text, {
            letter: range(r, 1.6, 2.1),
            color: main,
            fit: width - 1.5,
          })
        else if (plan.podium >= 12)
          roofSign(kit, width / 2, plan.podium, -0.4, bladeWord(text), {
            letter: 1.5,
            color: main,
            fit: width - 1.5,
          })
      } else if (era === 0 && plan.podium >= 14) {
        // Concrete: a tall blade on the corner, stencil cut.
        const word = bladeWord(text)
        const letter = Math.min(1.6, (plan.podium - 7.5) / (word.length * 1.28 + 0.3))
        if (letter >= 0.8)
          bladeSign(kit, width - 0.4, 6.2, 0, word, { letter, color: main, gap: 0.5 })
      }
    }
    kit.pop()
  }

  // Glass: the crown shows the time on all four sides, white over a line of blue.
  if (era === 2 && plan.hasShaft) {
    const sw = w - plan.inset[0] * 2
    const sdp = d - plan.inset[1] * 2
    const y = plan.h - 0.8 - plan.crownH / 2
    for (let f = 0; f < 4; f++) {
      const fw = f % 2 === 0 ? sw : sdp
      if (fw < 7) continue
      const [ox, oz] = onFace(f, 0, 0, sw, sdp, 0)
      kit.push(ox, 0, oz, (f * Math.PI) / 2)
      const letter = Math.min(plan.crownH * 0.52, fw / 5)
      kit.box(false, fw / 2, y, 0.04, letter * 4.4, letter * 1.7, 0.08, '#0c0d10')
      kit.text(o.clock, fw / 2, y + letter * 0.08, 0.1, letter, '#f4f6fb', {
        t: 0.6,
        body: true,
        tracking: 0.1,
      })
      kit.box(false, fw / 2, y - letter * 0.72, 0.1, letter * 3.9, 0.07, 0.05, '#3d5bff', {
        glow: GLOW.tube,
        t: 0.05,
      })
      kit.pop()
    }
  }
}

/** Where a street-face light sits, in the tower's local space: in front of its first knot. */
export function knotLight(plan: TowerPlan): [number, number, number] | null {
  const face = plan.faces[plan.main]
  if (!face) return null
  const knot = face.knots[0] ?? 0
  const [x, z] = onFace(face.index, 0, 0, plan.w, plan.d, (knot + 0.5) * face.bayW, 1.6)
  return [x, 3.3, z]
}
