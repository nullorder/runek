import { describe, expect, it } from 'vitest'
import { controlsToMap, DEFAULT_CONTROLS, resolveControls } from './keyboard'
import { parseWorld, serializeWorld, type WorldData } from './world-data'

describe('resolveControls', () => {
  it('merges a partial remap over the defaults', () => {
    const controls = resolveControls({ forward: ['KeyW', 'KeyZ'], turnLeft: ['KeyQ'] })
    expect(controls.forward).toEqual(['KeyW', 'KeyZ'])
    expect(controls.turnLeft).toEqual(['KeyQ'])
    expect(controls.jump).toEqual(DEFAULT_CONTROLS.jump)
  })

  it('passes unknown actions through as custom bindings and [] disables', () => {
    const controls = resolveControls({ interact: ['KeyE'], run: [] })
    expect(controls.interact).toEqual(['KeyE'])
    expect(controls.run).toEqual([])
    expect(controlsToMap(controls)).toContainEqual({ name: 'interact', keys: ['KeyE'] })
  })
})

describe('world controls (the setting)', () => {
  it('round-trips through serialize → parse', () => {
    const world: WorldData = {
      version: 1,
      controls: { forward: ['KeyZ'], interact: ['KeyE'] },
      nodes: [{ type: 'Player' }],
    }
    expect(parseWorld(serializeWorld(world))).toEqual(world)
  })

  it('rejects malformed controls', () => {
    expect(() => parseWorld('{"version":1,"controls":["KeyW"],"nodes":[]}')).toThrow(/controls/)
    expect(() => parseWorld('{"version":1,"controls":{"forward":"KeyW"},"nodes":[]}')).toThrow(
      /controls/,
    )
    expect(() => parseWorld('{"version":1,"controls":{"forward":[1]},"nodes":[]}')).toThrow(
      /controls/,
    )
  })
})
