import { describe, expect, it } from 'vitest'
import {
  ellipsoid,
  finish,
  len,
  noise3,
  prim,
  program,
  roundCone,
  sphere,
  surfaceNets,
} from './sdf'

describe('surfaceNets', () => {
  const ball = sphere([0, 0, 0], 0.5)
  const mesh = finish(surfaceNets(ball, [-0.7, -0.7, -0.7], [0.7, 0.7, 0.7], 0.05))

  it('puts every vertex on the surface', () => {
    const p = mesh.positions
    for (let i = 0; i < p.length; i += 3)
      expect(Math.abs(len(p[i], p[i + 1], p[i + 2]) - 0.5)).toBeLessThan(0.01)
  })

  it('faces outward', () => {
    const { positions: p, normals: n } = mesh
    for (let i = 0; i < p.length; i += 3)
      expect(p[i] * n[i] + p[i + 1] * n[i + 1] + p[i + 2] * n[i + 2]).toBeGreaterThan(0)
  })

  it('is closed: every edge is shared by exactly two triangles', () => {
    const edges = new Map<string, number>()
    const idx = mesh.indices
    for (let t = 0; t < idx.length; t += 3)
      for (let e = 0; e < 3; e++) {
        const a = idx[t + e]
        const b = idx[t + ((e + 1) % 3)]
        const key = a < b ? `${a}:${b}` : `${b}:${a}`
        edges.set(key, (edges.get(key) ?? 0) + 1)
      }
    for (const count of edges.values()) expect(count).toBe(2)
  })

  it('is deterministic', () => {
    const again = finish(surfaceNets(ball, [-0.7, -0.7, -0.7], [0.7, 0.7, 0.7], 0.05))
    expect(Array.from(again.positions)).toEqual(Array.from(mesh.positions))
  })
})

describe('program', () => {
  it('skipping out-of-reach primitives changes nothing', () => {
    const prims = [
      prim(ellipsoid([0, 0, 0], [0.3, 0.5, 0.2]), [0, 0, 0], 0.5, 0, 0),
      prim(roundCone([0.2, 0, 0], [0.8, -0.4, 0], 0.1, 0.05), [0.5, -0.2, 0], 0.5, 0, 0.05),
      prim(sphere([0, 0.5, 0.1], 0.08), [0, 0.5, 0.1], 0.08, 0, 0.02, { sub: true }),
    ]
    const fast = program(prims)
    const brute = (x: number, y: number, z: number) => {
      let d = 1e9
      for (const p of prims) {
        const v = p.d(x, y, z)
        const k = p.k
        if (p.sub) {
          const a = -d
          const b = v
          const h = Math.max(k - Math.abs(a - b), 0) / (k || 1)
          d = -(Math.min(a, b) - h * h * k * 0.25)
        } else {
          const h = Math.max(k - Math.abs(d - v), 0) / (k || 1)
          d = Math.min(d, v) - h * h * k * 0.25
        }
      }
      return d
    }
    for (let i = 0; i < 200; i++) {
      const x = Math.sin(i * 1.3) * 1.2
      const y = Math.cos(i * 0.7) * 1.2
      const z = Math.sin(i * 2.1) * 0.6
      expect(fast(x, y, z)).toBeCloseTo(brute(x, y, z), 9)
    }
  })
})

describe('noise3', () => {
  it('is seeded and stays in [0, 1]', () => {
    const a = noise3(4)
    const b = noise3(4)
    const c = noise3(5)
    let differs = false
    for (let i = 0; i < 100; i++) {
      const v = a(i * 0.37, i * 0.11, i * 0.53)
      expect(v).toBe(b(i * 0.37, i * 0.11, i * 0.53))
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
      if (v !== c(i * 0.37, i * 0.11, i * 0.53)) differs = true
    }
    expect(differs).toBe(true)
  })
})
