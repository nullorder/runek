import {
  Color,
  DataTexture,
  LinearFilter,
  type Material,
  Matrix3,
  type Side,
  type Texture,
  Vector2,
  Vector4,
} from 'three'
import {
  attribute,
  clamp,
  Discard,
  Fn,
  floor,
  fwidth,
  If,
  length,
  materialColor,
  materialOpacity,
  max,
  mix,
  mod,
  positionGeometry,
  pow,
  select,
  smoothstep,
  texture,
  uniform,
  varying,
  vec2,
  vec3,
  vec4,
} from 'three/tsl'
import { MeshBasicNodeMaterial, type Node } from 'three/webgpu'
import { beforeDraw } from './uniforms'

type F = Node<'float'>
type V2 = Node<'vec2'>
type V3 = Node<'vec3'>
type V4 = Node<'vec4'>

// TSL's types take mix/clamp as float-only; they work per component on vectors too.
const mixV = <N extends Node>(a: Node, b: Node, t: Node | number) =>
  mix(a as never, b as never, t as never) as unknown as N
const clampV = <N extends Node>(x: Node, lo: Node, hi: Node) =>
  clamp(x as never, lo as never, hi as never) as unknown as N

const captured = new WeakMap<Texture, DataTexture>()

/**
 * Copy troika's glyph atlas into a texture WebGPU can read. troika draws glyph distance fields
 * into a WebGL canvas, which has nothing left to copy by the time a WebGPU frame uploads it; read
 * it back right after troika lays text out (as troika's own Safari workaround does), in the same
 * task, and sample the copy instead.
 */
export function captureAtlas(atlas: Texture | undefined) {
  const canvas = atlas?.image as HTMLCanvasElement | undefined
  if (!atlas || typeof canvas?.getContext !== 'function') return
  const gl = (canvas.getContext('webgl2') ??
    canvas.getContext('webgl')) as WebGLRenderingContext | null
  if (!gl) return
  const { width, height } = canvas
  let copy = captured.get(atlas)
  if (!copy || copy.image.width !== width || copy.image.height !== height) {
    copy?.dispose()
    // readPixels rows run bottom up, as WebGL's flipped upload of the canvas does.
    copy = new DataTexture(new Uint8Array(width * height * 4), width, height)
    copy.magFilter = LinearFilter
    copy.minFilter = LinearFilter
    captured.set(atlas, copy)
  }
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, copy.image.data as Uint8Array)
  copy.needsUpdate = true
}

/** A uniform read from `entry.value` before each object draws: troika writes its uniforms in the
 *  text mesh's `onBeforeRender`, once per draw (outline and fill alike). */
function perDraw<N extends Node>(entry: { value: unknown }): N {
  return uniform(entry.value as never).onObjectUpdate(() => entry.value as never) as unknown as N
}

/**
 * The node (TSL) twin of troika-three-text's text material, for `WebGPURenderer`: troika's glyph
 * quads, SDF atlas, edge antialiasing and stroke, drawn by a basic node material. Give each text
 * mesh its own (troika keeps per-mesh values in `uniforms`); troika takes it as already derived and
 * fills its uniforms every draw.
 */
export function textMaterial(options: { side: Side; toneMapped: boolean }) {
  const blank = new DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1)
  blank.needsUpdate = true
  const uniforms = {
    uTroikaSDFTexture: { value: blank },
    uTroikaSDFTextureSize: { value: new Vector2(1, 1) },
    uTroikaSDFGlyphSize: { value: 1 },
    uTroikaSDFExponent: { value: 1 },
    uTroikaTotalBounds: { value: new Vector4() },
    uTroikaClipRect: { value: new Vector4() },
    uTroikaEdgeOffset: { value: 0 },
    uTroikaFillOpacity: { value: 1 },
    uTroikaPositionOffset: { value: new Vector2() },
    uTroikaCurveRadius: { value: 0 },
    uTroikaBlurRadius: { value: 0 },
    uTroikaStrokeWidth: { value: 0 },
    uTroikaStrokeColor: { value: new Color() },
    uTroikaStrokeOpacity: { value: 1 },
    uTroikaOrient: { value: new Matrix3() },
    uTroikaUseGlyphColors: { value: false },
    uTroikaSDFDebug: { value: false },
  }
  const u = <N extends Node>(name: keyof typeof uniforms) => perDraw<N>(uniforms[name])
  const textureSize = u<V2>('uTroikaSDFTextureSize')
  const glyphSize = u<F>('uTroikaSDFGlyphSize')
  const exponent = u<F>('uTroikaSDFExponent')
  const clipRect = u<V4>('uTroikaClipRect')
  const edgeOffset = u<F>('uTroikaEdgeOffset')
  const fillOpacity = u<F>('uTroikaFillOpacity')
  const positionOffset = u<V2>('uTroikaPositionOffset')
  const blur = u<F>('uTroikaBlurRadius')
  const strokeWidth = u<F>('uTroikaStrokeWidth')
  const strokeColor = u<V3>('uTroikaStrokeColor')
  const strokeOpacity = u<F>('uTroikaStrokeOpacity')
  const orient = u<Node<'mat3'>>('uTroikaOrient')

  // Vertex: stretch the unit quad over this glyph's bounds (clipped), as troika does.
  const raw = attribute('aTroikaGlyphBounds', 'vec4') as V4
  const index = attribute('aTroikaGlyphIndex', 'float') as F
  const bounds = vec4(
    raw.x.add(positionOffset.x),
    raw.y.sub(positionOffset.y),
    raw.z.add(positionOffset.x),
    raw.w.sub(positionOffset.y),
  )
  const outline = vec4(bounds.xy.sub(edgeOffset).sub(blur), bounds.zw.add(edgeOffset).add(blur))
  const lo = clampV<V2>(outline.xy, clipRect.xy, clipRect.zw)
  const hi = clampV<V2>(outline.zw, clipRect.xy, clipRect.zw)
  const glyphUV = mixV<V2>(lo, hi, positionGeometry.xy)
    .sub(bounds.xy)
    .div(bounds.zw.sub(bounds.xy)) as V2
  const placed = vec3(mixV<V2>(bounds.xy, bounds.zw, glyphUV), positionGeometry.z)
  const columns = textureSize.x.div(glyphSize)
  const square = vec2(glyphSize).div(textureSize) as V2
  const cell = floor(index.div(4))
  const start = square.mul(vec2(mod(cell, columns), floor(cell.div(columns)))) as V2

  const vGlyphUV = varying(glyphUV) as V2
  const vDims = varying(bounds.zw.sub(bounds.xy)) as V2
  const vUVBounds = varying(vec4(start, start.add(square))) as V4
  const vChannel = varying(mod(index, 4)) as F

  // Fragment: decode the glyph's signed distance and antialias its edge.
  const shade = Fn(() => {
    const aaDist = length(fwidth(vGlyphUV.mul(vDims))).mul(0.5) as F
    const edgeUV = glyphSize.reciprocal().mul(0.5)
    const clamped = clampV<V2>(vGlyphUV, vec2(edgeUV), vec2(edgeUV.oneMinus()))
    const atlas = texture(blank, mixV<V2>(vUVBounds.xy, vUVBounds.zw, clamped))
    const rgba = atlas as unknown as V4
    // Before each draw, sample the WebGPU copy of whichever atlas troika gave this mesh.
    const swap = beforeDraw(() => {
      atlas.value = captured.get(uniforms.uTroikaSDFTexture.value) ?? blank
    })
    const ch = floor(vChannel.add(0.5).add(swap))
    const alpha = select(
      ch.equal(0),
      rgba.r,
      select(ch.equal(1), rgba.g, select(ch.equal(2), rgba.b, rgba.a)),
    ) as F
    const near = select(alpha.greaterThan(0.5), alpha.oneMinus(), alpha) as F
    const maxDim = max(vDims.x, vDims.y)
    const absDist = pow(near.mul(2), exponent.reciprocal()).oneMinus().mul(maxDim)
    const signed = select(alpha.greaterThan(0.5), absDist.negate(), absDist) as F
    // Outside the glyph's square, extrapolate the distance.
    const distance = signed.add(length(vGlyphUV.sub(clamped).mul(vDims))) as F
    const aa = max(aaDist, blur)
    const edgeAlpha = smoothstep(edgeOffset.add(aa), edgeOffset.sub(aa), distance)
    If(edgeAlpha.lessThanEqual(0), () => {
      Discard()
    })
    const opacity = (materialOpacity as unknown as F).mul(fillOpacity)
    const fill = vec4(materialColor as unknown as V3, opacity) as V4
    const stroke = select(strokeWidth.equal(0), fill, vec4(strokeColor, strokeOpacity)) as V4
    const mixed = mixV<V4>(
      fill,
      stroke,
      smoothstep(strokeWidth.negate().sub(aaDist), strokeWidth.negate().add(aaDist), distance),
    )
    return vec4(mixed.rgb, mixed.a.mul(edgeAlpha))
  })

  const material = new MeshBasicNodeMaterial({
    transparent: true,
    side: options.side,
    toneMapped: options.toneMapped,
  })
  material.positionNode = orient.mul(placed)
  material.colorNode = shade()
  material.forceSinglePass = true
  // What troika looks for to use a material as is rather than deriving its GLSL one from it.
  Object.assign(material, {
    uniforms,
    isTroikaTextMaterial: true,
    baseMaterial: material,
    isDerivedFrom: () => true,
  })
  return material as Material
}
