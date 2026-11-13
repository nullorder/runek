import { useFrame } from '@react-three/fiber'
import { lazyModule, useNodeRenderer, useWorld } from '@runek/core'
import { useEffect, useMemo } from 'react'
import { BackSide, type Color, type Material, ShaderMaterial, SphereGeometry, Vector3 } from 'three'
import { along, emissiveColor, useLadder } from './city/glow'

// The dome's node (TSL) material, loaded only under a node renderer.
const skyNodes = lazyModule(() => import('./nodes/glowSky'))

export interface GlowSkyProps {
  /** Accepted for the component contract. Shifts the cloud pattern. */
  seed?: number
  /** Color of the sky overhead. */
  zenith?: string
  /** Color at the horizon. Match it to the world's fog so the city fades into the sky. */
  horizon?: string
  /** Color of the city glow on the underside of the cloud deck. */
  glow?: string
  /** Draw the low cloud deck lit from below. */
  clouds?: boolean
  /** Color of the open sky between the clouds. */
  night?: string
  /** Color of the clouds themselves, away from the city's glow. Cooler than the haze, so the
   *  glow on their undersides reads as light on something and not as more haze. */
  cloud?: string
  /** Color of the moon and its light on the clouds. */
  moonColor?: string
  /** Where the moon hangs: a direction from the viewer, +Y up. */
  moon?: [number, number, number]
  /** How the sky is right now. Asked every frame, and eased toward. Unset, the sky stays
   *  mostly overcast with a full moon behind it. */
  state?: () => SkyState
}

/** The part of the sky that changes while you watch. */
export interface SkyState {
  /** How far the clouds have parted, 0 (overcast) to 1 (none left). */
  clear: number
  /** The moon's phase as a share of its cycle: 0 new, 0.25 first quarter, 0.5 full, 0.75 last quarter. */
  phase: number
}

/**
 * The moon's phase at `ms` (Unix milliseconds), as a share of its cycle from one new moon to
 * the next. Counted from the new moon of 6 January 2000 at the mean length of a lunation, which
 * is within a few hours of the real one: enough for the shape of a moon in the sky.
 */
export function moonPhaseAt(ms: number): number {
  const NEW_MOON = Date.UTC(2000, 0, 6, 18, 14)
  const LUNATION = 29.530588853 * 86_400_000
  const cycles = (ms - NEW_MOON) / LUNATION
  return cycles - Math.floor(cycles)
}

/** How bright the moon's lit face and the brightest stars are, in scene-linear luminance. */
const MOON_LUMINANCE = 2.4
const STAR_LUMINANCE = 0.9
/** The moon's radius as an angle, in radians: about five times the real one, as a night sky is remembered. */
const MOON_RADIUS = 0.05

/** Where the sky sits between the darkest and brightest a night sky dome gets: zenith, then
 *  horizon (and haze). A world matches its fog color to the horizon. */
export const SKY_ZENITH = 0.15
export const SKY_HORIZON = 0.6

const VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}`

const FRAG = /* glsl */ `
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uGlow;
uniform float uTime;
uniform float uSeed;
uniform float uClouds;
uniform vec3 uNight;
uniform vec3 uCloud;
uniform vec3 uMoon;
uniform vec3 uMoonDir;
uniform float uMoonRadius;
uniform float uPhase;
uniform float uClear;
uniform float uStar;
varying vec3 vDir;
float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float h3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float n(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h(i), h(i + vec2(1, 0)), u.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), u.x), u.y); }
void main() {
  vec3 d = normalize(vDir);
  float y = max(d.y, 0.0);
  float up = pow(smoothstep(0.0, 0.7, y), 0.6);
  // A cloud deck lit from below by the district. It parts as the sky clears, and never low down,
  // where the haze closes it.
  vec2 p = d.xz / max(d.y, 0.05) * 1.4 + vec2(uTime * 0.01 + uSeed, uSeed * 0.37);
  float cn = n(p) * 0.5 + n(p * 2.3) * 0.27 + n(p * 5.1) * 0.15 + n(p * 11.3) * 0.08;
  // At 1 no cloud is left at all. A little under it, a few drift through.
  float from = mix(0.2, 0.92, uClear);
  // A firm edge, so a cloud is a shape with sky beside it and not a stain.
  float cl = smoothstep(from, from + 0.12, cn);
  // How thick the cloud is here: thin at its edge, heavy in its middle.
  float body = smoothstep(from, from + 0.4, cn);
  float cover = mix(1.0, max(cl, 1.0 - smoothstep(0.0, 0.16, y)), uClouds);

  // What is behind the clouds: the open night, stars, and the moon in its phase.
  vec3 open = mix(uHorizon, uNight, up);
  vec3 sp = d * 150.0;
  vec3 id = floor(sp);
  float r = h3(id);
  float star = step(0.986, r) * smoothstep(0.24, 0.0, length(fract(sp) - 0.5));
  open += vec3(uStar) * star * (0.25 + 0.75 * fract(r * 71.3)) * (0.75 + 0.25 * sin(uTime * (0.8 + r * 3.0) + r * 40.0));

  float toward = max(dot(d, uMoonDir), 0.0);
  // 0 at new moon, 1 at full.
  float lit = 0.5 - 0.5 * cos(uPhase);
  vec3 mx = normalize(cross(uMoonDir, vec3(0.0, 1.0, 0.0)));
  vec3 my = cross(mx, uMoonDir);
  vec2 q = vec2(dot(d, mx), dot(d, my)) / uMoonRadius;
  float rr = dot(q, q);
  if (rr < 1.0 && toward > 0.0) {
    // A ball lit from the side: the sun goes round behind it as the month runs.
    vec3 face = vec3(q, sqrt(1.0 - rr));
    float day = smoothstep(-0.04, 0.22, dot(face, vec3(sin(uPhase), 0.0, -cos(uPhase))));
    float seas = 0.72 + 0.28 * n(q * 2.6 + 9.0);
    open = mix(open, uMoon * (0.015 + day) * seas, smoothstep(1.0, 0.88, rr));
  }
  open += uMoon * lit * (0.1 * pow(toward, 400.0) + 0.012 * pow(toward, 30.0));

  // The clouds: the old dome, the city's glow on their undersides, and the moon behind them.
  // Their own cool grey, darker where they are thick, sinking into the haze low down. The city
  // lights their undersides, most near the horizon and most where they are heavy.
  vec3 cloud = mix(uHorizon, uCloud * mix(1.35, 0.6, body), smoothstep(0.0, 0.3, y));
  cloud += uGlow * (0.35 + 0.65 * body) * (1.0 - smoothstep(0.0, 0.7, y)) * smoothstep(0.0, 0.04, y) * uClouds;
  cloud += uMoon * lit * 0.03 * pow(toward, 14.0);
  // Thin cloud at the edge of a gap catches the moon.
  cloud += uMoon * lit * 0.05 * pow(toward, 6.0) * cl * (1.0 - cl) * 4.0;
  gl_FragColor = vec4(mix(open, cloud, cover), 1.0);
}`

/**
 * A night sky that is never black: a dome lit from below by the city, darkest overhead and as
 * bright as the haze at the horizon, with a slow cloud deck catching the district's glow. The
 * deck parts and closes with `state`: through the gaps are stars and a moon in the phase it is
 * told, which lights the cloud round it. (Under `WebGPURenderer` the deck stays closed, with no
 * stars or moon.) The clouds drift and the stars twinkle on the world's clock. The horizon is
 * meant to match the world's fog color so the two meet without a seam. Drawn behind everything
 * at the far plane, wherever the viewer is. Decorative: no collider.
 */
export function GlowSky({
  seed = 0,
  zenith = '#10172e',
  horizon = '#1a2238',
  glow = '#9ab8ff',
  clouds = true,
  night = '#131a3a',
  cloud = '#3a4052',
  moonColor = '#f6f2ea',
  moon = [0.42, 0.62, -0.66],
  state,
}: GlowSkyProps) {
  const ladder = useLadder()
  const { unit, now = Date.now } = useWorld()
  const nodes = useNodeRenderer() ? skyNodes() : null
  const colors = useMemo(
    () => ({
      zenith: emissiveColor(zenith, along(ladder.skyDome, SKY_ZENITH)),
      horizon: emissiveColor(horizon, along(ladder.skyDome, SKY_HORIZON)),
      glow: emissiveColor(glow, ladder.skyDome[0] * 0.6),
      night: emissiveColor(night, along(ladder.skyDome, SKY_ZENITH) * 0.6),
      cloud: emissiveColor(cloud, along(ladder.skyDome, SKY_ZENITH) * 1.5),
      moon: emissiveColor(moonColor, MOON_LUMINANCE),
      moonDir: new Vector3(...moon).normalize(),
    }),
    [zenith, horizon, glow, night, cloud, moonColor, moon, ladder.skyDome],
  )
  const sky = useMemo(
    () => (nodes ? nodes.nodeSky(colors, seed, clouds) : glslSky(colors, seed, clouds)),
    [nodes, colors, seed, clouds],
  )
  useEffect(() => () => sky.material.dispose(), [sky])
  useFrame((_, dt) => {
    // A day's seconds, so the shader's floats keep their precision; the clouds jump once a day.
    sky.setTime((now() / 1000) % 86_400)
    if (state) sky.setState?.(state(), Math.min(dt, 0.1))
  })
  const geometry = useMemo(() => new SphereGeometry(900 * unit, 32, 16), [unit])
  useEffect(() => () => geometry.dispose(), [geometry])

  return <mesh material={sky.material} geometry={geometry} renderOrder={-1} frustumCulled={false} />
}

export interface SkyColors {
  zenith: Color
  horizon: Color
  glow: Color
  night: Color
  cloud: Color
  moon: Color
  moonDir: Vector3
}

export interface SkyHandle {
  material: Material
  setTime: (t: number) => void
  /** Ease toward `state` over `dt` seconds. */
  setState?: (state: SkyState, dt: number) => void
}

function glslSky(c: SkyColors, seed: number, clouds: boolean): SkyHandle {
  const material = new ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      uZenith: { value: c.zenith },
      uHorizon: { value: c.horizon },
      uGlow: { value: c.glow },
      uTime: { value: 0 },
      uSeed: { value: (seed % 97) * 3.1 },
      uClouds: { value: clouds ? 1 : 0 },
      uNight: { value: c.night },
      uCloud: { value: c.cloud },
      uMoon: { value: c.moon },
      uMoonDir: { value: c.moonDir },
      uMoonRadius: { value: MOON_RADIUS },
      uPhase: { value: Math.PI },
      uClear: { value: 1 },
      uStar: { value: STAR_LUMINANCE },
    },
    side: BackSide,
    depthWrite: false,
    fog: false,
  })
  material.name = 'glowsky'
  return {
    material,
    setTime: (t) => {
      material.uniforms.uTime.value = t
    },
    setState: (state, dt) => {
      const u = material.uniforms
      // Clouds take a minute or so to part. The moon is where the calendar says.
      u.uClear.value +=
        (Math.min(1, Math.max(0, state.clear)) - u.uClear.value) * (1 - Math.exp(-dt / 20))
      u.uPhase.value = state.phase * Math.PI * 2
    },
  }
}

GlowSky.stream = false
