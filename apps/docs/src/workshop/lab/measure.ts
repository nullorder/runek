import {
  Box3,
  type BufferAttribute,
  InstancedMesh,
  Line,
  type Material,
  Mesh,
  type Object3D,
  Points,
} from 'three'
import { create } from 'zustand'

export interface SubjectStats {
  meshes: number
  instances: number
  triangles: number
  vertices: number
  geometries: number
  materials: number
  /** Mount (or prop change) to the first frame the geometry stopped changing. */
  buildMs: number | null
  size: [number, number, number] | null
}

export interface CheckResult {
  status: 'idle' | 'running' | 'done'
  deterministic?: boolean
  /** For seeded components: a different seed changed the geometry. */
  seedSensitive?: boolean | null
  hashes?: { a: string; again: string; other: string }
  diff?: string
}

export const useLabMeasure = create<{ stats: SubjectStats | null; check: CheckResult }>(() => ({
  stats: null,
  check: { status: 'idle' },
}))

const box = new Box3()

/** Count what a subtree is made of. */
export function measure(root: Object3D): Omit<SubjectStats, 'buildMs'> {
  let meshes = 0
  let instances = 0
  let triangles = 0
  let vertices = 0
  const geometries = new Set<string>()
  const materials = new Set<string>()
  root.traverse((o) => {
    if (!(o instanceof Mesh || o instanceof Points || o instanceof Line)) return
    meshes++
    const g = o.geometry
    geometries.add(g.uuid)
    for (const m of ([] as Material[]).concat(o.material)) materials.add(m.uuid)
    const count = o instanceof InstancedMesh ? o.count : 1
    instances += o instanceof InstancedMesh ? o.count : 0
    const pos = g.attributes.position as BufferAttribute | undefined
    const v = pos?.count ?? 0
    vertices += v * count
    if (o instanceof Mesh) triangles += ((g.index ? g.index.count : v) / 3) * count
  })
  box.setFromObject(root)
  const size: [number, number, number] | null = box.isEmpty()
    ? null
    : [box.max.x - box.min.x, box.max.y - box.min.y, box.max.z - box.min.z]
  return {
    meshes,
    instances,
    triangles: Math.round(triangles),
    vertices,
    geometries: geometries.size,
    materials: materials.size,
    size,
  }
}

/** A cheap signature that changes while geometry is still being built. */
export function signature(root: Object3D) {
  root.updateMatrixWorld(true)
  let n = 0
  let v = 0
  root.traverse((o) => {
    if (o instanceof Mesh || o instanceof Points || o instanceof Line) {
      n++
      v +=
        (o.geometry.attributes.position?.count ?? 0) +
        (o instanceof InstancedMesh ? o.count * 7 : 0)
    }
  })
  box.setFromObject(root)
  return `${n}:${v}:${
    box.isEmpty()
      ? ''
      : box.min
          .toArray()
          .concat(box.max.toArray())
          .map((x) => x.toFixed(3))
          .join(',')
  }`
}

const FNV_OFFSET = 0x811c9dc5
const FNV_PRIME = 0x01000193

function feed(h: number, data: ArrayLike<number>) {
  let x = h
  for (let i = 0; i < data.length; i++) {
    x ^= data[i]
    x = Math.imul(x, FNV_PRIME) >>> 0
  }
  return x
}

const bits = (array: ArrayBufferView): ArrayLike<number> =>
  array.byteOffset % 4 === 0 && array.byteLength % 4 === 0
    ? new Uint32Array(array.buffer, array.byteOffset, array.byteLength / 4)
    : new Uint8Array(array.buffer, array.byteOffset, array.byteLength)

/** FNV-1a over every mesh's vertex data, index, instance transforms and colors, and local
 *  transform, in scene order. Same props → same hash, if the component is deterministic. */
export function hashGeometry(root: Object3D): { hash: string; parts: string[] } {
  let h = FNV_OFFSET
  const parts: string[] = []
  root.updateMatrixWorld(true)
  root.traverse((o) => {
    if (!(o instanceof Mesh || o instanceof Points || o instanceof Line)) return
    let part = FNV_OFFSET
    const g = o.geometry
    for (const name of Object.keys(g.attributes).sort()) {
      const attr = g.attributes[name] as BufferAttribute
      if (ArrayBuffer.isView(attr.array)) part = feed(part, bits(attr.array as ArrayBufferView))
    }
    if (g.index && ArrayBuffer.isView(g.index.array))
      part = feed(part, bits(g.index.array as ArrayBufferView))
    if (o instanceof InstancedMesh) {
      part = feed(part, bits((o.instanceMatrix.array as Float32Array).subarray(0, o.count * 16)))
      if (o.instanceColor) part = feed(part, bits(o.instanceColor.array as Float32Array))
    }
    part = feed(part, bits(new Float32Array(o.matrix.elements)))
    parts.push(`${o.name || o.type}:${part.toString(16)}`)
    h = feed(h, [part])
  })
  return { hash: h.toString(16).padStart(8, '0'), parts }
}
