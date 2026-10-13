import { describe, expect, it } from 'vitest'
import { editableProps } from '../schema'
import {
  avatarBody,
  diffPatch,
  LOOK_KEYS,
  lookOf,
  moreProps,
  parseLook,
  TRAITS,
  wearLook,
  writeTrait,
} from './traits'

describe('writeTrait', () => {
  it('writes into part objects and prunes them when cleared', () => {
    const toned = writeTrait({ seed: 3 }, 'tone', '#c98d63')
    expect(toned).toEqual({ seed: 3, body: { tone: '#c98d63' } })
    expect(writeTrait(toned, 'tone', undefined)).toEqual({ seed: 3 })
    expect(writeTrait({}, 'eyeColor', '#3d7ab8')).toEqual({ face: { eyes: { color: '#3d7ab8' } } })
  })

  it('migrates flat shorthands into the part object on first edit', () => {
    expect(writeTrait({ skinTone: '#111111', build: 'slim' }, 'height', 1.6)).toEqual({
      body: { tone: '#111111', build: 'slim', height: 1.6 },
    })
    expect(writeTrait({ hair: 'bun', hairColor: '#2b1d14' }, 'hairColor', '#aa0000')).toEqual({
      hair: { style: 'bun', color: '#aa0000' },
    })
    // A shorthand the part object already overrides is dead, so it goes.
    expect(writeTrait({ skinTone: '#111111', body: { tone: '#222222' } }, 'build', 'slim')).toEqual(
      { body: { tone: '#222222', build: 'slim' } },
    )
  })

  it('clears a trait completely, shorthand included', () => {
    expect(writeTrait({ skinTone: '#111111' }, 'tone', undefined)).toEqual({})
    expect(writeTrait({ hair: 'bun' }, 'hair', undefined)).toEqual({})
  })
})

describe('diffPatch', () => {
  it('lists changed and removed keys only', () => {
    expect(diffPatch({ a: 1, b: { c: 1 }, d: 2 }, { a: 1, b: { c: 2 } })).toEqual({
      b: { c: 2 },
      d: undefined,
    })
  })
})

describe('looks', () => {
  const figure = {
    position: [1, 0, 2],
    seed: 4,
    pose: 'sit',
    patrol: [[0, 0, 0]],
    hair: { style: 'bun' },
    skin: 'winter',
  }

  it('separates the look from placement and behavior', () => {
    expect(lookOf(figure)).toEqual({ seed: 4, hair: { style: 'bun' }, skin: 'winter' })
    expect(wearLook(figure, { seed: 9, kind: 'guard' })).toEqual({
      position: [1, 0, 2],
      pose: 'sit',
      patrol: [[0, 0, 0]],
      seed: 9,
      kind: 'guard',
    })
  })

  it('reads a look file as a node or bare props', () => {
    expect(parseLook(JSON.stringify({ type: 'Person', props: figure }))).toEqual(lookOf(figure))
    expect(parseLook(JSON.stringify({ seed: 2, pose: 'sit' }))).toEqual({ seed: 2 })
    expect(() => parseLook(JSON.stringify({ type: 'Bench', props: {} }))).toThrow()
    expect(() => parseLook('[]')).toThrow()
  })

  it('fits a look to the avatar body, keeping its size', () => {
    const body = avatarBody(
      { seed: 4, height: 1.9, body: { height: 1.9, tone: '#111111' } },
      { height: 1.2, position: [0, -0.6, 0] },
    )
    expect(body).toEqual({
      seed: 4,
      body: { tone: '#111111' },
      physics: false,
      lookAt: false,
      height: 1.2,
      position: [0, -0.6, 0],
    })
  })
})

describe('coverage', () => {
  it('places every Person prop on a tab or under More', () => {
    const placed = new Set([
      ...Object.values(TRAITS).map((t) => t.path[0]),
      ...LOOK_KEYS,
      ...moreProps(),
    ])
    for (const [name] of editableProps('Person')) expect(placed.has(name), name).toBe(true)
    expect(moreProps()).toContain('patrol')
    expect(moreProps()).not.toContain('skinTone')
  })
})
