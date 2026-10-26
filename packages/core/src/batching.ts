import {
  BufferAttribute,
  BufferGeometry,
  type Group,
  type Material,
  Matrix3,
  type Matrix4,
  Mesh,
  type Object3D,
  Vector3,
} from 'three'

/** Marks a subtree the static batcher leaves alone (see `<Dynamic>`). */
export const DYNAMIC_KEY = 'runekDynamic'

/** The layer a batched source is moved to: no camera renders it, so only its batch draws. The
 *  world's pointer raycaster still tests it, so hover and click land on the source as before. */
export const BATCHED_LAYER = 31

/** Scans a mesh must hold still for before it joins a batch. */
const SETTLE_SCANS = 2
/** Moves after settling before a mesh is treated as animated and left out for good. */
const DEMOTE_AFTER = 2

/** A mesh the batcher can merge: plain geometry drawn with a shared, opaque, static material. */
export function isBatchable(o: Object3D): o is Mesh {
  const mesh = o as Mesh
  if (!mesh.isMesh) return false
  const flags = mesh as Mesh & {
    isInstancedMesh?: boolean
    isSkinnedMesh?: boolean
    isBatchedMesh?: boolean
  }
  if (flags.isInstancedMesh || flags.isSkinnedMesh || flags.isBatchedMesh) return false
  const material = mesh.material
  if (Array.isArray(material) || !material.name.startsWith('runek:') || material.transparent)
    return false
  if (mesh.onBeforeRender !== MESH_ON_BEFORE_RENDER) return false
  const g = mesh.geometry as BufferGeometry & { isInstancedBufferGeometry?: boolean }
  if (!g?.isBufferGeometry || g.isInstancedBufferGeometry || !g.attributes.position) return false
  if (Object.keys(g.morphAttributes).length > 0) return false
  if (g.drawRange.start !== 0 || Number.isFinite(g.drawRange.count)) return false
  for (const attr of Object.values(g.attributes)) {
    if (attr.normalized || !(attr.array instanceof Float32Array)) return false
  }
  return true
}

const MESH_ON_BEFORE_RENDER = new Mesh().onBeforeRender

/** Which attributes a geometry carries, and their sizes: only same-shaped geometry merges. */
export function attributeSignature(g: BufferGeometry): string {
  return Object.keys(g.attributes)
    .sort()
    .map((name) => `${name}:${g.attributes[name].itemSize}`)
    .join(',')
}

const center = new Vector3()

/** The cell a mesh belongs to, from its world-space bounding-sphere center. */
export function cellOf(mesh: Mesh, size: number): string {
  const g = mesh.geometry
  if (!g.boundingSphere) g.computeBoundingSphere()
  if (g.boundingSphere) center.copy(g.boundingSphere.center).applyMatrix4(mesh.matrixWorld)
  // Cells are centered on the ground plane vertically, so things standing on it never sit on a
  // cell boundary (a small move there would split them from their batch).
  return `${Math.floor(center.x / size)},${Math.floor(center.y / size + 0.5)},${Math.floor(center.z / size)}`
}

/** What a mesh is batched with: same material, shadow flags, attribute layout and cell. */
export function batchKey(mesh: Mesh, cellSize: number): string {
  return [
    (mesh.material as Material).uuid,
    mesh.castShadow ? 1 : 0,
    mesh.receiveShadow ? 1 : 0,
    attributeSignature(mesh.geometry),
    cellOf(mesh, cellSize),
  ].join('|')
}

const p = new Vector3()
const normalMatrix = new Matrix3()

/**
 * One world-space geometry from same-shaped meshes: positions and normals are carried through
 * each mesh's world matrix (a mirrored one flips its triangles so faces still point out), every
 * other attribute is copied as is.
 */
export function mergeInWorld(meshes: Mesh[]): BufferGeometry {
  const first = meshes[0].geometry
  const names = Object.keys(first.attributes)
  let vertices = 0
  let indices = 0
  for (const m of meshes) {
    const n = m.geometry.attributes.position.count
    vertices += n
    indices += m.geometry.index ? m.geometry.index.count : n
  }
  const out: Record<string, Float32Array> = {}
  for (const name of names) out[name] = new Float32Array(vertices * first.attributes[name].itemSize)
  const index = vertices > 65535 ? new Uint32Array(indices) : new Uint16Array(indices)

  let v0 = 0
  let i0 = 0
  for (const mesh of meshes) {
    const g = mesh.geometry
    const world = mesh.matrixWorld
    const count = g.attributes.position.count
    normalMatrix.getNormalMatrix(world)
    for (const name of names) {
      const attr = g.attributes[name]
      const size = attr.itemSize
      const target = out[name]
      for (let i = 0; i < count; i++) {
        if (name === 'position' || name === 'normal') {
          p.fromBufferAttribute(attr, i)
          if (name === 'position') p.applyMatrix4(world)
          else p.applyMatrix3(normalMatrix).normalize()
          target[(v0 + i) * 3] = p.x
          target[(v0 + i) * 3 + 1] = p.y
          target[(v0 + i) * 3 + 2] = p.z
        } else {
          for (let c = 0; c < size; c++) target[(v0 + i) * size + c] = attr.getComponent(i, c)
        }
      }
    }
    const flip = world.determinant() < 0
    const n = g.index ? g.index.count : count
    for (let k = 0; k < n; k += 3) {
      const a = g.index ? g.index.getX(k) : k
      const b = g.index ? g.index.getX(k + 1) : k + 1
      const c = g.index ? g.index.getX(k + 2) : k + 2
      index[i0 + k] = v0 + a
      index[i0 + k + 1] = v0 + (flip ? c : b)
      index[i0 + k + 2] = v0 + (flip ? b : c)
    }
    v0 += count
    i0 += n
  }

  const merged = new BufferGeometry()
  for (const name of names) {
    merged.setAttribute(name, new BufferAttribute(out[name], first.attributes[name].itemSize))
  }
  merged.setIndex(new BufferAttribute(index, 1))
  merged.computeBoundingSphere()
  merged.computeBoundingBox()
  return merged
}

interface Track {
  matrix: Matrix4
  geometry: BufferGeometry
  version: number
  material: Material
  /** Consecutive scans unchanged. */
  stable: number
  /** Moves after it had settled. */
  moves: number
  /** Layers mask before the batcher hid it. */
  layers: number | null
}

interface Batch {
  members: Mesh[]
  mesh: Mesh | null
}

const positionVersion = (g: BufferGeometry) =>
  (g.attributes.position as BufferAttribute | undefined)?.version ?? 0

/**
 * Merges static meshes that share a material into one mesh per material per cell, so draw calls
 * follow the number of looks rather than the number of parts. Call `scan` a few times a second:
 * it notices meshes appearing, settling, moving and leaving, and rebuilds only the batches whose
 * members changed. A batched mesh stays in place (colliders, picking and editing are untouched);
 * it just moves to a layer no camera draws while its batch draws for it. Raycasters that should
 * still hit batched parts enable `BATCHED_LAYER` (`<World>` does it for pointer events).
 */
export class StaticBatcher {
  readonly root: Group
  private readonly tracks = new Map<Mesh, Track>()
  private readonly batches = new Map<string, Batch>()

  constructor(
    root: Group,
    private readonly cellSize = 20,
  ) {
    this.root = root
    root.name = 'runek:batches'
    // Reachable from the scene, for tooling (`just perf`, debugging) to read `stats`/`demoted`.
    root.userData.batcher = this
    root.matrixAutoUpdate = false
  }

  /** How many batches draw right now, and how many meshes they stand in for. */
  get stats() {
    let batches = 0
    let members = 0
    for (const b of this.batches.values()) {
      if (!b.mesh) continue
      batches++
      members += b.members.length
    }
    return { batches, members }
  }

  /** Meshes left out because they kept moving after they had settled. */
  get demoted(): Mesh[] {
    return [...this.tracks].filter(([, t]) => t.moves >= DEMOTE_AFTER).map(([mesh]) => mesh)
  }

  scan(scene: Object3D) {
    const seen = new Set<Mesh>()
    const ready: Mesh[] = []
    const walk = (o: Object3D) => {
      if (o === this.root || !o.visible || o.userData[DYNAMIC_KEY]) return
      if (isBatchable(o)) {
        seen.add(o)
        if (this.track(o)) ready.push(o)
      }
      for (const child of o.children) walk(child)
    }
    walk(scene)

    for (const [mesh, track] of this.tracks) {
      if (seen.has(mesh)) continue
      this.reveal(mesh, track)
      this.tracks.delete(mesh)
    }

    const groups = new Map<string, Mesh[]>()
    for (const mesh of ready) {
      const key = batchKey(mesh, this.cellSize)
      const list = groups.get(key)
      if (list) list.push(mesh)
      else groups.set(key, [mesh])
    }

    for (const [key, batch] of this.batches) {
      const next = groups.get(key)
      if (next && sameMembers(batch.members, next)) {
        groups.delete(key)
        continue
      }
      this.drop(key, batch)
    }
    for (const [key, members] of groups) this.build(key, members)
  }

  /** Put every mesh back and remove the batches. */
  dispose() {
    for (const [key, batch] of this.batches) this.drop(key, batch)
    for (const [mesh, track] of this.tracks) this.reveal(mesh, track)
    this.tracks.clear()
  }

  /** Update a mesh's record; true when it has held still long enough to batch. */
  private track(mesh: Mesh): boolean {
    let t = this.tracks.get(mesh)
    if (!t) {
      t = {
        matrix: mesh.matrixWorld.clone(),
        geometry: mesh.geometry,
        version: positionVersion(mesh.geometry),
        material: mesh.material as Material,
        stable: 0,
        moves: 0,
        layers: null,
      }
      this.tracks.set(mesh, t)
      return false
    }
    const changed =
      !t.matrix.equals(mesh.matrixWorld) ||
      t.geometry !== mesh.geometry ||
      t.version !== positionVersion(mesh.geometry) ||
      t.material !== mesh.material
    if (changed) {
      if (t.stable >= SETTLE_SCANS) t.moves++
      t.stable = 0
      t.matrix.copy(mesh.matrixWorld)
      t.geometry = mesh.geometry
      t.version = positionVersion(mesh.geometry)
      t.material = mesh.material as Material
      this.reveal(mesh, t)
      return false
    }
    t.stable++
    return t.stable >= SETTLE_SCANS && t.moves < DEMOTE_AFTER
  }

  private build(key: string, members: Mesh[]) {
    const batch: Batch = { members, mesh: null }
    this.batches.set(key, batch)
    if (members.length < 2) return
    const first = members[0]
    const mesh = new Mesh(mergeInWorld(members), first.material)
    mesh.name = `runek:batch:${key.split('|').pop()}`
    mesh.castShadow = first.castShadow
    mesh.receiveShadow = first.receiveShadow
    mesh.matrixAutoUpdate = false
    mesh.userData.runekBatch = true
    batch.mesh = mesh
    this.root.add(mesh)
    for (const m of members) {
      const t = this.tracks.get(m)
      if (t && t.layers === null) {
        t.layers = m.layers.mask
        m.layers.set(BATCHED_LAYER)
      }
    }
  }

  private drop(key: string, batch: Batch) {
    this.batches.delete(key)
    if (batch.mesh) {
      this.root.remove(batch.mesh)
      batch.mesh.geometry.dispose()
    }
    for (const m of batch.members) {
      const t = this.tracks.get(m)
      if (t) this.reveal(m, t)
    }
  }

  private reveal(mesh: Mesh, track: Track) {
    if (track.layers === null) return
    mesh.layers.mask = track.layers
    track.layers = null
  }
}

function sameMembers(a: Mesh[], b: Mesh[]) {
  if (a.length !== b.length) return false
  const set = new Set(a)
  return b.every((m) => set.has(m))
}
