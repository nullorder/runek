// Materials shared by every figure. Colors are baked into vertex colors, so one material per
// surface kind serves the whole crowd (and one shader program each).
import {
  BufferAttribute,
  Color,
  MeshPhysicalMaterial,
  type MeshPhysicalMaterialParameters,
  ShaderChunk,
  SphereGeometry,
} from 'three'
import { linear } from './build'
import type { MaterialKind } from './spec'

const SKIN_DIFFUSE =
  'reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution );'

/**
 * Skin: sheen for the fine fuzz, and a red-shifted wrap on the direct diffuse term as a cheap
 * stand-in for subsurface scattering (light bleeds past the terminator, warmer as it goes).
 * If a three.js release renames the patched line, the skin falls back to plain physical shading.
 */
function skin() {
  const m = new MeshPhysicalMaterial({
    vertexColors: true,
    roughness: 0.55,
    specularIntensity: 0.4,
    sheen: 0.35,
    sheenColor: new Color('#ff9a7a'),
    sheenRoughness: 0.55,
  })
  m.customProgramCacheKey = () => 'runek-person-skin'
  m.onBeforeCompile = (shader) => {
    const chunk = ShaderChunk.lights_physical_pars_fragment
    if (!chunk.includes(SKIN_DIFFUSE)) return
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <lights_physical_pars_fragment>',
      chunk.replace(
        SKIN_DIFFUSE,
        `vec3 wrapW = vec3( 0.45, 0.2, 0.12 );
         vec3 wrapNL = clamp( ( vec3( dot( geometryNormal, directLight.direction ) ) + wrapW ) / ( 1.0 + wrapW ), 0.0, 1.0 );
         reflectedLight.directDiffuse += wrapNL * directLight.color * BRDF_Lambert( material.diffuseContribution );`,
      ),
    )
  }
  return m
}

const SPECS: Record<Exclude<MaterialKind, 'skin'>, MeshPhysicalMaterialParameters> = {
  cloth: { roughness: 0.88, sheen: 0.6, sheenColor: new Color('#ffffff'), sheenRoughness: 0.8 },
  knit: { roughness: 0.95, sheen: 0.9, sheenColor: new Color('#ffffff'), sheenRoughness: 0.6 },
  denim: { roughness: 0.82, sheen: 0.45, sheenColor: new Color('#b8c6d6'), sheenRoughness: 0.7 },
  leather: { roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.35 },
  hair: { roughness: 0.5, sheen: 0.6, sheenColor: new Color('#ffffff'), sheenRoughness: 0.32 },
}

let shared: Record<MaterialKind | 'eye', MeshPhysicalMaterial> | null = null

export function personMaterials() {
  if (!shared) {
    shared = {
      skin: skin(),
      cloth: new MeshPhysicalMaterial({ vertexColors: true, ...SPECS.cloth }),
      knit: new MeshPhysicalMaterial({ vertexColors: true, ...SPECS.knit }),
      denim: new MeshPhysicalMaterial({ vertexColors: true, ...SPECS.denim }),
      leather: new MeshPhysicalMaterial({ vertexColors: true, ...SPECS.leather }),
      hair: new MeshPhysicalMaterial({ vertexColors: true, ...SPECS.hair }),
      eye: new MeshPhysicalMaterial({
        vertexColors: true,
        roughness: 0.25,
        clearcoat: 1,
        clearcoatRoughness: 0.03,
      }),
    }
  }
  return shared
}

/** An eyeball looking down +z: pupil, a streaked iris, a dark limbal ring, warm sclera. */
export function eyeGeometry(radius: number, iris: string, detail: number) {
  const g = new SphereGeometry(radius, detail, Math.round(detail * 0.66))
  g.rotateX(Math.PI / 2)
  const p = g.attributes.position
  const col = new Float32Array(p.count * 3)
  const ir = linear(iris)
  const sclera = linear('#efe9e2')
  const vein = linear('#e3c0b8')
  for (let i = 0; i < p.count; i++) {
    const ang = Math.acos(Math.max(-1, Math.min(1, p.getZ(i) / radius)))
    const around = Math.atan2(p.getY(i), p.getX(i))
    let c: [number, number, number]
    if (ang < 0.2) c = [0.002, 0.002, 0.002]
    else if (ang < 0.56) {
      const k =
        (0.75 + 0.25 * Math.sin(around * 37) * Math.sin(around * 11 + 1)) *
        (0.65 + (ang - 0.2) * 1.1)
      c = [ir[0] * k, ir[1] * k, ir[2] * k]
    } else if (ang < 0.62) c = [0.01, 0.008, 0.007]
    else {
      const t = Math.min(1, (ang - 0.62) / 1.2) * 0.6
      c = [
        sclera[0] + (vein[0] - sclera[0]) * t,
        sclera[1] + (vein[1] - sclera[1]) * t,
        sclera[2] + (vein[2] - sclera[2]) * t,
      ]
    }
    col.set(c, i * 3)
  }
  g.setAttribute('color', new BufferAttribute(col, 3))
  return g
}

/** The upper lid for blinking: a hemispherical cap just outside the eyeball, in skin. */
export function lidGeometry(radius: number, skinHex: string) {
  const g = new SphereGeometry(radius, 28, 10, 0, Math.PI * 2, 0, Math.PI / 2)
  const c = linear(skinHex)
  const col = new Float32Array(g.attributes.position.count * 3)
  for (let i = 0; i < col.length; i += 3) col.set([c[0] * 0.85, c[1] * 0.8, c[2] * 0.8], i)
  g.setAttribute('color', new BufferAttribute(col, 3))
  return g
}
