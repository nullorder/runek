import { describe, expect, it } from 'vitest'
import { WorldNodes } from './WorldNodes'
import {
  type ComponentRegistry,
  type CompositeDef,
  isCompositeDef,
  seedCompositeNodes,
  unpackComposite,
  type WorldNode,
} from './world-data'

const Probe = () => null

const house: CompositeDef = {
  kind: 'composite',
  name: 'House',
  nodes: [
    { type: 'Probe', props: { size: [9, 7] } },
    { type: 'Probe', props: { seed: 42 } },
    { type: 'Probe' },
  ],
}

const registry = { Probe, House: house } as unknown as ComponentRegistry

// WorldNodes is hook-free, so we can call it directly and inspect the React
// elements it builds (no canvas/DOM needed).
function rendered(nodes: WorldNode[]): Array<{ type: unknown; props: Record<string, unknown> }> {
  const frag = WorldNodes({ nodes, registry }) as unknown as { props: { children: unknown } }
  const kids = frag.props.children
  return (Array.isArray(kids) ? kids : [kids]) as Array<{
    type: unknown
    props: Record<string, unknown>
  }>
}

describe('isCompositeDef', () => {
  it('accepts a composite and rejects components and junk', () => {
    expect(isCompositeDef(house)).toBe(true)
    expect(isCompositeDef(Probe as never)).toBe(false)
    expect(isCompositeDef(undefined)).toBe(false)
    expect(isCompositeDef({ kind: 'composite' } as never)).toBe(false)
  })
})

describe('seedCompositeNodes', () => {
  it('passes nodes through untouched when the instance has no seed', () => {
    expect(seedCompositeNodes(house.nodes)).toBe(house.nodes)
  })

  it('derives stable seeds for unpinned children and respects pinned ones', () => {
    const a = seedCompositeNodes(house.nodes, 7)
    const b = seedCompositeNodes(house.nodes, 7)
    expect(a).toEqual(b)
    expect(a[0].props?.seed).toBeTypeOf('number')
    expect(a[1].props?.seed).toBe(42)
    expect(a[2].props?.seed).toBeTypeOf('number')
    expect(a[0].props?.seed).not.toBe(a[2].props?.seed)
    const other = seedCompositeNodes(house.nodes, 8)
    expect(other[0].props?.seed).not.toBe(a[0].props?.seed)
  })
})

describe('WorldNodes composite expansion', () => {
  it('expands a composite instance into a positioned group of its arrangement', () => {
    const [group] = rendered([{ type: 'House', props: { position: [4, 0, -2] } }])
    expect(group.type).toBe('group')
    expect(group.props.position).toEqual([4, 0, -2])
  })

  it('renders the built-in Group as a transform container for its children', () => {
    const [group] = rendered([
      { type: 'Group', props: { position: [1, 2, 3] }, children: [{ type: 'Probe' }] },
    ])
    expect(group.type).toBe('group')
    expect(group.props.position).toEqual([1, 2, 3])
  })
})

describe('unpackComposite', () => {
  it('turns an instance into a Group carrying a deep copy of the arrangement', () => {
    const instance: WorldNode = {
      type: 'House',
      id: 'n1',
      props: { position: [4, 0, -2], seed: 7 },
    }
    const unpacked = unpackComposite(instance, house)
    expect(unpacked.type).toBe('Group')
    expect(unpacked.props?.position).toEqual([4, 0, -2])
    expect(unpacked.children).toHaveLength(3)
    // the instance seed is baked in, so the unpacked subtree renders identically
    expect(unpacked.children?.[0].props?.seed).toBe(
      seedCompositeNodes(house.nodes, 7)[0].props?.seed,
    )
    // a deep copy: editing the unpacked tree never mutates the definition
    expect(unpacked.children?.[0]).not.toBe(house.nodes[0])
    expect(unpacked.children?.[0].props).not.toBe(house.nodes[0].props)
  })
})
