import type { Color, Vector3 } from 'three'
import {
  cameraPosition,
  cos,
  distance,
  dot,
  float,
  max,
  mix,
  modelWorldMatrix,
  normalize,
  positionLocal,
  pow,
  reflect,
  sin,
  smoothstep,
  sRGBTransferEOTF,
  varying,
  vec2,
  vec3,
  vec4,
} from 'three/tsl'
import { MeshBasicNodeMaterial, type Node } from 'three/webgpu'
import { follow } from './uniforms'

/** What one body of water's waves and shading look like (the numbers its GLSL shader uses). */
export interface WaterShape {
  /** Wave frequencies: first wave x and y, second wave x and y, the diagonal chop. */
  freq: [number, number, number, number, number]
  /** How fast the diagonal chop runs against the clock. */
  chop: number
  /** Finite-difference step for the normal. */
  eps: number
  /** Waves in world XZ (they stay put while the mesh follows the camera) or in the mesh's own. */
  world: boolean
  /** How much sky tints the water at grazing angles. */
  sky: number
  /** Sun glint exponent and strength. */
  glint: [number, number]
  /** Crest brightening. */
  crest: number
  /** Base opacity, and what grazing angles add. */
  alpha: [number, number]
  /** Blend into distance fog (needs the fog uniforms). */
  fog: boolean
}

export interface WaterUniforms {
  uTime: { value: number }
  uWaveHeight: { value: number }
  uWaveSpeed: { value: number }
  uColorDeep: { value: Color }
  uColorShallow: { value: Color }
  uSunDir: { value: Vector3 }
  uFogColor?: { value: Color }
  uFogNear?: { value: number }
  uFogFar?: { value: number }
}

/** The node (TSL) twin of `Lake`'s and `Ocean`'s GLSL water, for `WebGPURenderer`. */
export function waterMaterial(record: WaterUniforms, shape: WaterShape) {
  const time = follow<Node<'float'>>(record.uTime)
  const waveHeight = follow<Node<'float'>>(record.uWaveHeight)
  const waveSpeed = follow<Node<'float'>>(record.uWaveSpeed)
  const deep = follow<Node<'vec3'>>(record.uColorDeep)
  const shallow = follow<Node<'vec3'>>(record.uColorShallow)
  const sunDir = follow<Node<'vec3'>>(record.uSunDir)
  const [fx1, fy1, fx2, fy2, fd] = shape.freq

  const waveH = (q: Node<'vec2'>, t: Node<'float'>): Node<'float'> => {
    const w1 = sin(q.x.mul(fx1).add(t)).mul(cos(q.y.mul(fy1).add(t.mul(0.8))))
    const w2 = sin(q.x.mul(fx2).sub(t.mul(0.7))).mul(sin(q.y.mul(fy2).add(t)))
    const w3 = sin(q.x.add(q.y).mul(fd).add(t.mul(shape.chop))).mul(0.25)
    return w1.add(w2).add(w3).mul(0.5) as Node<'float'>
  }

  const t = time.mul(waveSpeed)
  const q = (
    shape.world
      ? modelWorldMatrix.mul(vec4(positionLocal.x, positionLocal.y, 0, 1)).xz
      : positionLocal.xy
  ) as Node<'vec2'>
  const h = waveH(q, t)
  const hx = waveH(q.add(vec2(shape.eps, 0)), t)
  const hy = waveH(q.add(vec2(0, shape.eps)), t)
  const slope = waveHeight.div(shape.eps)
  const n = normalize(vec3(hx.sub(h).mul(slope).negate(), hy.sub(h).mul(slope).negate(), 1))
  const displaced = positionLocal.add(vec3(0, 0, h.mul(waveHeight)))

  const worldNormal = varying(normalize(modelWorldMatrix.mul(vec4(n, 0)).xyz))
  const worldPos = varying(modelWorldMatrix.mul(vec4(displaced, 1)).xyz)
  const wave = varying(h)

  const normal = normalize(worldNormal)
  const viewDir = normalize(cameraPosition.sub(worldPos))
  const m = smoothstep(-1, 1, wave)
  const fresnel = pow(float(1).sub(max(dot(normal, viewDir), 0)), 3)
  const glint = pow(max(dot(reflect(sunDir.negate(), normal), viewDir), 0), shape.glint[0])
  let color = mix(deep, shallow, m) as Node<'vec3'>
  color = mix(color, vec3(0.62, 0.78, 0.9), fresnel.mul(shape.sky)) as Node<'vec3'>
  color = color.add(vec3(1, 0.95, 0.85).mul(glint).mul(shape.glint[1])) as Node<'vec3'>
  color = color.add(pow(max(m.sub(0.6), 0), 2).mul(shape.crest)) as Node<'vec3'>
  let alpha = float(shape.alpha[0]).add(fresnel.mul(shape.alpha[1])) as Node<'float'>
  if (shape.fog && record.uFogColor && record.uFogNear && record.uFogFar) {
    const near = follow<Node<'float'>>(record.uFogNear)
    const far = follow<Node<'float'>>(record.uFogFar)
    const fog = smoothstep(near, far, distance(cameraPosition, worldPos))
    color = mix(color, follow<Node<'vec3'>>(record.uFogColor), fog) as Node<'vec3'>
    alpha = mix(alpha, float(1), fog) as Node<'float'>
  }

  const material = new MeshBasicNodeMaterial({ transparent: true })
  material.positionNode = displaced
  // The GLSL shader writes its color as is (no tone mapping, no output conversion); undoing the
  // node pipeline's sRGB output conversion here shows the same color.
  material.colorNode = vec4(sRGBTransferEOTF(color) as Node<'vec3'>, alpha)
  material.toneMapped = false
  material.fog = false
  return material
}
