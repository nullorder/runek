// A walking route as a pure function of time: where a figure is, which way it faces, and how
// fast it moves at any moment, with no integrated state. Two viewers sampling the same route at
// the same clock see the same thing. Plain TS (no three.js, no React) so it tests in isolation.
import { range, rng, type Vec3 } from '@runek/core'

/** `loop` closes the route (last point walks back to the first); `pingpong` retraces it. */
export type RouteLoop = 'loop' | 'pingpong'

export interface RouteOptions {
  /** Walking speed, in units per second. */
  speed: number
  /** Seconds held at each waypoint before setting off again. */
  pause: number
  /** How the route repeats, or `once` for a single trip that sets off at `t = 0` and holds the
   *  last point from `t = period` on. */
  loop: RouteLoop | 'once'
  /** Seconds to reach full speed from a standstill (and to stop again). */
  accel?: number
}

export interface RouteSample {
  x: number
  y: number
  z: number
  /** Yaw of travel (0 faces +z). While paused, the heading the figure arrived with. */
  heading: number
  /** Current speed along the route, in units per second. */
  speed: number
  /** Distance walked since the start of the cycle, for a walk cycle that doesn't slide. */
  distance: number
}

export interface Route {
  /** Seconds for one full cycle, pauses included; for a trip, the arrival time. Zero for a route
   *  that never moves. */
  period: number
  /** A single trip rather than a repeating cycle. */
  once: boolean
  /** Where the figure is at `t` seconds (any real number; a cycle repeats every `period`, a trip
   *  waits at its first point before 0 and holds its last after `period`). */
  sample: (t: number) => RouteSample
}

interface Leg {
  from: Vec3
  to: Vec3
  length: number
  heading: number
  /** Seconds held at the leg's start, then seconds spent moving. */
  wait: number
  move: number
  /** Ramp time at each end: the full `accel`, or half the move for a leg too short to cruise. */
  ramp: number
  /** Cycle time the leg's pause starts, and distance walked before it. */
  start: number
  before: number
}

const DEFAULT_ACCEL = 0.4

/**
 * Build a route through node-local waypoints. The legs join them in order (closing back to the
 * first for `loop`, retracing for `pingpong`, stopping at the last for `once`); each leg pauses,
 * then eases up to `speed`, cruises, and eases to a stop. A trip sets off without the first
 * pause. Fewer than two distinct points stand still at the first.
 */
export function buildRoute(points: Vec3[], options: RouteOptions): Route {
  const { speed, pause, loop, accel = DEFAULT_ACCEL } = options
  const once = loop === 'once'
  const order = loop === 'pingpong' ? [...points, ...points.slice(1, -1).reverse()] : points
  const count = once ? order.length - 1 : order.length
  const legs: Leg[] = []
  let clock = 0
  let walked = 0
  for (let i = 0; i < count && order.length > 1; i++) {
    const from = order[i]
    const to = order[(i + 1) % order.length]
    const wait = once && i === 0 ? 0 : pause
    const length = Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2])
    const ramp = speed > 0 ? Math.min(accel, length / speed) : 0
    const move = speed > 0 && length > 0 ? length / speed + ramp : 0
    legs.push({
      from,
      to,
      length,
      heading: Math.atan2(to[0] - from[0], to[2] - from[2]),
      wait,
      move,
      ramp,
      start: clock,
      before: walked,
    })
    clock += wait + move
    walked += length
  }

  const first = points[0] ?? [0, 0, 0]
  if (!legs.some((leg) => leg.move > 0)) {
    const still: RouteSample = {
      x: first[0],
      y: first[1],
      z: first[2],
      heading: 0,
      speed: 0,
      distance: 0,
    }
    return { period: 0, once, sample: () => still }
  }

  // The heading a figure arrives at each leg's start with: the last leg before it that moves. A
  // trip hasn't arrived anywhere before it sets off, so it faces the node's own way.
  const arrival = legs.map((_, i) => {
    for (let k = 1; k <= (once ? i : legs.length); k++) {
      const prev = legs[(i - k + legs.length) % legs.length]
      if (prev.length > 0) return prev.heading
    }
    return 0
  })

  const period = clock
  const last = order[order.length - 1]
  const end: RouteSample = {
    x: last[0],
    y: last[1],
    z: last[2],
    heading: legs.findLast((leg) => leg.length > 0)?.heading ?? 0,
    speed: 0,
    distance: walked,
  }
  const sample = (t: number): RouteSample => {
    if (once && t >= period) return end
    const at = once ? t : ((t % period) + period) % period
    let i = legs.length - 1
    while (i > 0 && legs[i].start > at) i--
    const leg = legs[i]
    const tau = at - leg.start - leg.wait
    if (tau <= 0 || leg.move === 0) {
      return {
        x: leg.from[0],
        y: leg.from[1],
        z: leg.from[2],
        heading: arrival[i],
        speed: 0,
        distance: leg.before,
      }
    }
    // Trapezoidal speed: ramp up, cruise, ramp down, so starts and stops never pop.
    const { ramp, move, length } = leg
    let s: number
    let v: number
    if (tau < ramp) {
      s = (speed * tau * tau) / (2 * ramp)
      v = (speed * tau) / ramp
    } else if (tau < move - ramp) {
      s = (speed * ramp) / 2 + speed * (tau - ramp)
      v = speed
    } else {
      const left = Math.max(move - tau, 0)
      s = length - (speed * left * left) / (2 * ramp)
      v = (speed * left) / ramp
    }
    const u = Math.min(Math.max(s / length, 0), 1)
    return {
      x: leg.from[0] + (leg.to[0] - leg.from[0]) * u,
      y: leg.from[1] + (leg.to[1] - leg.from[1]) * u,
      z: leg.from[2] + (leg.to[2] - leg.from[2]) * u,
      heading: leg.heading,
      speed: v,
      distance: leg.before + s,
    }
  }
  return { period, once, sample }
}

/**
 * Where a `route` trip has got to at `now` (epoch ms), in the node's local frame and ignoring
 * detours: for an app starting a new trip from wherever the last one had reached. `speed` and
 * `pause` are the figure's own (an adult walks 1.3 m/s; the default pause is 1.5 s).
 */
export function tripAt(
  points: Vec3[],
  departAt: number,
  now: number,
  { speed = 1.3, pause = 1.5 }: { speed?: number; pause?: number } = {},
): Vec3 {
  const p = buildRoute(points, { speed, pause, loop: 'once' }).sample((now - departAt) / 1000)
  return [p.x, p.y, p.z]
}

/**
 * A seeded wander loop inside `radius`: the origin, then `count - 1` points around it sorted by
 * angle, so the loop never crosses itself. Same seed, same loop.
 */
export function wanderPoints(radius: number, seed: number, count = 5): Vec3[] {
  const r = rng(seed)
  const n = Math.max(count - 1, 2)
  const offset = r() * Math.PI * 2
  const points: Vec3[] = [[0, 0, 0]]
  for (let i = 0; i < n; i++) {
    const angle = offset + ((i + range(r, 0.15, 0.85)) / n) * Math.PI * 2
    const reach = radius * range(r, 0.4, 1)
    points.push([Math.sin(angle) * reach, 0, Math.cos(angle) * reach])
  }
  return points
}
