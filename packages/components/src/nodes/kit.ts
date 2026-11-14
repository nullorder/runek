// The facade kit's materials as TSL node materials, for WebGPURenderer. Same lighting model as
// the GLSL in city/kit.ts (matte parts under street light, emitters on their ladder rung, letters cut
// from the glyph atlas, light splats added to the street). The per-kind surface detail (slats, fan grilles, awning stripes, cage
// wire, vending rows) is skipped here: parts draw in their flat color.

import { AdditiveBlending, type DataTexture } from 'three'
import {
  attribute,
  exp,
  float,
  floor,
  max,
  mix,
  mod,
  normalWorld,
  positionWorld,
  pow,
  select,
  smoothstep,
  texture,
  uv,
  vec2,
} from 'three/tsl'
import { MeshBasicNodeMaterial, type Node } from 'three/webgpu'
import { towerNodeUniforms as U } from './city'

const rung = (r: Node<'vec2'>, t: Node<'float'>) => r.x.mul(pow(r.y.div(r.x), t))
const kitRung = (glow: Node<'float'>, t: Node<'float'>) =>
  select(
    glow.lessThan(1.5),
    rung(U.sign, t),
    select(glow.lessThan(2.5), rung(U.tube, t), rung(U.shop, t)),
  )

export function kitNodeMaterials(atlas: DataTexture) {
  const color = attribute<'vec4'>('aColor', 'vec4')
  const kit = attribute<'vec4'>('aKit', 'vec4')
  const dusk = mix(float(0.12), float(1), U.night)

  const box = new MeshBasicNodeMaterial()
  const shade = float(0.72).add(normalWorld.y.mul(0.28)).add(normalWorld.x.mul(0.1))
  const matte = color.rgb
    .mul(mix(float(0.35), U.wallGain, U.night))
    .mul(shade)
    .add(
      U.glow
        .mul(exp(max(positionWorld.y, 0).negate().div(6)))
        .mul(U.night)
        .mul(shade.mul(0.45).add(0.55)),
    )
  box.colorNode = select(
    color.a.lessThan(0.5),
    matte,
    color.rgb.mul(kitRung(color.a, kit.x)).mul(dusk),
  )
  box.fog = true

  const glyph = new MeshBasicNodeMaterial()
  const cell = vec2(mod(kit.y, 8), floor(kit.y.div(8)))
  const at = vec2(cell.x.add(uv().x), cell.y.add(float(1).sub(uv().y))).div(8)
  const tx = texture(atlas, at)
  // Glow 0 is stencil paint: matte under the street light, like the wall it sits on.
  const paint = color.rgb
    .mul(mix(float(0.35), U.wallGain, U.night))
    .add(U.glow.mul(U.night).mul(0.5))
  glyph.colorNode = select(
    color.a.lessThan(0.5),
    paint,
    color.rgb.mul(kitRung(color.a, kit.x)).mul(dusk),
  )
  glyph.opacityNode = select(kit.z.lessThan(0.5), tx.r, select(kit.z.lessThan(1.5), tx.g, tx.b))
  glyph.transparent = true
  glyph.depthWrite = false
  glyph.fog = true

  // Light on the street: a half disc from the foot of the wall, added to what lies under it.
  const splat = new MeshBasicNodeMaterial()
  const reach = vec2(uv().x.sub(0.5).mul(2), float(1).sub(uv().y)).length()
  const disc = float(1).sub(smoothstep(0, 1, reach))
  splat.colorNode = color.rgb.mul(rung(U.street, kit.x)).mul(U.night).mul(disc.mul(disc))
  splat.transparent = true
  splat.blending = AdditiveBlending
  splat.depthWrite = false
  splat.fog = false
  splat.polygonOffset = true
  splat.polygonOffsetFactor = -2
  splat.polygonOffsetUnits = -4
  return { box, glyph, splat }
}
