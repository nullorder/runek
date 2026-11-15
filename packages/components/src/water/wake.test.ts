import { describe, expect, it } from 'vitest'
import { createWake, dropAt, type Mark, ringAt, stepWake, type Wake, type WakeBody } from './wake'

const DT = 1 / 60
const body = (over: Partial<WakeBody> = {}): WakeBody => ({
  wet: true,
  x: 0,
  y: 0,
  z: 0,
  fall: 0,
  ...over,
})
const mark = (): Mark => ({ x: 0, y: 0, z: 0, size: 0, glow: 0 })

const ringsNow = (wake: Wake) => wake.rings.filter((r) => ringAt(r, wake.time, 1, mark()))
const dropsNow = (wake: Wake) => wake.drops.filter((d) => dropAt(d, wake.time, 1, mark()))
const everLeft = (wake: Wake) => wake.rings.filter((r) => Number.isFinite(r.born)).length

/** Step `wake` through `seconds`, with the body `where(t)` says. */
function run(wake: Wake, seconds: number, where: (t: number) => WakeBody) {
  for (let t = 0; t < seconds; t += DT) stepWake(wake, where(t), DT)
}

describe('stepWake', () => {
  it('leaves nothing on dry land', () => {
    const wake = createWake(1)
    run(wake, 3, (t) => body({ wet: false, x: t * 2 }))
    expect(everLeft(wake)).toBe(0)
    expect(dropsNow(wake)).toHaveLength(0)
  })

  it('leaves a ripple where a body walks in', () => {
    const wake = createWake(1)
    stepWake(wake, body({ x: 3, z: -2, fall: 0.2 }), DT)
    expect(everLeft(wake)).toBe(1)
    expect(wake.rings[0]).toMatchObject({ x: 3, z: -2 })
    expect(dropsNow(wake)).toHaveLength(0)
  })

  it('splashes where one falls in, harder the faster it falls', () => {
    const drop = createWake(1)
    stepWake(drop, body({ fall: 3 }), DT)
    const dive = createWake(1)
    stepWake(dive, body({ fall: 7 }), DT)
    // Rings that follow one another out, and drops in the air a moment later.
    expect(everLeft(dive)).toBe(3)
    run(drop, 0.2, () => body({ fall: 3 }))
    run(dive, 0.2, () => body({ fall: 7 }))
    expect(dropsNow(drop).length).toBeGreaterThan(3)
    expect(dropsNow(dive).length).toBeGreaterThan(dropsNow(drop).length)
    expect(dropsNow(dive)).toHaveLength(dive.drops.length)
    const high = (wake: Wake) => Math.max(...wake.drops.map((d) => d.vy))
    expect(high(dive)).toBeGreaterThan(high(drop))
  })

  it('leaves a ring every half meter behind a swimmer, brighter at a sprint', () => {
    const cruise = createWake(1)
    stepWake(cruise, body(), DT)
    run(cruise, 2.1, (t) => body({ x: 1.5 * t }))
    // The one from getting in, then six along three meters.
    expect(everLeft(cruise)).toBe(1 + 6)
    const xs = cruise.rings.slice(1, 7).map((r) => r.x)
    for (let i = 1; i < xs.length; i++) expect(xs[i] - xs[i - 1]).toBeCloseTo(0.5, 1)

    const sprint = createWake(1)
    stepWake(sprint, body(), DT)
    run(sprint, 2.1, (t) => body({ x: 2.6 * t }))
    expect(sprint.rings[3].strength).toBeGreaterThan(cruise.rings[3].strength)
  })

  it('leaves a faint ring now and then round a body treading water', () => {
    const wake = createWake(1)
    run(wake, 5, () => body())
    const left = everLeft(wake)
    expect(left).toBeGreaterThanOrEqual(4)
    expect(left).toBeLessThanOrEqual(6)
    expect(wake.rings[2].strength).toBeLessThan(0.4)
  })

  it('leaves none while the body is under, and one where it comes back up', () => {
    const wake = createWake(1)
    stepWake(wake, body(), DT)
    stepWake(wake, body({ wet: false }), DT)
    const gone = everLeft(wake)
    run(wake, 3, (t) => body({ wet: false, x: t }))
    expect(everLeft(wake)).toBe(gone)
    stepWake(wake, body({ x: 3 }), DT)
    expect(everLeft(wake)).toBe(gone + 1)
    expect(wake.rings[gone].x).toBe(3)
    expect(dropsNow(wake)).toHaveLength(0)
  })

  it('writes over its oldest rings, never more than the pool', () => {
    const wake = createWake(1, 8, 4)
    stepWake(wake, body(), DT)
    run(wake, 20, (t) => body({ x: 2.6 * t }))
    expect(wake.rings).toHaveLength(8)
    expect(ringsNow(wake).length).toBeLessThanOrEqual(8)
    // The ones still showing are the latest.
    expect(Math.min(...ringsNow(wake).map((r) => r.x))).toBeGreaterThan(2.6 * 20 - 8)
  })

  it('scatters a splash the same way for the same seed', () => {
    const thrown = (seed: number) => {
      const wake = createWake(seed)
      stepWake(wake, body({ fall: 6 }), DT)
      return wake.drops.map((d) => [d.vx, d.vy, d.vz, d.size])
    }
    expect(thrown(7)).toEqual(thrown(7))
    expect(thrown(7)).not.toEqual(thrown(8))
  })

  it('scales with the world unit', () => {
    const wake = createWake(1)
    stepWake(wake, body(), DT, 2)
    for (let t = 0; t < 1.1; t += DT) stepWake(wake, body({ x: 3 * t }), DT, 2)
    // Three world units at two meters a unit: a ring a meter of world apart.
    expect(everLeft(wake)).toBe(1 + 3)
  })
})

describe('ringAt', () => {
  it('spreads and fades, then is gone', () => {
    const wake = createWake(1)
    stepWake(wake, body(), DT)
    const ring = wake.rings[0]
    const early = mark()
    const late = mark()
    expect(ringAt(ring, ring.born + 0.4, 1, early)).toBe(true)
    expect(ringAt(ring, ring.born + 1.8, 1, late)).toBe(true)
    expect(late.size).toBeGreaterThan(early.size)
    expect(late.glow).toBeLessThan(early.glow)
    expect(early.glow).toBeLessThanOrEqual(ring.strength)
    expect(ringAt(ring, ring.born + 3, 1, mark())).toBe(false)
  })

  it('starts from nothing, and waits for a ring left with a delay', () => {
    const wake = createWake(1)
    stepWake(wake, body({ fall: 6 }), DT)
    const [first, second] = wake.rings
    const now = mark()
    expect(ringAt(first, first.born, 1, now)).toBe(true)
    expect(now.glow).toBe(0)
    expect(second.born).toBeGreaterThan(first.born)
    expect(ringAt(second, first.born, 1, mark())).toBe(false)
    // A splash spreads faster than a trail.
    expect(first.spread).toBeGreaterThan(wake.rings[2].spread)
  })

  it('shows nothing for a ring never left', () => {
    expect(ringAt(createWake(1).rings[0], 5, 1, mark())).toBe(false)
  })
})

describe('dropAt', () => {
  it('goes up, comes down, and is gone when it meets the water', () => {
    const wake = createWake(3)
    stepWake(wake, body({ y: 2, fall: 6 }), DT)
    const drop = wake.drops[0]
    const up = mark()
    expect(dropAt(drop, drop.born + 0.1, 1, up)).toBe(true)
    expect(up.y).toBeGreaterThan(2)
    expect(Math.hypot(up.x, up.z)).toBeGreaterThan(0.15)
    const landed = (2 * drop.vy) / 9.81
    expect(dropAt(drop, drop.born + landed + 0.01, 1, mark())).toBe(false)
    expect(dropAt(drop, drop.born - 0.01, 1, mark())).toBe(false)
  })
})
