import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { collectDependencies, installCommand, resolveItems } from './lib.ts'

const localRegistry = fileURLToPath(new URL('../../../registry', import.meta.url))

describe('collectDependencies', () => {
  it('unions, dedupes, and sorts across manifests', () => {
    const deps = collectDependencies([
      {
        name: 'a',
        type: 'registry:component',
        dependencies: ['three', 'react'],
        registryDependencies: [],
        files: [],
      },
      {
        name: 'b',
        type: 'registry:component',
        dependencies: ['three'],
        registryDependencies: [],
        files: [],
      },
    ])
    expect(deps).toEqual(['react', 'three'])
  })
})

describe('installCommand', () => {
  it('uses "install" for npm and "add" elsewhere', () => {
    expect(installCommand('npm', ['three'])).toBe('npm install three')
    expect(installCommand('pnpm', ['three'])).toBe('pnpm add three')
  })
})

describe('resolveItems', () => {
  it('resolves sibling component dependencies, deps before dependents', async () => {
    const manifests = await resolveItems(localRegistry, ['house'])
    const names = manifests.map((m) => m.name)
    expect(names).toContain('wall')
    expect(names).not.toContain('core') // core is an npm dep now, not a copied item
    expect(names.at(-1)).toBe('house')
    expect(names.indexOf('wall')).toBeLessThan(names.indexOf('house'))
  })

  it('does not duplicate a shared dependency', async () => {
    const manifests = await resolveItems(localRegistry, ['house', 'wall'])
    const walls = manifests.filter((m) => m.name === 'wall')
    expect(walls).toHaveLength(1)
  })

  it('declares @runek/core as an npm dependency on each component', async () => {
    const [bookshelf] = await resolveItems(localRegistry, ['bookshelf'])
    expect(bookshelf.dependencies.some((d) => d.startsWith('@runek/core@'))).toBe(true)
  })

  it('resolves a composite: its arrangement JSON plus the parts it references', async () => {
    const manifests = await resolveItems(localRegistry, ['house'])
    const house = manifests.find((m) => m.name === 'house')
    expect(house?.type).toBe('registry:composite')
    expect(house?.files.map((f) => f.path)).toEqual(['composites/house.json'])
    const arrangement = JSON.parse(house?.files[0].content ?? '')
    expect(arrangement.kind).toBe('composite')
    expect(Array.isArray(arrangement.nodes)).toBe(true)
    // parts arrive as ordinary component manifests, dependencies first
    const names = manifests.map((m) => m.name)
    for (const part of ['level', 'door', 'window', 'roof', 'staircase', 'plant']) {
      expect(names.indexOf(part)).toBeGreaterThanOrEqual(0)
      expect(names.indexOf(part)).toBeLessThan(names.indexOf('house'))
    }
  })
})
