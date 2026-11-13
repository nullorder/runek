// What lights a Tower at night, shared by its GLSL material and its TSL port: the lamp colors
// behind windows and shopfronts (warm LED, sodium, mercury, phosphor violet and green, gas
// neon), each at unit luminance, and the uniforms that put windows, shop
// glass, trim, the lowest floors and the light a sign leaves on the street on the world's
// luminance ladder.

import { Vector2 } from 'three'
import { DEFAULT_LADDER, emissiveColor, type Ladder, mid } from './glow'

/** Lit windows: cumulative share, lamp. Most rooms are warm LED, then sodium, a few mercury, violet and green. */
export const WINDOW_LAMPS: [number, string][] = [
  [0.6, '#ffcf9a'],
  [0.86, '#ffa64d'],
  [0.94, '#b8e8c8'],
  [0.975, '#b967ff'],
  [1, '#39ff88'],
]

/** Shopfront bays: cumulative share, lamp. Bays past the last share have their shutters down. */
export const SHOP_LAMPS: [number, string][] = [
  [0.3, '#ffcf9a'],
  [0.45, '#ffa64d'],
  [0.52, '#39ff88'],
  [0.58, '#b967ff'],
  [0.62, '#ff6418'],
]

// The facade shader's integer hash (`pcg` and `h21` in towerFacade.ts), bit for bit, so the kit
// can ask what the shader draws behind a bay's glass.
function pcg(v: number) {
  const state = (Math.imul(v, 747796405) + 2891336453) >>> 0
  const word = Math.imul(((state >>> ((state >>> 28) + 4)) ^ state) >>> 0, 277803737) >>> 0
  return ((word >>> 22) ^ word) >>> 0
}
function h21(x: number, y: number) {
  const qx = (Math.floor(x) + 65536) >>> 0
  const qy = (Math.floor(y) + 65536) >>> 0
  return pcg((Math.imul(qx, 1664525) + pcg(qy)) >>> 0) / 4294967295
}
// The shader works in 32-bit floats: round the same way before a `floor` decides a cell.
const f = Math.fround

/**
 * The lamp behind a lit shop bay's glass and where on the shop rung it sits (0 to 1), as the
 * facade shader draws it. `sd` is the tower's seed value, `fseed` the face's, `bay` the bay's
 * place along the face.
 */
export function shopLamp(sd: number, fseed: number, bay: number): { color: string; level: number } {
  const last = SHOP_LAMPS[SHOP_LAMPS.length - 1]
  const r = h21(bay, f(f(f(sd) * f(13.1)) + f(fseed))) * last[0]
  return {
    color: (SHOP_LAMPS.find(([share]) => r < share) ?? last)[1],
    level: h21(bay + 3, f(f(sd) + f(f(fseed) * 5))),
  }
}

/** Trim colors a tower may pick when its `trim` is unset: gas neon, phosphor green and violet, sodium, pump orange. */
export const TRIM_NEON = ['#ff6418', '#39ff88', '#b967ff', '#ffa64d', '#ff8a1f']

/** A lamp color at unit luminance, as a GLSL literal. */
export function glslLamp(hex: string) {
  const c = emissiveColor(hex, 1)
  return `vec3(${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)})`
}

/** GLSL for a cumulative lamp table: `vec3 name(float r)`, black past the last share. */
export function glslLampTable(name: string, table: [number, string][]) {
  const body = table
    .map(([share, hex]) => `if (r < ${share.toFixed(3)}) return ${glslLamp(hex)};`)
    .join('\n  ')
  return `vec3 ${name}(float r) {\n  ${body}\n  return vec3(0.0);\n}`
}

/** The ladder values a tower needs. The wall gain maps a wall color of luminance 0.04 to the bottom of the unlit-wall rung. */
function lightFrom(ladder: Ladder) {
  return {
    window: new Vector2(ladder.windowLit[0], ladder.windowLit[1]),
    shop: new Vector2(ladder.shopGlass[0], ladder.shopGlass[1]),
    trim: mid(ladder.signFace),
    sign: new Vector2(ladder.signFace[0], ladder.signFace[1]),
    tube: new Vector2(ladder.tubeCore[0], ladder.tubeCore[1]),
    street: new Vector2(ladder.streetUnderSign[0], ladder.streetUnderSign[1]),
    wallGain: ladder.unlitWall[0] / 0.04,
    glow: emissiveColor('#ffa64d', ladder.streetUnderSign[0] * 0.3),
  }
}

/**
 * The light every tower and kit part is drawn under, one set for the page. The GLSL uniforms
 * below hold its vectors by reference, and the node twins (`nodes/city.ts`) read it each render,
 * so one write relights every tower under either renderer.
 */
export const towerLight = { ...lightFrom(DEFAULT_LADDER), night: 1 }

/** Uniforms every tower ShaderMaterial shares by reference. */
export const towerUniforms = {
  uWindow: { value: towerLight.window },
  uShop: { value: towerLight.shop },
  uTrim: { value: towerLight.trim },
  uSign: { value: towerLight.sign },
  uTube: { value: towerLight.tube },
  uStreet: { value: towerLight.street },
  uWallGain: { value: towerLight.wallGain },
  uGlow: { value: towerLight.glow },
}

/** Put every tower on `ladder`. Cheap: it writes a handful of shared values. */
export function applyTowerLight(ladder: Ladder) {
  const l = lightFrom(ladder)
  towerLight.window.copy(l.window)
  towerLight.shop.copy(l.shop)
  towerLight.sign.copy(l.sign)
  towerLight.tube.copy(l.tube)
  towerLight.street.copy(l.street)
  towerLight.glow.copy(l.glow)
  towerLight.trim = towerUniforms.uTrim.value = l.trim
  towerLight.wallGain = towerUniforms.uWallGain.value = l.wallGain
}

/** 0 at midday, 1 from late evening to early morning. */
export function nightFactor(hours: number) {
  const fromNoon = Math.abs((((hours % 24) + 24) % 24) - 12) / 12 // 0 noon, 1 midnight
  return Math.min(1, Math.max(0, (fromNoon - 0.35) / 0.3))
}
