import { Color } from 'three'
import { BRDF_Lambert, clamp, diffuseColor, dot, normalView, vec3 } from 'three/tsl'
import { MeshPhysicalNodeMaterial, type Node, PhysicalLightingModel } from 'three/webgpu'

type Direct = PhysicalLightingModel['direct']
type V3 = Node<'vec3'>

/** Physical shading with the skin's direct diffuse swapped for a red-shifted wrap, as the GLSL
 *  patch does: light bleeds past the terminator, warmer as it goes, a cheap stand-in for
 *  subsurface scattering. */
class SkinLightingModel extends PhysicalLightingModel {
  direct(light: Parameters<Direct>[0], builder: Parameters<Direct>[1]) {
    const { lightDirection, lightColor, reflectedLight } = light
    // Everything the physical model does, except its Lambert term lands somewhere unused.
    const discard = vec3(0).toVar()
    const rest = { ...light, reflectedLight: { ...reflectedLight, directDiffuse: discard } }
    super.direct(rest as Parameters<Direct>[0], builder)
    const wrap = vec3(0.45, 0.2, 0.12)
    const facing = dot(normalView, lightDirection as V3)
    const wrapNL = clamp(vec3(facing).add(wrap).div(wrap.add(1)), 0, 1) as V3
    const lambert = BRDF_Lambert({ diffuseColor: diffuseColor.rgb }) as unknown as V3
    const diffuse = reflectedLight.directDiffuse as unknown as V3
    diffuse.addAssign(wrapNL.mul(lightColor as V3).mul(lambert))
  }
}

class SkinNodeMaterial extends MeshPhysicalNodeMaterial {
  setupLightingModel() {
    return new SkinLightingModel(
      this.useClearcoat,
      this.useSheen,
      this.useIridescence,
      this.useAnisotropy,
      this.useTransmission,
      this.useDispersion,
    )
  }
}

let shared: SkinNodeMaterial | null = null

/** The node (TSL) twin of `Person`'s skin, for `WebGPURenderer`: one for every figure. */
export function skinMaterial() {
  shared ??= new SkinNodeMaterial({
    vertexColors: true,
    roughness: 0.55,
    specularIntensity: 0.4,
    sheen: 0.35,
    sheenColor: new Color('#ff9a7a'),
    sheenRoughness: 0.55,
  })
  return shared
}
