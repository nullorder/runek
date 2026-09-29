import { describe, expect, it } from 'vitest'
import {
  checkWorld,
  createGroundIndex,
  type GroundRegistry,
  groundAt,
  type SurfaceDef,
} from './ground'
import { parseWorld, serializeWorld, type WorldData, type WorldNode } from './world-data'

// A tilted plane (y = 0.1 x) over a 100×100 extent, standing in for displaced terrain.
const hill: SurfaceDef = {
  kind: 'terrain',
  build: () => (x, z) => (Math.abs(x) <= 50 && Math.abs(z) <= 50 ? 0.1 * x : null),
}
// A flat deck over local x ∈ [-1, 1], z ∈ [0, length].
const deck: SurfaceDef = {
  kind: 'deck',
  build: (props, { unit }) => {
    const length = ((props.length as number) ?? 10) * unit
    return (x, z) => (Math.abs(x) <= 1 && z >= 0 && z <= length ? 0 : null)
  },
}
const pad: SurfaceDef = {
  kind: 'terrain',
  build: () => (x, z) => (Math.abs(x) <= 2 && Math.abs(z) <= 2 ? 0 : null),
}
const pond: SurfaceDef = {
  kind: 'water',
  build: () => (x, z) => (Math.abs(x) <= 5 && Math.abs(z) <= 5 ? 0 : null),
  rim: () => [
    [-5, 0],
    [5, 0],
  ],
}

const registry: GroundRegistry = {
  Hill: { surface: hill },
  Dock: { surface: deck },
  Pad: { surface: pad },
  Pond: { surface: pond },
  Crate: { groundSitting: true },
  Bird: {},
  Hut: { kind: 'composite', groundSitting: true, nodes: [{ type: 'Dock', props: { length: 4 } }] },
}

const world = (nodes: WorldNode[], extra: Partial<WorldData> = {}): WorldData => ({
  version: 1,
  nodes,
  ...extra,
})

describe('groundAt', () => {
  it('falls back to the world ground baseline when nothing is there', () => {
    expect(groundAt(world([], { ground: -2 }), registry, 0, 0)).toBe(-2)
    expect(groundAt(world([{ type: 'Hill' }], { ground: -2 }), registry, 80, 0)).toBe(-2)
  })

  it('reads a surface through its node position', () => {
    const w = world([{ type: 'Hill', props: { position: [10, 1, 0] } }])
    // local x = 20 - 10 = 10 → 1, plus the node's y
    expect(groundAt(w, registry, 20, 0)).toBeCloseTo(2)
  })

  it('takes the highest of overlapping surfaces', () => {
    const w = world([{ type: 'Hill' }, { type: 'Pad', props: { position: [0, 3, 0] } }])
    expect(groundAt(w, registry, 1, 1)).toBeCloseTo(3)
    expect(groundAt(w, registry, 10, 0)).toBeCloseTo(1)
  })

  it('composes nested group and Y-rotation transforms', () => {
    // A dock rotated a quarter turn runs along +X instead of +Z.
    const w = world([
      {
        type: 'Group',
        props: { position: [100, 2, 0] },
        children: [{ type: 'Dock', props: { position: [0, 1, 0], rotation: [0, Math.PI / 2, 0] } }],
      },
    ])
    expect(groundAt(w, registry, 105, 0)).toBeCloseTo(3)
    expect(groundAt(w, registry, 100, 5, { kinds: ['terrain'] })).toBe(0)
    expect(groundAt(w, registry, 100, 5)).toBe(0)
  })

  it('filters by kind and excludes a node subtree by id', () => {
    const w = world([{ type: 'Hill' }, { type: 'Dock', id: 'd', props: { position: [0, 5, -1] } }])
    expect(groundAt(w, registry, 0, 0)).toBeCloseTo(5)
    expect(groundAt(w, registry, 0, 0, { kinds: ['terrain'] })).toBeCloseTo(0)
    expect(groundAt(w, registry, 0, 0, { exclude: 'd' })).toBeCloseTo(0)
  })

  it('reads surfaces inside composite arrangements', () => {
    const w = world([{ type: 'Hut', props: { position: [0, 4, 0] } }])
    expect(groundAt(w, registry, 0, 2)).toBeCloseTo(4)
  })

  it('scales surfaces by the world unit', () => {
    const w = world([{ type: 'Dock', props: { position: [0, 1, 0], length: 10 } }], { unit: 2 })
    expect(groundAt(w, registry, 0, 15)).toBeCloseTo(1)
  })

  it('leaves tilted surfaces out, with a warning', () => {
    const w = world([{ type: 'Pad', props: { position: [0, 3, 0], rotation: [0.3, 0, 0] } }])
    const index = createGroundIndex(w, registry)
    expect(index.groundAt(0, 0)).toBe(0)
    expect(index.warnings).toHaveLength(1)
  })
})

describe('anchors', () => {
  it('resolves an anchored node to an offset above the ground at its x, z', () => {
    const w = world([
      { type: 'Hill' },
      { type: 'Crate', anchor: 'ground', props: { position: [20, 0.5, 3] } },
    ])
    expect(createGroundIndex(w, registry).position('1')).toEqual([20, 2.5, 3])
  })

  it('leaves unanchored nodes alone', () => {
    const w = world([{ type: 'Hill' }, { type: 'Crate', props: { position: [20, 0.5, 3] } }])
    expect(createGroundIndex(w, registry).position('1')).toBeUndefined()
  })

  it('ground ignores decks, surface stands on them', () => {
    const nodes = (anchor: 'ground' | 'surface'): WorldNode[] => [
      { type: 'Hill' },
      { type: 'Dock', props: { position: [0, 4, 0] } },
      { type: 'Crate', anchor, props: { position: [0, 0, 5] } },
    ]
    expect(createGroundIndex(world(nodes('ground')), registry).position('2')?.[1]).toBeCloseTo(0)
    expect(createGroundIndex(world(nodes('surface')), registry).position('2')?.[1]).toBeCloseTo(4)
  })

  it('resolves under a translated, rotated parent into parent-local Y', () => {
    const w = world([
      { type: 'Hill' },
      {
        type: 'Group',
        props: { position: [10, 3, 0], rotation: [0, Math.PI, 0] },
        // local x = 10 → world x = 0, where the hill is at 0
        children: [{ type: 'Crate', anchor: 'ground', props: { position: [10, 1, 0] } }],
      },
    ])
    const [x, y, z] = createGroundIndex(w, registry).position('1/0') as number[]
    expect([x, z]).toEqual([10, 0])
    expect(y).toBeCloseTo(1 - 3)
  })

  it('never lands a node on its own surface', () => {
    const w = world([
      { type: 'Hill' },
      { type: 'Dock', id: 'd', anchor: 'surface', props: { position: [30, 0, 0] } },
    ])
    expect(createGroundIndex(w, registry).position('1')?.[1]).toBeCloseTo(3)
  })

  it('carries anchored parents: surfaces under them move with the anchor', () => {
    const w = world([
      { type: 'Hill' },
      { type: 'Hut', anchor: 'ground', props: { position: [20, 0, 0] } },
      { type: 'Crate', anchor: 'surface', props: { position: [20, 0, 2] } },
    ])
    const index = createGroundIndex(w, registry)
    expect(index.position('1')?.[1]).toBeCloseTo(2)
    expect(index.position('2')?.[1]).toBeCloseTo(2)
  })

  it('terminates on mutually dependent anchors', () => {
    const w = world([
      { type: 'Dock', anchor: 'surface', props: { position: [0, 1, 0] } },
      { type: 'Dock', anchor: 'surface', props: { position: [0, 1, 0] } },
    ])
    const index = createGroundIndex(w, registry)
    expect(index.position('0')).toBeDefined()
    expect(index.position('1')).toBeDefined()
  })

  it('treats an anchor under a tilted parent as absolute, with a warning', () => {
    const w = world([
      { type: 'Hill' },
      {
        type: 'Group',
        props: { rotation: [0.2, 0, 0] },
        children: [{ type: 'Crate', anchor: 'ground', props: { position: [20, 0.5, 0] } }],
      },
    ])
    const index = createGroundIndex(w, registry)
    expect(index.position('1/0')).toEqual([20, 0.5, 0])
    expect(index.warnings).toHaveLength(1)
  })

  it('round-trips anchor in canonical key order and rejects bad values', () => {
    const w = world([{ type: 'Crate', id: 'c', anchor: 'ground', props: { position: [0, 0, 0] } }])
    const text = serializeWorld(w)
    expect(text.indexOf('"anchor"')).toBeGreaterThan(text.indexOf('"id"'))
    expect(text.indexOf('"anchor"')).toBeLessThan(text.indexOf('"props"'))
    expect(parseWorld(text)).toEqual(w)
    const bad = JSON.stringify(
      world([{ type: 'Group', children: [{ type: 'Crate', anchor: 'up' as never }] }]),
    )
    expect(() => parseWorld(bad)).toThrow(/anchor/)
  })
})

describe('checkWorld', () => {
  it('flags buried and floating ground-sitting nodes with a fix', () => {
    const w = world([
      { type: 'Hill' },
      { type: 'Crate', id: 'buried', props: { position: [20, 0.4, 0] } },
      { type: 'Crate', id: 'floating', props: { position: [-10, 2, 0] } },
      { type: 'Crate', id: 'fine', props: { position: [10, 1.05, 0] } },
      { type: 'Bird', props: { position: [10, 30, 0] } },
    ])
    const issues = checkWorld(w, registry)
    expect(issues.map((i) => [i.id, i.kind, i.fix])).toEqual([
      ['buried', 'buried', 2],
      ['floating', 'floating', -1],
    ])
  })

  it('accepts a node standing on a deck, and anchored nodes', () => {
    const w = world([
      { type: 'Hill' },
      { type: 'Dock', props: { position: [0, 4, 0] } },
      { type: 'Crate', props: { position: [0, 4, 5] } },
      { type: 'Crate', anchor: 'ground', props: { position: [30, 0, 0] } },
    ])
    expect(checkWorld(w, registry)).toEqual([])
  })

  it("skips a component's own children, which ride their parent", () => {
    const w = world([
      { type: 'Hill' },
      { type: 'Bird', props: { position: [0, 5, 0] }, children: [{ type: 'Crate' }] },
    ])
    expect(checkWorld(w, registry)).toEqual([])
  })

  it('checks composite instances but not their arrangement', () => {
    const w = world([{ type: 'Hill' }, { type: 'Hut', props: { position: [20, 0, 0] } }])
    const issues = checkWorld(w, registry)
    expect(issues.map((i) => [i.path, i.kind])).toEqual([['1', 'buried']])
  })

  it('flags open water standing above the ground at its rim', () => {
    const w = world([
      { type: 'Pad', props: { position: [0, 0, 0] } },
      { type: 'Pond', props: { position: [30, 3, 0] } },
    ])
    // The rim falls off the pad onto the baseline (0), 3 below the water.
    expect(checkWorld(w, registry).map((i) => i.kind)).toEqual(['water-above-ground'])
  })
})
