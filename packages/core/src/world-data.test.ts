import { describe, expect, it } from 'vitest'
import { parseWorld, serializeWorld, type WorldData } from './world-data'

const sample: WorldData = {
  version: 1,
  unit: 1,
  gravity: [0, -9.81, 0],
  nodes: [
    { type: 'Terrain', props: { size: [60, 60], seed: 9 } },
    {
      type: 'House',
      props: { position: [0, 0, 0] },
      children: [{ type: 'Bookshelf', props: { seed: 42, fill: 0.85 } }],
    },
    { type: 'Player', props: { view: 'first', yaw: Math.PI } },
  ],
}

describe('world-data', () => {
  it('round-trips through serialize → parse with no loss', () => {
    expect(parseWorld(serializeWorld(sample))).toEqual(sample)
  })

  it('rejects an unsupported version', () => {
    expect(() => parseWorld('{"version":2,"nodes":[]}')).toThrow()
  })

  it('rejects data without a nodes array', () => {
    expect(() => parseWorld('{"version":1}')).toThrow()
  })
})
