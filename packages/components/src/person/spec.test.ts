import { DEFAULT_PALETTE } from '@runek/core'
import { describe, expect, it } from 'vitest'
import { resolveFigure, type TraitInput } from './spec'

const base: TraitInput = { seed: 3, style: 'stylized', kind: 'villager', age: 'adult' }
const resolve = (t: Partial<TraitInput>) =>
  resolveFigure({ ...base, ...t }, DEFAULT_PALETTE, 1).spec

describe('resolveFigure', () => {
  it('is deterministic per seed', () => {
    expect(resolve({})).toEqual(resolve({}))
    expect(resolve({})).not.toEqual(resolve({ seed: 4 }))
  })

  it('never reshuffles other traits when one is set', () => {
    const rolled = resolve({})
    const toned = resolve({ skinTone: '#123456' })
    expect(toned.colors.skin).toBe('#123456')
    expect(toned.hair).toBe(rolled.hair)
    expect(toned.colors.hair).toBe(rolled.colors.hair)
    expect(toned.layers).toEqual(rolled.layers)
  })

  it('lets a part object win over its flat shorthand', () => {
    const s = resolve({
      skinTone: '#111111',
      body: { tone: '#222222', build: 'stocky', height: 1.5 },
      build: 'slim',
    })
    expect(s.colors.skin).toBe('#222222')
    expect(s.build).toBe('stocky')
    expect(s.height).toBeCloseTo(1.5)
    expect(
      resolve({ hair: { style: 'bun', color: '#aa0000' }, hairColor: '#00aa00' }).colors.hair,
    ).toBe('#aa0000')
    expect(resolve({ hair: 'braid' }).hair).toBe('braid')
  })

  it('expands an outfit into a layer stack, with worn accessories on the outside', () => {
    const s = resolve({ outfit: 'tunic', accessories: ['belt', 'scarf'] })
    expect(s.layers.map((l) => l.type)).toEqual(['trousers', 'tunic', 'shoes', 'belt', 'scarf'])
  })

  it('takes an explicit clothes stack verbatim, and [] is the bare body', () => {
    const s = resolve({ clothes: [{ type: 'tshirt', color: '#ff0000' }, { type: 'shorts' }] })
    expect(s.layers.map((l) => l.type)).toEqual(['tshirt', 'shorts'])
    expect(s.layers[0].color).toBe('#ff0000')
    expect(resolve({ clothes: [] }).layers).toEqual([])
  })

  it("recolors the outer layers from the flat color props, but a garment's own color wins", () => {
    const s = resolve({
      outfit: 'coat',
      topColor: '#aa0000',
      bottomColor: '#00aa00',
      shoeColor: '#0000aa',
    })
    const by = (type: string) => s.layers.find((l) => l.type === type)?.color
    expect(by('coat')).toBe('#aa0000')
    expect(by('trousers')).toBe('#00aa00')
    expect(by('boots')).toBe('#0000aa')
    expect(by('shirt')).not.toBe('#aa0000')
    const own = resolve({ clothes: [{ type: 'sweater', color: '#ffffff' }], topColor: '#000000' })
    expect(own.layers[0].color).toBe('#ffffff')
  })

  it('tucks a top listed before the trousers, and stacks each layer proud of the last', () => {
    const tucked = resolve({ clothes: [{ type: 'shirt' }, { type: 'jeans' }, { type: 'vest' }] })
    expect(tucked.layers[0].tucked).toBe(true)
    expect(tucked.layers[1].offset).toBeGreaterThan(tucked.layers[0].offset)
    expect(tucked.layers[2].offset).toBeGreaterThan(tucked.layers[1].offset)
    const over = resolve({ clothes: [{ type: 'jeans' }, { type: 'shirt' }] })
    expect(over.layers[1].tucked).toBe(false)
  })

  it('ships the named skins', () => {
    const s = resolve({ skin: 'preppy' })
    expect(s.layers.map((l) => l.type)).toEqual(['shirt', 'vest', 'jeans', 'belt', 'shoes'])
    expect(resolve({ skin: 'winter' }).hat).toBe('hood')
  })
})
