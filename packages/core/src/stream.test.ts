import { describe, expect, it } from 'vitest'
import { createStreamIndex, nearNodes, STREAM_HYSTERESIS, streamOptions } from './stream'
import type { ComponentRegistry, WorldNode } from './world-data'

const Lamp = () => null
const Sky = Object.assign(() => null, { stream: false })
const registry: ComponentRegistry = {
  Lamp,
  Sky,
  Block: { kind: 'composite', bounds: [40, 10, 40], nodes: [] },
}
const at = (x: number, z: number, type = 'Lamp', props: object = {}): WorldNode => ({
  type,
  props: { position: [x, 0, z], ...props },
})

describe('streamOptions (#64)', () => {
  it('is off unless asked for, and scales by unit', () => {
    expect(streamOptions(undefined)).toBeNull()
    expect(streamOptions(false)).toBeNull()
    expect(streamOptions(true)).toEqual({ radius: 80, cell: 20, build: true })
    expect(streamOptions({ radius: 30, build: false }, 2)).toEqual({
      radius: 60,
      cell: 40,
      build: false,
    })
  })
})

describe('createStreamIndex / nearNodes', () => {
  const options = { radius: 50, cell: 20, build: true }

  it('mounts only what is near, and always what never streams', () => {
    const nodes = [
      at(0, 0),
      at(40, 0),
      at(200, 0),
      { type: 'Sky' },
      at(500, 500, 'Sky'),
      { type: 'Group', children: [at(900, 0)] },
      { type: 'Lamp' },
    ]
    const index = createStreamIndex(nodes, registry, options)
    expect(index.always).toEqual([3, 4, 5, 6])
    expect(nearNodes(index, 0, 0)).toEqual([0, 1, 3, 4, 5, 6])
    expect(nearNodes(index, 200, 0)).toEqual([2, 3, 4, 5, 6])
  })

  it('keeps a mounted node a little past the radius, so a boundary does not flicker', () => {
    const index = createStreamIndex([at(60, 0)], registry, options)
    expect(nearNodes(index, 0, 0)).toEqual([])
    expect(nearNodes(index, 12, 0)).toEqual([0])
    const mounted = new Set([0])
    expect(nearNodes(index, 0, 0, mounted)).toEqual([0])
    expect(nearNodes(index, 60 - 50 * STREAM_HYSTERESIS - 1, 0, mounted)).toEqual([])
  })

  it('measures to the footprint: composite bounds, or a size prop', () => {
    const nodes = [at(100, 0, 'Block'), at(0, 100, 'Lamp', { size: [80, 80] })]
    const index = createStreamIndex(nodes, registry, options)
    // the block's footprint reaches ~28 m from its center, the 80 m pad's ~57 m
    expect(nearNodes(index, 60, -30)).toEqual([0])
    expect(nearNodes(index, 0, 0)).toEqual([1])
    expect(nearNodes(index, 50, 30)).toEqual([0, 1])
    expect(nearNodes(index, -60, -30)).toEqual([])
    // a footprint spanning cells is found from any of them
    expect([...index.cells.values()].filter((list) => list.includes(1)).length).toBeGreaterThan(4)
  })

  it('reads an anchored node from the ground index', () => {
    const ground = { position: (path: string) => (path === '0' ? [300, 2, 0] : undefined) }
    const index = createStreamIndex(
      [{ type: 'Lamp', anchor: 'ground', props: { position: [0, 0, 0] } }],
      registry,
      options,
      1,
      ground as never,
    )
    expect(nearNodes(index, 0, 0)).toEqual([])
    expect(nearNodes(index, 300, 0)).toEqual([0])
  })

  it('handles thousands of nodes quickly', () => {
    const nodes = Array.from({ length: 10_000 }, (_, i) =>
      at((i % 100) * 10, Math.floor(i / 100) * 10),
    )
    const index = createStreamIndex(nodes, registry, options)
    const start = performance.now()
    const near = nearNodes(index, 500, 500)
    expect(performance.now() - start).toBeLessThan(20)
    expect(near.length).toBeGreaterThan(50)
    expect(near.length).toBeLessThan(150)
  })
})
