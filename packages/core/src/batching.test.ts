import {
  BoxGeometry,
  Group,
  InstancedMesh,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  Raycaster,
  Scene,
  Vector3,
} from 'three'
import { describe, expect, it } from 'vitest'
import { BATCHED_LAYER, DYNAMIC_KEY, isBatchable, mergeInWorld, StaticBatcher } from './batching'
import { sharedMaterial } from './material'

const wood = () => sharedMaterial({ color: '#7a5a40', roughness: 0.85 })

function box(x: number, material = wood()) {
  const mesh = new Mesh(new BoxGeometry(1, 1, 1), material)
  mesh.position.set(x, 0, 0)
  return mesh
}

function settle(batcher: StaticBatcher, scene: Scene, scans = 3) {
  for (let i = 0; i < scans; i++) {
    scene.updateMatrixWorld(true)
    batcher.scan(scene)
  }
}

describe('isBatchable', () => {
  it('takes plain meshes on shared, opaque materials only', () => {
    expect(isBatchable(box(0))).toBe(true)
    expect(isBatchable(box(0, new MeshStandardMaterial()))).toBe(false)
    expect(
      isBatchable(box(0, sharedMaterial({ color: 'red', transparent: true, opacity: 0.5 }))),
    ).toBe(false)
    expect(isBatchable(new InstancedMesh(new BoxGeometry(), wood(), 4))).toBe(false)
    expect(isBatchable(new Object3D())).toBe(false)
  })
})

describe('mergeInWorld', () => {
  it('carries positions into world space', () => {
    const a = box(-5)
    const b = box(5)
    a.updateMatrixWorld()
    b.updateMatrixWorld()
    const merged = mergeInWorld([a, b])
    const n = a.geometry.attributes.position.count
    expect(merged.attributes.position.count).toBe(2 * n)
    expect(merged.index?.count).toBe((a.geometry.index?.count ?? 0) * 2)
    merged.computeBoundingBox()
    expect(merged.boundingBox?.min.x).toBeCloseTo(-5.5)
    expect(merged.boundingBox?.max.x).toBeCloseTo(5.5)
  })

  it('keeps faces pointing out through a mirrored transform', () => {
    const plane = new Mesh(new PlaneGeometry(1, 1), wood())
    plane.scale.set(-1, 1, 1)
    plane.updateMatrixWorld()
    const merged = mergeInWorld([plane, plane])
    const pos = merged.attributes.position
    const idx = merged.index
    if (!idx) throw new Error('expected an index')
    const [a, b, c] = [0, 1, 2].map((k) => new Vector3().fromBufferAttribute(pos, idx.getX(k)))
    const face = b.clone().sub(a).cross(c.clone().sub(a)).normalize()
    const normal = new Vector3().fromBufferAttribute(merged.attributes.normal, idx.getX(0))
    expect(face.dot(normal)).toBeGreaterThan(0.99)
  })
})

describe('StaticBatcher', () => {
  it('batches meshes once they settle and hides the sources', () => {
    const scene = new Scene()
    const parts = [box(0), box(2), box(4)]
    scene.add(...parts)
    const batcher = new StaticBatcher(new Group())
    scene.add(batcher.root)

    scene.updateMatrixWorld(true)
    batcher.scan(scene)
    expect(batcher.stats.batches).toBe(0)

    settle(batcher, scene)
    expect(batcher.stats).toEqual({ batches: 1, members: 3 })
    expect(parts.every((p) => !p.layers.isEnabled(0))).toBe(true)
  })

  it('rebuilds when a part moves or leaves, and drops parts that keep moving', () => {
    const scene = new Scene()
    const parts = [box(0), box(2), box(4)]
    scene.add(...parts)
    const batcher = new StaticBatcher(new Group())
    scene.add(batcher.root)
    settle(batcher, scene)

    parts[0].position.y = 1
    settle(batcher, scene, 1)
    expect(parts[0].layers.isEnabled(0)).toBe(true)
    expect(batcher.stats.members).toBe(2)

    settle(batcher, scene)
    expect(batcher.stats.members).toBe(3)

    // A second move after settling marks it as animated: it renders itself from then on.
    parts[0].position.y = 2
    settle(batcher, scene)
    parts[0].position.y = 3
    settle(batcher, scene, 5)
    expect(parts[0].layers.isEnabled(0)).toBe(true)
    expect(batcher.stats.members).toBe(2)

    scene.remove(parts[2])
    settle(batcher, scene, 1)
    expect(parts[2].layers.isEnabled(0)).toBe(true)
    expect(batcher.stats.batches).toBe(0)
  })

  it('leaves <Dynamic> subtrees alone and keeps batched parts pickable', () => {
    const scene = new Scene()
    const dynamic = new Group()
    dynamic.userData[DYNAMIC_KEY] = true
    const moving = [box(0), box(1)]
    dynamic.add(...moving)
    const button = new Group()
    const parts = [box(2), box(3)]
    button.add(...parts)
    scene.add(dynamic, button)
    const batcher = new StaticBatcher(new Group())
    scene.add(batcher.root)
    settle(batcher, scene)
    expect(batcher.stats).toEqual({ batches: 1, members: 2 })
    expect(moving.every((m) => m.layers.isEnabled(0))).toBe(true)

    const ray = new Raycaster(new Vector3(2, 5, 0), new Vector3(0, -1, 0))
    expect(ray.intersectObject(button, true)).toHaveLength(0)
    ray.layers.enable(BATCHED_LAYER)
    expect(ray.intersectObject(button, true)[0]?.object).toBe(parts[0])
  })

  it('puts everything back when disposed', () => {
    const scene = new Scene()
    const parts = [box(0), box(2)]
    scene.add(...parts)
    const batcher = new StaticBatcher(new Group())
    scene.add(batcher.root)
    settle(batcher, scene)
    expect(batcher.root.children.length).toBe(1)
    batcher.dispose()
    expect(batcher.root.children.length).toBe(0)
    expect(parts.every((p) => p.layers.isEnabled(0))).toBe(true)
  })
})
