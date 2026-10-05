import type { WorldData } from '@runek/core/data'
import { transform } from 'sucrase'
import { describe, expect, it } from 'vitest'
import { compactArrays } from './format'
import { generateApp, installCommands, literal } from './generate'

const world: WorldData = {
  version: 1,
  time: '18:30',
  palette: { wood: '#7a5a40' },
  nodes: [
    { type: 'Terrain', id: 'a', props: { relief: 1.5, size: [30, 30] } },
    { type: 'Sign', id: 'b', props: { position: [0, 2, 0], glow: true, children: 'Hi {there}' } },
    {
      type: 'Group',
      id: 'g',
      props: { position: [1, 0, 0] },
      children: [
        {
          type: 'Bookshelf',
          id: 'c',
          anchor: 'ground',
          props: { position: [0, 0.1, 0], fill: 0.5 },
        },
      ],
    },
    { type: 'House', id: 'h', props: { seed: 3 } },
    { type: 'LightRig', id: 'l' },
  ],
}

const compiles = (code: string) =>
  expect(() =>
    transform(code, { transforms: ['typescript', 'jsx', 'imports'], jsxRuntime: 'automatic' }),
  ).not.toThrow()

describe('generateApp', () => {
  it('data style renders the JSON through WorldRenderer', () => {
    const code = generateApp(world, 'data')
    expect(code).toContain("import world from './world.json'")
    expect(code).toContain('lights={false}')
    compiles(code)
  })

  it('JSX style spells out components, nests groups and bakes anchors', () => {
    const code = generateApp(world, 'jsx', {
      resolve: (path) => (path === '2/0' ? [0, 1.25, 0] : undefined),
    })
    expect(code).toContain(
      "import { Bookshelf, LightRig, Sign, Terrain, registry } from '@runek/components'",
    )
    expect(code).toContain("import { World, WorldNodes } from '@runek/core'")
    expect(code).toContain('<World time="18:30" palette={{ wood: "#7a5a40" }} lights={false}>')
    expect(code).toContain('<Terrain relief={1.5} size={[30, 30]} />')
    expect(code).toContain('<Bookshelf position={[0, 1.25, 0]} fill={0.5} />')
    expect(code).toContain("Hi {'{'}there{'}'}")
    expect(code).toContain('<Sign position={[0, 2, 0]} glow>')
    expect(code).toContain(
      '<WorldNodes nodes={[{ type: "House", props: { seed: 3 } }]} registry={registry} />',
    )
    compiles(code)
  })

  it('formats literals compactly', () => {
    expect(literal({ a: [1, 2], 'b-c': 'x' })).toBe('{ a: [1, 2], "b-c": "x" }')
  })
})

describe('installCommands', () => {
  it('adds every used registry component once', () => {
    expect(installCommands(world)).toEqual([
      'npx @runek/cli init',
      'npx @runek/cli add bookshelf house lightrig sign terrain',
    ])
    expect(installCommands(world, 'pnpm')[0]).toBe('pnpm dlx @runek/cli init')
  })
})

describe('compactArrays', () => {
  it('inlines short arrays, keeping strings intact', () => {
    expect(
      compactArrays('{\n  "p": [\n    1,\n    -0.5,\n    2e-3\n  ],\n  "s": [\n    "a, b"\n  ]\n}'),
    ).toBe('{\n  "p": [1, -0.5, 0.002],\n  "s": ["a, b"]\n}')
  })
})
