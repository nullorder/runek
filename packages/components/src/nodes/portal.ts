import {
  AdditiveBlending,
  type BufferGeometry,
  type Color,
  type InstancedBufferAttribute,
  InstancedBufferGeometry,
  PlaneGeometry,
} from 'three'
import {
  attribute,
  cameraProjectionMatrix,
  clamp,
  cos,
  exp,
  float,
  fract,
  length,
  max,
  mix,
  modelViewMatrix,
  positionGeometry,
  pow,
  sin,
  smoothstep,
  uv,
  varying,
  vec2,
  vec3,
  vec4,
} from 'three/tsl'
import { MeshBasicNodeMaterial, type Node } from 'three/webgpu'
import { fbm } from './noise'
import { follow } from './uniforms'

type F = Node<'float'>
type V2 = Node<'vec2'>
type V3 = Node<'vec3'>

/** A point `offset` (in view units) from the object's center, facing the camera: the clip
 *  position the GLSL computes as `projectionMatrix * (modelViewMatrix * origin + offset)`. */
export function facing(offset: V2) {
  const center = modelViewMatrix.mul(vec4(0, 0, 0, 1))
  return cameraProjectionMatrix.mul(center.add(vec4(offset, 0, 0)))
}

/** Rotate `p` by an angle growing toward the center: noise sampled through it spirals. */
function twirl(p: V2, r: F, k: number, t: F): V2 {
  const a = float(k).div(r.add(0.15)).add(t)
  const c = cos(a)
  const s = sin(a)
  return vec2(c.mul(p.x).add(s.mul(p.y)), s.negate().mul(p.x).add(c.mul(p.y))) as V2
}

export interface VortexUniforms {
  uTime: { value: number }
  uR: { value: number }
  uExtent: { value: number }
  uSeed: { value: number }
  uHot: { value: Color }
  uCool: { value: Color }
}

/** The node (TSL) twin of `Portal`'s vortex. */
export function vortexMaterial(record: VortexUniforms) {
  const time = follow<F>(record.uTime)
  const R = follow<F>(record.uR)
  const extent = follow<F>(record.uExtent)
  const seed = follow<F>(record.uSeed)
  const hot = follow<V3>(record.uHot)
  const cool = follow<V3>(record.uCool)

  const p = varying(positionGeometry.xy.mul(extent)) as V2
  const r = length(p) as F
  const h = 0.42
  let arms = mix(
    fbm(twirl(p, r, 2.2, time.mul(0.7)).mul(2.4).add(seed) as V2, 4, 2.03, 17.1),
    fbm(twirl(p, r, 3.6, time.mul(1.4)).mul(4.2).sub(seed) as V2, 4, 2.03, 17.1),
    0.45,
  ) as F
  arms = smoothstep(0.3, 0.85, arms) as F
  const outside = smoothstep(h - 0.012, h + 0.012, r)
  const disc = outside.mul(exp(r.sub(h).mul(-2.4))).mul(smoothstep(0.95, 1.3, r).oneMinus())
  const ring = exp(pow(r.sub(h * 1.04).div(0.022), 2).negate())
  const halo = outside.mul(exp(r.sub(h).mul(-1.7))).mul(smoothstep(1.3, 1.9, r).oneMinus())
  const pulse = sin(time.mul(1.3).add(r.mul(6)))
    .mul(0.15)
    .add(0.85)
  const heat = exp(r.sub(h).mul(-5))
  const tint = mix(cool, hot, clamp(heat, 0, 1)) as V3
  let light = tint
    .mul(disc.mul(arms).mul(3).add(halo.mul(0.4).mul(pulse)))
    .add(mix(hot, vec3(1), 0.6).mul(ring).mul(1.6)) as V3
  const inner = outside
    .oneMinus()
    .mul(pow(r.div(h), 6))
    .mul(arms)
    .mul(0.25)
  light = light.add(cool.mul(inner)) as V3
  const shadow = smoothstep(h, h * 1.8, r)
    .oneMinus()
    .mul(0.6)
  const alpha = max(
    outside.oneMinus(),
    clamp(disc.mul(arms).mul(0.7).add(shadow.mul(outside)), 0, 0.95),
  )

  const material = new MeshBasicNodeMaterial({
    transparent: true,
    premultipliedAlpha: true,
    depthWrite: false,
  })
  material.vertexNode = facing(positionGeometry.xy.mul(extent).mul(R) as V2)
  // Light added over the scene: the GLSL adds it to display values, this to linear light, so it
  // goes in as is (converting it would wash the swirl out against a bright sky).
  material.colorNode = vec4(light, alpha)
  material.toneMapped = false
  return material
}

/**
 * Sized points for `WebGPURenderer`, which draws `Points` one pixel wide: one camera-facing quad
 * per point, instanced. `attributes` become per-instance attributes of the same names.
 */
export function pointQuads(count: number, attributes: Record<string, InstancedBufferAttribute>) {
  const quad = new PlaneGeometry(1, 1)
  const geometry = new InstancedBufferGeometry()
  geometry.index = quad.index
  geometry.setAttribute('position', quad.getAttribute('position'))
  geometry.setAttribute('uv', quad.getAttribute('uv'))
  for (const [name, attr] of Object.entries(attributes)) geometry.setAttribute(name, attr)
  geometry.instanceCount = count
  return geometry as BufferGeometry
}

export interface PortalMoteUniforms {
  uTime: { value: number }
  uR: { value: number }
  uSize: { value: number }
  uColor: { value: Color }
}

/** The node (TSL) twin of `Portal`'s drifting motes, drawn on `pointQuads`. */
export function portalMotesMaterial(record: PortalMoteUniforms) {
  const time = follow<F>(record.uTime)
  const R = follow<F>(record.uR)
  const size = follow<F>(record.uSize)
  const color = follow<V3>(record.uColor)
  const mote = attribute('aMote', 'vec3') as V3
  const life = fract(mote.y.add(time.mul(mote.z))) as F
  const r = mix(1.45, 0.44, life.mul(life)) as F
  const a = mote.x.sub(float(2.2).div(r.add(0.15))).sub(time.mul(0.7))
  const span = size.mul(life.add(0.6))
  const offset = vec2(cos(a), sin(a)).mul(r).mul(R).add(positionGeometry.xy.mul(span)) as V2
  const fade = varying(smoothstep(0, 0.25, life).mul(smoothstep(0.85, 1, life).oneMinus())) as F
  const d = length(uv().sub(0.5))

  const material = new MeshBasicNodeMaterial({
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
  })
  material.vertexNode = facing(offset)
  material.colorNode = vec4(color.mul(smoothstep(0.5, 0, d)).mul(fade), 1)
  material.toneMapped = false
  return material
}

/** The node (TSL) twin of a portal's or rift's glow pooled on the ground. */
export function poolMaterial(
  record: { uColor: { value: Color }; uOpen?: { value: number } },
  strength: number,
) {
  const color = follow<V3>(record.uColor)
  const open = record.uOpen ? follow<F>(record.uOpen) : float(1)
  const r = length(uv().sub(0.5)).mul(2)
  const a = pow(max(r.oneMinus(), 0), 2.2).mul(strength).mul(open)
  const material = new MeshBasicNodeMaterial({
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
  })
  // Added over the floor in linear light, as is (see the vortex).
  material.colorNode = vec4(color.mul(a), 1)
  material.toneMapped = false
  return material
}
