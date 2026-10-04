import { describe, expect, it } from 'vitest'
import { isNearest } from './interaction'

const at = (distance: number) => ({ distance })

describe('isNearest', () => {
  it('focuses only the nearest candidate in range', () => {
    const a = at(1.5)
    const b = at(0.8)
    const c = at(Number.POSITIVE_INFINITY)
    const all = [a, b, c]
    expect(isNearest(a, all)).toBe(false)
    expect(isNearest(b, all)).toBe(true)
    expect(isNearest(c, all)).toBe(false)
  })

  it('gives a tie to whoever registered first, so a key never fires twice', () => {
    const a = at(1)
    const b = at(1)
    expect(isNearest(a, [a, b])).toBe(true)
    expect(isNearest(b, [a, b])).toBe(false)
  })

  it('focuses nothing when nobody is in range', () => {
    const a = at(Number.POSITIVE_INFINITY)
    expect(isNearest(a, [a])).toBe(false)
  })
})
