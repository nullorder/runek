import { describe, expect, it } from 'vitest'
import {
  createSwimState,
  floatLine,
  STAND_AT,
  SWIM_AT,
  type SwimBody,
  type SwimSense,
  type SwimShape,
  stepSwim,
} from './swim'

// The default avatar: a 1.3 m capsule floating 0.3 m off the ground.
const shape: SwimShape = {
  feet: 0.95,
  top: 0.65,
  radius: 0.3,
  height: 1.3,
  unit: 1,
  walk: 2.5,
  sprint: 5,
  swim: 1.5,
  swimSprint: 2.6,
}
const DT = 1 / 60
const GRAVITY = 9.81

const sense = (over: Partial<SwimSense> = {}): SwimSense => ({
  dt: DT,
  level: 0,
  swell: 0,
  bed: Number.NEGATIVE_INFINITY,
  ahead: Number.NEGATIVE_INFINITY,
  grounded: false,
  pushing: false,
  sprinting: false,
  ...over,
})
const body = (over: Partial<SwimBody> = {}): SwimBody => ({ y: 0, vx: 0, vy: 0, vz: 0, ...over })
/** A body standing on a bed `depth` under still water at 0. */
const standing = (depth: number, over: Partial<SwimBody> = {}) =>
  body({ y: -depth + shape.feet, ...over })

/** Step `b` through `seconds` of free movement, with gravity wherever buoyancy isn't carrying. */
function run(
  state: ReturnType<typeof createSwimState>,
  b: SwimBody,
  seconds: number,
  over: Partial<SwimSense> | ((t: number) => Partial<SwimSense>) = {},
) {
  for (let t = 0; t < seconds; t += DT) {
    const carried = stepSwim(state, shape, b, sense(typeof over === 'function' ? over(t) : over))
    if (!carried) b.vy -= GRAVITY * DT
    b.y += b.vy * DT
  }
}

describe('stepSwim', () => {
  it('leaves a body on dry land alone', () => {
    const state = createSwimState()
    const b = body({ y: 5, vx: 4 })
    expect(stepSwim(state, shape, b, sense({ level: null, grounded: true }))).toBe(false)
    expect(state).toMatchObject({ phase: null, immersion: 0, submerged: 0 })
    expect(b.vx).toBe(4)
  })

  it('swims once the water is over half the body, and stands again a little shallower', () => {
    const state = createSwimState()
    const wade = (depth: number) => {
      stepSwim(state, shape, standing(depth), sense({ bed: -depth, grounded: true }))
      return state.phase
    }
    expect(wade((SWIM_AT - 0.02) * shape.height)).toBeNull()
    expect(wade((SWIM_AT + 0.02) * shape.height)).toBe('swim')
    // Back up the beach: still swimming between the two thresholds, standing below them.
    expect(wade((SWIM_AT - 0.02) * shape.height)).toBe('swim')
    expect(wade((STAND_AT - 0.02) * shape.height)).toBeNull()
  })

  it('reports how much of the body is under the still water', () => {
    const state = createSwimState()
    stepSwim(state, shape, standing(0.26), sense({ bed: -0.26, grounded: true }))
    expect(state.immersion).toBeCloseTo(0.2)
    stepSwim(state, shape, standing(3), sense({ bed: -3 }))
    expect(state.immersion).toBe(1)
  })

  it('slows a walk from the knee to the waist', () => {
    const speedIn = (depth: number, sprinting = false) => {
      const b = standing(depth, { vx: 5 })
      stepSwim(createSwimState(), shape, b, sense({ bed: -depth, grounded: true, sprinting }))
      return b.vx
    }
    // Ankle deep the land speed stands; the cap falls to the swimming speed at the waist.
    expect(speedIn(0.1, true)).toBe(5)
    expect(speedIn(0.4)).toBeLessThan(2.5)
    expect(speedIn(0.4)).toBeGreaterThan(1.5)
    expect(speedIn(0.4)).toBeGreaterThan(speedIn(0.6))
    expect(speedIn(0.7)).toBeCloseTo(1.5)
    expect(speedIn(0.7, true)).toBeCloseTo(2.6)
  })

  it('floats a body dropped into deep water at its floating height', () => {
    const state = createSwimState()
    const b = body({ y: 1.5 })
    run(state, b, 4)
    expect(state.phase).toBe('swim')
    expect(b.y).toBeCloseTo(floatLine(shape, 0), 2)
    expect(Math.abs(b.vy)).toBeLessThan(0.01)
    expect(state.submerged).toBeLessThan(0.01)
    // Most of the capsule is under, its top out.
    expect(b.y + shape.top).toBeGreaterThan(0)
    expect(b.y).toBeLessThan(0)
  })

  it('goes under on a plunge and comes back up', () => {
    const state = createSwimState()
    const b = body({ y: 0.6, vy: -8 })
    let deepest = 0
    for (let t = 0; t < 3; t += DT) {
      run(state, b, DT)
      deepest = Math.max(deepest, state.submerged)
    }
    expect(deepest).toBeGreaterThan(0.3)
    expect(deepest).toBeLessThan(1.5)
    expect(state.submerged).toBeLessThan(0.01)
  })

  it('rides the swell', () => {
    const state = createSwimState()
    const b = body({ y: floatLine(shape, 0) })
    const swell = (t: number) => 0.4 * Math.sin(t * 0.8)
    let worst = 0
    run(state, b, 12, (t) => {
      // After the first second, how far the body is from where the wave has it.
      if (t > 1) worst = Math.max(worst, Math.abs(b.y - floatLine(shape, swell(t))))
      return { swell: swell(t) }
    })
    expect(state.phase).toBe('swim')
    expect(worst).toBeLessThan(0.05)
  })

  it('stands in water too shallow to float in, swimming all the same', () => {
    const state = createSwimState()
    const depth = 0.8
    const b = standing(depth)
    run(state, b, 1, { bed: -depth, grounded: true })
    expect(state.phase).toBe('swim')
    // Held where it stood, well over where it would float, with nothing under water.
    expect(b.y).toBeCloseTo(-depth + shape.feet, 3)
    expect(b.y).toBeGreaterThan(floatLine(shape, 0) + 0.3)
    expect(state.submerged).toBeLessThan(0.001)
  })

  it('carries a swimmer up a bank the controller cannot stand on', () => {
    const state = createSwimState()
    const b = body({ y: floatLine(shape, 0) })
    // The bed rises a meter a second under a swimmer nothing calls grounded.
    let bed = -3
    run(state, b, 2.3, () => {
      bed += DT
      return { bed, pushing: true }
    })
    expect(state.phase).toBe('swim')
    expect(bed).toBeGreaterThan(-0.75)
    // Standing height over the bed, well over where it would float.
    expect(Math.abs(b.y - (bed + shape.feet))).toBeLessThan(0.1)
    expect(b.y).toBeGreaterThan(floatLine(shape, 0) + 0.3)
    // Out of the swim once the water is shallow enough to stand in, and still carried up the
    // bank until it is only knee deep.
    run(state, b, 0.3, () => {
      bed += DT
      return { bed, pushing: true }
    })
    expect(state.phase).toBeNull()
    expect(Math.abs(b.y - (bed + shape.feet))).toBeLessThan(0.1)
    // Ankle deep it is on its own feet again.
    const ashore = standing(0.1, { vy: -1 })
    expect(stepSwim(state, shape, ashore, sense({ bed: -0.1, grounded: true }))).toBe(false)
    expect(ashore.vy).toBe(-1)
  })

  it('lets a body step up off the bed it is carried over', () => {
    const state = createSwimState()
    const depth = 0.8
    const b = standing(depth, { vy: 1 })
    stepSwim(state, shape, b, sense({ bed: -depth, grounded: true }))
    // The water takes its weight but doesn't hold it down.
    expect(b.vy).toBe(1)
    // Afloat in deep water the same rise is damped, so a swimmer doesn't bob out.
    const deep = body({ y: floatLine(shape, 0), vy: 1 })
    stepSwim(createSwimState(), shape, deep, sense())
    expect(deep.vy).toBeLessThan(1)
  })

  describe('climbing out', () => {
    // A ledge 0.2 m over the water, just ahead of a swimmer pushed into it.
    const ledge = { ahead: 0.2, pushing: true }

    it('lifts a swimmer pushed into a low ledge up to stand on it', () => {
      const state = createSwimState()
      const b = body({ y: floatLine(shape, 0) })
      stepSwim(state, shape, b, sense())
      // Partway up it still swims, and reads as over where it floats, so what is drawn of it
      // comes up with the capsule.
      run(state, b, 0.25, ledge)
      expect(state.phase).toBe('swim')
      expect(state.submerged).toBeLessThan(-0.2)
      run(state, b, 1.25, ledge)
      expect(b.y).toBeCloseTo(0.2 + shape.feet, 1)
      // Out of the water and on its feet, and still held: the climb goes on until the ledge is
      // underfoot, and is never taken for a dive.
      expect(state.immersion).toBe(0)
      expect(state.phase).toBeNull()
      expect(state.climbing).toBe(true)
    })

    it('rises no faster than a climb', () => {
      const state = createSwimState()
      const b = body({ y: floatLine(shape, 0) })
      stepSwim(state, shape, b, sense())
      let fastest = 0
      for (let t = 0; t < 1.5; t += DT) {
        run(state, b, DT, ledge)
        fastest = Math.max(fastest, b.vy)
      }
      expect(fastest).toBeGreaterThan(1)
      expect(fastest).toBeLessThanOrEqual(2.5)
    })

    it('lets go when the push stops', () => {
      const state = createSwimState()
      const b = body({ y: floatLine(shape, 0) })
      stepSwim(state, shape, b, sense())
      run(state, b, 0.3, ledge)
      expect(b.y).toBeGreaterThan(floatLine(shape, 0) + 0.2)
      run(state, b, 3)
      expect(state.climbing).toBe(false)
      expect(b.y).toBeCloseTo(floatLine(shape, 0), 1)
    })

    it('helps a wader up a step, not a body in the air', () => {
      const wader = standing(0.4)
      const state = createSwimState()
      stepSwim(state, shape, wader, sense({ bed: -0.4, grounded: true, ...ledge }))
      expect(state.climbing).toBe(true)
      expect(wader.vy).toBeGreaterThan(0)

      const falling = body({ y: 1.2, vy: -3 })
      const air = createSwimState()
      stepSwim(air, shape, falling, sense({ bed: -3, ...ledge }))
      expect(air.climbing).toBe(false)
      expect(falling.vy).toBe(-3)
    })

    it('leaves a diver alone', () => {
      const state = createSwimState()
      const b = body({ y: 2, vx: 2.5 })
      stepSwim(state, shape, b, sense(ledge))
      expect(state.phase).toBe('dive')
      expect(state.climbing).toBe(false)
    })
  })

  it('does not flicker where a settled capsule straddles the threshold', () => {
    const state = createSwimState()
    // Water just shallow enough to stand in, the capsule sagging a few centimeters into it.
    const depth = (STAND_AT + 0.03) * shape.height
    const sagging = standing(depth, {})
    sagging.y -= 0.07
    for (let i = 0; i < 10; i++) {
      stepSwim(state, shape, { ...sagging }, sense({ bed: -depth, grounded: true }))
      expect(state.phase).toBeNull()
    }
  })

  it('holds a swimmer to the swimming speeds and lets it glide to a stop', () => {
    const state = createSwimState()
    const b = body({ y: floatLine(shape, 0), vx: 4 })
    stepSwim(state, shape, b, sense({ pushing: true }))
    expect(Math.hypot(b.vx, b.vz)).toBeCloseTo(1.5)
    b.vx = 4
    stepSwim(state, shape, b, sense({ pushing: true, sprinting: true }))
    expect(Math.hypot(b.vx, b.vz)).toBeCloseTo(2.6)
    // Hands off: the glide dies away within a couple of seconds.
    b.vx = 1.5
    run(state, b, 2)
    expect(b.vx).toBeLessThan(0.05)
    expect(b.vx).toBeGreaterThan(0)
  })

  it('does not brake a body falling through the surface', () => {
    const b = standing(0.4, { vx: 5, vy: -6 })
    stepSwim(createSwimState(), shape, b, sense({ bed: -3 }))
    expect(b.vx).toBe(5)
  })

  it('never swims faster than the avatar walks', () => {
    const slow = { ...shape, walk: 1, sprint: 1.2 }
    const b = standing(0.6, { vx: 3 })
    stepSwim(createSwimState(), slow, b, sense({ bed: -0.6, grounded: true }))
    expect(b.vx).toBeLessThanOrEqual(1)
  })

  describe('diving', () => {
    const jumper = (over: Partial<SwimBody> = {}) => body({ y: 2, vx: 2.5, vy: 1, ...over })

    it('dives when it leaves the ground over deep water, moving', () => {
      const state = createSwimState()
      stepSwim(state, shape, jumper(), sense())
      expect(state.phase).toBe('dive')
    })

    it('drops in feet first from a standstill', () => {
      const state = createSwimState()
      stepSwim(state, shape, jumper({ vx: 0.2 }), sense())
      expect(state.phase).toBeNull()
    })

    it('does not dive into the shallows, off a low step, or from the ground', () => {
      const state = createSwimState()
      stepSwim(state, shape, jumper(), sense({ bed: -0.6 }))
      expect(state.phase).toBeNull()
      stepSwim(state, shape, jumper({ y: shape.feet + 0.1 }), sense())
      expect(state.phase).toBeNull()
      stepSwim(state, shape, jumper(), sense({ grounded: true }))
      expect(state.phase).toBeNull()
    })

    it('calls a dive off when it lands on something', () => {
      const state = createSwimState()
      stepSwim(state, shape, jumper(), sense())
      stepSwim(state, shape, jumper({ y: 1.5 }), sense({ grounded: true, bed: 0.5 }))
      expect(state.phase).toBeNull()
    })

    it('glides under the surface after the dive, then swims', () => {
      const state = createSwimState()
      const b = jumper()
      const phases: (string | null)[] = []
      let carried = 0
      for (let t = 0; t < 4; t += DT) {
        run(state, b, DT, { pushing: true })
        if (phases[phases.length - 1] !== state.phase) phases.push(state.phase)
        if (state.phase === 'glide') carried = Math.max(carried, Math.hypot(b.vx, b.vz))
      }
      expect(phases).toEqual(['dive', 'glide', 'swim'])
      // The dive's speed carries into the glide and is shed on the way up.
      expect(carried).toBeGreaterThan(1.5)
      expect(Math.hypot(b.vx, b.vz)).toBeLessThanOrEqual(1.5 + 1e-9)
      expect(b.y).toBeCloseTo(floatLine(shape, 0), 1)
    })
  })
})
