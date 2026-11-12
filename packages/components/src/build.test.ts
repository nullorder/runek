import { DEFAULT_PALETTE } from '@runek/core'
import { describe, expect, it } from 'vitest'
import { Bench } from './Bench'
import { Crate } from './Crate'

const ctx = { unit: 1, palette: DEFAULT_PALETTE }

describe('component builds (#64)', () => {
  it('builds a crate as data: core, 12 planks, one collider', () => {
    const built = Crate.build({ size: 1, seed: 3 }, ctx)
    expect(built.parts).toHaveLength(13)
    expect(built.colliders).toEqual([{ cuboid: [0.5, 0.5, 0.5], position: [0, 0.5, 0] }])
    expect(JSON.parse(JSON.stringify(built))).toEqual(built)
  })

  it('is pure: same props, same build; the seed shades the planks', () => {
    expect(Crate.build({ seed: 3 }, ctx)).toEqual(Crate.build({ seed: 3 }, ctx))
    const colors = (seed: number) => Crate.build({ seed }, ctx).parts.map((p) => p.look.color)
    expect(colors(3)).not.toEqual(colors(4))
  })

  it('scales by unit and follows the palette', () => {
    const big = Crate.build({}, { ...ctx, unit: 2 })
    expect(big.colliders?.[0].cuboid).toEqual([0.8, 0.8, 0.8])
    const tinted = Bench.build({}, { ...ctx, palette: { ...DEFAULT_PALETTE, wood: '#123456' } })
    expect(tinted.parts.every((p) => p.look.color === '#123456')).toBe(true)
  })

  it('drops the backrest without one', () => {
    expect(Bench.build({}, ctx).parts).toHaveLength(11)
    expect(Bench.build({ back: false }, ctx).parts).toHaveLength(7)
  })
})
