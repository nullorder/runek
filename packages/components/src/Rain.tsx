import { useFrame, useThree } from '@react-three/fiber'
import {
  DYNAMIC_KEY,
  rng,
  scenePass,
  skipMirrors,
  useNodeRenderer,
  useWorld,
  type Vec3,
} from '@runek/core'
import { useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  type Camera,
  type Color,
  DepthTexture,
  DoubleSide,
  Group,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  LineSegments,
  Mesh,
  NearestFilter,
  type Object3D,
  OrthographicCamera,
  Points,
  RedFormat,
  type Scene,
  ShaderMaterial,
  type Texture,
  UnsignedByteType,
  UnsignedShortType,
  Vector2,
  Vector3,
  Vector4,
  type WebGLRenderer,
  WebGLRenderTarget,
} from 'three'
import { along, emissiveColor, useLadder } from './city/glow'
import { RAIN_PERIOD, rainUniforms, type WeatherState } from './city/weather'

// The weather is the rain's own: a world that mounts `Rain` reads what it does from here too.
export type { WeatherKind, WeatherState } from './city/weather'
export {
  makeWeather,
  parseWeatherKind,
  RAIN_PERIOD,
  steadyWeather,
  WEATHER,
  WEATHER_KINDS,
  weatherAt,
} from './city/weather'

/** The part of a `WeatherState` the rain draws from. */
export type RainWeather = Pick<WeatherState, 'rain' | 'snow' | 'wind' | 'wetness'>

export interface RainProps {
  /** Accepted for the component contract. Rain follows the camera, so it has no place of its own. */
  position?: Vec3
  /** Accepted for the component contract. */
  rotation?: Vec3
  /** Seeds where each streak, splash and flake starts. */
  seed?: number
  /** Streaks in the air around the camera when it rains its hardest. Lighter rain draws fewer. */
  streaks?: number
  /** Splashes on the ground around the camera in the heaviest rain, 0 for none. */
  splashes?: number
  /** Snowflakes in the air around the camera when it snows its hardest, 0 for none. */
  flakes?: number
  /** Ring the puddles of every `WetStreet`. */
  ripples?: boolean
  /**
   * The weather now, asked every frame: `weatherAt` on a clock, most often. Left out, it rains
   * hard and steadily and the streets stay soaked. JSX only.
   */
  weather?: () => RainWeather
  /** The part of the world rain can fall on, [minX, minZ, maxX, maxZ] in units. Outside it, rain falls through everything. */
  bounds?: readonly [number, number, number, number]
  /** Texels along each side of the cover map, which records the highest surface over every spot. */
  cover?: number
  /** The lowest anything falls, in units: the surface of a sea, which no cover map holds since
   *  water is not a still part of the world. Rain ends there and splashes on it, inside the
   *  bounds and out. Unset, there is no such floor. */
  floor?: number
  /** Rain color. A cool grey by default, lit as if by the street. */
  color?: string
  /** Called with the GPU bytes the cover map holds, and with 0 when it is let go. JSX only. */
  onMemory?: (bytes: number) => void
}

const DEFAULT_BOUNDS = [-160, -160, 160, 160] as const

/**
 * The weather over the whole world, drawn only around the camera: streaks of rain in the air,
 * splashes where they land, rings on the puddles of every `WetStreet`, and snowflakes. Mount it
 * once inside `<World>`.
 *
 * What falls follows `weather`. Rain from a drizzle (a few short, slow streaks) to a downpour
 * (all of them, long and fast), slanted by the wind and its gusts. Snow as slow flakes that
 * sway and drift. In dry weather nothing is drawn at all. It also tells every `WetStreet` how
 * hard the puddles are ringed and how wet the ground is.
 *
 * It stays out from under roofs. Shortly after mounting it draws the still parts of the world
 * once from straight above into a depth map (the cover map), and a streak dies where it meets
 * the highest surface over its spot, so an awning, a canopy or a ceiling keeps the ground under
 * it dry, and snow stays out the same way. Anything inside a `<Dynamic>` is left out of that
 * map. The map is drawn a few times in the first seconds to catch parts that arrive late, then
 * never again.
 *
 * Streaks, splashes and flakes are a draw call each, only while there are any to draw: two in
 * rain, one in snow, all three for the moments rain turns to snow, none when it is dry. They
 * stay out of the world's mirrors. The cover map is the one extra scene render, a few times in
 * the first seconds and never again, inside `scenePass()`.
 *
 * `WebGLRenderer` only: under `WebGPURenderer` it draws nothing.
 */
export function Rain(props: RainProps) {
  return useNodeRenderer() ? null : <Fall {...props} />
}

Rain.stream = false

/** Seconds after mounting at which the cover map is drawn. The later ones catch parts that build over several frames. */
const BAKE_AT = [0.3, 1.0, 2.2]

/** With no `weather` it rains as it always did: hard, on a light steady wind, on soaked streets. */
const STEADY: RainWeather = { rain: 1, snow: 0, wind: { x: 0.8, z: 0.4 }, wetness: 1 }

function Fall({
  seed = 0,
  streaks = 8000,
  splashes = 400,
  flakes = 4000,
  ripples = true,
  weather,
  bounds = DEFAULT_BOUNDS,
  cover = 2048,
  floor,
  color = '#aab0bd',
  onMemory,
}: RainProps) {
  const { unit } = useWorld()
  const ladder = useLadder()
  const gl = useThree((s) => s.gl) as WebGLRenderer
  const scene = useThree((s) => s.scene) as Scene
  const camera = useThree((s) => s.camera)
  const [minX, minZ, maxX, maxZ] = bounds

  const map = useMemo(
    () => new CoverMap(minX * unit, minZ * unit, maxX * unit, maxZ * unit, cover, unit),
    [minX, minZ, maxX, maxZ, cover, unit],
  )
  const schedule = useRef({ t: 0, next: 0 })
  useEffect(() => {
    schedule.current = { t: 0, next: 0 }
    return () => {
      map.dispose()
      onMemory?.(0)
    }
  }, [map, onMemory])

  // Lit as if by the street: rain shows where light is, and this is the light most of it has.
  const rain = useMemo(
    () =>
      buildRain({
        seed,
        streaks,
        splashes,
        flakes,
        unit,
        streak: emissiveColor(color, along(ladder.streetUnderSign, 0.2)),
        splash: emissiveColor(color, along(ladder.streetUnderSign, 0.35)),
        // Snow is white where rain is clear, so the same street light shows more of it.
        flake: emissiveColor(SNOW_COLOR, along(ladder.streetUnderSign, 0.4)),
        map,
      }),
    [seed, streaks, splashes, flakes, unit, color, ladder.streetUnderSign, map],
  )
  useEffect(() => () => rain.dispose(), [rain])

  // A reflection of a streak is too faint to pay for.
  useEffect(() => skipMirrors(rain.group), [rain])

  // Without a `Rain` the streets go back to what their own props say: still water, as wet as they were built.
  useEffect(
    () => () => {
      rainUniforms.uRain.value = 0
      rainUniforms.uWetness.value = 1
    },
    [],
  )

  useFrame((_, delta) => {
    // A long frame (a tab coming back) moves the rain a tenth of a second, not the whole gap.
    const dt = Math.min(delta, 0.1)
    rainUniforms.uRainTime.value = (rainUniforms.uRainTime.value + dt) % RAIN_PERIOD
    const now = weather ? weather() : STEADY
    rainUniforms.uRain.value = ripples ? Math.min(1, Math.max(0, now.rain)) : 0
    rainUniforms.uWetness.value = now.wetness
    rain.step(dt, now)
    const s = schedule.current
    s.t += dt
    if (s.next < BAKE_AT.length && s.t >= BAKE_AT[s.next]) {
      s.next++
      const first = !map.ready
      map.bake(gl, scene, camera, rain.group)
      if (first) onMemory?.(map.bytes)
    }
    // Nothing falls until the map says where the roofs are.
    rain.cover.value = map.ready ? map.depth : null
    rain.floor.value = floor === undefined ? NO_FLOOR : floor * unit
    rain.group.visible = map.ready
  })

  return <primitive object={rain.group} />
}

/**
 * The highest surface over every spot of a rectangle of the world, as a depth map drawn from
 * straight above. Sixteen bits of depth over the camera's range puts a surface within a
 * centimetre of where it is.
 */
class CoverMap {
  readonly target: WebGLRenderTarget
  readonly depth: DepthTexture
  readonly camera: OrthographicCamera
  /** (minX, maxZ, 1 / sizeX, 1 / sizeZ): turns a world xz into the map's uv. */
  readonly box: Vector4
  /** (camera height, near, far - near, half a texel in uv): turns a depth into a world height. */
  readonly range: Vector4
  readonly bytes: number
  ready = false

  constructor(minX: number, minZ: number, maxX: number, maxZ: number, size: number, unit: number) {
    const sizeX = maxX - minX
    const sizeZ = maxZ - minZ
    const top = 400 * unit
    const near = unit
    const far = top + 40 * unit
    this.depth = new DepthTexture(size, size, UnsignedShortType)
    this.target = new WebGLRenderTarget(size, size, {
      format: RedFormat,
      type: UnsignedByteType,
      minFilter: NearestFilter,
      magFilter: NearestFilter,
      generateMipmaps: false,
      depthBuffer: true,
    })
    this.target.depthTexture = this.depth
    // One byte of color (unused, a target must have one) and two of depth for each texel.
    this.bytes = size * size * 3
    // Looking straight down with -Z up the image: u runs along +X and v along -Z.
    this.camera = new OrthographicCamera(-sizeX / 2, sizeX / 2, sizeZ / 2, -sizeZ / 2, near, far)
    this.camera.position.set((minX + maxX) / 2, top, (minZ + maxZ) / 2)
    this.camera.up.set(0, 0, -1)
    this.camera.lookAt((minX + maxX) / 2, 0, (minZ + maxZ) / 2)
    this.camera.updateProjectionMatrix()
    this.camera.updateMatrixWorld()
    this.box = new Vector4(minX, maxZ, 1 / sizeX, 1 / sizeZ)
    this.range = new Vector4(top, near, far - near, 0.5 / size)
  }

  /** Draw the map: the scene as `viewer` sees it, less `skip` and everything that moves. */
  bake(gl: WebGLRenderer, scene: Scene, viewer: Camera, skip: Object3D) {
    const hidden: Object3D[] = []
    const hide = (o: Object3D) => {
      if (!o.visible) return
      if (o === skip || o.userData[DYNAMIC_KEY]) {
        o.visible = false
        hidden.push(o)
        return
      }
      for (const child of o.children) hide(child)
    }
    hide(scene)
    this.camera.layers.mask = viewer.layers.mask
    const target = gl.getRenderTarget()
    const auto = gl.shadowMap.autoUpdate
    const needs = gl.shadowMap.needsUpdate
    // The shadow maps are for the viewer's camera. Leave them be.
    gl.shadowMap.autoUpdate = false
    gl.shadowMap.needsUpdate = false
    gl.setRenderTarget(this.target)
    gl.clear(true, true, true)
    scenePass(() => gl.render(scene, this.camera))
    gl.setRenderTarget(target)
    gl.shadowMap.autoUpdate = auto
    gl.shadowMap.needsUpdate = needs
    for (const o of hidden) o.visible = true
    this.ready = true
  }

  dispose() {
    this.target.dispose()
    this.depth.dispose()
  }
}

// The box of rain around the camera, in units. Streaks wrap inside it, so the camera never
// walks out of the rain. `BELOW` is how far under the camera they still fall, for a view down
// from a roof.
const BOX = 64
const HEIGHT = 40
const BELOW = 10
/** Streak speeds in the heaviest rain's range, in units a second, in steps that fall a whole number of box heights over `RAIN_PERIOD`. */
const SPEED = { min: 22, steps: 41, step: 0.25 }
/** A streak is as long as the rain moves in this many seconds: the blur of one exposure. */
const EXPOSURE = 0.03
/**
 * What the rain's strength (0 to 1) does to a streak, as [in a drizzle, in a downpour]: how fast
 * it falls against `SPEED`, how long its exposure is against `EXPOSURE`, and how bright it is.
 * How many streaks fall goes straight with the strength.
 */
const STREAK = { speed: [0.45, 1.1], exposure: [0.7, 1.3], light: [0.55, 1] } as const
/** Splashes thin out a little faster than streaks as the rain eases: their count goes with the strength to this power. */
const SPLASH_EASE = 1.3
// Snow has a smaller box of its own, since a flake past 12 units is too small to see, and a
// small box keeps the flakes there are close together.
const SNOW_BOX = 24
const SNOW_HEIGHT = 16
const SNOW_BELOW = 6
/** Flake speeds, in units a second, in steps that fall a whole number of snow box heights over `RAIN_PERIOD`. */
const SNOW_SPEED = { min: 0.9, steps: 13, step: SNOW_HEIGHT / RAIN_PERIOD }
/** The wind's drift wraps here, in units: a whole number of both boxes, so neither sees the wrap. */
const DRIFT_SPAN = BOX * SNOW_BOX
/** How far a flake swings side to side as it falls, in units, and how wide the largest is. */
const SNOW_SWAY = 0.35
const SNOW_SIZE = { min: 0.02, max: 0.045 }
const SNOW_COLOR = '#dfe6f2'
/** Splashes wrap inside a square of this side around the camera, in units. */
const AREA = 36

const f = (n: number) => n.toFixed(4)

/** Where the floor is when a world has none: under anything a cover map could hold. */
const NO_FLOOR = -1000

const COVER_PARS = /* glsl */ `
uniform sampler2D tCover;
uniform float uFloor;
uniform vec4 uCoverBox;
uniform vec4 uCoverDepth;
vec2 coverUv( vec2 xz ) { return vec2( ( xz.x - uCoverBox.x ) * uCoverBox.z, ( uCoverBox.y - xz.y ) * uCoverBox.w ); }
float coverAt( vec2 uv ) { return uCoverDepth.x - ( uCoverDepth.y + texture2D( tCover, uv ).r * uCoverDepth.z ); }
bool coverOutside( vec2 uv ) { return uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0; }
// The height of the highest surface over a spot, or far below the world outside the map.
float coverHeight( vec2 xz ) {
  vec2 uv = coverUv( xz );
  return max( coverOutside( uv ) ? -1000.0 : coverAt( uv ), uFloor );
}
// The same over the four nearest texels, so a streak beside a wall ends at the roof line and not in the wall.
float coverShelter( vec2 xz ) {
  vec2 uv = coverUv( xz );
  if ( coverOutside( uv ) ) return uFloor;
  float h = uCoverDepth.w;
  return max( uFloor, max( max( coverAt( uv + vec2( -h, -h ) ), coverAt( uv + vec2( h, -h ) ) ), max( coverAt( uv + vec2( -h, h ) ), coverAt( uv + vec2( h, h ) ) ) ) );
}
`

const streakVert = (unit: number) => /* glsl */ `
uniform float uFall;
uniform vec2 uDrift;
uniform vec2 uWind;
uniform vec3 uStreak;
uniform vec3 uCam;
attribute float aEnd;
attribute float aSpeed;
varying float vA;
${COVER_PARS}
void main() {
  // Fall and drift, wrapped into the box around the camera. The fall has a clock of its own that
  // runs slow in a drizzle, and the drift is how far the wind has carried everything so far.
  vec3 w;
  w.y = uCam.y + mod( position.y - uFall * aSpeed - uCam.y + ${f(BELOW * unit)}, ${f(HEIGHT * unit)} ) - ${f(BELOW * unit)};
  w.x = uCam.x + mod( position.x + uDrift.x - uCam.x + ${f((BOX / 2) * unit)}, ${f(BOX * unit)} ) - ${f((BOX / 2) * unit)};
  w.z = uCam.z + mod( position.z + uDrift.y - uCam.z + ${f((BOX / 2) * unit)}, ${f(BOX * unit)} ) - ${f((BOX / 2) * unit)};
  // Both ends ask about the head, so a streak goes out whole when its head meets a surface.
  float alive = step( coverShelter( w.xz ), w.y );
  // The tail trails back along the way the drop is moving, so wind slants the streak.
  vec3 velocity = vec3( uWind.x, -aSpeed * uStreak.x, uWind.y );
  w -= velocity * ( aEnd * ${f(EXPOSURE)} * uStreak.y );
  float d = distance( w, uCam );
  // Bright at the head, faint at the tail. Gone right at the lens and again where the box ends.
  vA = uStreak.z * ( 1.0 - aEnd * 0.8 ) * smoothstep( ${f(0.5 * unit)}, ${f(3 * unit)}, d ) * ( 1.0 - smoothstep( ${f(18 * unit)}, ${f((BOX / 2) * unit)}, d ) ) * alive;
  gl_Position = projectionMatrix * viewMatrix * vec4( w, 1.0 );
}`

// No tone mapping here: like the haze, rain is added to the linear image and the post stack grades it.
const STREAK_FRAG = /* glsl */ `
uniform vec3 uColor;
varying float vA;
void main() {
  gl_FragColor = vec4( uColor * vA, 1.0 );
}`

// A flake is one point: it falls slowly, swings from side to side and rides the same drift as the
// rain. The swing turns a whole number of times over the rain clock, so the wrap is seamless.
const flakeVert = (unit: number) => /* glsl */ `
uniform float uRainTime;
uniform vec2 uDrift;
uniform float uPixels;
uniform vec3 uCam;
attribute vec4 aFlake;
varying float vA;
${COVER_PARS}
void main() {
  vec2 sway = vec2( sin( aFlake.y + uRainTime * aFlake.z ), cos( aFlake.y * 1.7 + uRainTime * aFlake.z ) ) * ${f(SNOW_SWAY * unit)};
  vec3 w;
  w.y = uCam.y + mod( position.y - uRainTime * aFlake.x - uCam.y + ${f(SNOW_BELOW * unit)}, ${f(SNOW_HEIGHT * unit)} ) - ${f(SNOW_BELOW * unit)};
  w.x = uCam.x + mod( position.x + uDrift.x + sway.x - uCam.x + ${f((SNOW_BOX / 2) * unit)}, ${f(SNOW_BOX * unit)} ) - ${f((SNOW_BOX / 2) * unit)};
  w.z = uCam.z + mod( position.z + uDrift.y + sway.y - uCam.z + ${f((SNOW_BOX / 2) * unit)}, ${f(SNOW_BOX * unit)} ) - ${f((SNOW_BOX / 2) * unit)};
  float alive = step( coverShelter( w.xz ), w.y );
  vec4 mv = viewMatrix * vec4( w, 1.0 );
  float d = length( mv.xyz );
  // As wide on screen as it would be at its distance. Under a pixel it stays a pixel and fades instead.
  float px = aFlake.w * uPixels / max( -mv.z, 1e-3 );
  gl_PointSize = clamp( px, 1.0, 12.0 );
  vA = min( px, 1.0 ) * smoothstep( ${f(0.4 * unit)}, ${f(1.5 * unit)}, d ) * ( 1.0 - smoothstep( ${f(SNOW_BOX * 0.3 * unit)}, ${f((SNOW_BOX / 2) * unit)}, d ) ) * alive;
  gl_Position = projectionMatrix * mv;
}`

const FLAKE_FRAG = /* glsl */ `
uniform vec3 uColor;
varying float vA;
void main() {
  float r = length( gl_PointCoord - 0.5 ) * 2.0;
  gl_FragColor = vec4( uColor * ( 1.0 - smoothstep( 0.35, 1.0, r ) ) * vA, 1.0 );
}`

// Each splash is two quads: a ring that spreads flat on the surface, and a short spurt that
// stands up and turns to face the camera. When its time is up it starts again somewhere else.
const splashVert = (unit: number) => /* glsl */ `
uniform float uRainTime;
uniform vec3 uCam;
attribute vec4 aSeed;
varying vec2 vP;
varying float vPart;
varying float vLife;
varying float vFade;
${COVER_PARS}
void main() {
  // Rates in eighths, so each splash's count of lives over the rain clock is whole and the wrap is seamless.
  float rate = 1.5 + floor( aSeed.z * 12.0 ) * 0.125;
  float t = uRainTime * rate + floor( aSeed.w * 61.0 );
  float life = fract( t );
  float turn = mod( floor( t ), rate * ${f(RAIN_PERIOD)} );
  vec2 spot = fract( aSeed.xy + turn * vec2( 0.618034, 0.754878 ) ) * ${f(AREA * unit)};
  vec2 xz = uCam.xz + mod( spot - uCam.xz + ${f((AREA / 2) * unit)}, ${f(AREA * unit)} ) - ${f((AREA / 2) * unit)};
  float ground = coverHeight( xz );
  vec3 w = vec3( xz.x, ground, xz.y );
  float d = distance( w, uCam );
  if ( position.z < 0.5 ) {
    float radius = ( 0.02 + ( 0.07 + 0.06 * aSeed.z ) * sqrt( life ) ) * ${f(unit)};
    w.xz += position.xy * radius;
    w.y += ${f(0.02 * unit)};
  } else {
    vec2 toCam = normalize( uCam.xz - xz + 1e-4 );
    float rise = ( 0.04 + 0.08 * aSeed.x ) * sin( min( life * 3.0, 1.0 ) * 3.14159 ) * ${f(unit)};
    w.xz += vec2( -toCam.y, toCam.x ) * position.x * ${f(0.025 * unit)};
    w.y += ${f(0.02 * unit)} + position.y * rise;
  }
  vP = position.xy;
  vPart = position.z;
  vLife = life;
  vFade = ( 1.0 - smoothstep( ${f(AREA * 0.3 * unit)}, ${f(AREA * 0.5 * unit)}, d ) ) * smoothstep( ${f(0.3 * unit)}, ${f(1.5 * unit)}, d ) * step( -500.0, ground );
  gl_Position = projectionMatrix * viewMatrix * vec4( w, 1.0 );
}`

const SPLASH_FRAG = /* glsl */ `
uniform vec3 uColor;
varying vec2 vP;
varying float vPart;
varying float vLife;
varying float vFade;
void main() {
  float a;
  if ( vPart < 0.5 ) {
    float r = length( vP );
    float fade = 1.0 - vLife;
    a = smoothstep( 0.7, 0.88, r ) * ( 1.0 - smoothstep( 0.88, 1.0, r ) ) * fade * fade;
  } else {
    // A sliver, widest at the foot, gone by the time the ring has spread.
    float width = 1.0 - vP.y * 0.8;
    a = ( 1.0 - smoothstep( width * 0.4, width, abs( vP.x ) ) ) * ( 1.0 - smoothstep( 0.0, 0.4, vLife ) );
  }
  gl_FragColor = vec4( uColor * a * vFade, 1.0 );
}`

interface RainParts {
  seed: number
  streaks: number
  splashes: number
  flakes: number
  unit: number
  streak: Color
  splash: Color
  flake: Color
  map: CoverMap
}

const wrap = (v: number, span: number) => ((v % span) + span) % span
const between = (range: readonly [number, number], k: number) =>
  range[0] + (range[1] - range[0]) * k

function buildRain({
  seed,
  streaks,
  splashes,
  flakes,
  unit,
  streak,
  splash,
  flake,
  map,
}: RainParts) {
  const r = rng(seed)
  const group = new Group()
  group.name = 'runek:rain'
  group.visible = false
  const disposables: { dispose(): void }[] = []
  const cover = { value: null as Texture | null }
  const floor = { value: NO_FLOOR }
  const eye = { value: new Vector3() }
  // The streaks' own clock, how far the wind has carried everything, the wind now, and what the
  // rain's strength makes of a streak (speed, exposure, light).
  const fall = { value: 0 }
  const drift = { value: new Vector2() }
  const wind = { value: new Vector2() }
  const streakLook = { value: new Vector3(1, 1, 1) }
  // Screen pixels a world length of 1 covers at a distance of 1, for sizing flakes.
  const pixels = { value: 1 }
  const size = new Vector2()
  const shared = {
    uRainTime: rainUniforms.uRainTime,
    uCam: eye,
    tCover: cover,
    uFloor: floor,
    uCoverBox: { value: map.box },
    uCoverDepth: { value: map.range },
  }
  // Read the eye from whichever camera is about to draw, so the rain never trails the view.
  const follow = (gl: WebGLRenderer, _scene: unknown, camera: Camera) => {
    eye.value.setFromMatrixPosition(camera.matrixWorld)
    const target = gl.getRenderTarget()
    const height = target ? target.height : gl.getDrawingBufferSize(size).y
    pixels.value = height * 0.5 * camera.projectionMatrix.elements[5]
  }
  const additive = (material: ShaderMaterial) => {
    material.transparent = true
    material.blending = AdditiveBlending
    material.depthWrite = false
    disposables.push(material)
    return material
  }
  const place = (object: Object3D) => {
    // The box follows the camera in the shader, so there is no still bound to cull by.
    object.frustumCulled = false
    object.renderOrder = 6
    object.onBeforeRender = follow as Object3D['onBeforeRender']
    // Nothing is drawn until the weather asks for it.
    object.visible = false
    group.add(object)
  }

  let lines: LineSegments | null = null
  let splashMesh: Mesh<InstancedBufferGeometry> | null = null
  let points: Points | null = null

  if (streaks > 0) {
    const position = new Float32Array(streaks * 6)
    const end = new Float32Array(streaks * 2)
    const speed = new Float32Array(streaks * 2)
    for (let i = 0; i < streaks; i++) {
      const x = r() * BOX * unit
      const y = r() * HEIGHT * unit
      const z = r() * BOX * unit
      const fall = (SPEED.min + Math.floor(r() * SPEED.steps) * SPEED.step) * unit
      position.set([x, y, z, x, y, z], i * 6)
      end.set([0, 1], i * 2)
      speed.set([fall, fall], i * 2)
    }
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(position, 3))
    geometry.setAttribute('aEnd', new BufferAttribute(end, 1))
    geometry.setAttribute('aSpeed', new BufferAttribute(speed, 1))
    disposables.push(geometry)
    const material = additive(
      new ShaderMaterial({
        vertexShader: streakVert(unit),
        fragmentShader: STREAK_FRAG,
        uniforms: {
          ...shared,
          uFall: fall,
          uDrift: drift,
          uWind: wind,
          uStreak: streakLook,
          uColor: { value: streak },
        },
      }),
    )
    lines = new LineSegments(geometry, material)
    lines.name = 'runek:rain:streaks'
    place(lines)
  }

  if (splashes > 0) {
    const geometry = new InstancedBufferGeometry()
    // (x, y) is the corner and z says which quad: 0 the flat ring, 1 the upright spurt.
    const corners = [-1, -1, 0, 1, -1, 0, -1, 1, 0, 1, 1, 0, -1, 0, 1, 1, 0, 1, -1, 1, 1, 1, 1, 1]
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(corners), 3))
    geometry.setIndex([0, 1, 2, 2, 1, 3, 4, 5, 6, 6, 5, 7])
    const seeds = new Float32Array(splashes * 4)
    for (let i = 0; i < seeds.length; i++) seeds[i] = r()
    geometry.setAttribute('aSeed', new InstancedBufferAttribute(seeds, 4))
    geometry.instanceCount = splashes
    disposables.push(geometry)
    const material = additive(
      new ShaderMaterial({
        vertexShader: splashVert(unit),
        fragmentShader: SPLASH_FRAG,
        uniforms: { ...shared, uColor: { value: splash } },
        side: DoubleSide,
      }),
    )
    material.polygonOffset = true
    material.polygonOffsetFactor = -2
    material.polygonOffsetUnits = -4
    splashMesh = new Mesh(geometry, material)
    splashMesh.name = 'runek:rain:splashes'
    place(splashMesh)
  }

  if (flakes > 0) {
    const position = new Float32Array(flakes * 3)
    const flakeSeeds = new Float32Array(flakes * 4)
    for (let i = 0; i < flakes; i++) {
      position.set([r() * SNOW_BOX * unit, r() * SNOW_HEIGHT * unit, r() * SNOW_BOX * unit], i * 3)
      // Fall speed, where in its swing it starts, how fast it swings (a whole number of turns over the rain clock), and its width.
      flakeSeeds.set(
        [
          (SNOW_SPEED.min + Math.floor(r() * SNOW_SPEED.steps) * SNOW_SPEED.step) * unit,
          r() * Math.PI * 2,
          ((20 + Math.floor(r() * 40)) * Math.PI * 2) / RAIN_PERIOD,
          (SNOW_SIZE.min + r() * (SNOW_SIZE.max - SNOW_SIZE.min)) * unit,
        ],
        i * 4,
      )
    }
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(position, 3))
    geometry.setAttribute('aFlake', new BufferAttribute(flakeSeeds, 4))
    disposables.push(geometry)
    const material = additive(
      new ShaderMaterial({
        vertexShader: flakeVert(unit),
        fragmentShader: FLAKE_FRAG,
        uniforms: { ...shared, uDrift: drift, uPixels: pixels, uColor: { value: flake } },
      }),
    )
    points = new Points(geometry, material)
    points.name = 'runek:rain:flakes'
    place(points)
  }

  return {
    group,
    cover,
    floor,
    /** Move the weather on by `dt` seconds and draw as much of it as `now` asks for. */
    step(dt: number, now: RainWeather) {
      const rain = Math.min(1, Math.max(0, now.rain))
      const snow = Math.min(1, Math.max(0, now.snow))
      const speed = between(STREAK.speed, rain)
      // Wrapped like the rain clock, and for the same reason: every streak speed repeats over it.
      fall.value = (fall.value + dt * speed) % RAIN_PERIOD
      const span = DRIFT_SPAN * unit
      drift.value.set(
        wrap(drift.value.x + now.wind.x * unit * dt, span),
        wrap(drift.value.y + now.wind.z * unit * dt, span),
      )
      wind.value.set(now.wind.x * unit, now.wind.z * unit)
      streakLook.value.set(speed, between(STREAK.exposure, rain), between(STREAK.light, rain))
      // Every part starts at a random spot, so the first few of them are as evenly spread as all of them.
      if (lines) {
        const count = Math.round(streaks * rain)
        lines.geometry.setDrawRange(0, count * 2)
        lines.visible = count > 0
      }
      if (splashMesh) {
        const count = Math.round(splashes * rain ** SPLASH_EASE)
        splashMesh.geometry.instanceCount = count
        splashMesh.visible = count > 0
      }
      if (points) {
        const count = Math.round(flakes * snow)
        points.geometry.setDrawRange(0, count)
        points.visible = count > 0
      }
    },
    dispose() {
      for (const d of disposables) d.dispose()
    },
  }
}
