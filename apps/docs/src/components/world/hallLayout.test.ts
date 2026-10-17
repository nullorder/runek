import { describe, expect, it } from 'vitest'
import { INSET, innerHalf, layoutHall, MIN_SIDE, type Slot, VOID } from './hallLayout'

const PEDESTAL = 1.5

/** Pedestal footprints never overlap, on any floor. */
function overlaps(slots: Slot[]): boolean {
  for (let i = 0; i < slots.length; i++)
    for (let j = i + 1; j < slots.length; j++) {
      const a = slots[i]
      const b = slots[j]
      if (Math.abs(a.x - b.x) < PEDESTAL && Math.abs(a.z - b.z) < PEDESTAL) return true
    }
  return false
}

describe('layoutHall', () => {
  it('places every exhibit at today’s counts in the minimum hall', () => {
    const { side, floors } = layoutHall([22, 23, 36])
    expect(side).toBe(MIN_SIDE)
    expect(floors.map((f) => f.length)).toEqual([22, 23, 36])
    for (const f of floors) expect(overlaps(f)).toBe(false)
  })

  it('keeps exhibits against the outer walls, outside the atrium', () => {
    const { side, floors } = layoutHall([22, 23, 36])
    const line = innerHalf(side) - INSET
    for (const slot of floors.flat()) {
      expect(Math.max(Math.abs(slot.x), Math.abs(slot.z))).toBeCloseTo(line)
      expect(Math.min(Math.abs(slot.x), Math.abs(slot.z))).toBeLessThan(line)
    }
    for (const slot of floors.flat())
      expect(Math.abs(slot.x) > VOID / 2 || Math.abs(slot.z) > VOID / 2).toBe(true)
  })

  it('keeps the ground floor doorways clear', () => {
    const { floors } = layoutHall([22, 23, 36])
    for (const slot of floors[0])
      if (Math.abs(slot.z) < 2) expect(Math.abs(slot.x)).toBeLessThan(innerHalf(MIN_SIDE) - 2)
  })

  it('faces each exhibit away from its wall', () => {
    const { side, floors } = layoutHall([10, 10, 10])
    const line = innerHalf(side) - INSET
    for (const { x, z, rotation } of floors.flat()) {
      // +z turned by `rotation` must point back toward the center.
      const fx = Math.sin(rotation)
      const fz = Math.cos(rotation)
      expect(fx * x + fz * z).toBeCloseTo(-line)
    }
  })

  it('widens the hall when a floor overflows', () => {
    const { side, floors } = layoutHall([22, 23, 60])
    expect(side).toBeGreaterThan(MIN_SIDE)
    expect(floors[2]).toHaveLength(60)
    expect(overlaps(floors[2])).toBe(false)
  })

  it('handles an empty floor', () => {
    expect(layoutHall([0, 5, 0]).floors.map((f) => f.length)).toEqual([0, 5, 0])
  })
})
