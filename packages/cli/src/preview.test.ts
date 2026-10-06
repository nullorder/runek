import { inflateRawSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { encodeShare, previewUrl, siteOrigin } from './preview.ts'

describe('preview', () => {
  const world = { version: 1, nodes: [{ type: 'Bench', props: { position: [1, 0, 2] } }] }

  it('encodes the way the workshop decodes share links', () => {
    const text = encodeShare(world)
    expect(text).toMatch(/^[\w-]+$/)
    const decoded = JSON.parse(inflateRawSync(Buffer.from(text, 'base64url')).toString())
    expect(decoded).toEqual({ v: 1, world })
  })

  it('points at the site that serves the registry', () => {
    expect(siteOrigin('https://runek.nullorder.org/r')).toBe('https://runek.nullorder.org')
    expect(siteOrigin('http://localhost:4321/r/')).toBe('http://localhost:4321')
    expect(siteOrigin('./registry')).toBe('https://runek.nullorder.org')
    expect(previewUrl(world, './registry')).toMatch(
      /^https:\/\/runek\.nullorder\.org\/workshop#s=[\w-]+$/,
    )
  })
})
