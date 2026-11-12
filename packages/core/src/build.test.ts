import { describe, expect, it, vi } from 'vitest'
import { type Built, buildOf, cachedBuild, shapeGeometry, shapeKey } from './build'
import { DEFAULT_PALETTE } from './palette'

const ctx = { unit: 1, palette: DEFAULT_PALETTE }

describe('builds (#64)', () => {
  it('finds a component build, and nothing on a component without one', () => {
    const build = () => ({ parts: [] })
    expect(buildOf(Object.assign(() => null, { build }))).toBe(build)
    expect(buildOf(() => null)).toBeUndefined()
    expect(buildOf({ kind: 'composite', nodes: [] })).toBeUndefined()
  })

  it('shares one geometry per shape', () => {
    const a = shapeGeometry({ box: [1, 2, 3] })
    expect(shapeGeometry({ box: [1, 2, 3.0000001] })).toBe(a)
    expect(shapeGeometry({ box: [1, 2, 4] })).not.toBe(a)
    expect(shapeKey({ cylinder: [0.5, 0.5, 2] })).toBe('cylinder:0.5,0.5,2')
    const arrays = { position: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]) }
    const tri = shapeGeometry({ arrays })
    expect(shapeGeometry({ arrays })).toBe(tri)
    expect(tri.getAttribute('normal')).toBeDefined()
  })

  it('builds identical nodes once, placement aside', () => {
    const build = vi.fn((): Built => ({ parts: [] }))
    const one = cachedBuild('Thing', build, { size: 2, position: [0, 0, 0] }, ctx)
    const two = cachedBuild(
      'Thing',
      build,
      { size: 2, position: [9, 0, 9], rotation: [0, 1, 0] },
      ctx,
    )
    expect(two).toBe(one)
    expect(build).toHaveBeenCalledOnce()
    cachedBuild('Thing', build, { size: 3 }, ctx)
    cachedBuild('Thing', build, { size: 2 }, { ...ctx, unit: 2 })
    cachedBuild('Other', build, { size: 2 }, ctx)
    expect(build).toHaveBeenCalledTimes(4)
  })
})
