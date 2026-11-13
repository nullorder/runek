// The facade kit's parts. Each function adds one prop to a KitBuilder in a wall frame: +X runs
// along the wall to the viewer's right, +Y is up, +Z points out of the wall. (x, y, z) is where
// the prop meets the wall. Tower calls these for its street faces, and each also backs a
// standalone component of the same name.

import { DETAIL, GLOW, KitBuilder } from './kit'

const CASES = ['#8a8a84', '#75736c', '#9a9488', '#6b6f70']
const DARK = '#141110'
const STEEL = '#4a4844'
const RUST = '#5a4234'

/** An outdoor AC unit on its bracket. `cage` wraps it in a wire cage. */
export function acUnit(
  kit: KitBuilder,
  x: number,
  y: number,
  z: number,
  { seed = 0, cage = false } = {},
) {
  const tone = CASES[Math.floor(Math.abs(seed) * 97) % CASES.length]
  if (cage) {
    kit.box(true, x, y + 0.36, z + 0.24, 0.98, 0.72, 0.48, RUST, { detail: DETAIL.cage, seed })
  } else {
    kit.box(true, x, y + 0.33, z + 0.19, 0.82, 0.58, 0.34, tone, { detail: DETAIL.fan, seed })
  }
  kit.box(true, x, y + 0.02, z + 0.2, 0.9, 0.04, 0.4, DARK)
  // The drain hose.
  kit.box(true, x + 0.34, y - 0.4, z + 0.03, 0.03, 0.8, 0.03, DARK)
}

/** A pipe run with collars: up the wall from (x, y, z), or along it when `horizontal`. */
export function pipeRun(
  kit: KitBuilder,
  x: number,
  y: number,
  z: number,
  length: number,
  { horizontal = false, radius = 0.06, color = STEEL } = {},
) {
  const t = radius * 2
  if (horizontal) kit.box(true, x + length / 2, y, z + radius + 0.03, length, t, t, color)
  else kit.box(true, x, y + length / 2, z + radius + 0.03, t, length, t, color)
  const collars = Math.max(2, Math.round(length / 2.4))
  for (let i = 0; i < collars; i++) {
    const at = ((i + 0.5) * length) / collars
    if (horizontal) kit.box(true, x + at, y, z + radius + 0.02, 0.07, t + 0.06, t + 0.05, DARK)
    else kit.box(true, x, y + at, z + radius + 0.02, t + 0.06, 0.07, t + 0.05, DARK)
  }
}

/** Height of a cable `t` of the way across (0 to 1): a parabola that drops `sag` at mid span and ends `drop` higher. */
export const cableY = (t: number, sag: number, drop = 0) => drop * t - 4 * sag * t * (1 - t)

/** A cable sagging from the wall at (x, y, z) across `span` metres of street. */
export function cableSag(
  kit: KitBuilder,
  x: number,
  y: number,
  z: number,
  span: number,
  { sag = 1.2, drop = 0, segments = 8, color = DARK, thickness = 0.04 } = {},
) {
  for (let i = 0; i < segments; i++) {
    const t0 = i / segments
    const t1 = (i + 1) / segments
    const y0 = cableY(t0, sag, drop)
    const y1 = cableY(t1, sag, drop)
    const len = span / segments
    kit.box(
      true,
      x,
      y + (y0 + y1) / 2,
      z + (t0 + t1) * 0.5 * span,
      thickness,
      thickness,
      len,
      color,
      { rise: (y1 - y0) / len },
    )
  }
}

/** A louvred vent under a small hood. */
export function vent(
  kit: KitBuilder,
  x: number,
  y: number,
  z: number,
  { width = 0.6, height = 0.45 } = {},
) {
  kit.box(true, x, y + height / 2, z + 0.04, width, height, 0.08, STEEL, { detail: DETAIL.slats })
  kit.box(true, x, y + height + 0.03, z + 0.08, width + 0.08, 0.05, 0.16, DARK)
}

/** A sloped fabric awning hung at (x, y, z), `width` along the wall, with a valance. */
export function awning(
  kit: KitBuilder,
  x: number,
  y: number,
  z: number,
  width: number,
  { depth = 1.3, drop = 0.45, color = '#5a2a1c', stripes = true } = {},
) {
  const detail = stripes ? DETAIL.stripes : DETAIL.none
  kit.box(false, x, y - drop / 2, z + depth / 2, width, 0.05, depth, color, {
    detail,
    rise: -drop / depth,
  })
  kit.box(false, x, y - drop - 0.1, z + depth, width, 0.22, 0.03, color, { detail })
  // The two arms that carry it.
  for (const side of [-1, 1])
    kit.box(
      true,
      x + side * (width / 2 - 0.05),
      y - drop / 2 - 0.05,
      z + depth / 2,
      0.04,
      0.04,
      depth,
      DARK,
      { rise: -drop / depth },
    )
}

/** A roller shutter in its housing. `open` is the share rolled up, 0 (down) to 1. */
export function rollerShutter(
  kit: KitBuilder,
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
  { open = 0, color = '#6e6a62' } = {},
) {
  const down = height * (1 - Math.min(1, Math.max(0, open)))
  if (down > 0.05)
    kit.box(false, x, y + height - down / 2, z + 0.05, width, down, 0.05, color, {
      detail: DETAIL.slats,
    })
  kit.box(false, x, y + height + 0.1, z + 0.11, width + 0.12, 0.26, 0.22, STEEL)
  for (const side of [-1, 1])
    kit.box(
      true,
      x + side * (width / 2 + 0.03),
      y + height / 2,
      z + 0.05,
      0.06,
      height,
      0.09,
      STEEL,
    )
}

/** The word a blade sign stacks: the longest word of a shop's name that has seven letters or fewer. */
export function bladeWord(name: string) {
  const words = name.toUpperCase().split(' ')
  let best = ''
  for (const w of words) if (w.length <= 7 && w.length > best.length) best = w
  return best || words[0].slice(0, 9)
}

/** A blade sign: a board standing out from the wall, its letters stacked and lit on both faces. (x, y, z) is the bottom of the board at the wall. */
export function bladeSign(
  kit: KitBuilder,
  x: number,
  y: number,
  z: number,
  text: string,
  { letter = 0.55, color = '#ff6418', gap = 0.3, tube = true } = {},
) {
  const word = text.toUpperCase().replace(/ /g, '')
  const step = letter * 1.28
  const height = word.length * step + 0.3
  const depth = letter * 1.15 + 0.3
  const mid = z + gap + depth / 2
  kit.box(false, x, y + height / 2, mid, 0.14, height, depth, DARK)
  const top = y + height - 0.15 - step / 2
  for (const side of [-1, 1]) {
    kit.text(word, x + side * 0.085, top, mid, letter, color, {
      vertical: true,
      rotY: (side * Math.PI) / 2,
      t: 0.45,
    })
  }
  if (tube) {
    for (const edge of [-1, 1])
      kit.box(
        false,
        x,
        y + height / 2,
        mid + edge * (depth / 2 + 0.02),
        0.05,
        height,
        0.05,
        color,
        { glow: GLOW.tube, t: 0.1 },
      )
  }
  // Two arms back to the wall.
  for (const at of [0.25, height - 0.25])
    kit.box(true, x, y + at, z + gap / 2, 0.05, 0.05, gap, STEEL)
}

/** A vending machine standing against the wall: a matte case and a lit window of goods. The case is solid. */
export function vendingMachine(
  kit: KitBuilder,
  x: number,
  y: number,
  z: number,
  { seed = 0, color = '#3a2f45', lamp = '#ffcf9a' } = {},
) {
  kit.box(true, x, y + 0.93, z + 0.36, 1.0, 1.86, 0.72, color)
  kit.solid(x, y + 0.93, z + 0.36, 1.0, 1.86, 0.72)
  kit.box(false, x - 0.06, y + 1.2, z + 0.73, 0.76, 1.02, 0.03, lamp, {
    glow: GLOW.glass,
    t: 0.35,
    detail: DETAIL.vending,
    seed,
  })
  kit.box(true, x - 0.06, y + 0.38, z + 0.73, 0.6, 0.2, 0.03, DARK)
  kit.box(true, x + 0.4, y + 1.2, z + 0.73, 0.1, 0.7, 0.03, DARK)
}

/** A shop's name over its bay: lit letters on a dark board, or bare tube letters. `fit` is the most width it may take. */
export function fasciaSign(
  kit: KitBuilder,
  x: number,
  y: number,
  z: number,
  text: string,
  { letter = 0.5, color = '#ffa64d', fit = 0, tube = false, board = true } = {},
) {
  let h = letter
  const wide = KitBuilder.textWidth(text, h)
  if (fit > 0 && wide + 0.4 > fit) h *= fit / (wide + 0.4)
  const width = KitBuilder.textWidth(text, h)
  if (board)
    kit.box(false, x, y, z + 0.04, width + h * 0.9, h * 1.75, 0.08, DARK, { detail: DETAIL.panel })
  kit.text(text, x, y, z + 0.1, h, color, {
    outline: tube,
    glow: tube ? GLOW.tube : GLOW.sign,
    t: tube ? 0.12 : 0.5,
  })
  return width + h * 0.9
}

/** A drum lantern on a wall arm: the corner light of a tenement street. */
export function drumLantern(
  kit: KitBuilder,
  x: number,
  y: number,
  z: number,
  { color = '#ffa64d', reach = 0.7 } = {},
) {
  const at = z + reach
  for (const turn of [0, Math.PI / 4]) {
    kit.box(false, x, y, at, 0.5, 0.78, 0.5, color, { glow: GLOW.sign, t: 0.25, rotY: turn })
    kit.box(true, x, y + 0.43, at, 0.58, 0.08, 0.58, DARK, { rotY: turn })
    kit.box(true, x, y - 0.43, at, 0.58, 0.08, 0.58, DARK, { rotY: turn })
  }
  kit.box(true, x, y + 0.55, z + reach / 2, 0.05, 0.05, reach, STEEL)
}

/** Big letters on an open frame, standing on a roof edge. (x, y, z) is the middle of the frame's foot. Returns its width. */
export function roofSign(
  kit: KitBuilder,
  x: number,
  y: number,
  z: number,
  text: string,
  { letter = 1.8, color = '#ff6418', fit = 0 } = {},
) {
  let h = letter
  const wide = KitBuilder.textWidth(text, h, 0.1)
  if (fit > 0 && wide > fit) h *= fit / wide
  const width = KitBuilder.textWidth(text, h, 0.1)
  const base = y + 0.9
  kit.text(text, x, base + h / 2, z + 0.08, h, color, { t: 0.75, tracking: 0.1 })
  for (const rail of [0.12, 0.88])
    kit.box(false, x, base + h * rail, z, width + 0.6, 0.07, 0.07, STEEL)
  const posts = Math.max(2, Math.round(width / 3))
  for (let i = 0; i < posts; i++) {
    const px = x - width / 2 + (width * i) / (posts - 1)
    kit.box(true, px, y + (0.9 + h) / 2, z - 0.06, 0.1, 0.9 + h, 0.1, STEEL)
    kit.box(true, px, y + 0.5, z - 0.5, 0.07, 0.07, 0.95, STEEL, { rise: -0.9 })
  }
  return width
}

/** A stencilled code painted on the wall in the body font. */
export function stencilCode(
  kit: KitBuilder,
  x: number,
  y: number,
  z: number,
  text: string,
  { letter = 0.3, color = '#a8a092' } = {},
) {
  kit.text(text, x, y, z + 0.012, letter, color, { glow: GLOW.matte, body: true, tracking: 0.12 })
}
