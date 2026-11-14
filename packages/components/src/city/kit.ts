// The facade kit's shared draw: every AC unit, pipe, cable, vent, awning, shutter, sign and
// vending machine in a world is an instance in one of three InstancedMeshes, so a street full of
// props costs three draws however many towers it has. A fourth holds the light those signs leave
// on the ground.
//
// `near` holds the parts worth reflecting in the wet street (signs, tubes, awnings, shutters).
// `small` holds the rest and is left out of the world's mirrors (`skipMirrors`).
// `glyph` holds sign letters, cut from an atlas drawn in code at load from the world's fonts.
// `splat` holds soft additive pools on the street in front of lit signs and door lamps. They are
// not real lights: a shop's glow reads on the pavement without spending one of the world's few.
//
// Components describe their parts in local space with a KitBuilder (a pure function of props and
// seed) and hand them to `useKit`, which registers them in world space with the scene's Kit.

import { skipMirrors } from '@runek/core'
import {
  AdditiveBlending,
  BoxGeometry,
  Color,
  DataTexture,
  InstancedBufferAttribute,
  InstancedMesh,
  LinearFilter,
  LinearMipmapLinearFilter,
  type Material,
  Matrix4,
  PlaneGeometry,
  RGBAFormat,
  type Scene,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
  Vector3,
} from 'three'
import { emissiveColor } from './glow'
import { FOG_FADE } from './haze'
import { towerUniforms } from './towerLight'

/** Floats per box or glyph instance: a 4x4 matrix, then two vec4s. */
export const KIT_STRIDE = 24
/** How a part is lit: matte under street light, or an emitter on a ladder rung. */
export const GLOW = { matte: 0, sign: 1, tube: 2, glass: 3 } as const
/** Surface detail drawn by the box shader from the face's size in metres. */
export const DETAIL = {
  none: 0,
  slats: 1,
  fan: 2,
  vending: 3,
  stripes: 4,
  cage: 5,
  panel: 6,
} as const

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+-.:'&/!?#"
const ADVANCE: Record<string, number> = {
  I: 0.42,
  '1': 0.55,
  '.': 0.34,
  ':': 0.34,
  "'": 0.3,
  '!': 0.4,
  ' ': 0.45,
  M: 0.95,
  W: 1.0,
  '-': 0.6,
  '+': 0.7,
}
/** Advance of one glyph, in letter heights. */
export const glyphAdvance = (ch: string) => ADVANCE[ch] ?? 0.8
/** A glyph's quad side, in letter heights (the cap height fills half a cell). */
const GLYPH_QUAD = 2

const m4 = new Matrix4()
const m4b = new Matrix4()
const v3 = new Vector3()

/** A box that stops a walker, in the component's local space. Upright, turned about Y only. */
export interface KitSolid {
  /** Centre [x, y, z]. */
  position: [number, number, number]
  /** Half extents along the box's own X, Y and Z. */
  half: [number, number, number]
  /** Turn about Y, in radians. */
  rotY: number
}

/** Collects a component's kit parts in its local space. */
export class KitBuilder {
  near: number[] = []
  small: number[] = []
  glyph: number[] = []
  splat: number[] = []
  /** What a walker should bump into. The kit meshes do not read it: the component that owns the builder makes the colliders. */
  solids: KitSolid[] = []
  private frame = new Matrix4()
  private stack: Matrix4[] = []

  /** Enter a local frame at (x, y, z) turned `rotY` about Y. Parts added until `pop` sit in it. */
  push(x: number, y: number, z: number, rotY = 0) {
    this.stack.push(this.frame.clone())
    this.frame.multiply(m4.makeRotationY(rotY).setPosition(x, y, z))
    return this
  }
  pop() {
    this.frame.copy(this.stack.pop() ?? new Matrix4())
    return this
  }

  /**
   * Mark a box centred at (x, y, z) of size (sx, sy, sz) in the current frame as solid. It draws
   * nothing. Parts record their own (a vending machine's case), so a component that places them
   * gets colliders that follow the same seeded layout as the instances.
   */
  solid(x: number, y: number, z: number, sx: number, sy: number, sz: number) {
    const e = this.frame.elements
    v3.set(x, y, z).applyMatrix4(this.frame)
    this.solids.push({
      position: [v3.x, v3.y, v3.z],
      half: [sx / 2, sy / 2, sz / 2],
      rotY: Math.atan2(e[8], e[0]),
    })
    return this
  }

  private write(
    out: number[],
    local: Matrix4,
    color: string,
    glow: number,
    a: number,
    b: number,
    c: number,
    d: number,
  ) {
    m4b.multiplyMatrices(this.frame, local)
    const col = glow === GLOW.matte ? new Color(color) : emissiveColor(color, 1)
    out.push(...m4b.elements, col.r, col.g, col.b, glow, a, b, c, d)
  }

  /**
   * A box centred at (x, y, z) of size (sx, sy, sz). `glow` picks matte or a ladder rung, `t` the
   * place along that rung (0 to 1), `detail` a surface pattern. `shear` leans the box: its top
   * moves that far along local Z per metre of height (an awning's slope). `rise` lifts its far
   * end: that many metres of height per metre of local Z (a cable's slope).
   */
  box(
    small: boolean,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    color: string,
    {
      glow = GLOW.matte as number,
      t = 0.5,
      detail = DETAIL.none as number,
      seed = 0,
      rotY = 0,
      shear = 0,
      rise = 0,
    } = {},
  ) {
    m4.makeRotationY(rotY).setPosition(x, y, z)
    const s = new Matrix4().makeScale(sx, sy, sz)
    if (shear) s.elements[6] = shear * sy // local Z gains shear per unit of local Y
    if (rise) s.elements[9] = rise * sz // local Y gains rise per unit of local Z
    m4.multiply(s)
    this.write(small ? this.small : this.near, m4, color, glow, t, detail, seed, 0)
    return this
  }

  /**
   * Light left on the ground: a soft half disc lying flat at height y, its straight edge centred
   * on (x, z) and running along local X for `sx`, reaching `sz` out along local +Z (away from
   * the wall the light comes from). `t` is its place on the street-under-sign rung.
   */
  lightSplat(
    x: number,
    y: number,
    z: number,
    sx: number,
    sz: number,
    color: string,
    { t = 0.5 } = {},
  ) {
    // A unit plane laid flat: its top edge (uv.y = 1) ends up on the -Z side, at the wall.
    m4.makeRotationX(-Math.PI / 2)
      .scale(v3.set(sx, sz, 1))
      .setPosition(x, y, z + sz / 2)
    this.write(this.splat, m4, color, GLOW.sign, t, 0, 0, 0)
    return this
  }

  /** Width of `text` set at letter height `h`. */
  static textWidth(text: string, h: number, tracking = 0.06) {
    let w = 0
    for (const ch of text) w += (glyphAdvance(ch) + tracking) * h
    return w - tracking * h
  }

  /**
   * A line of text centred on (x, y, z), facing local +Z after `rotY`, letters `h` tall.
   * `outline` draws bent-tube letters, `body` uses the world's body font (stencil codes).
   * `vertical` stacks the letters downward from y.
   */
  text(
    text: string,
    x: number,
    y: number,
    z: number,
    h: number,
    color: string,
    {
      glow = GLOW.sign as number,
      t = 0.5,
      rotY = 0,
      outline = false,
      body = false,
      vertical = false,
      tracking = 0.06,
    } = {},
  ) {
    const q = h * GLYPH_QUAD
    const channel = body ? 2 : outline ? 1 : 0
    const width = vertical ? 0 : KitBuilder.textWidth(text, h, tracking)
    let cursor = -width / 2
    let row = 0
    for (const ch of text.toUpperCase()) {
      const adv = glyphAdvance(ch) * h
      const index = GLYPHS.indexOf(ch)
      if (index >= 0) {
        const lx = vertical ? 0 : cursor + adv / 2
        const ly = vertical ? -row * h * 1.28 : 0
        m4.makeRotationY(rotY)
        m4.multiply(new Matrix4().makeTranslation(lx, ly, 0)).multiply(
          new Matrix4().makeScale(q, q, 1),
        )
        m4.elements[12] += x
        m4.elements[13] += y
        m4.elements[14] += z
        this.write(this.glyph, m4, color, glow, t, index, channel, 0)
      }
      cursor += adv + tracking * h
      if (ch !== ' ' || vertical) row++
    }
    return this
  }
}

// ---------------------------------------------------------------------------------------------
// Glyph atlas

const ATLAS = 1024
const CELL = ATLAS / 8
const atlasData = new Uint8Array(ATLAS * ATLAS * 4)
let atlasTexture: DataTexture | null = null
const fontsAsked = new Set<string>()

function drawAtlas(display: string, body: string) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = ATLAS
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return
  const pass = (family: string, weight: number, stroke: boolean, channel: number) => {
    ctx.clearRect(0, 0, ATLAS, ATLAS)
    ctx.fillStyle = ctx.strokeStyle = 'white'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.lineJoin = ctx.lineCap = 'round'
    // Size the font so a capital is exactly half a cell tall, whatever the face.
    ctx.font = `${weight} 100px ${family}`
    const cap = ctx.measureText('H').actualBoundingBoxAscent || 70
    const px = (100 * CELL * 0.5) / cap
    ctx.font = `${weight} ${px}px ${family}`
    ctx.lineWidth = CELL * 0.05
    for (let i = 0; i < GLYPHS.length; i++) {
      const cx = (i % 8) * CELL + CELL / 2
      const cy = Math.floor(i / 8) * CELL + CELL * 0.75
      if (stroke) ctx.strokeText(GLYPHS[i], cx, cy)
      else ctx.fillText(GLYPHS[i], cx, cy)
    }
    const img = ctx.getImageData(0, 0, ATLAS, ATLAS).data
    for (let p = 0; p < ATLAS * ATLAS; p++) atlasData[p * 4 + channel] = img[p * 4 + 3]
  }
  pass(display, 600, false, 0)
  pass(display, 600, true, 1)
  pass(body, 500, false, 2)
  for (let p = 0; p < ATLAS * ATLAS; p++) atlasData[p * 4 + 3] = 255
  if (atlasTexture) atlasTexture.needsUpdate = true
}

/** The sign glyph atlas: R display fill, G display outline, B body fill. Redrawn when the world's fonts arrive. */
export function glyphAtlas(fonts?: { display?: string; body?: string }) {
  const families = { display: 'sans-serif', body: 'monospace' }
  if (!atlasTexture) {
    atlasTexture = new DataTexture(atlasData, ATLAS, ATLAS, RGBAFormat)
    atlasTexture.magFilter = LinearFilter
    atlasTexture.minFilter = LinearMipmapLinearFilter
    atlasTexture.generateMipmaps = true
    if (typeof document !== 'undefined') drawAtlas(families.display, families.body)
    atlasTexture.needsUpdate = true
  }
  if (typeof document === 'undefined' || typeof FontFace === 'undefined') return atlasTexture
  const key = `${fonts?.display}|${fonts?.body}`
  if (fonts && !fontsAsked.has(key)) {
    fontsAsked.add(key)
    const load = (name: string, url?: string) =>
      url
        ? new FontFace(name, `url(${url})`).load().then(
            (f) => {
              ;(document.fonts as unknown as { add(face: FontFace): void }).add(f)
              return `"${name}"`
            },
            () => null,
          )
        : Promise.resolve(null)
    void Promise.all([
      load('runek-kit-display', fonts.display),
      load('runek-kit-body', fonts.body),
    ]).then(([d, b]) => {
      if (d || b)
        drawAtlas(d ? `${d}, sans-serif` : families.display, b ? `${b}, monospace` : families.body)
    })
  }
  return atlasTexture
}

// ---------------------------------------------------------------------------------------------
// Materials (WebGL). The WebGPU twins live in kitNode.ts.

/** Uniforms the kit shares with every tower, plus its own night level. */
export const kitUniforms = {
  ...towerUniforms,
  uNight: { value: 1 },
  tAtlas: { value: null as DataTexture | null },
}

const PARS = /* glsl */ `
uniform float uNight;
uniform float uWallGain;
uniform vec3 uGlow;
uniform vec2 uSign;
uniform vec2 uTube;
uniform vec2 uShop;
float rung(vec2 r, float t) { return r.x * pow(r.y / r.x, t); }
float kitRung(float glow, float t) { return glow < 1.5 ? rung(uSign, t) : (glow < 2.5 ? rung(uTube, t) : rung(uShop, t)); }
`

const BOX_VERT = /* glsl */ `
attribute vec4 aColor;
attribute vec4 aKit;
varying vec4 vColor;
varying vec4 vKit;
varying vec2 vUvM;
varying vec2 vFace;
varying vec3 vLN;
varying vec3 vWN;
varying float vWorldY;
#include <fog_pars_vertex>
void main() {
  vColor = aColor; vKit = aKit; vLN = normal;
  mat4 im = instanceMatrix;
  vec3 s = vec3(length(im[0].xyz), length(im[1].xyz), length(im[2].xyz));
  vec3 an = abs(normal);
  vFace = an.x > 0.5 ? s.zy : (an.y > 0.5 ? s.xz : s.xy);
  vUvM = uv * vFace;
  vWN = normalize(mat3(modelMatrix) * mat3(im) * normal);
  vec4 wp = modelMatrix * im * vec4(position, 1.0);
  vWorldY = wp.y;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`

const BOX_FRAG = /* glsl */ `
${PARS}
varying vec4 vColor;
varying vec4 vKit;
varying vec2 vUvM;
varying vec2 vFace;
varying vec3 vLN;
varying vec3 vWN;
varying float vWorldY;
#include <fog_pars_fragment>
float pulseInt(float x, float a, float b) { return floor(x) * (b - a) + clamp(fract(x), a, b) - a; }
// Box-filtered periodic pulse: coverage of [a, b] in each unit cell over a footprint w.
float pulse(float x, float a, float b, float w) {
  w = max(w, 1e-4);
  return (pulseInt(x + 0.5 * w, a, b) - pulseInt(x - 0.5 * w, a, b)) / w;
}
float band(float x, float a, float b, float w) {
  return clamp((min(x + 0.5 * w, b) - max(x - 0.5 * w, a)) / max(w, 1e-4), 0.0, 1.0);
}
void main() {
  float glow = vColor.a, t = vKit.x, detail = vKit.y, sd = vKit.z;
  vec2 m = vUvM, fw = fwidth(vUvM);
  float side = 1.0 - step(0.5, abs(vLN.y));
  float front = step(0.5, vLN.z);
  float tone = 1.0;
  if (detail > 0.5 && detail < 1.5) {
    tone = mix(0.55, 1.0, pulse(m.y / 0.11, 0.0, 0.7, fw.y / 0.11)) * side + (1.0 - side);
  } else if (detail < 2.5 && detail > 1.5) {
    // An outdoor unit: a fan ring behind fins on the front, a seam round the case.
    vec2 c = (m - vec2(vFace.x * 0.38, vFace.y * 0.5)) / (vFace.y * 0.4);
    float disc = 1.0 - smoothstep(0.92, 1.0, length(c));
    float fins = pulse(m.y / 0.045, 0.0, 0.5, fw.y / 0.045);
    tone = mix(1.0, mix(0.25, 0.6, fins) * (0.6 + 0.4 * smoothstep(0.15, 0.3, length(c))), disc * front);
    tone *= mix(1.0, 0.7, (1.0 - front) * side * band(m.y, vFace.y - 0.05, vFace.y, fw.y));
  } else if (detail < 3.5 && detail > 2.5) {
    // A vending window: rows of lit goods.
    tone = mix(0.2, 1.0, pulse(m.y / 0.26, 0.12, 1.0, fw.y / 0.26) * pulse(m.x / 0.13, 0.2, 1.0, fw.x / 0.13));
  } else if (detail < 4.5 && detail > 3.5) {
    tone = mix(0.55, 1.0, pulse(m.x / 0.7, 0.0, 0.5, fw.x / 0.7));
  } else if (detail < 5.5 && detail > 4.5) {
    float wire = 1.0 - pulse(m.x / 0.09, 0.0, 0.8, fw.x / 0.09) * pulse(m.y / 0.09, 0.0, 0.8, fw.y / 0.09);
    tone = mix(0.35, 1.3, wire);
  } else if (detail > 5.5) {
    float rim = 1.0 - band(m.x, 0.05, vFace.x - 0.05, fw.x) * band(m.y, 0.05, vFace.y - 0.05, fw.y);
    tone = mix(1.0, 2.2, rim * (1.0 - step(0.5, abs(vLN.x))));
  }
  vec3 col;
  if (glow < 0.5) {
    // Matte: the wall's own unlit model, with a face shade so a box reads as a solid.
    float shade = 0.72 + 0.28 * vWN.y + 0.1 * vWN.x;
    col = vColor.rgb * mix(0.35, uWallGain, uNight) * shade * tone;
    col += uGlow * exp(-max(vWorldY, 0.0) / 6.0) * uNight * (0.55 + 0.45 * shade) * min(tone, 1.0);
  } else {
    col = vColor.rgb * kitRung(glow, t) * tone * mix(0.12, 1.0, uNight);
  }
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`

const GLYPH_VERT = /* glsl */ `
attribute vec4 aColor;
attribute vec4 aKit;
varying vec4 vColor;
varying vec3 vKit;
varying vec2 vUv;
#include <fog_pars_vertex>
void main() {
  vColor = aColor; vKit = aKit.xyz;
  vec2 cell = vec2(mod(aKit.y, 8.0), floor(aKit.y / 8.0));
  vUv = vec2(cell.x + uv.x, cell.y + 1.0 - uv.y) / 8.0;
  vec4 mvPosition = viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`

const GLYPH_FRAG = /* glsl */ `
${PARS}
uniform sampler2D tAtlas;
varying vec4 vColor;
varying vec3 vKit;
varying vec2 vUv;
#include <fog_pars_fragment>
void main() {
  vec3 tx = texture2D(tAtlas, vUv).rgb;
  float a = vKit.z < 0.5 ? tx.r : (vKit.z < 1.5 ? tx.g : tx.b);
  // Sharpen the edge when the atlas is magnified. Leave the mip's own coverage when it is not.
  float texels = length(fwidth(vUv)) * ${ATLAS}.0;
  float w = clamp(fwidth(a), 0.03, 0.5);
  a = mix(smoothstep(0.5 - w, 0.5 + w, a), a, clamp(texels - 0.6, 0.0, 1.0));
  if (a < 0.01) discard;
  // Glow 0 is paint on a wall (stencil codes). Anything else is a lit letter on its rung.
  vec3 col = vColor.a < 0.5 ? vColor.rgb * mix(0.35, uWallGain, uNight) + uGlow * uNight * 0.5 : vColor.rgb * kitRung(vColor.a, vKit.x) * mix(0.12, 1.0, uNight);
  gl_FragColor = vec4(col, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`

const SPLAT_VERT = /* glsl */ `
attribute vec4 aColor;
attribute vec4 aKit;
uniform float uNight;
uniform vec2 uStreet;
varying vec3 vColor;
varying vec2 vUv;
varying vec3 vWorld;
void main() {
  vColor = aColor.rgb * uStreet.x * pow(uStreet.y / uStreet.x, aKit.x) * uNight;
  vUv = uv;
  vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}`

// Brightest at the foot of the wall, gone at the far edge. Added to the street, so it fades
// with the fog range instead of mixing toward the fog color.
const SPLAT_FRAG = /* glsl */ `
varying vec3 vColor;
varying vec2 vUv;
varying vec3 vWorld;
${FOG_FADE}
void main() {
  float d = length(vec2((vUv.x - 0.5) * 2.0, 1.0 - vUv.y));
  float a = 1.0 - smoothstep(0.0, 1.0, d);
  gl_FragColor = vec4(vColor * a * a * hazeFog(vWorld), 1.0);
}`

function glMaterials(): KitMaterialSet {
  const fog = () => UniformsUtils.merge([UniformsLib.fog])
  const box = new ShaderMaterial({
    uniforms: { ...fog(), ...kitUniforms },
    vertexShader: BOX_VERT,
    fragmentShader: BOX_FRAG,
    fog: true,
  })
  const glyph = new ShaderMaterial({
    uniforms: { ...fog(), ...kitUniforms },
    vertexShader: GLYPH_VERT,
    fragmentShader: GLYPH_FRAG,
    fog: true,
    transparent: true,
    depthWrite: false,
  })
  const splat = new ShaderMaterial({
    uniforms: { ...fog(), ...kitUniforms },
    vertexShader: SPLAT_VERT,
    fragmentShader: SPLAT_FRAG,
    fog: true,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    // It lies a few centimetres over the street, which is not enough far away.
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -4,
  })
  return { box, glyph, splat }
}

// ---------------------------------------------------------------------------------------------
// The per-scene kit

type Slot = 'near' | 'small' | 'glyph' | 'splat'
const SLOTS: Slot[] = ['near', 'small', 'glyph', 'splat']

export interface KitMaterialSet {
  box: Material
  glyph: Material
  splat: Material
}

/** Makes the kit's box, glyph and splat materials. WebGPU passes its node twins. */
export type KitMaterials = (atlas: DataTexture) => KitMaterialSet

export class Kit {
  private entries = new Map<number, { parts: KitBuilder; world: Matrix4 }>()
  private meshes: Partial<Record<Slot, InstancedMesh>> = {}
  private materials: KitMaterialSet
  private nextId = 1
  private unskip = new Map<InstancedMesh, () => void>()
  private queued = false
  users = 0

  constructor(
    private scene: Scene,
    make: KitMaterials | undefined,
    atlas: DataTexture,
  ) {
    kitUniforms.tAtlas.value = atlas
    this.materials = make ? make(atlas) : glMaterials()
  }

  add(parts: KitBuilder, world: Matrix4) {
    const id = this.nextId++
    this.entries.set(id, { parts, world: world.clone() })
    this.queue()
    return id
  }
  remove(id: number) {
    this.entries.delete(id)
    this.queue()
  }
  private queue() {
    if (this.queued) return
    this.queued = true
    queueMicrotask(() => this.flush())
  }

  /** Rewrite the instance buffers from every registered component. */
  private flush() {
    this.queued = false
    for (const slot of SLOTS) {
      let count = 0
      for (const e of this.entries.values()) count += e.parts[slot].length / KIT_STRIDE
      let mesh = this.meshes[slot]
      if (!mesh || mesh.instanceMatrix.count < count) {
        if (mesh) this.drop(mesh)
        if (count === 0) {
          delete this.meshes[slot]
          continue
        }
        mesh = this.meshes[slot] = this.make(slot, Math.ceil(count * 1.25) + 16)
      }
      const mat = mesh.instanceMatrix.array as Float32Array
      const color = mesh.geometry.getAttribute('aColor') as InstancedBufferAttribute
      const kit = mesh.geometry.getAttribute('aKit') as InstancedBufferAttribute
      let i = 0
      for (const e of this.entries.values()) {
        const src = e.parts[slot]
        for (let o = 0; o < src.length; o += KIT_STRIDE, i++) {
          m4.fromArray(src, o)
            .premultiply(e.world)
            .toArray(mat, i * 16)
          for (let k = 0; k < 4; k++) {
            color.array[i * 4 + k] = src[o + 16 + k]
            kit.array[i * 4 + k] = src[o + 20 + k]
          }
        }
      }
      mesh.count = count
      mesh.instanceMatrix.needsUpdate = color.needsUpdate = kit.needsUpdate = true
    }
  }

  private make(slot: Slot, capacity: number) {
    const flat = slot === 'glyph' || slot === 'splat'
    const geometry = flat ? new PlaneGeometry(1, 1) : new BoxGeometry(1, 1, 1)
    geometry.setAttribute('aColor', new InstancedBufferAttribute(new Float32Array(capacity * 4), 4))
    geometry.setAttribute('aKit', new InstancedBufferAttribute(new Float32Array(capacity * 4), 4))
    const mesh = new InstancedMesh(
      geometry,
      flat ? this.materials[slot] : this.materials.box,
      capacity,
    )
    mesh.name = `runek:kit:${slot}`
    // Instances span the world, so one bound would never cull anything useful.
    mesh.frustumCulled = false
    mesh.matrixAutoUpdate = false
    // Mirrors skip the small parts, and the light on the street they are themselves laid over.
    if (slot === 'small' || slot === 'splat') this.unskip.set(mesh, skipMirrors(mesh))
    if (slot === 'glyph') mesh.renderOrder = 2
    if (slot === 'splat') mesh.renderOrder = 1
    this.scene.add(mesh)
    return mesh
  }
  private drop(mesh: InstancedMesh) {
    this.unskip.get(mesh)?.()
    this.unskip.delete(mesh)
    this.scene.remove(mesh)
    mesh.geometry.dispose()
    mesh.dispose()
  }
  dispose() {
    for (const slot of SLOTS) if (this.meshes[slot]) this.drop(this.meshes[slot])
    this.meshes = {}
    this.materials.box.dispose()
    this.materials.glyph.dispose()
    this.materials.splat.dispose()
  }
}

const kits = new WeakMap<Scene, Kit>()

/** The scene's kit, made on first use. Pair every call with `releaseKit`. */
export function acquireKit(
  scene: Scene,
  make: KitMaterials | undefined,
  fonts?: { display?: string; body?: string },
) {
  let kit = kits.get(scene)
  if (!kit) {
    kit = new Kit(scene, make, glyphAtlas(fonts))
    kits.set(scene, kit)
  }
  kit.users++
  return kit
}

export function releaseKit(scene: Scene) {
  const kit = kits.get(scene)
  if (!kit || --kit.users > 0) return
  // Wait a tick: a component that re-registers in the same commit keeps the kit alive.
  queueMicrotask(() => {
    if (kit.users > 0 || kits.get(scene) !== kit) return
    kit.dispose()
    kits.delete(scene)
  })
}
