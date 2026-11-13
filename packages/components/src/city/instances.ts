// Shared instanced meshes for small parts a world repeats hundreds of times and that static
// batching cannot merge: anything see-through. Runek's batcher leaves transparent meshes alone,
// so every window pane and every soft shell round a neon tube was a draw of its own.
//
// A pool is one `InstancedMesh` in the scene for one kind of part (one geometry, one material).
// Components hand it the places of their parts in the world and take them back when they
// unmount. Parts are still: a component gives its places again when it moves. However many
// parts there are, a pool is one draw, and it is never frustum culled.

import { useThree } from '@react-three/fiber'
import { skipMirrors } from '@runek/core'
import { type RefObject, useLayoutEffect, useMemo, useRef } from 'react'
import {
  type BufferGeometry,
  type Color,
  type Group,
  InstancedMesh,
  type Material,
  Matrix4,
  type Scene,
} from 'three'

interface Parts {
  matrices: Matrix4[]
  /** One color for every part of this owner, when the pool colors its instances. */
  color: Color | null
}

/** What a pool is made of, asked for once when the first part of its kind turns up. */
export interface PoolLook {
  geometry: BufferGeometry
  material: Material
  /** Draw order among see-through things. */
  renderOrder?: number
  /** Leave the pool out of the world's mirrors (`skipMirrors`). */
  skipMirrors?: boolean
}

class Pool {
  private mesh: InstancedMesh | null = null
  private unskip: (() => void) | null = null
  private readonly owners = new Map<object, Parts>()
  private queued = false

  constructor(
    private readonly scene: Scene,
    private readonly name: string,
    private readonly look: PoolLook,
  ) {}

  /** Give `owner`'s parts their places in the world, replacing any it had. */
  set(owner: object, matrices: Matrix4[], color: Color | null) {
    this.owners.set(owner, { matrices, color })
    this.queue()
  }

  drop(owner: object) {
    if (this.owners.delete(owner)) this.queue()
  }

  /** Many components mount in one commit: write the buffers once, after all of them. */
  private queue() {
    if (this.queued) return
    this.queued = true
    queueMicrotask(() => {
      this.queued = false
      this.write()
    })
  }

  private write() {
    let total = 0
    for (const parts of this.owners.values()) total += parts.matrices.length
    let mesh = this.mesh
    if (!mesh || mesh.instanceMatrix.count < total) {
      // Room for half as many again, so a few more parts do not mean a new buffer.
      if (mesh) {
        this.unskip?.()
        this.scene.remove(mesh)
        mesh.dispose()
      }
      mesh = new InstancedMesh(
        this.look.geometry,
        this.look.material,
        Math.max(16, Math.ceil(total * 1.5)),
      )
      mesh.name = `runek:pool:${this.name}`
      mesh.frustumCulled = false
      mesh.renderOrder = this.look.renderOrder ?? 0
      this.unskip = this.look.skipMirrors ? skipMirrors(mesh) : null
      this.scene.add(mesh)
      this.mesh = mesh
    }
    let i = 0
    for (const parts of this.owners.values()) {
      for (const matrix of parts.matrices) {
        mesh.setMatrixAt(i, matrix)
        if (parts.color) mesh.setColorAt(i, parts.color)
        i++
      }
    }
    mesh.count = total
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }
}

const pools = new WeakMap<Scene, Map<string, Pool>>()

/** The pool named `name` in `scene`, made from `look()` the first time it is asked for. */
function poolFor(scene: Scene, name: string, look: () => PoolLook): Pool {
  let named = pools.get(scene)
  if (!named) {
    named = new Map()
    pools.set(scene, named)
  }
  let pool = named.get(name)
  if (!pool) {
    pool = new Pool(scene, name, look())
    named.set(name, pool)
  }
  return pool
}

/**
 * Put a component's parts in the pool named `name`. `local` is each part's matrix in the
 * component's own frame and must be memoized. Attach the returned ref to a group at the
 * component's origin: its world matrix places the parts. `place` is any value that changes when
 * that group moves (its position and rotation props). `color` tints every part of this
 * component, for a pool whose material is white.
 */
export function useInstances(
  name: string,
  look: () => PoolLook,
  local: Matrix4[],
  color: Color | null,
  place: unknown,
): RefObject<Group | null> {
  const ref = useRef<Group>(null)
  const scene = useThree((s) => s.scene)
  const owner = useMemo(() => ({}), [])
  useLayoutEffect(() => {
    const group = ref.current
    if (!group || !local.length) return
    const pool = poolFor(scene, name, look)
    group.updateWorldMatrix(true, false)
    pool.set(
      owner,
      local.map((m) => new Matrix4().multiplyMatrices(group.matrixWorld, m)),
      color,
    )
    return () => pool.drop(owner)
    // `look` is only read when the pool is first made.
  }, [scene, name, local, color, place, owner])
  return ref
}
