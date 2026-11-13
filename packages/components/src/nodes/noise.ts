import { dot, float, floor, fract, mix, sin, vec2 } from 'three/tsl'
import type { Node } from 'three/webgpu'

type V2 = Node<'vec2'>
type F = Node<'float'>

/** The GLSL `hash` the shader components share: a pseudo-random 0..1 per point. */
export function hash(p: V2): F {
  return fract(sin(dot(p, vec2(127.1, 311.7))).mul(43758.5453)) as F
}

/** Smooth value noise, 0..1. */
export function noise(p: V2): F {
  const i = floor(p) as V2
  const f = fract(p) as V2
  const u = f.mul(f).mul(f.mul(-2).add(3)) as V2
  const a = hash(i)
  const b = hash(i.add(vec2(1, 0)) as V2)
  const c = hash(i.add(vec2(0, 1)) as V2)
  const d = hash(i.add(vec2(1, 1)) as V2)
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y) as F
}

/** Fractal noise: `octaves` layers, each `lacunarity` times finer and shifted by `shift`. */
export function fbm(p: V2, octaves: number, lacunarity: number, shift: number): F {
  let v: F = float(0)
  let q: V2 = p
  let a = 0.5
  for (let i = 0; i < octaves; i++) {
    v = v.add(noise(q).mul(a)) as F
    q = q.mul(lacunarity).add(shift) as V2
    a *= 0.5
  }
  return v
}
