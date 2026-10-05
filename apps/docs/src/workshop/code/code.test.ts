import { parser } from '@lezer/json'
import { describe, expect, it } from 'vitest'
import { SCHEMA } from '../schema'
import { containerAt, nodePathOf, pathAt, propertyAt, rangeOf } from './json-tree'
import { suggest, validateWorld } from './validate'

const text = `{
  "version": 1,
  "nodes": [
    { "type": "Bookshelf", "id": "a", "props": { "fil": 0.5, "width": "wide" } },
    { "type": "Bookshelfs", "children": [{ "type": "Lamp", "props": { "intensity": 3 } }] }
  ]
}`
const doc = { sliceString: (from: number, to: number) => text.slice(from, to) }
const tree = parser.parse(text)

describe('validateWorld', () => {
  const issues = validateWorld(JSON.parse(text), SCHEMA)
  it('suggests prop and component names', () => {
    expect(issues.find((i) => i.path.join('.') === 'nodes.0.props.fil')?.message).toContain(
      'Did you mean "fill"?',
    )
    expect(issues.find((i) => i.path.join('.') === 'nodes.1.type')?.message).toContain(
      '"Bookshelf"',
    )
  })
  it('type-checks prop values', () => {
    expect(issues.find((i) => i.path.join('.') === 'nodes.0.props.width')?.message).toContain(
      'expects number',
    )
  })
  it('accepts a valid world', () => {
    expect(
      validateWorld(
        { version: 1, nodes: [{ type: 'Trees', props: { seed: 2, angle: 0.4 } }] },
        SCHEMA,
      ),
    ).toEqual([])
  })
  it('flags structural errors', () => {
    expect(validateWorld({ nodes: {} }, SCHEMA).filter((i) => i.severity === 'error')).toHaveLength(
      2,
    )
  })
  it('suggests only close names', () => {
    expect(suggest('Bokshelf', ['Bookshelf', 'Lamp'])).toBe('Bookshelf')
    expect(suggest('xyz', ['Bookshelf'])).toBeUndefined()
  })
})

describe('json-tree', () => {
  it('maps a path to its source range', () => {
    const r = rangeOf(tree, doc, ['nodes', 1, 'children', 0, 'props', 'intensity'])
    expect(r && text.slice(r.from, r.to)).toBe('3')
    const k = rangeOf(tree, doc, ['nodes', 0, 'props', 'fil'], true)
    expect(k && text.slice(k.from, k.to)).toBe('"fil"')
  })
  it('maps a position back to a path and its node', () => {
    const pos = text.indexOf('"intensity"') + 3
    const { path, onKey } = pathAt(tree, doc, pos)
    expect(path).toEqual(['nodes', 1, 'children', 0, 'props', 'intensity'])
    expect(onKey).toBe(true)
    expect(nodePathOf(path)).toEqual(['nodes', 1, 'children', 0])
  })
  it('finds the container and property being typed in', () => {
    const inProps = text.indexOf('"fil"')
    const c = containerAt(tree, doc, inProps)
    expect(c?.node.name).toBe('Object')
    expect(c?.path).toEqual(['nodes', 0, 'props'])
    expect(propertyAt(tree, doc, text.indexOf('0.5') + 1)).toEqual(['nodes', 0, 'props', 'fil'])
    const partial = '{ "nodes": [ { "type": "Lamp", "props": { '
    const t2 = parser.parse(partial)
    const d2 = { sliceString: (a: number, b: number) => partial.slice(a, b) }
    expect(containerAt(t2, d2, partial.length)?.path).toEqual(['nodes', 0, 'props'])
  })
})
