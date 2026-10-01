// Signed-distance building blocks for the figure: primitives, an ordered smooth "program" over
// tagged primitives, and a narrow-band surface-nets mesher written as a generator so a build can
// be spread over many frames. Plain TS (no three.js, no React), so it tests in isolation.

export type V3 = [number, number, number]
export type Field = (x: number, y: number, z: number) => number

export const len = (a: number, b: number, c = 0) => Math.sqrt(a * a + b * b + c * c)
export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

/** Polynomial smooth minimum: `k` is the blend radius (0 is a hard union). */
export function smin(a: number, b: number, k: number) {
  if (k <= 0) return a < b ? a : b
  const h = Math.max(k - Math.abs(a - b), 0) / k
  return Math.min(a, b) - h * h * k * 0.25
}
export const smax = (a: number, b: number, k: number) => -smin(-a, -b, k)

/** One tagged piece of a figure: its field, a bounding sphere, and how it blends in. */
export interface Prim {
  d: Field
  c: V3
  R: number
  /** Blend radius into everything before it. */
  k: number
  /** Carves instead of adds. */
  sub?: boolean
  /** Index of the bone it rides, which is where skin weights come from. */
  bone: number
  tag?: string
}

/** Rotation as an inverse 3x3 (row-major), from XYZ Euler angles. */
function inverseRotation(rot?: V3) {
  if (!rot) return null
  const [ax, ay, az] = rot
  const cx = Math.cos(ax)
  const sx = Math.sin(ax)
  const cy = Math.cos(ay)
  const sy = Math.sin(ay)
  const cz = Math.cos(az)
  const sz = Math.sin(az)
  // R = Rz Ry Rx; its inverse is the transpose.
  return [
    cz * cy,
    sz * cy,
    -sy,
    cz * sy * sx - sz * cx,
    sz * sy * sx + cz * cx,
    cy * sx,
    cz * sy * cx + sz * sx,
    sz * sy * cx - cz * sx,
    cy * cx,
  ]
}

/** iq's ellipsoid bound: exact on the surface, a good estimate near it. */
export function ellipsoid(c: V3, r: V3, rot?: V3): Field {
  const m = inverseRotation(rot)
  const [rx, ry, rz] = r
  return (x, y, z) => {
    let px = x - c[0]
    let py = y - c[1]
    let pz = z - c[2]
    if (m) {
      const qx = m[0] * px + m[1] * py + m[2] * pz
      const qy = m[3] * px + m[4] * py + m[5] * pz
      const qz = m[6] * px + m[7] * py + m[8] * pz
      px = qx
      py = qy
      pz = qz
    }
    const k0 = len(px / rx, py / ry, pz / rz)
    const k1 = len(px / (rx * rx), py / (ry * ry), pz / (rz * rz))
    return k1 === 0 ? -Math.min(rx, ry, rz) : (k0 * (k0 - 1)) / k1
  }
}

export function sphere(c: V3, r: number): Field {
  return (x, y, z) => len(x - c[0], y - c[1], z - c[2]) - r
}

/** iq's exact round cone from `a` (radius `r1`) to `b` (radius `r2`). */
export function roundCone(a: V3, b: V3, r1: number, r2: number): Field {
  const bx = b[0] - a[0]
  const by = b[1] - a[1]
  const bz = b[2] - a[2]
  const l2 = bx * bx + by * by + bz * bz
  const rr = r1 - r2
  const a2 = l2 - rr * rr
  const il2 = 1 / l2
  return (x, y, z) => {
    const px = x - a[0]
    const py = y - a[1]
    const pz = z - a[2]
    const t = px * bx + py * by + pz * bz
    const u = t - l2
    const qx = px * l2 - bx * t
    const qy = py * l2 - by * t
    const qz = pz * l2 - bz * t
    const x2 = qx * qx + qy * qy + qz * qz
    const y2 = t * t * l2
    const z2 = u * u * l2
    const k = Math.sign(rr) * rr * rr * x2
    if (Math.sign(u) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2
    if (Math.sign(t) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1
    return (Math.sqrt(x2 * a2 * il2) + t * rr) * il2 - r1
  }
}

/** Rounded box centred at `c` with half-extents `h`. */
export function box(c: V3, h: V3, round = 0): Field {
  return (x, y, z) => {
    const qx = Math.abs(x - c[0]) - h[0] + round
    const qy = Math.abs(y - c[1]) - h[1] + round
    const qz = Math.abs(z - c[2]) - h[2] + round
    return (
      len(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) +
      Math.min(Math.max(qx, qy, qz), 0) -
      round
    )
  }
}

/** A primitive from a field and its bounding sphere. */
export function prim(d: Field, c: V3, R: number, bone: number, k = 0, extra?: Partial<Prim>): Prim {
  return { d, c, R, k, bone, ...extra }
}

/**
 * Fold primitives into one field, in order: each smooth-unions into (or carves from) everything
 * before it. A primitive whose bounding sphere can't reach the running distance plus its blend is
 * skipped, which is exact for the polynomial blend and makes far pieces free.
 */
export function program(prims: readonly Prim[], inflate = 0): Field {
  const list = prims.slice()
  return (x, y, z) => {
    let d = 1e9
    for (let i = 0; i < list.length; i++) {
      const p = list[i]
      const lb = len(x - p.c[0], y - p.c[1], z - p.c[2]) - p.R - inflate
      if (p.sub) {
        if (lb >= p.k - d) continue
        d = smax(d, -(p.d(x, y, z) - inflate), p.k)
      } else {
        if (lb >= d + p.k) continue
        d = smin(d, p.d(x, y, z) - inflate, p.k)
      }
    }
    return d
  }
}

/** Only the primitives that can affect points inside the box (plus a margin). */
export function within(prims: readonly Prim[], min: V3, max: V3, margin = 0): Prim[] {
  return prims.filter((p) => {
    const dx = Math.max(min[0] - p.c[0], 0, p.c[0] - max[0])
    const dy = Math.max(min[1] - p.c[1], 0, p.c[1] - max[1])
    const dz = Math.max(min[2] - p.c[2], 0, p.c[2] - max[2])
    return len(dx, dy, dz) <= p.R + p.k + margin
  })
}

export interface Raw {
  positions: Float32Array
  normals: Float32Array
  indices: Uint32Array
}

/** Cells processed between yields, so a scheduler can stop a build at a frame boundary. */
const SLICE = 384

/**
 * Narrow-band surface nets. A coarse pass keeps only blocks near the surface; their fine cells
 * are sampled lazily. Each vertex starts at its cell centre and is projected onto the surface
 * along the gradient, so the mesh follows the true isosurface instead of the voxel staircase.
 * Yields every few hundred cells; the return value is the mesh.
 */
export function* surfaceNets(
  f: Field,
  min: V3,
  max: V3,
  h: number,
  block = 6,
): Generator<void, Raw> {
  const nx = Math.ceil((max[0] - min[0]) / h) + 1
  const ny = Math.ceil((max[1] - min[1]) / h) + 1
  const nz = Math.ceil((max[2] - min[2]) / h) + 1
  const total = nx * ny * nz
  const dense = total <= 4_000_000 ? new Float32Array(total).fill(Number.NaN) : null
  const sparse = dense ? null : new Map<number, number>()
  const val = (i: number, j: number, k: number) => {
    const key = i + nx * (j + ny * k)
    let v = dense ? dense[key] : sparse?.get(key)
    if (v === undefined || Number.isNaN(v)) {
      v = f(min[0] + i * h, min[1] + j * h, min[2] + k * h)
      if (dense) dense[key] = v
      else sparse?.set(key, v)
    }
    return v
  }

  const H = h * block
  const reach = H * 0.9 + h * 2
  const cells: number[] = []
  let work = 0
  for (let bk = 0; bk * block < nz - 1; bk++)
    for (let bj = 0; bj * block < ny - 1; bj++)
      for (let bi = 0; bi * block < nx - 1; bi++) {
        if (++work % SLICE === 0) yield
        const cx = min[0] + (bi + 0.5) * H
        const cy = min[1] + (bj + 0.5) * H
        const cz = min[2] + (bk + 0.5) * H
        if (Math.abs(f(cx, cy, cz)) > reach) continue
        for (let k = bk * block; k < Math.min((bk + 1) * block, nz - 1); k++)
          for (let j = bj * block; j < Math.min((bj + 1) * block, ny - 1); j++)
            for (let i = bi * block; i < Math.min((bi + 1) * block, nx - 1); i++)
              cells.push(i, j, k)
      }

  // Vertex: the mean of the cell's edge crossings (from cached samples), then one step along
  // the sampled gradient onto the true surface. Normals come from the faces afterwards, so
  // placing a vertex costs one extra field evaluation.
  const verts = new Map<number, number>()
  const pos: number[] = []
  const c = new Float64Array(8)
  const EDGES = [0, 1, 2, 3, 4, 5, 6, 7, 0, 2, 1, 3, 4, 6, 5, 7, 0, 4, 1, 5, 2, 6, 3, 7]
  const vertex = (i: number, j: number, k: number) => {
    const key = i + nx * (j + ny * k)
    const got = verts.get(key)
    if (got !== undefined) return got
    for (let q = 0; q < 8; q++) c[q] = val(i + (q & 1), j + ((q >> 1) & 1), k + ((q >> 2) & 1))
    let sx = 0
    let sy = 0
    let sz = 0
    let count = 0
    for (let e = 0; e < 24; e += 2) {
      const a = EDGES[e]
      const b = EDGES[e + 1]
      if (c[a] < 0 === c[b] < 0) continue
      const t = c[a] / (c[a] - c[b])
      sx += (a & 1) + ((b & 1) - (a & 1)) * t
      sy += ((a >> 1) & 1) + (((b >> 1) & 1) - ((a >> 1) & 1)) * t
      sz += ((a >> 2) & 1) + (((b >> 2) & 1) - ((a >> 2) & 1)) * t
      count++
    }
    const fx = count ? sx / count : 0.5
    const fy = count ? sy / count : 0.5
    const fz = count ? sz / count : 0.5
    // Trilinear gradient of the samples at that point.
    const gx =
      (c[1] - c[0]) * (1 - fy) * (1 - fz) +
      (c[3] - c[2]) * fy * (1 - fz) +
      (c[5] - c[4]) * (1 - fy) * fz +
      (c[7] - c[6]) * fy * fz
    const gy =
      (c[2] - c[0]) * (1 - fx) * (1 - fz) +
      (c[3] - c[1]) * fx * (1 - fz) +
      (c[6] - c[4]) * (1 - fx) * fz +
      (c[7] - c[5]) * fx * fz
    const gz =
      (c[4] - c[0]) * (1 - fx) * (1 - fy) +
      (c[5] - c[1]) * fx * (1 - fy) +
      (c[6] - c[2]) * (1 - fx) * fy +
      (c[7] - c[3]) * fx * fy
    const gl = len(gx, gy, gz) || 1
    let x = min[0] + (i + fx) * h
    let y = min[1] + (j + fy) * h
    let z = min[2] + (k + fz) * h
    const d = f(x, y, z)
    const lx = min[0] + i * h
    const ly = min[1] + j * h
    const lz = min[2] + k * h
    x = Math.min(Math.max(x - (d * gx) / gl, lx - h * 0.25), lx + h * 1.25)
    y = Math.min(Math.max(y - (d * gy) / gl, ly - h * 0.25), ly + h * 1.25)
    z = Math.min(Math.max(z - (d * gz) / gl, lz - h * 0.25), lz + h * 1.25)
    const idx = pos.length / 3
    pos.push(x, y, z)
    verts.set(key, idx)
    return idx
  }

  const tris: number[] = []
  const quad = (a: number, b: number, c: number, d: number, flip: boolean) => {
    if (flip) tris.push(a, c, b, a, d, c)
    else tris.push(a, b, c, a, c, d)
  }
  for (let n = 0; n < cells.length; n += 3) {
    if ((n / 3) % SLICE === 0) yield
    const i = cells[n]
    const j = cells[n + 1]
    const k = cells[n + 2]
    if (i < 1 || j < 1 || k < 1) continue
    const inside = val(i, j, k) < 0
    // Each sign change along a cell's lower edges joins the four cells sharing that edge.
    if (inside !== val(i + 1, j, k) < 0)
      quad(
        vertex(i, j - 1, k - 1),
        vertex(i, j, k - 1),
        vertex(i, j, k),
        vertex(i, j - 1, k),
        !inside,
      )
    if (inside !== val(i, j + 1, k) < 0)
      quad(
        vertex(i - 1, j, k - 1),
        vertex(i - 1, j, k),
        vertex(i, j, k),
        vertex(i, j, k - 1),
        !inside,
      )
    if (inside !== val(i, j, k + 1) < 0)
      quad(
        vertex(i - 1, j - 1, k),
        vertex(i, j - 1, k),
        vertex(i, j, k),
        vertex(i - 1, j, k),
        !inside,
      )
  }
  const positions = new Float32Array(pos)
  const indices = new Uint32Array(tris)
  return { positions, normals: faceNormals(positions, indices), indices }
}

/** Area-weighted vertex normals from the faces. */
export function faceNormals(p: Float32Array, idx: Uint32Array) {
  const out = new Float32Array(p.length)
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t] * 3
    const b = idx[t + 1] * 3
    const c = idx[t + 2] * 3
    const ux = p[b] - p[a]
    const uy = p[b + 1] - p[a + 1]
    const uz = p[b + 2] - p[a + 2]
    const vx = p[c] - p[a]
    const vy = p[c + 1] - p[a + 1]
    const vz = p[c + 2] - p[a + 2]
    const nx = uy * vz - uz * vy
    const ny = uz * vx - ux * vz
    const nz = ux * vy - uy * vx
    for (const v of [a, b, c]) {
      out[v] += nx
      out[v + 1] += ny
      out[v + 2] += nz
    }
  }
  for (let v = 0; v < out.length; v += 3) {
    const l = len(out[v], out[v + 1], out[v + 2]) || 1
    out[v] /= l
    out[v + 1] /= l
    out[v + 2] /= l
  }
  return out
}

/** A field sampled lazily on a lattice and trilinearly interpolated: cheap, smooth, approximate. */
export function lattice(f: Field, h: number): Field {
  const cache = new Map<number, number>()
  const at = (i: number, j: number, k: number) => {
    const key = i + 4096 + 8192 * (j + 4096 + 8192 * (k + 4096))
    let v = cache.get(key)
    if (v === undefined) {
      v = f(i * h, j * h, k * h)
      cache.set(key, v)
    }
    return v
  }
  return (x, y, z) => {
    const gx = x / h
    const gy = y / h
    const gz = z / h
    const i = Math.floor(gx)
    const j = Math.floor(gy)
    const k = Math.floor(gz)
    const tx = gx - i
    const ty = gy - j
    const tz = gz - k
    const l = (a: number, b: number, t: number) => a + (b - a) * t
    return l(
      l(l(at(i, j, k), at(i + 1, j, k), tx), l(at(i, j + 1, k), at(i + 1, j + 1, k), tx), ty),
      l(
        l(at(i, j, k + 1), at(i + 1, j, k + 1), tx),
        l(at(i, j + 1, k + 1), at(i + 1, j + 1, k + 1), tx),
        ty,
      ),
      tz,
    )
  }
}

/** Run a generator to completion (tests and synchronous callers). */
export function finish<T>(gen: Generator<void, T>): T {
  for (;;) {
    const r = gen.next()
    if (r.done) return r.value
  }
}

/** Seeded value noise in [0, 1], for cloth folds, hair clumps, and skin mottling. */
export function noise3(seed: number): Field {
  const hash = (i: number, j: number, k: number) => {
    let h = (i * 374761393 + j * 668265263 + k * 2147483647 + seed * 974634281) | 0
    h = Math.imul(h ^ (h >>> 13), 1274126177)
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295
  }
  const s = (t: number) => t * t * (3 - 2 * t)
  const l = (a: number, b: number, t: number) => a + (b - a) * t
  return (x, y, z) => {
    const i = Math.floor(x)
    const j = Math.floor(y)
    const k = Math.floor(z)
    const fx = s(x - i)
    const fy = s(y - j)
    const fz = s(z - k)
    return l(
      l(
        l(hash(i, j, k), hash(i + 1, j, k), fx),
        l(hash(i, j + 1, k), hash(i + 1, j + 1, k), fx),
        fy,
      ),
      l(
        l(hash(i, j, k + 1), hash(i + 1, j, k + 1), fx),
        l(hash(i, j + 1, k + 1), hash(i + 1, j + 1, k + 1), fx),
        fy,
      ),
      fz,
    )
  }
}
