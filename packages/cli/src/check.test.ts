import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  applyFixes,
  loadCoreData,
  loadGroundRegistry,
  nodeAtPath,
  type WorldData,
} from './check.ts'

const components = fileURLToPath(new URL('../../components/src', import.meta.url))

describe('loadGroundRegistry', () => {
  it('reads surfaces, ground-sitting flags, and composites from component source', async () => {
    const registry = (await loadGroundRegistry(components)) as Record<
      string,
      Record<string, unknown>
    >
    expect(registry.Terrain.surface).toMatchObject({ kind: 'terrain' })
    expect(registry.Dock.surface).toMatchObject({ kind: 'deck' })
    expect(registry.Person.groundSitting).toBe(true)
    expect(registry.Birds).toBeUndefined()
    expect(registry.House).toMatchObject({ kind: 'composite', groundSitting: true })
  })
})

describe('check-world', () => {
  const world = (): WorldData => ({
    version: 1,
    nodes: [
      { type: 'Terrain', props: { size: [40, 40], relief: 3, seed: 7 } },
      { type: 'Group', children: [{ type: 'Person', id: 'p', props: { position: [12, -5, 3] } }] },
      { type: 'Crate', props: { position: [0, 0.2, 30] } },
    ],
  })

  it('flags a buried node through core and fixes it in place', async () => {
    const core = await loadCoreData([components])
    const registry = await loadGroundRegistry(components)
    const w = world()
    const issues = core.checkWorld(w, registry)
    expect(issues.map((i) => [i.path, i.kind])).toEqual([
      ['1/0', 'buried'],
      ['2', 'floating'],
    ])
    expect(applyFixes(w, issues)).toBe(2)
    expect(core.checkWorld(w, registry)).toEqual([])
    expect(nodeAtPath(w.nodes, '1/0')?.props?.position).toEqual([12, issues[0].fix, 3])
  })
})
