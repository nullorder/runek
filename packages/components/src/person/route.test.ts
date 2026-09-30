import type { Vec3 } from '@runek/core'
import { describe, expect, it } from 'vitest'
import { buildRoute, wanderPoints } from './route'

const SQUARE: Vec3[] = [
  [0, 0, 0],
  [4, 0, 0],
  [4, 0, 4],
  [0, 0, 4],
]

describe('buildRoute', () => {
  it('times a closed loop: each leg is its pause plus length / speed plus one ramp', () => {
    const route = buildRoute(SQUARE, { speed: 2, pause: 1, loop: 'loop', accel: 0.5 })
    expect(route.period).toBeCloseTo(4 * (1 + 2 + 0.5))
  })

  it('holds the waypoint through the pause, then leaves it', () => {
    const route = buildRoute(SQUARE, { speed: 2, pause: 1, loop: 'loop' })
    expect(route.sample(0.5)).toMatchObject({ x: 0, z: 0, speed: 0 })
    expect(route.sample(1.2).x).toBeGreaterThan(0)
  })

  it('eases in and out, and cruises at speed between', () => {
    const route = buildRoute(SQUARE, { speed: 2, pause: 0, loop: 'loop', accel: 0.5 })
    expect(route.sample(0.25).speed).toBeCloseTo(1)
    expect(route.sample(1).speed).toBeCloseTo(2)
    expect(route.sample(2.49).speed).toBeLessThan(0.1)
  })

  it('arrives exactly at each waypoint', () => {
    const route = buildRoute(SQUARE, { speed: 1.3, pause: 0.5, loop: 'loop' })
    const leg = 0.5 + 4 / 1.3 + 0.4
    const at = route.sample(leg + 0.25)
    expect(at.x).toBeCloseTo(4)
    expect(at.z).toBeCloseTo(0)
    expect(at.speed).toBe(0)
  })

  it('is continuous: no jumps anywhere along the cycle', () => {
    const route = buildRoute(SQUARE, { speed: 1.5, pause: 0.7, loop: 'pingpong' })
    const dt = 0.01
    let prev = route.sample(0)
    for (let t = dt; t < route.period * 2; t += dt) {
      const next = route.sample(t)
      expect(Math.hypot(next.x - prev.x, next.z - prev.z)).toBeLessThan(1.5 * dt + 1e-9)
      prev = next
    }
  })

  it('repeats every period, and takes negative and huge clocks', () => {
    const route = buildRoute(SQUARE, { speed: 1.3, pause: 1.5, loop: 'loop' })
    const a = route.sample(3.3)
    expect(route.sample(3.3 + route.period * 7).x).toBeCloseTo(a.x)
    expect(route.sample(3.3 - route.period).x).toBeCloseTo(a.x)
    const epoch = 1_790_000_000
    expect(Number.isFinite(route.sample(epoch).x)).toBe(true)
  })

  it('retraces a pingpong route instead of closing it', () => {
    const line: Vec3[] = [
      [0, 0, 0],
      [3, 0, 0],
      [3, 0, 3],
    ]
    const route = buildRoute(line, { speed: 1, pause: 0, loop: 'pingpong', accel: 0 })
    expect(route.period).toBeCloseTo(12)
    // Halfway through the third leg it is walking back along the second.
    expect(route.sample(7.5)).toMatchObject({ x: 3 })
    expect(route.sample(7.5).z).toBeCloseTo(1.5)
    expect(route.sample(7.5).heading).toBeCloseTo(Math.PI)
  })

  it('faces the way it arrived while paused', () => {
    const route = buildRoute(SQUARE, { speed: 2, pause: 1, loop: 'loop' })
    // Paused at [4, 0, 0] after walking +x.
    expect(route.sample(2 + 0.4 + 1 + 0.5).heading).toBeCloseTo(Math.PI / 2)
  })

  it('stands still with one point, or with none that differ', () => {
    for (const points of [
      [[2, 0, 1]],
      [
        [1, 0, 1],
        [1, 0, 1],
      ],
      [],
    ] as Vec3[][]) {
      const route = buildRoute(points, { speed: 1, pause: 1, loop: 'loop' })
      expect(route.period).toBe(0)
      expect(route.sample(42).speed).toBe(0)
    }
    expect(buildRoute([[2, 0, 1]], { speed: 1, pause: 0, loop: 'loop' }).sample(5).x).toBe(2)
  })

  it('counts distance walked, for a walk cycle that tracks the feet', () => {
    const route = buildRoute(SQUARE, { speed: 2, pause: 0, loop: 'loop', accel: 0 })
    expect(route.sample(3).distance).toBeCloseTo(6)
  })
})

describe('wanderPoints', () => {
  it('is deterministic per seed', () => {
    expect(wanderPoints(4, 9)).toEqual(wanderPoints(4, 9))
    expect(wanderPoints(4, 9)).not.toEqual(wanderPoints(4, 10))
  })

  it('starts at the origin and stays inside the radius', () => {
    const points = wanderPoints(4, 3)
    expect(points).toHaveLength(5)
    expect(points[0]).toEqual([0, 0, 0])
    for (const [x, , z] of points) expect(Math.hypot(x, z)).toBeLessThanOrEqual(4 + 1e-9)
  })

  it('winds once around the origin, so the loop never crosses itself', () => {
    const angles = wanderPoints(5, 21)
      .slice(1)
      .map(([x, , z]) => Math.atan2(x, z))
    let turn = 0
    for (let i = 1; i < angles.length; i++) {
      let d = angles[i] - angles[i - 1]
      if (d < -Math.PI) d += Math.PI * 2
      if (d > Math.PI) d -= Math.PI * 2
      expect(d).toBeGreaterThan(0)
      turn += d
    }
    expect(turn).toBeLessThan(Math.PI * 2)
  })
})
