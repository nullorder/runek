import { Color, Object3D, PerspectiveCamera, type PointLight, type SpotLight } from 'three'
import { describe, expect, it } from 'vitest'
import { type LightEmitter, LightPool } from './light'

function emitter(x: number, z: number, intensity = 1, extra: Partial<LightEmitter> = {}) {
  const anchor = new Object3D()
  anchor.position.set(x, 1, z)
  anchor.updateMatrixWorld()
  return {
    ref: { current: anchor },
    target: { current: null },
    kind: 'point',
    color: new Color('#ffffff'),
    intensity,
    distance: 6,
    decay: 2,
    angle: 0.5,
    penumbra: 0,
    enabled: true,
    ...extra,
  } as LightEmitter
}

// Camera at the origin looking down -z.
const camera = new PerspectiveCamera(60, 1, 0.1, 100)
camera.updateMatrixWorld()

const run = (pool: LightPool, seconds: number) => {
  for (let t = 0; t < seconds; t += 0.05) pool.update(camera, 0.05)
}

describe('LightPool', () => {
  it('lends its lights to the nearest, brightest emitters in view', () => {
    const near = emitter(0, -3)
    const far = emitter(0, -40)
    const behind = emitter(0, 8)
    const bright = emitter(2, -10, 4)
    const pool = new LightPool(new Set([near, far, behind, bright]), { point: 2, spot: 0 })
    run(pool, 1)
    expect(new Set(pool.lit)).toEqual(new Set([near, bright]))
  })

  it('fades a light in rather than switching it on', () => {
    const lamp = emitter(0, -3, 2)
    const pool = new LightPool(new Set([lamp]), { point: 1, spot: 0 })
    const light = pool.root.children[0] as PointLight
    pool.update(camera, 0.05)
    expect(light.intensity).toBeGreaterThan(0)
    expect(light.intensity).toBeLessThan(0.5)
    run(pool, 1)
    expect(light.intensity).toBeCloseTo(2)
    expect(light.position.toArray()).toEqual([0, 1, -3])
  })

  it('keeps its pick through near-ties, and hands off over a fade', () => {
    const a = emitter(0, -4)
    const b = emitter(0, -4.2)
    const pool = new LightPool(new Set([a, b]), { point: 1, spot: 0 })
    run(pool, 1)
    expect(pool.lit).toEqual([a])

    b.ref.current?.position.set(0, 1, -3.9)
    b.ref.current?.updateMatrixWorld()
    run(pool, 1)
    expect(pool.lit).toEqual([a])

    b.intensity = 10
    pool.update(camera, 0.05)
    expect(pool.lit).toEqual([a]) // fading out first
    run(pool, 1)
    expect(pool.lit).toEqual([b])
  })

  it('holds a light it just handed over, even if the scores flip at once', () => {
    const a = emitter(0, -4)
    const pool = new LightPool(new Set([a]), { point: 1, spot: 0 })
    pool.update(camera, 0.05)
    expect(pool.lit).toEqual([a])
    const b = emitter(0, -4, 5)
    pool.emitters.add(b)
    run(pool, 0.5)
    expect(pool.lit).toEqual([a])
    run(pool, 1.5)
    expect(pool.lit).toEqual([b])
  })

  it('skips lamps that are off, and darkens a light whose lamp left', () => {
    const off = emitter(0, -2, 1, { enabled: false })
    const lamp = emitter(0, -5)
    const emitters = new Set([off, lamp])
    const pool = new LightPool(emitters, { point: 1, spot: 0 })
    run(pool, 1)
    expect(pool.lit).toEqual([lamp])

    emitters.delete(lamp)
    lamp.ref.current = null
    run(pool, 1)
    expect(pool.lit).toEqual([])
    expect((pool.root.children[0] as PointLight).intensity).toBe(0)
  })

  it('aims spotlights at their target', () => {
    const goal = new Object3D()
    goal.position.set(1, 0, -6)
    goal.updateMatrixWorld()
    const spot = emitter(0, -5, 1, { kind: 'spot', target: { current: goal } })
    const pool = new LightPool(new Set([spot]), { point: 1, spot: 1 })
    run(pool, 1)
    const light = pool.root.children.find((c) => (c as SpotLight).isSpotLight) as SpotLight
    expect(light.intensity).toBeCloseTo(1)
    expect(light.target.position.toArray()).toEqual([1, 0, -6])
    expect(light.angle).toBe(0.5)
  })
})
