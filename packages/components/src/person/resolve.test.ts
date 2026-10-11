import { DEFAULT_PALETTE } from '@runek/core'
import { describe, expect, it } from 'vitest'
import { resolvePerson } from './resolve'
import { resolveFigure } from './spec'

describe('resolvePerson', () => {
  it('reports what the seed chose, matching the figure the component builds', () => {
    const r = resolvePerson({ seed: 3 })
    const { spec } = resolveFigure(
      { seed: 3, style: 'stylized', kind: 'villager', age: 'adult' },
      DEFAULT_PALETTE,
      1,
    )
    expect(r.gender).toEqual({ value: spec.gender, from: 'seed' })
    expect(r.hair).toEqual({ value: spec.hair, from: 'seed' })
    expect(r.tone).toEqual({ value: spec.colors.skin, from: 'seed' })
    expect(r.style).toEqual({ value: 'stylized', from: 'default' })
    expect(r.clothes.value.map((g) => g.type)).toEqual(spec.layers.map((l) => l.type))
  })

  it('walks the precedence chain: prop, then skin, then kind', () => {
    const r = resolvePerson({ seed: 2, kind: 'farmer', skin: 'winter', hat: 'cap' })
    expect(r.hat).toEqual({ value: 'cap', from: 'prop' })
    expect(r.outfit.from).toBe('skin')
    expect(resolvePerson({ seed: 2, kind: 'farmer' }).hat).toEqual({ value: 'straw', from: 'kind' })
    expect(resolvePerson({ seed: 2, kind: 'farmer' }).outfit).toEqual({
      value: 'shirt',
      from: 'kind',
    })
  })

  it('treats part objects and flat shorthands alike as props', () => {
    expect(resolvePerson({ body: { tone: '#222222' } }).tone).toEqual({
      value: '#222222',
      from: 'prop',
    })
    expect(resolvePerson({ skinTone: '#333333' }).tone.from).toBe('prop')
    expect(resolvePerson({ hair: { color: '#aa0000' } }).hair.from).toBe('seed')
    expect(resolvePerson({ hair: { color: '#aa0000' } }).hairColor.from).toBe('prop')
    expect(resolvePerson({ height: 1.5 }).height).toEqual({ value: 1.5, from: 'prop' })
  })

  it('marks explicit clothes, with no outfit behind them and tucks from the order', () => {
    const r = resolvePerson({ clothes: [{ type: 'shirt' }, { type: 'jeans' }] })
    expect(r.outfit).toEqual({ value: null, from: 'prop' })
    expect(r.clothes.value[0]).toMatchObject({ type: 'shirt', tucked: true, sleeves: 'long' })
    const loose = resolvePerson({ clothes: [{ type: 'jeans' }, { type: 'shirt' }] })
    expect(loose.clothes.value[1].tucked).toBe(false)
  })
})
