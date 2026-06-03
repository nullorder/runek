import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { collectDependencies, installCommand, resolveItems, rewriteCoreImport } from './lib.ts'

const localRegistry = fileURLToPath(new URL('../../../registry', import.meta.url))

describe('rewriteCoreImport', () => {
  it('repoints the core import, leaving others untouched', () => {
    const src = [
      "import { CuboidCollider } from '@react-three/rapier'",
      "import { rng, useWorld, type Vec3 } from '@runek/core'",
    ].join('\n')
    const out = rewriteCoreImport(src, './core')
    expect(out).toContain("from './core'")
    expect(out).not.toContain('@runek/core')
    expect(out).toContain("from '@react-three/rapier'")
  })

  it('honors a custom core import and double quotes', () => {
    expect(rewriteCoreImport('from "@runek/core"', '@/runek/core')).toBe('from "@/runek/core"')
  })
})

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
  it('resolves registry dependencies with deps ordered before dependents', async () => {
    const manifests = await resolveItems(localRegistry, ['house'])
    const names = manifests.map((m) => m.name)
    expect(names).toContain('core')
    expect(names).toContain('wall')
    expect(names.at(-1)).toBe('house')
    expect(names.indexOf('core')).toBeLessThan(names.indexOf('house'))
  })

  it('does not duplicate a shared dependency', async () => {
    const manifests = await resolveItems(localRegistry, ['door', 'window'])
    const cores = manifests.filter((m) => m.name === 'core')
    expect(cores).toHaveLength(1)
  })
})
