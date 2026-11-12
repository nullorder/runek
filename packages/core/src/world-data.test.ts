import { describe, expect, it } from 'vitest'
import { validateWorld } from './validate'
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

  it('keeps $schema first', () => {
    const $schema = 'https://runek.nullorder.org/r/world.schema.json'
    const text = serializeWorld({ ...sample, $schema })
    expect(Object.keys(JSON.parse(text))[0]).toBe('$schema')
    expect(parseWorld(text).$schema).toBe($schema)
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

  it('accepts every avatar view, overhead included', () => {
    for (const view of ['first', 'third', 'overhead'])
      expect(parseWorld(`{"version":1,"avatar":"${view}","nodes":[]}`).avatar).toBe(view)
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

  it('takes one fallback font or a list (#66)', () => {
    expect(parseWorld('{"version":1,"fonts":{"fallback":"cjk.woff"},"nodes":[]}').fonts).toEqual({
      fallback: 'cjk.woff',
    })
    const world = parseWorld('{"version":1,"fonts":{"fallback":["a.woff","b.ttf"]},"nodes":[]}')
    expect(world.fonts?.fallback).toEqual(['a.woff', 'b.ttf'])
    expect(() => parseWorld('{"version":1,"fonts":{"display":["a.woff"]},"nodes":[]}')).toThrow()
    expect(() => parseWorld('{"version":1,"fonts":{"fallback":["a.woff",1]},"nodes":[]}')).toThrow()
  })

  it('checks font roles and what the bundled font can draw (#66)', () => {
    const schema = {
      Sign: {
        props: {
          children: { type: 'string' },
          variant: { type: 'enum', options: ['display', 'body'] },
          font: { type: 'string' },
        },
      },
    } as never
    const sign = (props: object) => ({ type: 'Sign', props })
    const issues = validateWorld(
      {
        version: 1,
        fonts: { dispaly: 'x.woff', fallback: [1] },
        nodes: [sign({ children: 'Café → 東京 ❤️' })],
      },
      schema,
    )
    expect(issues.map((i) => [i.path.join('.'), i.severity])).toEqual([
      ['fonts.dispaly', 'warning'],
      ['fonts.fallback', 'error'],
    ])
    expect(issues[0].message).toContain('Did you mean "display"?')

    const plain = validateWorld(
      { version: 1, nodes: [sign({ children: 'Café → 東京 ❤️\nok' }), sign({ children: 'Hi' })] },
      schema,
    )
    expect(plain).toHaveLength(1)
    expect(plain[0].path).toEqual(['nodes', 0, 'props', 'children'])
    expect(plain[0].message).toContain('"→", "東", "京", "❤"')
    expect(plain[0].message).toContain('"display" role')

    const declared = [{ fonts: { display: 'cjk.woff' } }, { fonts: { fallback: 'cjk.woff' } }].map(
      (world) =>
        validateWorld({ version: 1, ...world, nodes: [sign({ children: '東京' })] }, schema),
    )
    expect(declared).toEqual([[], []])
    expect(
      validateWorld(
        {
          version: 1,
          fonts: { display: 'cjk.woff' },
          nodes: [sign({ children: '東京', variant: 'body' }), sign({ children: '東', font: 'a' })],
        },
        schema,
      ),
    ).toHaveLength(1)
  })

  it('keeps luminance levels and rejects non-numbers', () => {
    const world = parseWorld('{"version":1,"luminance":{"screen":2,"tube":6},"nodes":[]}')
    expect(world.luminance).toEqual({ screen: 2, tube: 6 })
    expect(() => parseWorld('{"version":1,"luminance":[2],"nodes":[]}')).toThrow()
    expect(() => parseWorld('{"version":1,"luminance":{"screen":"2"},"nodes":[]}')).toThrow()
  })

  it('flags unknown and negative luminance levels', () => {
    const issues = validateWorld(
      { version: 1, luminance: { scren: 2, lamp: -1, tube: 4 }, nodes: [] },
      {},
    )
    expect(issues.map((i) => [i.path.join('.'), i.severity])).toEqual([
      ['luminance.scren', 'warning'],
      ['luminance.lamp', 'warning'],
    ])
    expect(issues[0].message).toContain('Did you mean "screen"?')
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
