import { BufferAttribute, BufferGeometry, type Color } from 'three'

export type V3 = [number, number, number]

/** Collects flat-shaded, vertex-coloured triangles. `quad` takes a hint the face should point
 *  along and winds it to match, so callers never reason about winding. */
export class MeshBuilder {
  readonly pos: number[] = []
  readonly col: number[] = []

  tri(a: V3, b: V3, c: V3, color?: Color) {
    const ux = b[0] - a[0]
    const uy = b[1] - a[1]
    const uz = b[2] - a[2]
    const vx = c[0] - a[0]
    const vy = c[1] - a[1]
    const vz = c[2] - a[2]
    const nx = uy * vz - uz * vy
    const ny = uz * vx - ux * vz
    const nz = ux * vy - uy * vx
    // Clamped hull rows meet at the stem and stern; their slivers would only trouble the collider.
    if (nx * nx + ny * ny + nz * nz < 1e-10) return
    this.pos.push(...a, ...b, ...c)
    if (color) for (let i = 0; i < 3; i++) this.col.push(color.r, color.g, color.b)
  }

  quad(a: V3, b: V3, c: V3, d: V3, hint: V3, color?: Color) {
    // The diagonals' cross product stays true when the quad has collapsed to a triangle.
    const ux = c[0] - a[0]
    const uy = c[1] - a[1]
    const uz = c[2] - a[2]
    const vx = d[0] - b[0]
    const vy = d[1] - b[1]
    const vz = d[2] - b[2]
    const n =
      (uy * vz - uz * vy) * hint[0] + (uz * vx - ux * vz) * hint[1] + (ux * vy - uy * vx) * hint[2]
    if (n >= 0) {
      this.tri(a, b, c, color)
      this.tri(a, c, d, color)
    } else {
      this.tri(a, c, b, color)
      this.tri(a, d, c, color)
    }
  }

  append(other: MeshBuilder) {
    for (const v of other.pos) this.pos.push(v)
    for (const v of other.col) this.col.push(v)
  }

  get empty() {
    return this.pos.length === 0
  }

  geometry(): BufferGeometry {
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array(this.pos), 3))
    if (this.col.length) g.setAttribute('color', new BufferAttribute(new Float32Array(this.col), 3))
    g.computeVertexNormals()
    return g
  }

  /** The same triangles as a trimesh collider's vertices and indices. */
  trimesh(): [Float32Array, Uint32Array] {
    const vertices = new Float32Array(this.pos)
    const indices = new Uint32Array(vertices.length / 3)
    for (let i = 0; i < indices.length; i++) indices[i] = i
    return [vertices, indices]
  }
}

/** A cheap stable hash of two integers and a seed, in [0, 1). */
export function hash01(a: number, b: number, seed: number): number {
  let h =
    Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1) ^ Math.imul(seed | 0, 0x9e3779b1)
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b)
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}
