import { describe, expect, it } from 'vitest'
import { codeOnlyProps, editableProps, SCHEMA } from '.'
import { controlKind, emptyValue, labelFor, matches, numberRange, variantOf } from './controls'
import type { PropType } from './types'

describe('generated schema', () => {
  it('covers the registry with names, categories and defaults', () => {
    expect(Object.keys(SCHEMA).length).toBeGreaterThan(60)
    for (const [title, entry] of Object.entries(SCHEMA)) {
      expect(entry.name, title).toBeTruthy()
      expect(entry.category, title).toBeTruthy()
    }
    expect(SCHEMA.Bookshelf.props.width).toMatchObject({ type: 'number', default: 1.2 })
    expect(SCHEMA.Terrain.props.size.default).toEqual([40, 40])
    expect(SCHEMA.Bookshelf.props.color).toMatchObject({ type: 'color', palette: 'wood' })
    expect(SCHEMA.Roof.props.style).toMatchObject({ type: 'enum', options: ['flat', 'gable'] })
    expect(SCHEMA.Sign.props.children).toMatchObject({ type: 'string', multiline: true })
    expect(SCHEMA.House.kind).toBe('composite')
  })

  it('keeps callbacks and React children out of the form', () => {
    expect(editableProps('Bookshelf').map(([n]) => n)).not.toContain('onBookSelect')
    expect(codeOnlyProps('Bookshelf')).toContain('onBookSelect')
    expect(editableProps('Sign').map(([n]) => n)).toContain('children')
  })
})

describe('controls', () => {
  it('picks a control per type', () => {
    expect(controlKind({ type: 'vec3' })).toBe('vec3')
    expect(controlKind({ type: 'enum', options: ['flat', 'gable'] })).toBe('segmented')
    expect(controlKind({ type: 'enum', options: ['stylized', 'realistic', 'anime'] })).toBe(
      'select',
    )
    expect(controlKind({ type: 'tuple', items: [{ type: 'number' }, { type: 'number' }] })).toBe(
      'pair',
    )
    expect(controlKind({ type: 'array', items: { type: 'vec3' } })).toBe('list')
  })

  it('guesses useful slider ranges', () => {
    expect(numberRange('Bookshelf', 'fill', SCHEMA.Bookshelf.props.fill)).toMatchObject({
      min: 0,
      max: 1,
    })
    expect(numberRange('Bookshelf', 'shelves', SCHEMA.Bookshelf.props.shelves)).toMatchObject({
      integer: true,
    })
    const width = numberRange('Bookshelf', 'width', SCHEMA.Bookshelf.props.width)
    expect(width.max).toBeGreaterThanOrEqual(4.8)
    expect(numberRange('X', 'angle', { type: 'number', doc: 'In radians.' })).toMatchObject({
      min: -Math.PI,
    })
  })

  it('builds empty values and matches union variants', () => {
    const union: Extract<PropType, { type: 'union' }> = {
      type: 'union',
      variants: [{ type: 'boolean' }, { type: 'object', ref: 'LevelFloorConfig' }],
    }
    expect(variantOf(union, true)).toBe(0)
    expect(variantOf(union, { opening: {} })).toBe(1)
    expect(matches({ type: 'enum', options: ['a'] }, 'b')).toBe(false)
    expect(emptyValue({ type: 'vec3' })).toEqual([0, 0, 0])
    expect(labelFor('segmentLength')).toBe('segment length')
  })
})
