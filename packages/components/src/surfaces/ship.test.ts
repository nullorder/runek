import { describe, expect, it } from 'vitest'
import {
  CASTLE_STAIR,
  deckSpan,
  innerBreadth,
  LEVEL,
  shipLayout,
  shipShape,
  shipSurface,
} from './ship'

const world = { unit: 1, ground: 0 }

describe.each([30, 36, 60])('ship layout at length %i', (length) => {
  const s = shipShape(length, 10)
  const lay = shipLayout(s)
  const masts = Object.values(lay.masts)

  it('keeps both hatches clear of every mast', () => {
    for (const h of [lay.hatchA, lay.hatchB])
      for (const z of masts) expect(z < h.z0 - 0.6 || z > h.z1 + 0.6).toBe(true)
  })

  it('fits the castle stairs inside the hull', () => {
    for (const b of [...lay.quarterStairs, ...lay.foreStairs])
      for (const z of [b.z0, b.z1])
        for (const y of [LEVEL.main, LEVEL.quarter])
          expect(Math.abs(b.x) + b.w / 2).toBeLessThan(innerBreadth(s, z, y))
  })

  it('reads the deck heights a walker stands on', () => {
    const at = shipSurface.build({ length }, world)
    expect(at(0, lay.zQ + CASTLE_STAIR.quarterRun + 0.5)).toBe(LEVEL.main)
    expect(at(0, lay.zQ - 1)).toBe(LEVEL.quarter)
    expect(at(0, lay.zF + 1)).toBe(LEVEL.fore)
    expect(at(0, deckSpan(s, LEVEL.quarter)[0] - 1)).toBeNull()
    expect(at(innerBreadth(s, 0, LEVEL.main) + 0.5, -1)).toBeNull()
  })

  it('climbs the hatch stair from the gun deck to the main deck', () => {
    const at = shipSurface.build({ length }, world)
    const { z0, z1 } = lay.hatchA
    const foot = at(0, z1 - 0.1) as number
    const head = at(0, z0 + 0.1) as number
    expect(foot).toBe(LEVEL.gun)
    expect(head).toBeCloseTo(LEVEL.main, 5)
  })
})

describe('ship gangway surface', () => {
  it('runs from the main deck down to the shore end', () => {
    const lay = shipLayout(shipShape())
    const at = shipSurface.build({ gangwayDrop: 3.8 }, world)
    const z = lay.gangway.z
    const top = at(-4.9, z) as number
    const foot = at(-14.6, z) as number
    expect(top).toBeGreaterThan(LEVEL.main - 0.2)
    expect(foot).toBeLessThan(LEVEL.main - 3.5)
    expect(at(-4.9, z + 3)).toBeNull()
  })

  it('has no surface without its collider', () => {
    expect(shipSurface.build({ collider: false }, world)(0, 0)).toBeNull()
  })
})
