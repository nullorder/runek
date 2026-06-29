import { isValidElement } from 'react'
import { describe, expect, it } from 'vitest'
import { WorldNodes } from './WorldNodes'
import type { ComponentRegistry } from './world-data'

// A stand-in component; we only need a registry entry, never a real render.
const Probe = () => null
const registry = { Probe } as unknown as ComponentRegistry

// WorldNodes is hook-free, so we can call it directly and inspect the React elements it builds
// (no canvas/DOM needed) — enough to assert how props and children are wired.
function rendered(nodes: unknown): Array<{ props: Record<string, unknown> }> {
  const frag = WorldNodes({ nodes, registry } as never) as { props: { children: unknown } }
  const kids = frag.props.children
  return (Array.isArray(kids) ? kids : [kids]) as Array<{ props: Record<string, unknown> }>
}

describe('WorldNodes', () => {
  it('keeps props.children when a node has no child nodes (so JSON-authored text survives)', () => {
    const [node] = rendered([{ type: 'Probe', props: { children: 'FOOSHA' } }])
    expect(node.props.children).toBe('FOOSHA')
  })

  it('uses nested child nodes as children, overriding props.children', () => {
    const [node] = rendered([
      { type: 'Probe', props: { children: 'ignored' }, children: [{ type: 'Probe', props: {} }] },
    ])
    expect(isValidElement(node.props.children)).toBe(true)
    expect((node.props.children as { type: unknown }).type).toBe(WorldNodes)
  })
})
