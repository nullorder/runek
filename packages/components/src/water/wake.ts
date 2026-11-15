// The marks a body leaves on water: rings that spread from where it is and where it was (a line
// of them behind a swimmer opens into a wake), and the splash of going in. Plain numbers, kept in
// two fixed pools, so it is tested without a scene; `water/trail.tsx` draws them.
import { rng } from '@runek/core'

// Lengths in meters, times in seconds.
/** How long a ring lasts. */
const RING_LIFE = 2.4
/** A ring's radius as it is left, and how fast it spreads: a trail's, then a splash's. */
const RING_START = 0.18
const SPREAD = 0.5
const SPLASH_SPREAD = 1.1
/** A swimmer leaves a ring every this far, */
const SPACING = 0.5
/** and a body that stays where it is, one every this long. */
const IDLE = 1.1
// Going into the water slower than the first is a ripple; from the second up it is the biggest
// splash there is (about a fall of two meters).
const GENTLE = 1
const HARD = 6
const DROP_LIFE = 1.2
const GRAVITY = 9.81

/** One ring on the water. */
export interface Ring {
  /** Where its middle is, in world coordinates. */
  x: number
  z: number
  /** When it was left, on the wake's clock; `Infinity` for one never used. */
  born: number
  /** How bright it starts, 0 to 1. */
  strength: number
  /** How fast it spreads, in meters a second. */
  spread: number
}

/** One drop thrown up by a splash. */
export interface Drop {
  x: number
  /** The water's surface where it was thrown up from. */
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  born: number
  /** Across, in meters. */
  size: number
}

/** A body as its wake needs it this step. */
export interface WakeBody {
  /** In the water and breaking its surface: wading, afloat, climbing out. Not while it is
   *  wholly under. */
  wet: boolean
  /** Where it is, in world coordinates; `y` is the water's surface there. */
  x: number
  y: number
  z: number
  /** How fast it is falling, in world units a second: what a splash is sized by as it goes in. */
  fall: number
}

export interface Wake {
  rings: Ring[]
  drops: Drop[]
  /** Seconds this wake has run. */
  time: number
  /** The slot the next ring, and the next drop, goes in. */
  ring: number
  drop: number
  /** In the water last step, and where it left its last ring, how long ago. */
  wet: boolean
  x: number
  z: number
  since: number
  random: () => number
}

/** An empty wake. `seed` sets how each splash scatters; the pools hold as many rings and drops
 *  as can show at once, and the oldest are written over. */
export function createWake(seed: number, rings = 24, drops = 18): Wake {
  return {
    rings: Array.from({ length: rings }, () => ({
      x: 0,
      z: 0,
      born: Number.POSITIVE_INFINITY,
      strength: 0,
      spread: SPREAD,
    })),
    drops: Array.from({ length: drops }, () => ({
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      born: Number.POSITIVE_INFINITY,
      size: 0,
    })),
    time: 0,
    ring: 0,
    drop: 0,
    wet: false,
    x: 0,
    z: 0,
    since: 0,
    random: rng(seed),
  }
}

const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1)
const smooth = (v: number) => {
  const c = clamp01(v)
  return c * c * (3 - 2 * c)
}

function ring(wake: Wake, body: WakeBody, strength: number, spread = SPREAD, delay = 0) {
  const next = wake.rings[wake.ring]
  wake.ring = (wake.ring + 1) % wake.rings.length
  next.x = body.x
  next.z = body.z
  next.born = wake.time + delay
  next.strength = strength
  next.spread = spread
  wake.x = body.x
  wake.z = body.z
  wake.since = 0
}

/** Going in: a ripple at a walk, and from a fall rings that spread fast and drops thrown up and
 *  out, more of both the harder it lands. */
function splash(wake: Wake, body: WakeBody, unit: number) {
  const hit = clamp01((body.fall / unit - GENTLE) / (HARD - GENTLE))
  if (hit <= 0) return ring(wake, body, 0.5)
  ring(wake, body, 0.6 + 0.4 * hit, SPLASH_SPREAD)
  ring(wake, body, 0.45 + 0.3 * hit, SPLASH_SPREAD, 0.14)
  ring(wake, body, 0.3 + 0.2 * hit, SPREAD, 0.3)
  const { drops, random } = wake
  const count = Math.round(4 + (drops.length - 4) * hit)
  for (let i = 0; i < count; i++) {
    const drop = drops[wake.drop]
    wake.drop = (wake.drop + 1) % drops.length
    const turn = random() * Math.PI * 2
    const out = (0.4 + 1.4 * random()) * (0.5 + 0.5 * hit) * unit
    drop.x = body.x + Math.cos(turn) * 0.15 * unit
    drop.y = body.y
    drop.z = body.z + Math.sin(turn) * 0.15 * unit
    drop.vx = Math.cos(turn) * out
    drop.vy = (1.6 + 2.6 * random()) * (0.6 + 0.4 * hit) * unit
    drop.vz = Math.sin(turn) * out
    drop.born = wake.time + 0.06 * random()
    drop.size = (0.035 + 0.05 * random()) * unit
  }
}

/**
 * One step of a wake, `dt` seconds on: leaves the rings and drops `body` makes this step. Going
 * into the water is a splash sized by how fast it falls; moving through it leaves a ring every
 * half meter, brighter the faster it goes; staying put, a faint one now and then; coming out of
 * it, or back up to the surface, one more.
 */
export function stepWake(wake: Wake, body: WakeBody, dt: number, unit = 1) {
  wake.time += dt
  const was = wake.wet
  wake.wet = body.wet
  if (!body.wet) {
    if (was) ring(wake, { ...body, x: wake.x, z: wake.z }, 0.4)
    return
  }
  if (!was) return splash(wake, body, unit)
  wake.since += dt
  const moved = Math.hypot(body.x - wake.x, body.z - wake.z)
  if (moved >= SPACING * unit) {
    // Its speed since the last ring; a jump (a teleport) is no faster than a sprint.
    const speed = Math.min(moved / Math.max(wake.since, dt), 3 * unit)
    ring(wake, body, 0.3 + 0.5 * clamp01(speed / (2.6 * unit)))
  } else if (wake.since >= IDLE) ring(wake, body, 0.28)
}

/** What a ring or a drop looks like now. */
export interface Mark {
  x: number
  y: number
  z: number
  /** A ring's radius, or a drop's width, in world units. */
  size: number
  /** How bright, 0 to 1. */
  glow: number
}

/** A ring `at` the wake's time: how wide it has spread and how far it has faded. False once it is
 *  gone, or before a ring left with a delay has begun. Writes `x`, `z`, `size` and `glow`. */
export function ringAt(ring: Ring, at: number, unit: number, out: Mark): boolean {
  const age = at - ring.born
  if (!(age >= 0 && age < RING_LIFE)) return false
  out.x = ring.x
  out.z = ring.z
  out.size = (RING_START + ring.spread * age) * unit
  out.glow = ring.strength * smooth(age / 0.2) * (1 - age / RING_LIFE) ** 2
  return true
}

/** A drop `at` the wake's time: up, over and back down. False once it has fallen back in. */
export function dropAt(drop: Drop, at: number, unit: number, out: Mark): boolean {
  const age = at - drop.born
  if (!(age >= 0 && age < DROP_LIFE)) return false
  const y = drop.vy * age - 0.5 * GRAVITY * unit * age * age
  if (y < 0) return false
  out.x = drop.x + drop.vx * age
  out.y = drop.y + y
  out.z = drop.z + drop.vz * age
  out.size = drop.size
  out.glow = 1 - 0.6 * (age / DROP_LIFE)
  return true
}
