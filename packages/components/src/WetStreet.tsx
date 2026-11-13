import {
  type MirrorSurface,
  useMaterial,
  useMirrorMaterial,
  useNodeRenderer,
  useWorld,
  type WorldComponentProps,
} from '@runek/core'
import { useMemo } from 'react'
import {
  BoxGeometry,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  type WebGLProgramParametersWithUniforms,
} from 'three'
import { RAIN_PERIOD, rainUniforms } from './city/weather'

/** Where a cross street meets this one: its centre along this street, and its width, in units. */
export interface StreetCrossing {
  at: number
  width: number
}

export interface WetStreetProps extends WorldComponentProps {
  /** Length along local Z, in units. */
  length?: number
  /** Width along local X, kerb to kerb, in units. */
  width?: number
  /** Asphalt color; defaults to the palette's `stone`. */
  color?: string
  /** Kerb color; defaults to the palette's `floor` (the pavement). */
  kerbColor?: string
  /** How wet the street is when the weather has soaked it, 0 (dry) to 1 (soaked). */
  wetness?: number
  /** How much of the street stands in puddles then, 0 to 1. */
  puddles?: number
  /** Paint lane and edge lines, and a zebra at each crossing. */
  markings?: boolean
  /** Lane, edge and zebra paint. */
  paint?: string
  /** The centre line. */
  centrePaint?: string
  /** Cross streets: no kerbs, lines or gutters inside them, a zebra either side. At most four. */
  crossings?: StreetCrossing[]
}

/** Most crossings one street can hold. */
const MAX_CROSSINGS = 4

/**
 * A wet asphalt street with kerbs, laid in the XZ plane just above the ground, straight along
 * local Z: a `Road` that reads as rain-soaked. Puddles collect from a world-space noise field
 * and in the gutters, wet asphalt darkens and turns glossy (Lagarde's porosity model), paint
 * stays drier, and the deck reflects the street through the world's shared mirror for its
 * height: fully in standing water, faintly on damp asphalt. While a `Rain` is mounted, drops ring
 * the puddles, more of them the harder it rains, and the weather it follows dries the street and
 * its puddles out and soaks them again. Streets that cross should share a `seed`: their puddles
 * then match where they overlap. Decorative, like `Road`: it owns no collider.
 *
 * The puddles, paint and rain rings are `WebGLRenderer` only. Under `WebGPURenderer` the deck is
 * damp asphalt with an even, faint reflection.
 */
export function WetStreet({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  seed = 0,
  length = 12,
  width = 7,
  color,
  kerbColor,
  wetness = 0.85,
  puddles = 0.5,
  markings = true,
  paint = '#ece6da',
  centrePaint = '#c98a3e',
  crossings = NO_CROSSINGS,
}: WetStreetProps) {
  const { unit, palette } = useWorld()
  const node = useNodeRenderer()
  const L = length * unit
  const W = width * unit
  const kerbW = 0.18 * unit
  const kerbH = 0.12 * unit
  const kerb = useMaterial({ slot: 'concrete', color: kerbColor ?? palette.floor, roughness: 0.85 })
  const cutKey = JSON.stringify(crossings)
  const cuts = useMemo(
    () =>
      crossings
        .slice(0, MAX_CROSSINGS)
        .map((c) => ({ at: c.at * unit, half: (c.width * unit) / 2 })),
    [cutKey, unit],
  )
  const deck = useMemo(() => deckGeometry(W, L), [W, L])
  const kerbs = useMemo(() => kerbSegments(L, cuts), [L, cuts])
  const surface = useMemo(
    () =>
      streetSurface({ wetness, puddles, markings, paint, centrePaint, seed, half: W / 2, cuts }),
    [wetness, puddles, markings, paint, centrePaint, seed, W, cuts],
  )
  // Under WebGPU there is no wet layer to darken the asphalt, so the look does it, as `Road` does.
  const asphalt = color ?? palette.stone
  const deckColor = useMemo(
    () =>
      node ? `#${new Color(asphalt).multiplyScalar(1 - 0.45 * wetness).getHexString()}` : asphalt,
    [node, asphalt, wetness],
  )
  const deckMaterial = useMirrorMaterial(
    { slot: 'asphalt', color: deckColor, roughness: node ? 1 - 0.7 * wetness : 0.85, metalness: 0 },
    node ? 0.25 * wetness : 1,
    surface,
  )

  const edge = W / 2 - kerbW / 2
  return (
    <group position={[position[0], position[1] + 0.03 * unit, position[2]]} rotation={rotation}>
      <mesh geometry={deck} material={deckMaterial} receiveShadow />
      {[edge, -edge].map((x) =>
        kerbs.map(([z, len]) => (
          <mesh
            key={`${x}:${z}`}
            material={kerb}
            position={[x, kerbH / 2, z]}
            geometry={kerbGeometry(kerbW, kerbH, len)}
            receiveShadow
          />
        )),
      )}
    </group>
  )
}

const NO_CROSSINGS: StreetCrossing[] = []

/** A flat deck with street coordinates (across, along) in meters, which survive batching. */
function deckGeometry(w: number, l: number) {
  const g = new BufferGeometry()
  const x = w / 2
  const z = l / 2
  g.setAttribute(
    'position',
    new Float32BufferAttribute([-x, 0, z, x, 0, z, x, 0, -z, -x, 0, -z], 3),
  )
  g.setAttribute('normal', new Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3))
  g.setAttribute('uv', new Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2))
  g.setAttribute('aStreet', new Float32BufferAttribute([-x, z, x, z, x, -z, -x, -z], 2))
  g.setIndex([0, 1, 2, 0, 2, 3])
  return g
}

/** Kerb runs as [centre z, length], broken where cross streets come in. */
function kerbSegments(l: number, cuts: { at: number; half: number }[]): [number, number][] {
  const gaps = cuts.map((c) => [c.at - c.half, c.at + c.half] as const).sort((a, b) => a[0] - b[0])
  const out: [number, number][] = []
  let from = -l / 2
  for (const [a, b] of gaps) {
    if (a > from + 0.01) out.push([(from + Math.min(a, l / 2)) / 2, Math.min(a, l / 2) - from])
    from = Math.max(from, b)
  }
  if (l / 2 > from + 0.01) out.push([(from + l / 2) / 2, l / 2 - from])
  return out
}

const kerbCache = new Map<string, BoxGeometry>()
function kerbGeometry(w: number, h: number, l: number) {
  const key = `${w}:${h}:${l.toFixed(3)}`
  let g = kerbCache.get(key)
  if (!g) {
    g = new BoxGeometry(w, h, l)
    kerbCache.set(key, g)
  }
  return g
}

interface StreetLook {
  wetness: number
  puddles: number
  markings: boolean
  paint: string
  centrePaint: string
  seed: number
  half: number
  cuts: { at: number; half: number }[]
}

/** The street's own shader edits over the mirror material, and how strongly each pixel reflects:
 *  standing water fully, damp asphalt faintly. One program for every street. */
function streetSurface(look: StreetLook): MirrorSurface {
  const v3 = (hex: string) => new Color(hex)
  const cuts = Array.from({ length: MAX_CROSSINGS }, (_, i) => look.cuts[i] ?? { at: 1e6, half: 0 })
  const uniforms = {
    uWet: { value: look.wetness },
    uPuddles: { value: look.puddles },
    uSeed: { value: [((look.seed * 17.31) % 97) + 11.7, ((look.seed * 7.13) % 89) + 3.1] },
    uHalf: { value: look.half },
    uCuts: { value: cuts.flatMap((c) => [c.at, c.half]) },
    uMarkings: { value: look.markings ? 1 : 0 },
    uPaint: { value: v3(look.paint) },
    uCentre: { value: v3(look.centrePaint) },
  }
  return {
    key: 'wetstreet',
    strength: 'streetPuddle + ( 1.0 - streetPuddle ) * streetWet * streetGloss * 0.35',
    compile(shader: WebGLProgramParametersWithUniforms) {
      Object.assign(shader.uniforms, uniforms, rainUniforms)
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${VERT_PARS}`)
        .replace('#include <project_vertex>', `#include <project_vertex>\n${VERT_MAIN}`)
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\n${FRAG_PARS}`)
        .replace('#include <map_fragment>', `#include <map_fragment>\n${ALBEDO}`)
        .replace(
          '#include <roughnessmap_fragment>',
          `#include <roughnessmap_fragment>\n${ROUGHNESS}`,
        )
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${RIPPLES}`)
        .replace(
          '#include <lights_fragment_maps>',
          '#include <lights_fragment_maps>\nradiance *= streetGloss;',
        )
        .replace(
          '#include <lights_fragment_end>',
          '#include <lights_fragment_end>\nreflectedLight.directSpecular *= streetGloss;',
        )
    },
  }
}

const VERT_PARS = /* glsl */ `
attribute vec2 aStreet;
varying vec2 vStreet;
varying vec3 vStreetWorld;
`
const VERT_MAIN = /* glsl */ `
vStreet = aStreet;
vStreetWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;
`

const FRAG_PARS = /* glsl */ `
varying vec2 vStreet;
varying vec3 vStreetWorld;
uniform float uMarkings;
uniform vec3 uPaint;
uniform vec3 uCentre;
uniform float uWet;
uniform float uPuddles;
uniform vec2 uSeed;
uniform float uHalf;
uniform vec2 uCuts[${MAX_CROSSINGS}];
float streetHash( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }
float streetNoise( vec2 p ) {
  vec2 i = floor( p ), f = fract( p );
  vec2 u = f * f * ( 3.0 - 2.0 * f );
  return mix( mix( streetHash( i ), streetHash( i + vec2( 1.0, 0.0 ) ), u.x ), mix( streetHash( i + vec2( 0.0, 1.0 ) ), streetHash( i + vec2( 1.0, 1.0 ) ), u.x ), u.y );
}
// Coverage of [a, b] over a pixel footprint w: a box-filtered band, so lines never shimmer.
float streetBand( float x, float a, float b, float w ) {
  return clamp( ( min( x + 0.5 * w, b ) - max( x - 0.5 * w, a ) ) / max( w, 1e-4 ), 0.0, 1.0 );
}
float streetPulseInt( float x, float a, float b ) { return floor( x ) * ( b - a ) + clamp( fract( x ), a, b ) - a; }
float streetPulse( float x, float a, float b, float w ) {
  w = max( w, 1e-4 );
  return ( streetPulseInt( x + 0.5 * w, a, b ) - streetPulseInt( x - 0.5 * w, a, b ) ) / w;
}
uniform float uRainTime;
uniform float uRain;
uniform float uWetness;
// The slope a raindrop's ring gives the water: one drop at a time in each cell of a grid, at a
// new spot in the cell each time. Rates in eighths keep every cell in step with the rain clock's wrap.
// The harder it rains, the more of the cells take a drop: about one in twelve in a drizzle, over half in heavy rain.
vec2 streetRipple( vec2 p, float cell, float shift ) {
  vec2 q = p / cell + shift;
  vec2 id = floor( q );
  vec2 f = q - id;
  float rate = 0.875 + floor( streetHash( id + shift ) * 5.0 ) * 0.125;
  float t = uRainTime * rate + floor( streetHash( id + 41.7 ) * 17.0 );
  float turn = mod( floor( t ), rate * ${RAIN_PERIOD.toFixed(1)} );
  float life = fract( t );
  vec2 c = 0.3 + 0.4 * vec2( streetHash( id + turn * 0.37 + 3.1 ), streetHash( id + turn * 0.71 + 7.9 ) );
  float fires = step( 1.0 - 0.55 * uRain, streetHash( id + turn * 1.31 + 1.7 ) );
  vec2 d = f - c;
  float dist = length( d ) + 1e-4;
  float x = ( dist - 0.3 * life ) * 14.0;
  float fade = 1.0 - life;
  return ( d / dist ) * ( -2.0 * x * exp( -x * x ) ) * fade * fade * fires;
}
`

// Paint first (it decides where water stands), then puddles and wetness.
const ALBEDO = /* glsl */ `
float streetPaint = 0.0;
float streetInCross = 0.0;
float streetZebra = 0.0;
float streetZebraZone = 0.0;
{
  vec2 sp = vStreet;
  vec2 sfw = fwidth( sp );
  for ( int i = 0; i < ${MAX_CROSSINGS}; i++ ) {
    vec2 c = uCuts[i];
    streetInCross = max( streetInCross, streetBand( sp.y, c.x - c.y, c.x + c.y, sfw.y ) );
    float near = streetBand( abs( sp.y - c.x ), c.y + 1.0, c.y + 4.5, sfw.y );
    streetZebraZone = max( streetZebraZone, near );
    streetZebra = max( streetZebra, near * streetPulse( sp.x / 1.0, 0.0, 0.5, sfw.x ) * step( abs( sp.x ), uHalf - 0.6 ) );
  }
  if ( uMarkings > 0.5 ) {
    float ax = abs( sp.x );
    float edgeLine = streetBand( ax, uHalf - 0.5, uHalf - 0.38, sfw.x );
    float lane = uHalf >= 6.0 ? streetBand( ax, uHalf * 0.5 - 0.06, uHalf * 0.5 + 0.06, sfw.x ) * streetPulse( sp.y / 9.0, 0.0, 0.33, sfw.y / 9.0 ) : 0.0;
    float centre = streetBand( ax, 0.08, 0.2, sfw.x );
    float open = 1.0 - streetInCross;
    float lanes = open * ( 1.0 - streetZebraZone );
    float bone = max( edgeLine * open + lane * lanes, streetZebra );
    diffuseColor.rgb = mix( diffuseColor.rgb, uPaint * 0.55, bone );
    diffuseColor.rgb = mix( diffuseColor.rgb, uCentre * 0.55, centre * lanes );
    streetPaint = max( bone, centre * lanes );
  }
}
vec2 streetW = vStreetWorld.xz + uSeed;
float streetBig = streetNoise( streetW / 7.0 ) * 0.6 + streetNoise( streetW / 3.1 ) * 0.3 + streetNoise( streetW / 1.3 ) * 0.1;
float streetFine = streetNoise( streetW / 1.7 + 17.0 );
// Camber: water runs to the gutters, except inside a crossing where there are none.
float streetGutter = smoothstep( uHalf - 1.4, uHalf - 0.2, abs( vStreet.x ) ) * ( 1.0 - streetInCross );
float streetLevel = streetBig + streetGutter * 0.22;
// The weather fills the street and dries it again. Standing water goes first, drawing back to
// the low spots and the gutters, and the damp in the asphalt goes after it.
float streetStand = smoothstep( 0.1, 0.6, uWetness );
float streetEdge = 0.74 - uPuddles * 0.2 + ( 1.0 - streetStand ) * 0.3;
float streetPuddle = smoothstep( streetEdge, streetEdge + 0.03, streetLevel ) * ( 1.0 - streetPaint * 0.8 ) * smoothstep( 0.0, 0.15, streetStand );
float streetWet = clamp( uWet * uWetness * mix( 0.35, 1.0, smoothstep( 0.3, 0.68, streetFine ) ), 0.0, 1.0 );
// Wet asphalt is full of grain and tyre polish, so outside the puddles it gives back only part
// of what a mirror (or a lamp) would, in patches. Standing water reflects fully.
float streetGloss = mix( mix( 0.2, 0.5, streetFine ), 1.0, streetPuddle );
// Wet porous asphalt darkens (Lagarde), standing water darkens it further.
diffuseColor.rgb *= mix( 1.0, mix( 1.0, 0.25, 0.5 ), streetWet );
diffuseColor.rgb *= mix( 1.0, 0.55, streetPuddle );
`

// Rain rings on standing water. They fade out where a pixel is wider than a ring, so far
// puddles hold still and never shimmer.
const RIPPLES = /* glsl */ `
vec2 streetRfw = fwidth( vStreetWorld.xz );
float streetRings = ( 1.0 - smoothstep( 0.03, 0.1, max( streetRfw.x, streetRfw.y ) ) ) * smoothstep( 0.0, 0.08, uRain ) * streetPuddle;
if ( streetRings > 0.0 ) {
  vec2 slope = streetRipple( vStreetWorld.xz, 0.7, 0.0 ) + streetRipple( vStreetWorld.xz, 1.1, 13.7 );
  normal = normalize( normal + ( viewMatrix * vec4( -slope.x, 0.0, -slope.y, 0.0 ) ).xyz * streetRings * 0.4 );
}
`

const ROUGHNESS = /* glsl */ `
roughnessFactor = mix( roughnessFactor, 0.06, streetWet * 0.6 );
roughnessFactor = mix( roughnessFactor, 0.4, streetPaint * ( 1.0 - streetPuddle ) );
roughnessFactor = mix( roughnessFactor, 0.025, streetPuddle );
`
