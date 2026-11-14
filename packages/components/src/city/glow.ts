// How bright each kind of city emitter is, as a ladder of rungs, each the lowest and highest
// luminance that kind may have, so a sign face is a sign face whatever its hue and a lamp lens
// always outshines it. The rungs are face values scaled by the world's luminance levels
// (`useLuminance()`): sign faces by `sign`, tube cores by `tube`, lamp lenses by `lamp`, and lit
// glass (windows, shopfronts, ad boards, and the light they leave on the pavement) by `screen`.
// At every level's default of 1 the brightest rungs sit around 1, so they read without bloom; a
// world with bloom raises `sign`, `tube` and `lamp` to make them bloom.
//
// Emissive colors are normalized to unit luminance and then scaled onto a rung, so the hue of a
// color never changes how bright it reads.

import {
  DEFAULT_LUMINANCE,
  glowLook,
  type MaterialLook,
  materialKey,
  retainMaterial,
  sharedMaterial,
  useLuminance,
  type WorldLuminance,
} from '@runek/core'
import { useMemo } from 'react'
import { Color, type Material } from 'three'

/** A rung of the ladder: the lowest and highest luminance that kind of emitter may have. */
export type Rung = readonly [number, number]

export interface Ladder {
  /** A night sky dome lit from below by a city. Face value. */
  skyDome: Rung
  /** A wall with no lamp on it. Face value. */
  unlitWall: Rung
  /** Pavement lit by the glass and signs above it. */
  streetUnderSign: Rung
  /** A lit room seen through its window from the street. */
  windowLit: Rung
  /** Lit shopfront glass, and the white of an ad board. */
  shopGlass: Rung
  /** Sign faces and lit letters. */
  signFace: Rung
  /** The core of a neon tube. */
  tubeCore: Rung
  /** A street lamp's lens seen from below. */
  lampLens: Rung
}

const scale = (r: Rung, k: number): Rung => [r[0] * k, r[1] * k]

/** The rungs at every luminance level's face value (1). */
export const FACE_LADDER: Ladder = {
  skyDome: [0.018, 0.055],
  unlitWall: [0.02, 0.05],
  streetUnderSign: [0.1, 0.5],
  windowLit: [0.15, 0.6],
  shopGlass: [0.4, 1.2],
  signFace: [0.6, 1.6],
  tubeCore: [0.6, 1.7],
  lampLens: [0.67, 1.5],
}

/** The ladder for a world's luminance levels. */
export function ladderFor(l: WorldLuminance): Ladder {
  const f = FACE_LADDER
  return {
    skyDome: f.skyDome,
    unlitWall: f.unlitWall,
    streetUnderSign: scale(f.streetUnderSign, l.screen),
    windowLit: scale(f.windowLit, l.screen),
    shopGlass: scale(f.shopGlass, l.screen),
    signFace: scale(f.signFace, l.sign),
    tubeCore: scale(f.tubeCore, l.tube),
    lampLens: scale(f.lampLens, l.lamp),
  }
}

/** The ladder at the default levels. */
export const DEFAULT_LADDER: Ladder = ladderFor(DEFAULT_LUMINANCE)

/** The world's ladder, from its luminance levels. */
export function useLadder(): Ladder {
  const { screen, sign, tube, lamp, flame } = useLuminance()
  return useMemo(
    () => ladderFor({ screen, sign, tube, lamp, flame }),
    [screen, sign, tube, lamp, flame],
  )
}

/** The typical value of a rung: the geometric middle, since luminance is perceived on a log scale. */
export function mid(rung: Rung): number {
  return Math.sqrt(rung[0] * rung[1])
}

/** A point along a rung, 0 at its bottom and 1 at its top, spaced evenly on a log scale. */
export function along(rung: Rung, t: number): number {
  return rung[0] * (rung[1] / rung[0]) ** t
}

/** Relative luminance (Rec. 709) of a linear color. */
export function luminanceOf(c: Color): number {
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b
}

/** `hex` at unit luminance times `luminance`, as a linear (HDR) color. */
export function emissiveColor(hex: string, luminance: number): Color {
  const c = new Color(hex)
  return c.multiplyScalar(luminance / Math.max(1e-4, luminanceOf(c)))
}

/** A shared look's material, kept for the life of the page: city emitters come back often. */
function kept(look: MaterialLook): Material {
  const key = materialKey(look)
  const material = sharedMaterial(look, key)
  if (!material.userData.kept) {
    material.userData.kept = true
    retainMaterial(key)
  }
  return material
}

/**
 * The shared unlit material for an emitter of color `hex` at `luminance`, through core's
 * `glowLook`, so it batches with every other part of that look. Read-only.
 */
export function glowMaterial(hex: string, luminance: number, opacity = 1): Material {
  return kept(
    glowLook(
      emissiveColor(hex, 1),
      luminance,
      opacity < 1 ? { transparent: true, opacity, depthWrite: false } : undefined,
    ),
  )
}

/**
 * The shared unlit material for picture content on a lit board: `hex` keeps its own value and
 * is scaled so that white would shine at `white`. Dark backgrounds stay dark, bright text and
 * shapes glow.
 */
export function screenMaterial(hex: string, white: number): Material {
  return kept(glowLook(hex, white))
}
