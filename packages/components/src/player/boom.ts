// Where the third-person camera rides while its avatar swims.
import type { Vector3 } from 'three'

/** The least the camera stands over an avatar afloat at the surface: the angle of its line from
 *  the avatar above the level, in radians. Level behind a swimmer it would skim the water, a
 *  hand's width over it, and go under with every swell. */
export const SWIM_TILT = 0.36

/**
 * Raise `dir`, the unit direction from the avatar to its camera, toward standing at least `tilt`
 * radians over the level: all the way at a `weight` of 1, not at all at 0. It keeps the way it
 * points across the ground. A line already steeper is left alone, as is one straight up or down.
 * Changes `dir` in place and returns it.
 */
export function raiseBoom(dir: Vector3, tilt: number, weight: number): Vector3 {
  const flat = Math.hypot(dir.x, dir.z)
  if (weight <= 0 || flat < 1e-4) return dir
  const now = Math.atan2(dir.y, flat)
  if (now >= tilt) return dir
  const to = now + (tilt - now) * Math.min(weight, 1)
  const k = Math.cos(to) / flat
  return dir.set(dir.x * k, Math.sin(to), dir.z * k)
}
