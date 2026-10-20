import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  compareVersions,
  coreVersion,
  pickVersion,
  rangeFloor,
  resolveRegistry,
  sameReleaseLine,
  type VersionsIndex,
} from './versions.ts'

const localRegistry = fileURLToPath(new URL('../../../registry', import.meta.url))

const index: VersionsIndex = {
  latest: '0.16.0',
  versions: ['0.17.0-rc.1', '0.16.0', '0.15.2', '0.15.0', '0.14.0', '0.10.4', '0.10.0'],
  channels: { rc: '0.17.0-rc.1' },
}

function tempDir(files: Record<string, unknown> = {}): string {
  const dir = mkdtempSync(join(tmpdir(), 'runek-versions-'))
  for (const [path, value] of Object.entries(files)) {
    mkdirSync(join(dir, path, '..'), { recursive: true })
    writeFileSync(join(dir, path), typeof value === 'string' ? value : JSON.stringify(value))
  }
  return dir
}

describe('compareVersions', () => {
  it('follows semver precedence', () => {
    expect(compareVersions('0.15.0', '0.16.0')).toBeLessThan(0)
    expect(compareVersions('0.10.4', '0.9.9')).toBeGreaterThan(0)
    expect(compareVersions('0.17.0-rc.1', '0.17.0')).toBeLessThan(0)
    expect(compareVersions('0.17.0-rc.10', '0.17.0-rc.2')).toBeGreaterThan(0)
    expect(compareVersions('0.15.0', '0.15.0')).toBe(0)
  })
})

describe('sameReleaseLine', () => {
  it('compares the minor before 1.0 and the major after', () => {
    expect(sameReleaseLine('0.15.0', '0.15.3')).toBe(true)
    expect(sameReleaseLine('0.15.0', '0.16.0')).toBe(false)
    expect(sameReleaseLine('1.2.0', '1.5.0')).toBe(true)
    expect(sameReleaseLine('1.2.0', '2.0.0')).toBe(false)
  })
})

describe('pickVersion', () => {
  it('takes the exact snapshot', () => {
    expect(pickVersion(index, '0.15.0')).toBe('0.15.0')
  })

  it('falls back to the newest older snapshot on the same release line', () => {
    expect(pickVersion(index, '0.15.3')).toBe('0.15.2')
    expect(pickVersion(index, '0.15.1')).toBe('0.15.0')
    expect(pickVersion(index, '0.10.3')).toBe('0.10.0')
  })

  it('never crosses a pre-1.0 minor or picks a newer snapshot', () => {
    expect(pickVersion(index, '0.13.0')).toBeNull()
    expect(pickVersion(index, '0.18.0')).toBeNull()
    expect(pickVersion(index, '0.14.0-rc.0')).toBeNull()
  })

  it('resolves latest and channel names', () => {
    expect(pickVersion(index, 'latest')).toBe('0.16.0')
    expect(pickVersion(index, 'rc')).toBe('0.17.0-rc.1')
    expect(pickVersion(index, 'nope')).toBeNull()
  })
})

describe('rangeFloor', () => {
  it('reads plain ranges and ignores the rest', () => {
    expect(rangeFloor('^0.15.0')).toBe('0.15.0')
    expect(rangeFloor('~0.15.2')).toBe('0.15.2')
    expect(rangeFloor('>=0.14.0')).toBe('0.14.0')
    expect(rangeFloor('0.17.0-rc.1')).toBe('0.17.0-rc.1')
    expect(rangeFloor('workspace:*')).toBeNull()
    expect(rangeFloor('latest')).toBeNull()
    expect(rangeFloor('^0.15.0 || ^0.16.0')).toBeNull()
  })
})

describe('coreVersion', () => {
  it('prefers the installed copy, found walking up', () => {
    const root = tempDir({
      'node_modules/@runek/core/package.json': { version: '0.15.2' },
      'app/package.json': { dependencies: { '@runek/core': '^0.15.0' } },
    })
    expect(coreVersion(join(root, 'app'))).toEqual({ version: '0.15.2', source: 'installed' })
  })

  it("falls back to package.json's range, then null", () => {
    const app = tempDir({ 'package.json': { devDependencies: { '@runek/core': '^0.14.0' } } })
    expect(coreVersion(app)).toEqual({ version: '0.14.0', source: 'package.json' })
    expect(coreVersion(tempDir({ 'package.json': { name: 'x' } }))).toBeNull()
  })
})

describe('resolveRegistry', () => {
  const served = tempDir({
    'versions.json': { latest: '0.16.0', versions: ['0.16.0', '0.15.0'] },
  })

  it('uses a registry without versions.json as-is', async () => {
    const resolved = await resolveRegistry(localRegistry, tempDir())
    expect(resolved).toEqual({ base: localRegistry })
  })

  it('rejects --core on an unversioned registry', async () => {
    await expect(resolveRegistry(localRegistry, tempDir(), 'latest')).rejects.toThrow(
      /versions\.json/,
    )
  })

  it("picks the snapshot matching the project's core", async () => {
    const app = tempDir({ 'node_modules/@runek/core/package.json': { version: '0.15.0' } })
    const resolved = await resolveRegistry(served, app)
    expect(resolved.base).toBe(join(served, '0.15.0'))
    expect(resolved.version).toBe('0.15.0')
    expect(resolved.latest).toBe('0.16.0')
    expect(resolved.reason).toMatch(/installed @runek\/core 0\.15\.0/)
  })

  it('uses latest without core, and honours --core', async () => {
    expect((await resolveRegistry(served, tempDir())).version).toBe('0.16.0')
    const app = tempDir({ 'node_modules/@runek/core/package.json': { version: '0.15.0' } })
    expect((await resolveRegistry(served, app, 'latest')).version).toBe('0.16.0')
  })

  it('explains when nothing matches', async () => {
    const app = tempDir({ 'node_modules/@runek/core/package.json': { version: '0.13.0' } })
    await expect(resolveRegistry(served, app)).rejects.toThrow(/--core latest/)
  })
})
