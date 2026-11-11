/**
 * How bright each kind of glowing surface is, in scene-linear units relative to diffuse white:
 * `1` draws a color at face value, `4` four times brighter (past what a screen shows, into
 * bloom). One level per kind of light source, so a world sets its exposure in one place and a
 * desk monitor never outshines a street lamp. Every level defaults to `1`.
 */
export interface WorldLuminance {
  /** Displays: `Screen`, `Monitor`, `Tv` and arcade screens. */
  screen: number
  /** Lit lettering: a `Sign` with `lit`. */
  sign: number
  /** Neon tubes: `NeonStrip`, an arcade marquee. */
  tube: number
  /** Bulbs and the shades and glass they light (`Lamp`, `CeilingLight`, `Chandelier`, …). */
  lamp: number
  /** Fire: `Campfire`, `TikiTorch`. */
  flame: number
}

export type LuminanceLevel = keyof WorldLuminance

/** Every level at face value. A world's `luminance` layers on top. */
export const DEFAULT_LUMINANCE: WorldLuminance = {
  screen: 1,
  sign: 1,
  tube: 1,
  lamp: 1,
  flame: 1,
}
