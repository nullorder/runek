// The TSL twins of city/haze.ts, for WebGPURenderer: a lamp's haze cone and the pool it leaves
// on the street, additive and faded out by distance instead of fog.

import { type Color, DoubleSide, type Material } from 'three'
import {
  abs,
  cameraPosition,
  distance,
  float,
  mix,
  normalView,
  positionViewDirection,
  positionWorld,
  pow,
  smoothstep,
  uniform,
  uv,
  vec2,
} from 'three/tsl'
import { MeshBasicNodeMaterial } from 'three/webgpu'
import { additive } from '../city/haze'

const cache = new Map<string, Material>()

/** The haze cone under a lamp head, in `color` (linear, already scaled to its luminance). */
export function coneNodeMaterial(color: Color): Material {
  const key = `cone:${color.r.toFixed(4)},${color.g.toFixed(4)},${color.b.toFixed(4)}`
  let m = cache.get(key)
  if (!m) {
    const n = new MeshBasicNodeMaterial()
    const facing = pow(abs(normalView.dot(positionViewDirection)), 1.5)
    n.colorNode = uniform(color.clone()).mul(facing).mul(uv().y.mul(uv().y))
    n.fog = false
    n.side = DoubleSide
    n.name = `runek:haze:${key}`
    m = additive(n)
    cache.set(key, m)
  }
  return m
}

/** The pool a lamp leaves on the street, faded in between `near` and `far` meters from the eye. */
export function poolNodeMaterial(color: Color, near: number, far: number): Material {
  const key = `pool:${color.r.toFixed(4)},${color.g.toFixed(4)},${color.b.toFixed(4)}:${near}:${far}`
  let m = cache.get(key)
  if (!m) {
    const n = new MeshBasicNodeMaterial()
    const r = uv().sub(vec2(0.5)).length().mul(2)
    const disc = float(1).sub(smoothstep(0, 1, r))
    const fade = mix(0.5, 1, smoothstep(near, far, distance(positionWorld, cameraPosition)))
    n.colorNode = uniform(color.clone()).mul(disc.mul(disc)).mul(fade)
    n.fog = false
    n.polygonOffset = true
    n.polygonOffsetFactor = -2
    n.polygonOffsetUnits = -4
    n.name = `runek:haze:${key}`
    m = additive(n)
    cache.set(key, m)
  }
  return m
}
