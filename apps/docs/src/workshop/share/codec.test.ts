import { describe, expect, it } from 'vitest'
import { decodeShare, encodeShare, parseHash, type SharePayload } from './codec'

const payload: SharePayload = {
  world: {
    version: 1,
    time: '18:30',
    nodes: Array.from({ length: 20 }, (_, i) => ({
      type: i % 2 ? 'Trees' : 'Crate',
      id: `n${i}`,
      props: { position: [i, 0, i * 2], seed: i * 7 },
    })),
  },
  code: 'export default function App() { return <group /> } // ünïcode ✓',
  mode: 'code',
  stage: 'plot',
  camera: { position: [6, 4, 6], target: [0, 1, 0] },
}

describe('share codec', () => {
  it('round-trips a payload exactly, URL-safe', async () => {
    const text = await encodeShare(payload)
    expect(text).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(await decodeShare(text)).toEqual(payload)
  })

  it('stays well under a kilobyte or two for a 20-node world', async () => {
    const text = await encodeShare({ world: payload.world })
    expect(text.length).toBeLessThan(1500)
  })

  it('rejects garbage', async () => {
    await expect(decodeShare('not-a-link')).rejects.toThrow()
  })

  it('parses hash params', () => {
    expect(parseHash('#m=lab&c=Bookshelf')).toEqual({ mode: 'lab', component: 'Bookshelf' })
    expect(parseHash('#s=abc').share).toBe('abc')
    expect(parseHash('#m=nope').mode).toBeUndefined()
  })
})
