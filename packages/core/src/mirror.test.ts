import { Matrix4, Object3D, PerspectiveCamera, Vector3, Vector4 } from 'three'
import { describe, expect, it } from 'vitest'
import {
  aimMirror,
  inScenePass,
  isMirrorSkipped,
  MIRROR_TOLERANCE,
  MirrorPool,
  scenePass,
  skipMirrors,
} from './mirror'

describe('MirrorPool (#63)', () => {
  it('gives surfaces at one height one plane', () => {
    const pool = new MirrorPool(2)
    const a = pool.planeFor(0)
    expect(pool.planeFor(MIRROR_TOLERANCE / 2)).toBe(a)
    expect(pool.planeFor(-MIRROR_TOLERANCE / 2)).toBe(a)
    expect(pool.planes).toHaveLength(1)
    pool.dispose()
  })

  it('stops at its plane limit, and frees idle slots', () => {
    const pool = new MirrorPool(2)
    const ground = pool.planeFor(0)
    const upstairs = pool.planeFor(3)
    expect(ground).not.toBe(upstairs)
    expect(pool.planeFor(6)).toBeNull()
    expect(pool.planeFor(0)).toBe(ground)

    if (!ground || !upstairs) throw new Error('expected two planes')
    for (let i = 0; i < 400; i++) {
      ground.used = pool.frame
      pool.tick()
    }
    expect(pool.planes).toEqual([ground])
    expect(pool.planeFor(6)).not.toBeNull()
    pool.dispose()
  })

  it('makes nothing until a surface asks', () => {
    const pool = new MirrorPool()
    pool.tick()
    expect(pool.planes).toHaveLength(0)
  })
})

describe('scenePass', () => {
  it('marks the pass while it draws, nested or not', () => {
    expect(inScenePass()).toBe(false)
    scenePass(() => {
      expect(inScenePass()).toBe(true)
      scenePass(() => expect(inScenePass()).toBe(true))
      expect(inScenePass()).toBe(true)
    })
    expect(inScenePass()).toBe(false)
    expect(() =>
      scenePass(() => {
        throw new Error('draw failed')
      }),
    ).toThrow()
    expect(inScenePass()).toBe(false)
  })
})

describe('aimMirror', () => {
  const camera = new PerspectiveCamera(60, 16 / 9, 0.1, 100)
  camera.position.set(1, 3, 8)
  camera.lookAt(2, 0.5, 0)
  camera.updateMatrixWorld()
  const virtual = new PerspectiveCamera()
  const matrix = new Matrix4()
  const height = 0.5
  aimMirror(camera, height, virtual, matrix)

  const uv = (p: Vector3) => {
    const v = new Vector4(p.x, p.y, p.z, 1).applyMatrix4(matrix)
    return [v.x / v.w, v.y / v.w]
  }

  it('puts the camera under the plane, as far below it as the camera is above', () => {
    expect(virtual.position.x).toBeCloseTo(1)
    expect(virtual.position.y).toBeCloseTo(2 * height - 3)
    expect(virtual.position.z).toBeCloseTo(8)
  })

  it('shows at each point of the surface what the eye sees reflected there', () => {
    const eye = camera.position
    for (const thing of [new Vector3(2, 1.7, 0), new Vector3(-1, 4, -3), new Vector3(3, 0.9, 2)]) {
      // The eye sees `thing` reflected where the line to its mirror image crosses the surface.
      const image = new Vector3(thing.x, 2 * height - thing.y, thing.z)
      const t = (eye.y - height) / (eye.y - image.y)
      const surface = eye.clone().lerp(image, t)
      expect(surface.y).toBeCloseTo(height)
      // What the mirror camera drew at `thing` is what the surface samples there.
      const [su, sv] = uv(surface)
      const [tu, tv] = uv(thing)
      expect(su).toBeCloseTo(tu, 5)
      expect(sv).toBeCloseTo(tv, 5)
    }
  })

  it('maps what the camera looks at into the texture', () => {
    const [u, v] = uv(new Vector3(2, height, 0))
    expect(u).toBeGreaterThan(0)
    expect(u).toBeLessThan(1)
    expect(v).toBeGreaterThan(0)
    expect(v).toBeLessThan(1)
  })
})

describe('skipMirrors', () => {
  it('marks an object until its cleanup runs', () => {
    const object = new Object3D()
    const restore = skipMirrors(object)
    expect(isMirrorSkipped(object)).toBe(true)
    restore()
    expect(isMirrorSkipped(object)).toBe(false)
  })

  it('takes a missing object', () => {
    expect(() => skipMirrors(null)()).not.toThrow()
  })
})
