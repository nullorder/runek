import { describe, expect, it } from 'vitest'
import { pick, rng } from './rng'

const first = (seed: number) => rng(seed)()

describe('rng', () => {
  it('repeats the same sequence for the same seed', () => {
    const a = rng(42)
    const b = rng(42)
    for (let i = 0; i < 100; i++) expect(a()).toBe(b())
  })

  it('stays in [0, 1)', () => {
    const r = rng(7)
    for (let i = 0; i < 1000; i++) {
      const v = r()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it("doesn't get stuck at seed 0", () => {
    const r = rng(0)
    const draws = new Set(Array.from({ length: 10 }, r))
    expect(draws.size).toBe(10)
  })

  it('spreads the first draw evenly over small seeds', () => {
    const draws = Array.from({ length: 100 }, (_, i) => first(i + 1))
    const mean = draws.reduce((sum, v) => sum + v, 0) / draws.length
    expect(mean).toBeGreaterThan(0.4)
    expect(mean).toBeLessThan(0.6)
    expect(draws.filter((v) => v < 0.05).length).toBeLessThan(15)
  })

  it('makes a first pick vary across neighbouring seeds', () => {
    const picks = new Set(Array.from({ length: 30 }, (_, i) => pick(rng(i + 1), ['a', 'b', 'c'])))
    expect(picks.size).toBe(3)
  })
})
