import { Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { raiseBoom, SWIM_TILT } from './boom'

const over = (dir: Vector3) => Math.atan2(dir.y, Math.hypot(dir.x, dir.z))

describe('raiseBoom', () => {
  it('lifts a level camera to the tilt, still behind the avatar', () => {
    const dir = raiseBoom(new Vector3(0.6, 0, -0.8), SWIM_TILT, 1)
    expect(over(dir)).toBeCloseTo(SWIM_TILT)
    expect(dir.length()).toBeCloseTo(1)
    expect(Math.atan2(dir.x, dir.z)).toBeCloseTo(Math.atan2(0.6, -0.8))
  })

  it('lifts a camera looking up from below', () => {
    const dir = raiseBoom(new Vector3(0, -0.5, -1).normalize(), SWIM_TILT, 1)
    expect(over(dir)).toBeCloseTo(SWIM_TILT)
  })

  it('leaves a camera that is already higher', () => {
    const high = new Vector3(0, 1, -1).normalize()
    expect(raiseBoom(high.clone(), SWIM_TILT, 1)).toEqual(high)
  })

  it('eases in with its weight', () => {
    const level = new Vector3(0, 0, -1)
    expect(raiseBoom(level.clone(), SWIM_TILT, 0)).toEqual(level)
    const half = raiseBoom(level.clone(), SWIM_TILT, 0.5)
    expect(over(half)).toBeCloseTo(SWIM_TILT / 2)
    expect(half.length()).toBeCloseTo(1)
  })

  it('leaves a camera straight overhead alone', () => {
    const up = new Vector3(0, 1, 0)
    expect(raiseBoom(up.clone(), SWIM_TILT, 1)).toEqual(up)
    const down = new Vector3(0, -1, 0)
    expect(raiseBoom(down.clone(), SWIM_TILT, 1)).toEqual(down)
  })
})
