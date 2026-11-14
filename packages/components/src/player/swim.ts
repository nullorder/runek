// What water does to the avatar: when it wades, swims and dives, and the buoyancy and drag that
// carry it. Plain numbers in and out, so it is tested without a physics world; `Player` feeds it
// the capsule before every physics step.
import type { PlayerSwim } from '@runek/core'

/** Swim when the still water is over this much of the body, feet to crown. */
export const SWIM_AT = 0.5
/** Stand again when the water is shallower than this much of the body. Under `SWIM_AT`, so a
 *  body on a sloping beach doesn't flicker between the two. */
export const STAND_AT = 0.45
/** Water starts to slow a walk at this much of the body (about the knee). */
const WADE_FROM = 0.15
/** How much of the capsule stays out of the water afloat, as a part of the body's height. It
 *  puts the first-person eye just over the surface. */
const FLOAT_TOP = 0.2
// A dive: the feet this far over the surface (meters), water at least this many body heights
// deep, and the body moving forward at least this fast (meters per second). Slower, it drops in
// feet first.
const DIVE_CLEARANCE = 0.3
const DIVE_DEPTH = 1
const DIVE_SPEED = 1
/** A glide ends when the body has risen to this close under its floating height (meters). */
const SURFACED = 0.15
// Buoyancy as a spring to the floating height (1/s² and 1/s), a little under critical damping,
// so a body bobs once as it comes up. It pulls as if the body were no deeper than `PULL`
// (meters), so a deep plunge comes up at a swim, not a shot.
const BUOYANCY = 40
const DAMPING = 10
const PULL = 0.6
/** How far over its floating height the water still holds a body (meters). */
const BAND = 0.05
// Over a bed the water raises a body toward standing height at this rate (1/s), no faster than
// `CLIMB` (meters per second).
const RISE = 8
const CLIMB = 2.5
/** The highest ledge over the surface a swimmer is lifted onto (meters): a pool's rim, a low
 *  dock, a step. */
export const CLIMB_REACH = 0.6
// Water drag on the speed over the ground (1/s): while a direction is held, and the stronger one
// that ends a glide when none is.
const DRAG = 0.5
const DRAG_IDLE = 2.5
/** How fast the speed a dive carries in is shed (1/s). */
const SHED = 2.5

/** The avatar's capsule, as swimming needs it. Lengths in world units. */
export interface SwimShape {
  /** The feet below the capsule's centre: half the capsule and the height it floats off the
   *  ground. */
  feet: number
  /** The capsule's top above its centre. */
  top: number
  radius: number
  /** Feet to crown. */
  height: number
  unit: number
  /** Top speeds on land and in the water, walking and with the `run` key, in world units a
   *  second. */
  walk: number
  sprint: number
  swim: number
  swimSprint: number
}

/** The capsule this step. `stepSwim` changes its velocity in place. */
export interface SwimBody {
  /** Height of the capsule's centre. */
  y: number
  vx: number
  vy: number
  vz: number
}

/** What the capsule finds around it this step. */
export interface SwimSense {
  dt: number
  /** The still water over the body, or null where there is none. */
  level: number | null
  /** The swell on it now. */
  swell: number
  /** The ground under the body, `-Infinity` when none is in reach. */
  bed: number
  /** The ground just ahead of the body the way it is pushed, no higher than `CLIMB_REACH` over
   *  the surface; `-Infinity` when none, or nothing is pushed. */
  ahead: number
  /** Standing on something (the controller's ground test). */
  grounded: boolean
  /** A direction is held. */
  pushing: boolean
  /** The `run` key is held. */
  sprinting: boolean
}

export interface SwimState {
  phase: PlayerSwim | null
  /** How much of the body is under the still water, 0 to 1. */
  immersion: number
  /** How far the body is under the height it rests at here (afloat, or standing on a bed that
   *  is higher), in world units. Negative over it: dropping in, climbing out. */
  submerged: number
  /** The height the water was taking the body to last step, to tell how fast it moves. */
  line: number | null
  /** Being lifted out onto a ledge ahead. */
  climbing: boolean
}

export const createSwimState = (): SwimState => ({
  phase: null,
  immersion: 0,
  submerged: 0,
  line: null,
  climbing: false,
})

const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1)
const smooth = (v: number) => v * v * (3 - 2 * v)

/** The height the capsule's centre floats at on water whose surface is at `surface`. */
export const floatLine = (shape: SwimShape, surface: number) =>
  surface + FLOAT_TOP * shape.height - shape.top

/** Which phase follows `state.phase`, given what the body finds this step and how far it is
 *  under the height it rests at. */
function nextPhase(
  state: SwimState,
  shape: SwimShape,
  body: SwimBody,
  sense: SwimSense,
  below: number,
): PlayerSwim | null {
  const { level, grounded } = sense
  if (level === null) return null
  const { height, unit } = shape
  const depth = level - sense.bed
  const clearance = body.y - shape.feet - level
  switch (state.phase) {
    case 'dive':
      if (grounded || depth < DIVE_DEPTH * height) return null
      return state.immersion > SWIM_AT ? 'glide' : 'dive'
    case 'glide':
      if (grounded && depth < STAND_AT * height) return null
      // Over once the body has gone under, turned, and come back up to where it floats.
      return body.vy >= 0 && below < SURFACED * unit ? 'swim' : 'glide'
    case 'swim':
      return depth < STAND_AT * height || state.immersion <= 0 ? null : 'swim'
    default:
      // A body on its feet is judged by the water's depth, as it will be to stand again, so the
      // little its capsule settles can't flip it back and forth.
      if (state.immersion > SWIM_AT && (!grounded || depth > SWIM_AT * height)) return 'swim'
      return !grounded &&
        !state.climbing &&
        clearance >= DIVE_CLEARANCE * unit &&
        depth >= DIVE_DEPTH * height &&
        Math.hypot(body.vx, body.vz) >= DIVE_SPEED * unit
        ? 'dive'
        : null
  }
}

/**
 * One step of the avatar in water. Updates `state` (the phase, how much of the body is under,
 * how far it is below where it rests) and `body`'s velocity, and returns true when the water is
 * carrying the body this step, so gravity should be left out of it.
 *
 * From the knee up the water takes the body's weight. Afloat, a damped spring holds the capsule
 * at its floating height and follows the swell. Where the bed comes up under it, or a ledge stands
 * ahead of the way it is pushed, the water raises it to standing height over that instead, so a
 * swimmer gets up a bank too steep for the controller's ground spring, up steps, and out onto a
 * pool's rim or a low dock. Wading, the speed over the ground is held to a cap that eases from
 * the land speeds at the knee to the swimming speeds at the waist. Swimming, drag ends a glide
 * and the same cap holds the speed; what a dive carries in over it is shed gradually.
 */
export function stepSwim(state: SwimState, shape: SwimShape, body: SwimBody, sense: SwimSense) {
  const { dt, level } = sense
  const { height, unit } = shape
  if (level === null) {
    state.phase = null
    state.immersion = 0
    state.submerged = 0
    state.line = null
    state.climbing = false
    return false
  }
  // Where the body rests here: afloat, or standing on a bed that is higher.
  const afloatAt = floatLine(shape, level + sense.swell)
  const rest = Math.max(afloatAt, sense.bed + shape.feet)
  state.immersion = clamp01((level - (body.y - shape.feet)) / height)
  state.phase = nextPhase(state, shape, body, sense, rest - body.y)
  const afloat = state.phase === 'swim' || state.phase === 'glide'
  state.submerged = afloat ? rest - body.y : 0

  // Where the water is taking it: there, or up onto what stands ahead of a body that swims or
  // wades into it. Once begun, a climb goes on out of the water until the ledge is underfoot.
  const ledge = sense.ahead + shape.feet
  const wet = state.phase === 'swim' || (state.phase === null && state.immersion > WADE_FROM)
  state.climbing = ledge > rest && (state.climbing || wet)
  const line = state.climbing ? ledge : rest
  const below = line - body.y
  let carried = false
  if ((afloat || state.climbing || state.immersion > WADE_FROM) && below > -BAND * unit) {
    // How fast that height is itself moving (a swell, a bank coming up under a swimmer), fed
    // forward so the body keeps up with it.
    const rate = state.line === null || dt <= 0 ? 0 : (line - state.line) / dt
    const moving = Math.min(Math.max(rate, -2 * unit), 2 * unit)
    if (line > afloatAt) {
      const rise = Math.min(RISE * below + Math.max(moving, 0), CLIMB * unit)
      // A climb is taken up at just that speed, so it arrives without overshooting. Over a bed
      // the water only lifts: holding a body down to it would keep it off a step.
      body.vy = state.climbing ? Math.max(rise, 0) : Math.max(body.vy, rise)
    } else {
      const pull = Math.min(below, PULL * unit)
      body.vy += (BUOYANCY * pull - DAMPING * (body.vy - moving)) * dt
    }
    carried = true
  }
  state.line = line

  // Water drags at a body on its feet, not at one falling through the surface.
  const wading = sense.grounded
    ? smooth(clamp01((state.immersion - WADE_FROM) / (SWIM_AT - WADE_FROM)))
    : 0
  if (!afloat && wading <= 0) return carried

  if (afloat && !sense.grounded) {
    const drag = Math.exp(-(sense.pushing ? DRAG : DRAG_IDLE) * dt)
    body.vx *= drag
    body.vz *= drag
  }
  const land = sense.sprinting ? shape.sprint : shape.walk
  const water = sense.sprinting ? shape.swimSprint : shape.swim
  const most = afloat ? water : land + (Math.min(water, land) - land) * wading
  const speed = Math.hypot(body.vx, body.vz)
  if (speed > most) {
    const kept = state.phase === 'glide' ? most + (speed - most) * Math.exp(-SHED * dt) : most
    body.vx *= kept / speed
    body.vz *= kept / speed
  }
  return carried
}
