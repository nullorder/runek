// Materials shared by every figure. Colors are baked into vertex colors, so one material per
// surface kind serves the whole crowd (and one shader program each).
import {
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  DataTexture,
  LinearFilter,
  type Material,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  type MeshPhysicalMaterialParameters,
  MeshToonMaterial,
  RedFormat,
  ShaderChunk,
  SphereGeometry,
  type Texture,
} from 'three'
import { linear } from './build'
import { LIT_GAIN, type MaterialKind } from './spec'

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

/** The materials every figure shares; `skinOverride` stands in for the skin (its node twin under
 *  `WebGPURenderer`, where the GLSL patch doesn't compile). */
export function personMaterials(skinOverride?: Material) {
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
  return skinOverride ? { ...shared, skin: skinOverride as MeshPhysicalMaterial } : shared
}

/** How bright a lit seam is, in scene luminance for a full white: over the level bloom starts at. */
const SEAM_LEVEL = 2.2

let ramp: DataTexture | null = null
/**
 * The light on a drawn figure comes in two tones: lit, and a shadow that never goes black. The
 * step between them is one soft texel wide, and sits a little to the lit side of the terminator.
 */
export function drawnRamp(): Texture {
  if (ramp) return ramp
  const n = 32
  const data = new Uint8Array(n)
  for (let i = 0; i < n; i++) data[i] = i < 17 ? 112 : i === 17 ? 185 : 255
  ramp = new DataTexture(data, n, 1, RedFormat)
  ramp.minFilter = LinearFilter
  ramp.magFilter = LinearFilter
  ramp.generateMipmaps = false
  ramp.needsUpdate = true
  return ramp
}

/** Flat color in two tones, with a thin rim of light where the surface turns away, held under
 *  the brightness at which bloom takes hold. */
function drawn(rim: number) {
  // Flat color reflects more than a rounded surface would, so it is taken down a little to keep
  // whites from blooming under a lamp.
  const m = new MeshToonMaterial({
    vertexColors: true,
    gradientMap: drawnRamp(),
    color: new Color(0.8, 0.8, 0.8),
  })
  m.customProgramCacheKey = () => `runek-person-drawn:${rim}`
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      `{
        float rim = pow( 1.0 - saturate( dot( normal, normalize( vViewPosition ) ) ), 3.5 );
        outgoingLight += outgoingLight * rim * ${rim.toFixed(2)};
        // Flat color has no falloff to hold it back under a strong lamp, so its brightness
        // rolls off below the level where bloom starts: a figure is never a glow.
        float lum = dot( outgoingLight, vec3( 0.2126, 0.7152, 0.0722 ) );
        if ( lum > 0.5 ) {
          float over = lum - 0.5;
          outgoingLight *= ( 0.5 + 0.42 * over / ( over + 0.42 ) ) / lum;
        }
        // The one exception: a lit seam (vertex color written ${LIT_GAIN} times over) is a light of
        // its own, the same in the dark as under a lamp, and bright enough for bloom to catch.
        #if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
          float seam = smoothstep( 1.3, 3.0, max( vColor.r, max( vColor.g, vColor.b ) ) );
          outgoingLight = mix( outgoingLight, vColor.rgb * ${(SEAM_LEVEL / LIT_GAIN).toFixed(4)}, seam );
        #endif
      }
      #include <opaque_fragment>`,
    )
  }
  return m
}

let ink: MeshBasicMaterial | null = null
/**
 * The ink line round a drawn figure: the same mesh drawn inside out and pushed out along its
 * normals, in a dark shade of whatever color it outlines. The line keeps about the same width on
 * screen however far away the figure is. `WebGLRenderer` only: under `WebGPURenderer` a drawn
 * figure has no line.
 */
export function inkMaterial(): Material {
  if (ink) return ink
  ink = new MeshBasicMaterial({
    vertexColors: true,
    color: new Color(0.16, 0.13, 0.15),
    side: BackSide,
  })
  ink.customProgramCacheKey = () => 'runek-person-ink'
  ink.onBeforeCompile = (shader) => {
    // A lit seam's vertex color is far over 1: its line stays as dark as any other.
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      diffuseColor.rgb = min( diffuseColor.rgb, vec3( 0.2 ) );`,
    )
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      {
        vec4 inkView = modelViewMatrix * vec4( position, 1.0 );
        transformed += normalize( normal ) * min( 0.0017 * max( 1.0, - inkView.z ), 0.03 );
      }`,
    )
  }
  return ink
}

/** Makes one of a drawn figure's materials under `WebGPURenderer`, from the two-tone ramp. */
export type ToonMaker = (gradientMap: Texture) => Material

const drawnShared: Record<string, Record<MaterialKind | 'eye', MeshPhysicalMaterial>> = {}

/**
 * The materials a drawn (`punk`) figure shares: flat color in two tones. Each kind keeps a
 * material of its own, with its own rim of light, so a world can still restyle one of them.
 * `toon` builds them under `WebGPURenderer` (its node twin, without the rim); unset, they are the
 * GLSL ones.
 */
export function drawnMaterials(toon?: ToonMaker) {
  const key = toon ? 'node' : 'gl'
  let set = drawnShared[key]
  if (!set) {
    const make = (rim: number) =>
      (toon ? toon(drawnRamp()) : drawn(rim)) as unknown as MeshPhysicalMaterial
    set = {
      skin: make(0.35),
      cloth: make(0.25),
      knit: make(0.2),
      denim: make(0.25),
      leather: make(0.6),
      hair: make(0.45),
      eye: make(0),
    }
    drawnShared[key] = set
  }
  return set
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

/**
 * A drawn eye, looking down +z: the front of a large ball, so what shows through the opening is
 * nearly flat. The iris is a tall oval that tucks under the lash line, dark at the top and
 * bright at the bottom, with a pupil, a dark rim and two painted catchlights. `open` is half the
 * width and height of the opening it is seen through.
 */
export function drawnEyeGeometry(radius: number, open: [number, number], iris: string) {
  const [w, h] = open
  const rings = 30
  const segs = 44
  const reach = Math.min(1.35, Math.asin(Math.min(1, Math.max(w, h) / radius)) + 0.5)
  const pos: number[] = []
  const col: number[] = []
  const idx: number[] = []
  const base = linear(iris)
  // Eyes read by their color, so the iris is drawn brighter than the tone it was given.
  const peak = Math.max(base[0], base[1], base[2], 0.02)
  const lift = Math.min(3, 0.42 / peak)
  const ir = base.map((c) => Math.min(1, c * lift + 0.02))
  const white = linear('#e4dfdc')
  const shade = linear('#a9a6b8')
  const a = w * 0.86
  const b = h * 0.96
  const cy = -h * 0.02
  const mix = (p: number[], q: number[], t: number) => p.map((v, i) => v + (q[i] - v) * t)
  for (let r = 0; r <= rings; r++) {
    const theta = (r / rings) * reach
    for (let s = 0; s <= segs; s++) {
      const phi = (s / segs) * Math.PI * 2
      const x = radius * Math.sin(theta) * Math.cos(phi)
      const y = radius * Math.sin(theta) * Math.sin(phi)
      pos.push(x, y, radius * Math.cos(theta))
      const ex = x / a
      const ey = (y - cy) / b
      const rr = Math.hypot(ex, ey)
      let c: number[]
      if (rr < 1) {
        const up = (ey + 1) / 2
        // Dark under the lid, clear and bright toward the bottom: a deep eye, not a pale disc.
        c = ir.map((v) => v * (1.25 - 1.0 * up))
        // A lighter crescent along the bottom of the iris.
        if (ey < -0.25 && rr < 0.84) c = mix(c, [1, 1, 1], 0.28 * Math.min(1, (-ey - 0.25) / 0.5))
        if (rr > 0.9) c = ir.map((v) => v * 0.22)
        if (Math.hypot(ex / 0.46, (ey - 0.12) / 0.52) < 1) c = ir.map((v) => v * 0.06)
        // Both catchlights sit to the same side, as if from one lamp.
        if (Math.hypot((x + a * 0.36) / (a * 0.27), (y - cy - b * 0.4) / (a * 0.27)) < 1)
          c = [1, 1, 1]
        if (Math.hypot((x - a * 0.34) / (a * 0.12), (y - cy + b * 0.46) / (a * 0.12)) < 1)
          c = [1, 1, 1]
      } else {
        // The white, in the lid's shadow toward the top.
        c = mix(white, shade, Math.min(1, Math.max(0, (y - h * 0.2) / (h * 0.7))) * 0.7)
      }
      // The lash line is inked onto the eye itself, round the edge of the opening: heavy along
      // the top lid, a hairline underneath.
      const edge = Math.hypot(x / w, y / h)
      if (edge > (y > 0 ? 0.86 - 0.08 * Math.min(1, y / h) : 0.975)) c = [0.012, 0.009, 0.01]
      col.push(c[0], c[1], c[2])
    }
  }
  for (let r = 0; r < rings; r++)
    for (let s = 0; s < segs; s++) {
      const i = r * (segs + 1) + s
      idx.push(i, i + segs + 1, i + 1, i + 1, i + segs + 1, i + segs + 2)
    }
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3))
  g.setAttribute('color', new BufferAttribute(new Float32Array(col), 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

/** The blink lid over a drawn eye: the patch of a shell that covers the opening, in skin. */
export function drawnLidGeometry(radius: number, skinHex: string) {
  const g = new SphereGeometry(radius, 18, 10, Math.PI / 2 - 0.75, 1.5, 0, Math.PI / 2)
  const c = linear(skinHex)
  const col = new Float32Array(g.attributes.position.count * 3)
  for (let i = 0; i < col.length; i += 3) col.set([c[0] * 0.94, c[1] * 0.9, c[2] * 0.9], i)
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
