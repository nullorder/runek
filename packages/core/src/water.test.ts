import { Object3D } from 'three'
import { describe, expect, it } from 'vitest'
import { planeWater, type WaterBody, waterAt } from './water'

const flat = (level: number, half = Number.POSITIVE_INFINITY, depth?: number): WaterBody => ({
  depth,
  level: (x, z) => (Math.abs(x) <= half && Math.abs(z) <= half ? level : null),
})

/** A sheet lying flat, as the water components turn their planes. */
function sheet(position: [number, number, number], yaw = 0) {
  const o = new Object3D()
  o.position.set(...position)
  o.rotation.set(-Math.PI / 2, 0, yaw)
  return o
}

describe('waterAt', () => {
  it('finds no water in a world without any', () => {
    expect(waterAt(undefined, 0, 0, 0)).toBeNull()
    expect(waterAt([], 0, 0, 0)).toBeNull()
  })

  it('reads the level where the water is and nothing beside it', () => {
    const waters = [flat(-0.4, 5)]
    expect(waterAt(waters, 1, 2, 1)?.level).toBe(-0.4)
    expect(waterAt(waters, 9, 2, 1)).toBeNull()
  })

  it('takes the highest of overlapping waters', () => {
    const waters = [flat(0), flat(3, 4), flat(1, 2)]
    expect(waterAt(waters, 0, 5, 0)?.level).toBe(3)
    expect(waterAt(waters, 10, 5, 0)?.level).toBe(0)
  })

  it('leaves a body under a pool dry', () => {
    const waters = [flat(0), flat(8, 4, 1.5)]
    // Standing in the pool, then on the storey below it.
    expect(waterAt(waters, 0, 8.2, 0)?.level).toBe(8)
    expect(waterAt(waters, 0, 5, 0)?.level).toBe(0)
  })

  it('reports the swell of the water it chose', () => {
    const calm = flat(2, 4)
    const sea: WaterBody = { ...flat(0), swell: () => 0.3 }
    const out = { level: 0, swell: 0 }
    expect(waterAt([sea, calm], 9, 3, 0, out)).toBe(out)
    expect(out).toEqual({ level: 0, swell: 0.3 })
    expect(waterAt([sea, calm], 0, 3, 0, out)).toEqual({ level: 2, swell: 0 })
  })
})

describe('planeWater', () => {
  it('has no water until its object exists', () => {
    expect(planeWater(() => null, [4, 4]).level(0, 0)).toBeNull()
  })

  it('bounds a sheet by its size, in its own frame', () => {
    const o = sheet([10, -1, 0], Math.PI / 2)
    const water = planeWater(() => o, [8, 2])
    expect(water.level(10, 0)).toBe(-1)
    // Turned a quarter, the long side runs along world Z.
    expect(water.level(10, 3.5)).toBe(-1)
    expect(water.level(13.5, 0)).toBeNull()
  })

  it('has no edges without a size', () => {
    const o = sheet([0, 0.5, 0])
    expect(planeWater(() => o, null).level(1e5, -1e5)).toBe(0.5)
  })

  it('follows a parent', () => {
    const parent = new Object3D()
    parent.position.set(0, 4, 20)
    const o = sheet([0, -1, 0])
    parent.add(o)
    const water = planeWater(() => o, [6, 6])
    expect(water.level(0, 20)).toBe(3)
    expect(water.level(0, 0)).toBeNull()
  })

  it('hands a wave both sets of coordinates', () => {
    const o = sheet([10, 0, 5])
    const water = planeWater(() => o, [20, 20], {
      wave: (lx, ly, x, z) => lx * 1000 + ly * 100 + x * 10 + z,
    })
    // Local Y runs along world -Z on a plane turned to lie flat.
    expect(water.swell?.(12, 4)).toBeCloseTo(2 * 1000 + 1 * 100 + 12 * 10 + 4)
  })

  it('carries its depth', () => {
    const o = sheet([0, 0, 0])
    expect(planeWater(() => o, null, { depth: 1.5 }).depth).toBe(1.5)
    expect(planeWater(() => o, null).swell).toBeUndefined()
  })
})
