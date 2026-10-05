import type { WorldData } from '@runek/core'
import { describe, expect, it } from 'vitest'
import { emptyHistory, record, redo, undo } from './history'
import {
  duplicateNode,
  groupNodes,
  insertNodes,
  locate,
  moveNode,
  offsetNodes,
  patchProps,
  removeNode,
  stripDefaults,
  usedTypes,
} from './ops'

const world = (): WorldData => ({
  version: 1,
  nodes: [
    { type: 'Terrain', id: 'a', props: { relief: 2 } },
    {
      type: 'Group',
      id: 'g',
      props: { position: [1, 0, 0] },
      children: [{ type: 'Bookshelf', id: 'b', props: { fill: 0.5, width: 1.2 } }],
    },
    { type: 'Lamp', id: 'c' },
  ],
})

describe('ops', () => {
  it('locates nested nodes with ground-index paths', () => {
    const found = locate(world().nodes, 'b')
    expect(found?.path).toBe('1/0')
    expect(found?.parent?.id).toBe('g')
  })

  it('patches props immutably, removing undefined keys', () => {
    const before = world()
    const after = patchProps(before, 'b', { fill: undefined, height: 3 })
    expect(locate(after.nodes, 'b')?.node.props).toEqual({ width: 1.2, height: 3 })
    expect(locate(before.nodes, 'b')?.node.props).toEqual({ fill: 0.5, width: 1.2 })
    expect(after.nodes[0]).toBe(before.nodes[0])
  })

  it('drops an emptied props object', () => {
    const after = patchProps(world(), 'a', { relief: undefined })
    expect(after.nodes[0]).toEqual({ type: 'Terrain', id: 'a' })
  })

  it('removes nested nodes', () => {
    const after = removeNode(world(), 'b')
    expect(after.nodes[1].children).toEqual([])
  })

  it('inserts with fresh ids and reports them', () => {
    const { world: after, ids } = insertNodes(world(), [{ type: 'Crate', id: 'a' }], {
      parentId: 'g',
    })
    expect(ids).toHaveLength(1)
    expect(ids[0]).not.toBe('a')
    expect(locate(after.nodes, ids[0])?.parent?.id).toBe('g')
  })

  it('duplicates beside the source, offset', () => {
    const { world: after, ids } = duplicateNode(world(), 'c')
    expect(after.nodes[3].id).toBe(ids[0])
    expect(after.nodes[3].props?.position).toEqual([0.5, 0, 0.5])
  })

  it('moves and reparents, refusing cycles', () => {
    const moved = moveNode(world(), 'c', 'g', 0)
    expect(moved.nodes.map((n) => n.id)).toEqual(['a', 'g'])
    expect(moved.nodes[1].children?.map((n) => n.id)).toEqual(['c', 'b'])
    expect(moveNode(world(), 'g', 'b', 0)).toEqual(world())
    const reordered = moveNode(world(), 'a', null, 3)
    expect(reordered.nodes.map((n) => n.id)).toEqual(['g', 'c', 'a'])
  })

  it('groups root siblings', () => {
    const { world: after, id } = groupNodes(world(), ['a', 'c'])
    expect(after.nodes).toHaveLength(2)
    expect(after.nodes[0].id).toBe(id)
    expect(after.nodes[0].children?.map((n) => n.id)).toEqual(['a', 'c'])
  })

  it('offsets top-level positions', () => {
    expect(
      offsetNodes([{ type: 'Crate', props: { position: [1, 0, 1] } }], [2, 0, -1])[0].props
        ?.position,
    ).toEqual([3, 0, 0])
  })

  it('strips props equal to their default', () => {
    const after = stripDefaults(world(), (type) =>
      type === 'Bookshelf' ? { width: 1.2, fill: 0 } : {},
    )
    expect(locate(after.nodes, 'b')?.node.props).toEqual({ fill: 0.5 })
  })

  it('lists used types', () => {
    expect(usedTypes(world())).toEqual(['Bookshelf', 'Group', 'Lamp', 'Terrain'])
  })
})

describe('history', () => {
  it('coalesces same-key edits and undoes/redoes', () => {
    let h = emptyHistory<number>()
    h = record(h, 0, 'fill', 1000)
    h = record(h, 1, 'fill', 1500)
    h = record(h, 2, 'width', 1600)
    expect(h.past).toEqual([0, 2])
    const u = undo(h, 3)
    expect(u?.value).toBe(2)
    const r = redo(u?.history ?? h, 2)
    expect(r?.value).toBe(3)
  })

  it('starts a new step after a pause', () => {
    let h = emptyHistory<number>()
    h = record(h, 0, 'fill', 0)
    h = record(h, 1, 'fill', 5000)
    expect(h.past).toEqual([0, 1])
  })
})
