import { describe, expect, it } from 'vitest'
import { assignNodeIds, parseWorld, serializeWorld, type WorldData } from './world-data'

const sample: WorldData = {
  version: 1,
  unit: 1,
  gravity: [0, -9.81, 0],
  palette: { wood: '#7a5638', foliage: '#557d3c' },
  fog: { color: '#cfe3f5', near: 30, far: 90 },
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

  it('round-trips meta and node ids with no loss', () => {
    const withMeta: WorldData = {
      version: 1,
      meta: {
        title: 'Helicon',
        description: 'A walkable procedural island.',
        authors: [{ name: 'Kumar Anirudha', url: 'https://anirudha.dev' }],
        license: 'CC-BY-4.0',
        source: {
          url: 'https://github.com/nullorder/helicon',
          path: 'public/helicon.world.json',
          branch: 'main',
        },
      },
      nodes: [{ type: 'Terrain', id: 'n1', props: { seed: 9 } }],
    }
    expect(parseWorld(serializeWorld(withMeta))).toEqual(withMeta)
  })

  it('round-trips world settings (ground, time, timezone, avatar) with no loss', () => {
    const settings: WorldData = {
      version: 1,
      ground: -0.5,
      time: '18:30',
      timezone: 'Asia/Kolkata',
      avatar: 'third',
      nodes: [{ type: 'Player' }],
    }
    expect(parseWorld(serializeWorld(settings))).toEqual(settings)
  })

  it('round-trips world fonts with no loss', () => {
    const withFonts: WorldData = {
      version: 1,
      fonts: { display: '/fonts/Pixelspace-Regular.woff2', body: 'system-ui.woff2' },
      nodes: [{ type: 'Sign', props: { children: 'Hello' } }],
    }
    expect(parseWorld(serializeWorld(withFonts))).toEqual(withFonts)
  })

  it('serializes keys in a canonical order regardless of input order', () => {
    const scrambled = {
      nodes: [{ props: { seed: 1 }, type: 'Terrain' }],
      palette: { wood: '#000' },
      time: '06:00',
      unit: 2,
      version: 1,
    } as WorldData
    const text = serializeWorld(scrambled)
    expect(text.indexOf('"version"')).toBeLessThan(text.indexOf('"unit"'))
    expect(text.indexOf('"unit"')).toBeLessThan(text.indexOf('"time"'))
    expect(text.indexOf('"time"')).toBeLessThan(text.indexOf('"palette"'))
    expect(text.indexOf('"palette"')).toBeLessThan(text.indexOf('"nodes"'))
    expect(text.indexOf('"type"')).toBeLessThan(text.indexOf('"props"'))
  })

  it('rejects an unknown avatar value', () => {
    expect(() => parseWorld('{"version":1,"avatar":"bird","nodes":[]}')).toThrow()
  })

  it('rejects a non-number ground', () => {
    expect(() => parseWorld('{"version":1,"ground":"low","nodes":[]}')).toThrow()
  })

  it('rejects a non-object fonts', () => {
    expect(() => parseWorld('{"version":1,"fonts":["a.woff2"],"nodes":[]}')).toThrow()
  })

  it('rejects a non-string font value', () => {
    expect(() => parseWorld('{"version":1,"fonts":{"display":42},"nodes":[]}')).toThrow()
  })

  it('rejects an unsupported version', () => {
    expect(() => parseWorld('{"version":2,"nodes":[]}')).toThrow()
  })

  it('rejects data without a nodes array', () => {
    expect(() => parseWorld('{"version":1}')).toThrow()
  })

  it('rejects a non-object meta', () => {
    expect(() => parseWorld('{"version":1,"meta":"nope","nodes":[]}')).toThrow()
  })

  it('rejects meta.authors that is not an array', () => {
    expect(() => parseWorld('{"version":1,"meta":{"authors":"me"},"nodes":[]}')).toThrow()
  })
})

describe('assignNodeIds', () => {
  it('gives every node a stable id, preserving existing ones', () => {
    const input: WorldData = {
      version: 1,
      nodes: [
        { type: 'Terrain', id: 'keep-me' },
        { type: 'House', children: [{ type: 'Bookshelf' }] },
      ],
    }
    const out = assignNodeIds(input)

    expect(out.nodes[0].id).toBe('keep-me')
    expect(out.nodes[1].id).toBeTypeOf('string')
    expect(out.nodes[1].children?.[0].id).toBeTypeOf('string')

    const ids = [out.nodes[0].id, out.nodes[1].id, out.nodes[1].children?.[0].id]
    expect(new Set(ids).size).toBe(3)
  })

  it('does not mutate the input world', () => {
    const input: WorldData = { version: 1, nodes: [{ type: 'Terrain' }] }
    assignNodeIds(input)
    expect(input.nodes[0].id).toBeUndefined()
  })
})
