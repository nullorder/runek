import { describe, expect, it } from 'vitest'
import { validateWorld } from '../code/validate'
import { SCHEMA } from '../schema'
import { SNIPPETS } from '../snippets'
import { TEMPLATES } from '.'

describe('starter content', () => {
  it.each(TEMPLATES.map((t) => [t.id, t] as const))('template %s validates', (_, t) => {
    expect(validateWorld(t.world, SCHEMA)).toEqual([])
  })
  it.each(SNIPPETS.map((s) => [s.id, s] as const))('snippet %s validates', (_, s) => {
    expect(validateWorld({ version: 1, nodes: s.nodes }, SCHEMA)).toEqual([])
  })
})
