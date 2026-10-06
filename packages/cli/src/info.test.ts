import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { componentInfo, formatInfo, resolveItem } from './info.ts'
import { fetchIndex, fetchManifest, fetchPropSchema } from './lib.ts'

const localRegistry = fileURLToPath(new URL('../../../registry', import.meta.url))

describe('resolveItem', () => {
  const items = [
    { name: 'bench', title: 'Bench', type: 'registry:component' },
    { name: 'arcadecabinet', title: 'ArcadeCabinet', type: 'registry:component' },
  ]

  it('takes the registry name or the world type, in any case', () => {
    expect(resolveItem(items, 'bench').name).toBe('bench')
    expect(resolveItem(items, 'ArcadeCabinet').name).toBe('arcadecabinet')
    expect(resolveItem(items, 'BENCH').name).toBe('bench')
  })

  it('suggests a close name on a miss', () => {
    expect(() => resolveItem(items, 'bnch')).toThrow('Did you mean "bench"?')
    expect(() => resolveItem(items, 'lighthouse')).not.toThrow('Did you mean')
  })
})

describe('componentInfo', () => {
  it('merges the index, manifest, and prop schema into one card', async () => {
    const [index, schema] = await Promise.all([
      fetchIndex(localRegistry),
      fetchPropSchema(localRegistry),
    ])
    const item = resolveItem(index.items, 'bookshelf')
    const info = componentInfo(
      item,
      await fetchManifest(localRegistry, item.name),
      schema.Bookshelf,
    )
    expect(info).toMatchObject({
      name: 'bookshelf',
      title: 'Bookshelf',
      add: 'npx @runek/cli add bookshelf',
      example: { node: { type: 'Bookshelf', props: { position: [0, 0, 0], seed: 1 } } },
    })
    expect(info.example.jsx).toBe('<Bookshelf position={[0, 0, 0]} seed={1} />')
    expect(info.props.find((p) => p.name === 'seed')).toMatchObject({ type: 'number' })
    expect(info.dependencies.some((d) => d.startsWith('@runek/core@'))).toBe(true)
    expect(formatInfo(info)).toContain('npx @runek/cli add bookshelf')
  })

  it('leaves seed out of the example when the component ignores it', async () => {
    const [index, schema] = await Promise.all([
      fetchIndex(localRegistry),
      fetchPropSchema(localRegistry),
    ])
    const item = resolveItem(index.items, 'bench')
    const info = componentInfo(item, await fetchManifest(localRegistry, item.name), schema.Bench)
    expect(info.example.jsx).toBe('<Bench position={[0, 0, 0]} />')
  })
})
