import { AdditiveBlending, type Color, DataTexture, type Texture, type Vector4 } from 'three'
import {
  abs,
  atan,
  attribute,
  clamp,
  cos,
  exp,
  floor,
  fract,
  length,
  max,
  mix,
  modelWorldMatrix,
  positionGeometry,
  pow,
  screenCoordinate,
  sin,
  smoothstep,
  step,
  texture,
  uv,
  varying,
  vec2,
  vec3,
  vec4,
} from 'three/tsl'
import { MeshBasicNodeMaterial, type Node } from 'three/webgpu'
import { fbm, hash, noise } from './noise'
import { facing } from './portal'
import { follow } from './uniforms'

type F = Node<'float'>
type V2 = Node<'vec2'>
type V3 = Node<'vec3'>

export interface RiftShared {
  uTime: { value: number }
  uOpen: { value: number }
  uTurb: { value: number }
  uSeed: { value: number }
}

/** The rift's edge (as the GLSL `EDGE` chunk): its outline and thin-film colors. */
function edgeOf(record: RiftShared, closed: number) {
  const time = follow<F>(record.uTime)
  const open = follow<F>(record.uOpen)
  const turb = follow<F>(record.uTurb)
  const seed = follow<F>(record.uSeed)
  // Sampling noise on the unit circle keeps the outline seamless all the way round.
  const edge = (dir: V2) => {
    const ragged = smoothstep(closed, 1, open).mul(turb)
    const slow = fbm(dir.mul(1.4).add(seed).add(time.mul(0.11)) as V2, 3, 2.07, 13.3).sub(0.5)
    const fine = noise(dir.mul(6).sub(seed).add(time.mul(0.7)) as V2).sub(0.5)
    return open.mul(slow.mul(0.55).mul(ragged).add(fine.mul(0.1).mul(ragged)).add(0.82)) as F
  }
  // Thin-film iridescence, held to the pink / violet / cyan end of the spectrum.
  const film = (at: F) => {
    const x = fract(at)
    let c = mix(vec3(1, 0.08, 0.55), vec3(0.35, 0.12, 1), smoothstep(0, 0.33, x)) as V3
    c = mix(c, vec3(0.1, 0.75, 1), smoothstep(0.33, 0.66, x)) as V3
    return mix(c, vec3(1, 0.08, 0.55), smoothstep(0.66, 1, x)) as V3
  }
  return { time, open, seed, edge, film }
}

/** The object's scale along x, as the GLSL `length(modelMatrix[0].xyz)`. */
const worldScale = () => length(modelWorldMatrix.mul(vec4(1, 0, 0, 0)).xyz) as F

export interface RiftWindowUniforms extends RiftShared {
  uR: { value: number }
  uView: { value: Texture | null }
  uViewport: { value: Vector4 }
  uLive: { value: number }
  uTint: { value: Color }
  uTintMix: { value: number }
}

/** The node (TSL) twin of `Rift`'s window: the far end live, the plasma rim and glints. */
export function windowMaterial(record: RiftWindowUniforms, closed: number, extent: number) {
  // Black until the first far view is drawn into a target.
  const placeholder = new DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1)
  placeholder.needsUpdate = true
  const { time, open, seed, edge, film } = edgeOf(record, closed)
  const R = follow<F>(record.uR)
  const viewport = follow<Node<'vec4'>>(record.uViewport)
  const live = follow<F>(record.uLive)
  const tintColor = follow<V3>(record.uTint)
  const tintMix = follow<F>(record.uTintMix)

  const p = varying(positionGeometry.xy.div(R)) as V2
  const r = length(p) as F
  const dir = p.div(max(r, 1e-4)) as V2
  const d = r.sub(edge(dir))
  const s = mix(0.45, 1, open) as F
  const inside = smoothstep(s.mul(-0.006), s.mul(0.006), d).oneMinus()
  const lens = exp(d.min(0).div(s.mul(0.05)))
  const a = atan(p.y, p.x)
  const tint = mix(
    film(a.mul(0.32).add(d.mul(1.2)).add(time.mul(0.08)) as F),
    tintColor,
    tintMix,
  ) as V3

  // The far end, sampled where this pixel is on screen. WebGPU counts screen and texture rows
  // from the top, so both agree without a flip; only the lensing's vertical push changes sign.
  const at = screenCoordinate.xy.sub(viewport.xy).div(viewport.zw) as V2
  const bent = at.sub(vec2(dir.x, dir.y.negate()).mul(lens).mul(0.012)) as V2
  const viewTexture = texture(placeholder, bent)
  const view = viewTexture.rgb as V3
  const shimmer = tint.mul(
    fbm(p.mul(2.5).add(seed).add(time.mul(0.15)) as V2, 3, 2.07, 13.3)
      .mul(0.18)
      .add(0.12),
  )
  let far = mix(shimmer, view, live) as V3
  far = mix(far, tint.mul(0.5), lens.mul(0.25)) as V3

  const plasma = noise(
    dir
      .mul(14)
      .add(vec2(time.mul(1.7), time.mul(-1.3)))
      .add(seed) as V2,
  )
    .mul(0.9)
    .add(0.55)
  const core = exp(pow(d.div(s.mul(0.02)), 2).negate()).mul(plasma)
  const glow = exp(abs(d).negate().div(s.mul(0.04))).mul(plasma)
  const halo = step(0, d)
    .mul(exp(pow(d.div(s.mul(0.2)), 2).negate()))
    .mul(0.16)

  const g = p.mul(40) as V2
  const id = floor(g) as V2
  const h = hash(id.add(seed) as V2)
  const off = vec2(hash(id.add(3.1) as V2), hash(id.add(7.7) as V2))
    .sub(0.5)
    .mul(0.6)
  const twinkle = pow(
    sin(time.mul(h.mul(5).add(2)).add(h.mul(40)))
      .mul(0.5)
      .add(0.5),
    6,
  )
  const band = exp(pow(d.sub(s.mul(0.05)).div(s.mul(0.1)), 2).negate())
  const glint = step(0.6, h)
    .mul(twinkle)
    .mul(smoothstep(0.14, 0, length(fract(g).sub(0.5).sub(off))))
    .mul(band)

  const fade = smoothstep(extent * 0.75, extent, r).oneMinus()
  const light = tint
    .mul(glow.mul(1.1).add(halo))
    .add(vec3(1).mul(core).mul(1.8))
    .add(mix(vec3(1), tint, 0.4).mul(glint).mul(2.5))
    .mul(fade) as V3
  const alpha = max(
    inside,
    clamp(core.mul(0.6).add(glow.mul(0.6)).add(halo.mul(1.2)).add(glint.mul(0.5)).mul(fade), 0, 1),
  )

  const material = new MeshBasicNodeMaterial({
    transparent: true,
    premultipliedAlpha: true,
    depthWrite: false,
  })
  material.vertexNode = facing(positionGeometry.xy.mul(worldScale()) as V2)
  // The GLSL encodes its output itself; here the frame's output pass does, from linear light.
  material.colorNode = vec4(far.mul(inside).add(light), alpha)
  // The far end's texture: point `view.value` at the target drawn for this frame.
  return { material, view: viewTexture as unknown as { value: Texture } }
}

export interface RiftMoteUniforms extends RiftShared {
  uR: { value: number }
  uSize: { value: number }
  uTint: { value: Color }
  uTintMix: { value: number }
}

/** The node (TSL) twin of `Rift`'s glitter, drawn on `pointQuads`. */
export function riftMotesMaterial(record: RiftMoteUniforms, closed: number) {
  const { time, open, edge, film } = edgeOf(record, closed)
  const R = follow<F>(record.uR)
  const size = follow<F>(record.uSize)
  const tintColor = follow<V3>(record.uTint)
  const tintMix = follow<F>(record.uTintMix)
  const mote = attribute('aMote', 'vec3') as V3
  const kind = attribute('aKind', 'vec3') as V3

  const life = fract(mote.y.add(time.mul(mote.z))) as F
  const start = vec2(cos(mote.x), sin(mote.x)) as V2
  // Born on the rim, then shed outward (or, for a few, inward) and settling like glitter.
  const r = edge(start).add(kind.z.mul(life).mul(mix(0.4, 1, open)))
  const a = mote.x.add(life.mul(0.35))
  const p = vec2(cos(a), sin(a))
    .mul(r)
    .sub(vec2(0, life.mul(life).mul(0.3).mul(open))) as V2
  const scale = worldScale()
  const span = size.mul(scale).mul(kind.x.add(0.4))
  const offset = p.mul(R).mul(scale).add(positionGeometry.xy.mul(span)) as V2

  const fade = smoothstep(0, 0.08, life).mul(smoothstep(0.55, 1, life).oneMinus())
  const twinkle = pow(
    sin(time.mul(kind.y.mul(9).add(5)).add(mote.y.mul(60)))
      .mul(0.5)
      .add(0.5),
    3,
  )
    .mul(0.65)
    .add(0.35)
  const color = varying(
    mix(vec3(1), mix(film(kind.y), tintColor, tintMix), 0.55)
      .mul(fade)
      .mul(twinkle),
  ) as V3
  const spark = pow(smoothstep(0.5, 0, length(uv().sub(0.5))), 2)

  const material = new MeshBasicNodeMaterial({
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
  })
  material.vertexNode = facing(offset)
  material.colorNode = vec4(color.mul(spark).mul(1.6), 1)
  material.toneMapped = false
  return material
}

export { pointQuads, poolMaterial } from './portal'
