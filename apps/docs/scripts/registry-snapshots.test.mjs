import { describe, expect, it } from 'vitest'
import { compareDesc, parseTag, versionsIndex } from './registry-snapshots.mjs'

const releases = (...tags) => tags.map(parseTag)

describe('parseTag', () => {
  it('reads release and prerelease tags, and skips anything else', () => {
    expect(parseTag('v0.15.0')).toMatchObject({ version: '0.15.0', core: [0, 15, 0], pre: [] })
    expect(parseTag('v0.17.0-rc.1')).toMatchObject({ version: '0.17.0-rc.1', pre: ['rc', '1'] })
    expect(parseTag('v1')).toBeNull()
    expect(parseTag('docs-v2')).toBeNull()
  })
})

describe('compareDesc', () => {
  it('orders by semver precedence, newest first', () => {
    const sorted = releases(
      'v0.10.0',
      'v0.9.0',
      'v0.10.4',
      'v0.11.0-rc.2',
      'v0.11.0',
      'v0.11.0-rc.10',
      'v0.11.0-alpha.0',
    ).sort(compareDesc)
    expect(sorted.map((r) => r.version)).toEqual([
      '0.11.0',
      '0.11.0-rc.10',
      '0.11.0-rc.2',
      '0.11.0-alpha.0',
      '0.10.4',
      '0.10.0',
      '0.9.0',
    ])
  })
})

describe('versionsIndex', () => {
  it('points latest at the newest stable release and lists every snapshot', () => {
    expect(versionsIndex(releases('v0.14.0', 'v0.16.0-rc.1', 'v0.15.0'))).toEqual({
      latest: '0.15.0',
      versions: ['0.16.0-rc.1', '0.15.0', '0.14.0'],
      channels: { rc: '0.16.0-rc.1' },
    })
  })

  it('has no latest and no channels without stable releases or prereleases', () => {
    expect(versionsIndex([])).toEqual({ latest: null, versions: [] })
  })
})
